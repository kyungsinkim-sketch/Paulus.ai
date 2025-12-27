
import { DeckOutputAdapter } from '../deckOutputAdapter';
import { SlideStyleType } from '../../deck-editor';
import { DirectionItem } from '../../types';

/**
 * PAULUS.AI — DIRECTION BOARD EXPORT
 */
export const exportDirectionToDeck = async (
  adapter: DeckOutputAdapter, 
  category: string, 
  items: DirectionItem[]
) => {
  await adapter.createSlideFromModule({
    sourceModule: 'DIRECTION',
    slideStyleType: SlideStyleType.DirectionBoard,
    payload: {
      text: `Direction: ${category}`,
      images: items.map(i => i.imageUrl || ''),
      texts: items.map(i => i.name)
    }
  });
};
