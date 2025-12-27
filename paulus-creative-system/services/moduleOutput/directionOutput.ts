
import { DeckOutputAdapter } from '../deckOutputAdapter';
import { SlideStyleType } from '../../deck-editor';
import { DirectionItem } from '../../types';

/**
 * Canonical mapping: Direction category -> DirectionBoard slide.
 */
export const outputDirectionCategoryToDeck = async (
  adapter: DeckOutputAdapter, 
  category: string, 
  items: DirectionItem[]
) => {
  const summary = items.map(i => `${i.name}: ${i.description}`).join('\n');
  
  // Fix: Corrected property names to sourceModule and payload to align with DeckOutputAdapter implementation
  await adapter.createSlideFromModule({
    sourceModule: 'DIRECTION',
    slideStyleType: SlideStyleType.DirectionBoard,
    payload: {
      text: `Direction: ${category}`,
      texts: [summary]
    }
  });
};