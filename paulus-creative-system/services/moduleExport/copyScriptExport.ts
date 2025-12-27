
import { DeckOutputAdapter } from '../deckOutputAdapter';
import { SlideStyleType } from '../../deck-editor';

/**
 * PAULUS.AI — COPY & SCRIPT EXPORT
 */
export const exportSloganToDeck = async (adapter: DeckOutputAdapter, slogan: string) => {
  await adapter.createSlideFromModule({
    sourceModule: 'COPY_SCRIPT',
    slideStyleType: SlideStyleType.Slogan,
    payload: { text: slogan }
  });
};

export const exportScriptToDeck = async (adapter: DeckOutputAdapter, script: string) => {
  await adapter.createSlideFromModule({
    sourceModule: 'COPY_SCRIPT',
    slideStyleType: SlideStyleType.Script,
    payload: { text: script }
  });
};
