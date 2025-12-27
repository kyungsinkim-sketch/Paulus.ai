
import { DeckOutputAdapter } from '../deckOutputAdapter';
import { SlideStyleType } from '../../deck-editor';
import { StrategySection } from '../../types';

/**
 * Canonical mapping: Strategy sections -> Strategy or Standard slides.
 */
export const outputStrategyToDeck = async (adapter: DeckOutputAdapter, sections: StrategySection[]) => {
  for (const section of sections) {
    // Fix: Corrected property names to sourceModule and payload to align with DeckOutputAdapter implementation
    await adapter.createSlideFromModule({
      sourceModule: 'STRATEGY_RESEARCH',
      slideStyleType: SlideStyleType.Strategy,
      payload: {
        text: section.title,
        texts: [section.content]
      }
    });
  }
};