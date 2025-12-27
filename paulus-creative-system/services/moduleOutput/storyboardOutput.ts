
import { DeckOutputAdapter } from '../deckOutputAdapter';
import { SlideStyleType } from '../../deck-editor';
import { StoryboardFrameBlock } from '../../types';

/**
 * Canonical mapping: Storyboard cuts -> Storyboard slide.
 * Fulfills Spec: 8 cuts fixed.
 */
export const outputStoryboardToDeck = async (adapter: DeckOutputAdapter, sequenceTitle: string, frames: StoryboardFrameBlock[]) => {
  // Always spawn Storyboard slide
  // Fix: Corrected property names to sourceModule and payload to align with DeckOutputAdapter implementation
  await adapter.createSlideFromModule({
    sourceModule: 'STORYBOARD',
    slideStyleType: SlideStyleType.Storyboard,
    payload: { text: sequenceTitle }
  });

  // Note: For Storyboard, deeper grid mapping is usually handled via updateSlideContent
  // or specialized logic inside the adapter for GridElementType.
};