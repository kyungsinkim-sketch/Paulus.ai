
import { DeckOutputAdapter } from './deckOutputAdapter';
import { SlideStyleType } from '../deck-editor';

/**
 * Outputs a selected slogan to the deck.
 */
export const outputSloganToDeck = async (adapter: DeckOutputAdapter, slogan: string) => {
  // Fix: Corrected property names to sourceModule and payload to align with DeckOutputAdapter implementation
  await adapter.createSlideFromModule({
    sourceModule: 'COPY_SCRIPT',
    slideStyleType: SlideStyleType.Slogan,
    payload: {
      text: slogan
    }
  });
};

/**
 * Outputs script content to the deck.
 */
export const outputScriptToDeck = async (adapter: DeckOutputAdapter, script: string) => {
  // Fix: Corrected property names to sourceModule and payload to align with DeckOutputAdapter implementation
  await adapter.createSlideFromModule({
    sourceModule: 'COPY_SCRIPT',
    slideStyleType: SlideStyleType.Script,
    payload: {
      text: script
    }
  });
};