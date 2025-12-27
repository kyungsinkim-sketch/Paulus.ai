
import { DeckOutputAdapter } from '../deckOutputAdapter';
import { SlideStyleType } from '../../deck-editor';

/**
 * Canonical mapping: Slogan -> Slogan slide.
 */
export const outputSloganToDeck = async (adapter: DeckOutputAdapter, slogan: string) => {
  // Fix: Corrected property names to sourceModule and payload to align with DeckOutputAdapter implementation
  await adapter.createSlideFromModule({
    sourceModule: 'COPY_SCRIPT',
    slideStyleType: SlideStyleType.Slogan,
    payload: { text: slogan }
  });
};

/**
 * Canonical mapping: Script content -> Script slide.
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