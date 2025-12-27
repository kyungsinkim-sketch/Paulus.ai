
import { DeckOutputAdapter } from './deckOutputAdapter';
import { SlideStyleType } from '../deck-editor';
import { CanvasItem } from '../types';

/**
 * Exports selected ideation nodes to a specific slide type.
 */
export const exportIdeationNodesToDeck = async (
  adapter: DeckOutputAdapter, 
  nodes: CanvasItem[], 
  style: SlideStyleType = SlideStyleType.Concept
) => {
  const contentText = nodes.map(n => n.content).filter(Boolean).join('\n');
  const imageRefs = nodes.filter(n => n.type === 'IMAGE').map(n => n.content).filter(Boolean) as string[];

  // Fix: Corrected property names to sourceModule and payload to align with DeckOutputAdapter implementation
  await adapter.createSlideFromModule({
    sourceModule: 'CREATIVE_IDEATION',
    slideStyleType: style,
    payload: {
      text: contentText,
      images: imageRefs
    }
  });
};