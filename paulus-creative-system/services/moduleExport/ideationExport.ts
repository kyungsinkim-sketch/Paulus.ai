
import { DeckOutputAdapter } from '../deckOutputAdapter';
import { SlideStyleType } from '../../deck-editor';
import { CanvasItem } from '../../types';

/**
 * PAULUS.AI — CREATIVE IDEATION EXPORT
 * 
 * Maps selected ideation nodes to appropriate Deck slides.
 */
export const exportIdeationNodesToDeck = async (
  adapter: DeckOutputAdapter, 
  nodes: CanvasItem[]
) => {
  // RULE: Only nodes with status = SELECTED are exported
  const selectedNodes = nodes.filter(n => n.status === 'SELECTED');

  for (const node of selectedNodes) {
    const content = node.content || '';
    // RULE: Node length determines style (short -> Concept, long -> Standard)
    const isShort = content.length < 50;
    const styleType = isShort ? SlideStyleType.Concept : SlideStyleType.Standard;

    // Fix: Corrected meta property location to be inside payload as per DeckOutputAdapter types
    await adapter.createSlideFromModule({
      sourceModule: 'CREATIVE_IDEATION',
      slideStyleType: styleType,
      payload: {
        text: content,
        imageUrl: node.type === 'IMAGE' ? content : undefined,
        meta: { sourceNodeId: node.id }
      }
    });
  }
};