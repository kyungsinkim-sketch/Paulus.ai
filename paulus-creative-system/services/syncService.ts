
import { Project, Slide, CanvasItem, DeckEvent, ContentBlock, TextBlock, Language } from '../types';

export type SyncEventType = 
  | 'CANVAS_NODE_UPDATED'
  | 'CANVAS_NODE_MARKED_SELECTED'
  | 'SLIDE_TEXT_UPDATED'
  | 'SLIDE_FINALIZED'
  | 'SYNC_CONFIRMED';

interface SyncContext {
  project: Project;
  event: {
    type: SyncEventType;
    sourceId: string; // Item ID or Slide ID
    payload?: any;
    userId: string;
  };
}

/**
 * CORE EVENT HANDLER
 * Handles the logic for synchronization events as per the core principles.
 */
export const handleSyncEvent = (ctx: SyncContext): Project => {
  const { project, event } = ctx;
  const newProject = { ...project };
  const timestamp = new Date().toISOString();

  // Helper to log deck history
  const logEvent = (type: DeckEvent['type'], targetId: string, details: string) => {
    newProject.deck.history.push({
      id: `evt-${Date.now()}`,
      type,
      targetId,
      sourceId: event.sourceId,
      userId: event.userId,
      timestamp,
      details
    });
  };

  switch (event.type) {
    
    // ----------------------------------------------------------------
    // EVENT 2: CANVAS_NODE_UPDATED
    // Trigger: User edits text or image content of a canvas node.
    // Behavior: If node linked -> Mark linked slide as "Out of sync".
    // ----------------------------------------------------------------
    case 'CANVAS_NODE_UPDATED': {
        const nodeId = event.sourceId;
        const newContent = event.payload?.content;
        
        // 1. Update the Node Content
        newProject.canvasItems = newProject.canvasItems.map(item => 
            item.id === nodeId ? { ...item, content: newContent } : item
        );

        // 2. Check for links
        const node = newProject.canvasItems.find(i => i.id === nodeId);
        if (node?.linkedSlideId) {
            // Find linked slide
            const slideIndex = newProject.deck.slides.findIndex(s => s.id === node.linkedSlideId);
            if (slideIndex > -1) {
                // Mark slide as OUT_OF_SYNC
                const updatedSlide = { ...newProject.deck.slides[slideIndex], syncStatus: 'OUT_OF_SYNC' as const };
                newProject.deck.slides[slideIndex] = updatedSlide;
                
                // Also mark node as OUT_OF_SYNC for visibility
                newProject.canvasItems = newProject.canvasItems.map(item => 
                    item.id === nodeId ? { ...item, syncStatus: 'OUT_OF_SYNC' } : item
                );
            }
        }
        break;
    }

    // ----------------------------------------------------------------
    // EVENT 3: CANVAS_NODE_MARKED_SELECTED
    // Trigger: User changes node status to "Selected".
    // Behavior: If not linked -> Prompt creation (Handled by UI to trigger logic). 
    //           Here we assume confirmation was given if this logic is reached via 'SYNC_CONFIRMED' or direct call.
    // ----------------------------------------------------------------
    case 'CANVAS_NODE_MARKED_SELECTED': {
        const nodeId = event.sourceId;
        
        // 1. Update Node Status
        newProject.canvasItems = newProject.canvasItems.map(item => 
            item.id === nodeId ? { ...item, status: 'SELECTED' } : item
        );

        // 2. Check if linked. If NOT, the UI should have prompted. 
        // If this event is fired, we assume we just updated the status. 
        // Slide creation is a separate explicit action usually, but let's check prompt requirement.
        // Prompt behavior: "Create a new slide from this node?" -> If confirmed, creates slide.
        // We will return the project state. The UI calling this should check if slide creation is needed.
        break;
    }

    // ----------------------------------------------------------------
    // EVENT 5: SLIDE_TEXT_UPDATED
    // Trigger: User edits text inside a slide.
    // Behavior: If linked -> Prompt "Apply back?". 
    //           If declined (default flow here), mark as Diverged or OutOfSync.
    // ----------------------------------------------------------------
    case 'SLIDE_TEXT_UPDATED': {
        const slideId = event.sourceId;
        const newBlocks = event.payload?.blocks;

        // 1. Update Slide
        const slideIndex = newProject.deck.slides.findIndex(s => s.id === slideId);
        if (slideIndex > -1) {
            const slide = newProject.deck.slides[slideIndex];
            newProject.deck.slides[slideIndex] = { ...slide, blocks: newBlocks };

            // 2. Check for Linked Node (Node -> Slide)
            if (slide.sourceReference?.type === 'CANVAS_NODE') {
                const nodeId = slide.sourceReference.id;
                
                // Mark Node as OUT_OF_SYNC
                newProject.canvasItems = newProject.canvasItems.map(item => 
                    item.id === nodeId ? { ...item, syncStatus: 'OUT_OF_SYNC' } : item
                );
                
                // Mark Slide as OUT_OF_SYNC
                newProject.deck.slides[slideIndex].syncStatus = 'OUT_OF_SYNC';
            }

            // 3. Phase 5: Check for Reference Nodes (Slide -> Node)
            // If any node references THIS slide, update its content automatically
            const titleBlock = newBlocks.find((b: any) => b.type === 'TITLE') as TextBlock;
            const bodyBlock = newBlocks.find((b: any) => b.type === 'BODY_TEXT') as TextBlock;
            
            let content = "";
            if (titleBlock) content += `<p><b>${titleBlock.content.text}</b></p>`;
            if (bodyBlock) content += `<p>${bodyBlock.content.text}</p>`;

            newProject.canvasItems = newProject.canvasItems.map(item => {
                if (item.sourceReference?.type === 'DECK_SLIDE' && item.sourceReference.id === slideId) {
                    return { ...item, content: content };
                }
                return item;
            });
        }
        break;
    }

    // ----------------------------------------------------------------
    // EVENT 7: SLIDE_FINALIZED
    // Trigger: User marks slide status as "Final".
    // Behavior: Mark linked nodes as "Selected". Log it.
    // ----------------------------------------------------------------
    case 'SLIDE_FINALIZED': {
        const slideId = event.sourceId;
        const slideIndex = newProject.deck.slides.findIndex(s => s.id === slideId);
        
        if (slideIndex > -1) {
            const slide = newProject.deck.slides[slideIndex];
            newProject.deck.slides[slideIndex] = { ...slide, isFinal: true };

            if (slide.sourceReference?.type === 'CANVAS_NODE') {
                const nodeId = slide.sourceReference.id;
                newProject.canvasItems = newProject.canvasItems.map(item => 
                    item.id === nodeId ? { ...item, status: 'SELECTED', syncStatus: 'SYNCED' } : item
                );
            }
            logEvent('SLIDE_UPDATED', slideId, 'Slide Finalized');
        }
        break;
    }

    // ----------------------------------------------------------------
    // SYNC_CONFIRMED
    // Trigger: User clicks "Sync" on an Out-of-Sync item.
    // Behavior: Force update the target from the source.
    // ----------------------------------------------------------------
    case 'SYNC_CONFIRMED': {
        const { direction } = event.payload; // 'TO_DECK' or 'TO_CANVAS'
        const id = event.sourceId;

        if (direction === 'TO_DECK') {
            // Source is Canvas Node, Target is Slide
            const node = newProject.canvasItems.find(i => i.id === id);
            if (node && node.linkedSlideId) {
                const slideIdx = newProject.deck.slides.findIndex(s => s.id === node.linkedSlideId);
                if (slideIdx > -1) {
                    // Update Slide Content logic (Simple Title/Body mapping)
                    const contentText = node.content?.replace(/<[^>]*>/g, ' ') || "";
                    const currentSlide = newProject.deck.slides[slideIdx];
                    
                    const newBlocks = currentSlide.blocks.map(b => {
                        if (b.type === 'BODY_TEXT') {
                            return { 
                                ...b, 
                                content: { text: contentText }, 
                                bilingualContent: { [event.payload.language || 'EN']: contentText } // Preserve lang context
                            } as TextBlock;
                        }
                        return b;
                    });

                    newProject.deck.slides[slideIdx] = { 
                        ...currentSlide, 
                        blocks: newBlocks, 
                        syncStatus: 'SYNCED' 
                    };
                    
                    // Update Node Sync Status
                    newProject.canvasItems = newProject.canvasItems.map(i => 
                        i.id === id ? { ...i, syncStatus: 'SYNCED' } : i
                    );
                    
                    logEvent('SYNC_ACTION', node.linkedSlideId, 'Synced from Canvas Node');
                }
            }
        } else if (direction === 'TO_CANVAS') {
            // Source is Slide, Target is Canvas Node
            const slide = newProject.deck.slides.find(s => s.id === id);
            if (slide && slide.sourceReference?.type === 'CANVAS_NODE') {
                const nodeId = slide.sourceReference.id;
                
                // Extract text from slide body
                const bodyBlock = slide.blocks.find(b => b.type === 'BODY_TEXT') as TextBlock;
                const newText = bodyBlock?.content?.text || "Updated from Slide";

                newProject.canvasItems = newProject.canvasItems.map(i => 
                    i.id === nodeId ? { 
                        ...i, 
                        content: newText, 
                        bilingualContent: { [event.payload.language || 'EN']: newText },
                        syncStatus: 'SYNCED' 
                    } : i
                );

                // Update Slide Sync Status
                const slideIdx = newProject.deck.slides.findIndex(s => s.id === id);
                if (slideIdx > -1) {
                    newProject.deck.slides[slideIdx].syncStatus = 'SYNCED';
                }

                logEvent('SYNC_ACTION', nodeId, 'Synced from Slide');
            }
        }
        break;
    }
  }

  return newProject;
};
