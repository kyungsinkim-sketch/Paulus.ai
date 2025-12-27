
import { DeckOutputAdapter } from '../deckOutputAdapter';
import { SlideStyleType } from '../../deck-editor';
import { StoryboardFrameBlock } from '../../types';

/**
 * PAULUS.AI — STORYBOARD EXPORT
 */
export const exportStoryboardToDeck = async (
  adapter: DeckOutputAdapter, 
  title: string, 
  frames: StoryboardFrameBlock[]
) => {
  // Currently handles one slide of 8 frames
  await adapter.createSlideFromModule({
    sourceModule: 'STORYBOARD',
    slideStyleType: SlideStyleType.Storyboard,
    payload: {
      text: title,
      images: frames.map(f => f.content.imageUrl || ''),
      texts: frames.map(f => f.content.caption || '')
    }
  });
};
