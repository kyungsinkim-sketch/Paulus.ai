
import { DeckOutputAdapter } from '../deckOutputAdapter';
import { SlideStyleType } from '../../deck-editor';
import { Brief } from '../../types';

/**
 * PAULUS.AI — CLIENT BRIEF EXPORT
 */
export const exportBriefToDeck = async (adapter: DeckOutputAdapter, brief: Brief) => {
  const sections = [
    { key: 'overview', title: 'Project Overview' },
    { key: 'objectives', title: 'Strategic Objectives' },
    { key: 'targetAudience', title: 'Target Audience' },
    { key: 'keyMessage', title: 'Key Campaign Message' }
  ];

  for (const sec of sections) {
    const val = (brief as any)[sec.key];
    if (val) {
      // Fix: Corrected meta property location to be inside payload as per DeckOutputAdapter types
      await adapter.createSlideFromModule({
        sourceModule: 'CLIENT_BRIEF',
        slideStyleType: SlideStyleType.Standard,
        payload: { 
          text: val,
          meta: { section: sec.key }
        }
      });
    }
  }
};