
import { Project, Slide, ContentBlock, SlideType, ImageBlock } from '../types';

export interface SlideDraft {
  sectionKey: string;
  title: string;
  type: SlideType;
  body: string[];
  source: string;
}

/**
 * COMMAND B2 — 멱등적 업데이트 (Idempotent Update)
 * source와 sectionKey를 기준으로 슬라이드를 생성하거나 업데이트합니다.
 */
export const upsertSlides = (project: Project, drafts: SlideDraft[]): Project => {
  const currentSlides = [...project.deck.slides];
  
  drafts.forEach((draft, index) => {
    const existingIndex = currentSlides.findIndex(
      s => s.sourceReference?.type === draft.source && s.sourceReference?.id === draft.sectionKey
    );

    const blocks: ContentBlock[] = [
      {
        id: `blk-${draft.sectionKey}-title`,
        type: 'TITLE',
        content: { 
          text: draft.title,
          formatting: { top: 10, left: 6, width: 80, height: 15, fontSize: 48 }
        }
      },
      {
        id: `blk-${draft.sectionKey}-body`,
        type: 'BODY_TEXT',
        content: { 
          text: draft.body.map(p => `• ${p}`).join('\n'),
          formatting: { top: 30, left: 6, width: 45, height: 60, fontSize: 24 }
        }
      },
      {
        id: `blk-${draft.sectionKey}-img`,
        type: 'IMAGE',
        content: { 
          url: '',
          formatting: { top: 30, left: 55, width: 40, height: 50 } 
        }
      }
    ];

    if (existingIndex > -1) {
      // UPDATE existing
      const existing = currentSlides[existingIndex];
      currentSlides[existingIndex] = {
        ...existing,
        title: draft.title,
        blocks: blocks
      };
    } else {
      // CREATE new
      const newSlide: Slide = {
        id: `slide-${draft.source}-${draft.sectionKey}`,
        pageNumber: currentSlides.length + 1,
        title: draft.title,
        type: draft.type,
        layout: 'TITLE_BULLETS',
        blocks: blocks,
        isFinal: false,
        sourceReference: { type: draft.source, id: draft.sectionKey }
      };
      currentSlides.push(newSlide);
    }
  });

  // Re-order by draft sequence if they are specific to a source
  const finalSlides = [...currentSlides].sort((a, b) => {
    if (a.sourceReference?.type === 'CLIENT_BRIEF_INTELLIGENCE' && b.sourceReference?.type === 'CLIENT_BRIEF_INTELLIGENCE') {
        const order = drafts.map(d => d.sectionKey);
        return order.indexOf(a.sourceReference.id) - order.indexOf(b.sourceReference.id);
    }
    return 0;
  });

  finalSlides.forEach((s, i) => s.pageNumber = i + 1);

  return { ...project, deck: { ...project.deck, slides: finalSlides } };
};

/**
 * COMMAND B3 — 슬라이드 이미지 슬롯 업데이트
 */
export const updateSlideRightImage = (project: Project, slideId: string, imageUrl: string): Project => {
  const newSlides = project.deck.slides.map(s => {
    if (s.id === slideId) {
      const newBlocks = s.blocks.map(b => {
        if (b.type === 'IMAGE') {
          return { ...b, content: { ...b.content, url: imageUrl } };
        }
        return b;
      });
      return { ...s, blocks: newBlocks as ContentBlock[] };
    }
    return s;
  });
  return { ...project, deck: { ...project.deck, slides: newSlides } };
};
