
import { DeckOutputAdapter } from '../deckOutputAdapter';
import { SlideStyleType } from '../../deck-editor';
import { Brief } from '../../types';

/**
 * Canonical mapping: Client Brief intelligence -> Standard slides.
 */
export const outputBriefToDeck = async (adapter: DeckOutputAdapter, brief: Brief) => {
  const fields = [
    { key: 'overview', title: 'Project Overview' },
    { key: 'objectives', title: 'Objectives' },
    { key: 'targetAudience', title: 'Target Audience' },
    { key: 'keyMessage', title: 'Key Message' },
    { key: 'competitors', title: 'Competitors & Market' },
    { key: 'brandTone', title: 'Brand Tone' },
    { key: 'deliverablesChannels', title: 'Deliverables' },
    { key: 'timelineBudget', title: 'Timeline & Budget' }
  ];

  for (const field of fields) {
    const val = (brief as any)[field.key];
    if (val) {
      // Fix: Corrected property names to sourceModule and payload to align with DeckOutputAdapter implementation
      await adapter.createSlideFromModule({
        sourceModule: 'CLIENT_BRIEF',
        slideStyleType: SlideStyleType.Standard,
        payload: {
          text: val
        }
      });
    }
  }
};