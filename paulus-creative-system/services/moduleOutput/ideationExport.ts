
import { DeckOutputAdapter } from '../deckOutputAdapter';
import { SlideStyleType } from '../../deck-editor';
import { CanvasItem } from '../../types';

/**
 * Canonical mapping: selected ideation nodes -> Standard or Concept slides.
 */
export const exportIdeationNodesToDeck = async (
  adapter: DeckOutputAdapter, 
  nodes: CanvasItem[]
) => {
  for (const node of nodes) {
    const isShort = (node.content?.length || 0) < 50;
    
    // Fix: Corrected property names to sourceModule and payload to align with DeckOutputAdapter implementation
    await adapter.createSlideFromModule({
      sourceModule: 'CREATIVE_IDEATION',
      slideStyleType: isShort ? SlideStyleType.Concept : SlideStyleType.Standard,
      payload: {
        text: node.content || '',
        images: node.type === 'IMAGE' ? [node.content || ''] : []
      }
    });
  }
};