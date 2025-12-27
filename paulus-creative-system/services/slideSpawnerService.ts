import { 
  ElementDoc, 
  ElementType, 
  SlideStyleType, 
  Transform, 
  TextStyle 
} from '../deck-editor';
import { SlideStyleApplicator } from './slideStyleApplicator';

/**
 * PAULUS.AI — RESTORE R2 / R5
 * slideSpawnerService.ts
 * 
 * Purpose: Deterministic skeleton generation based on R2 Canonical Spec.
 * Rule: px units forbidden, coordinates in 0-100 percentage.
 */

const createTransform = (x: number, y: number, width: number, height: number): Transform => ({
  x, y, width, height, rotation: 0
});

const createTextStyle = (overrides: Partial<TextStyle> = {}): TextStyle => ({
  fontSize: 24,
  fontFamily: 'Pretendard',
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  textAlign: 'left',
  lineHeight: 1.2,
  letterSpacing: 0,
  ...overrides
});

export const spawnElements = (
  styleType: SlideStyleType, 
  data?: { title?: string; body?: string; subtitle?: string; items?: any[] }
): ElementDoc[] => {
  let elements: ElementDoc[] = [];

  switch (styleType) {
    case SlideStyleType.MainTitle:
      elements.push({
        id: 'bgImage',
        type: ElementType.image,
        transform: createTransform(0, 0, 100, 100),
        zIndex: 0, opacity: 1, hidden: false, locked: false,
        image: { src: '', alt: 'Background', objectFit: 'cover' }
      });
      elements.push({
        id: 'title',
        type: ElementType.text,
        transform: createTransform(5, 32, 90, 20),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        text: {
          content: data?.title || 'PROJECT TITLE',
          style: createTextStyle({ fontSize: 72, fontWeight: 'bold', lineHeight: 1.1 })
        }
      });
      elements.push({
        id: 'subtitle',
        type: ElementType.text,
        transform: createTransform(5, 55, 90, 15),
        zIndex: 2, opacity: 0.85, hidden: false, locked: false,
        text: {
          content: data?.subtitle || 'CLIENT NAME / SUBTITLE',
          style: createTextStyle({ fontSize: 40 })
        }
      });
      break;

    case SlideStyleType.Standard:
    case SlideStyleType.Category:
      elements.push({
        id: 'body',
        type: ElementType.text,
        transform: createTransform(6, 15, 42, 70),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        text: {
          content: data?.body || 'Main text content...',
          style: createTextStyle({ fontSize: 28, lineHeight: 1.4 })
        }
      });
      elements.push({
        id: 'imageMain',
        type: ElementType.image,
        transform: createTransform(54, 15, 40, 70),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        image: { src: '', alt: 'Supporting Visual', objectFit: 'cover' }
      });
      break;

    case SlideStyleType.Strategy:
      elements.push({
        id: 'title',
        type: ElementType.text,
        transform: createTransform(6, 8, 88, 12),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        text: {
          content: data?.title || 'STRATEGY OVERVIEW',
          style: createTextStyle({ fontSize: 42, fontWeight: 'bold' })
        }
      });
      // R2 Strategy: 3-column vertical grid for pillars
      elements.push({
        id: 'gridStrategy',
        type: ElementType.grid,
        transform: createTransform(6, 22, 88, 68),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        grid: {
          columns: 3, rows: 1, gap: 20,
          items: Array.from({ length: 3 }).map((_, i) => ({
            id: `pillar-${i}`,
            elements: [
              {
                id: `pillar-txt-${i}`,
                type: ElementType.text,
                transform: createTransform(0, 0, 100, 100),
                zIndex: 1, opacity: 1, hidden: false, locked: false,
                text: { content: `Strategic Point ${i+1}`, style: createTextStyle({ fontSize: 16 }) }
              }
            ]
          }))
        }
      });
      break;

    case SlideStyleType.Concept:
      elements.push({
        id: 'conceptText',
        type: ElementType.text,
        transform: createTransform(10, 40, 80, 20),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        text: {
          content: data?.title || 'CORE CONCEPT',
          style: createTextStyle({ textAlign: 'center', fontSize: 52, fontWeight: 600 })
        }
      });
      break;

    case SlideStyleType.Slogan:
      elements.push({
        id: 'sloganText',
        type: ElementType.text,
        transform: createTransform(10, 65, 80, 15),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        text: {
          content: data?.title || 'YOUR CAMPAIGN SLOGAN',
          style: createTextStyle({ textAlign: 'center', fontWeight: 'bold' })
        }
      });
      break;

    case SlideStyleType.Visual:
      elements.push({
        id: 'visualFull',
        type: ElementType.image,
        transform: createTransform(0, 0, 100, 100),
        zIndex: 0, opacity: 1, hidden: false, locked: false,
        image: { src: '', alt: 'Full Visual', objectFit: 'cover' }
      });
      break;

    case SlideStyleType.Script:
      elements.push({
        id: 'scriptText',
        type: ElementType.text,
        transform: createTransform(10, 10, 80, 80),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        text: {
          content: data?.body || 'Scene script goes here...',
          style: createTextStyle({ fontFamily: 'Monospace', lineHeight: 1.6 })
        }
      });
      break;

    case SlideStyleType.Storyboard:
      elements.push({
        id: 'gridStoryboard',
        type: ElementType.grid,
        transform: createTransform(5, 10, 90, 80),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        grid: {
          columns: 4, rows: 2, gap: 10,
          items: Array.from({ length: 8 }).map((_, i) => ({
            id: `sb-slot-${i}`,
            elements: [
              {
                id: `sb-img-${i}`,
                type: ElementType.image,
                transform: createTransform(0, 0, 100, 65),
                zIndex: 0, opacity: 1, hidden: false, locked: false,
                image: { src: '', alt: `Shot ${i+1}`, objectFit: 'cover' }
              },
              {
                id: `sb-desc-${i}`,
                type: ElementType.text,
                transform: createTransform(0, 68, 100, 15),
                zIndex: 1, opacity: 1, hidden: false, locked: false,
                text: { content: `Scene Description`, style: createTextStyle({ fontSize: 10 }) }
              },
              {
                id: `sb-dial-${i}`,
                type: ElementType.text,
                transform: createTransform(0, 85, 100, 15),
                zIndex: 1, opacity: 1, hidden: false, locked: false,
                text: { content: `Dialogue/Narration`, style: createTextStyle({ fontSize: 10, fontStyle: 'italic' }) }
              }
            ]
          }))
        }
      });
      break;

    case SlideStyleType.DirectionBoard:
      elements.push({
        id: 'gridDirection',
        type: ElementType.grid,
        transform: createTransform(5, 10, 90, 80),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        grid: {
          columns: 3, rows: 3, gap: 10,
          items: Array.from({ length: 9 }).map((_, i) => ({
            id: `db-slot-${i}`,
            elements: [
              {
                id: `db-img-${i}`,
                type: ElementType.image,
                transform: createTransform(0, 0, 100, 80),
                zIndex: 0, opacity: 1, hidden: false, locked: false,
                image: { src: '', alt: `Asset ${i+1}`, objectFit: 'cover' }
              },
              {
                id: `db-cap-${i}`,
                type: ElementType.text,
                transform: createTransform(0, 82, 100, 18),
                zIndex: 1, opacity: 1, hidden: false, locked: false,
                text: { content: `Asset ${i+1}`, style: createTextStyle({ fontSize: 12, textAlign: 'center' }) }
              }
            ]
          }))
        }
      });
      break;

    case SlideStyleType.Schedule:
    case SlideStyleType.Estimate:
      elements.push({
        id: 'lockedPlaceholder',
        type: ElementType.image,
        transform: createTransform(10, 10, 80, 80),
        zIndex: 1, opacity: 1, hidden: false, locked: true,
        image: { src: '', alt: 'Export Locked Content', objectFit: 'contain' }
      });
      break;

    case SlideStyleType.MiddleTitle:
      elements.push({
        id: 'centeredTitle',
        type: ElementType.text,
        transform: createTransform(10, 45, 80, 10),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        text: {
          content: data?.title || 'SECTION TITLE',
          style: createTextStyle({ textAlign: 'center' })
        }
      });
      break;

    case SlideStyleType.Section:
      elements.push({
        id: 'label',
        type: ElementType.text,
        transform: createTransform(6, 30, 88, 5),
        zIndex: 1, opacity: 0.6, hidden: false, locked: false,
        text: { content: 'CHAPTER LABEL', style: createTextStyle({ fontSize: 14 }) }
      });
      elements.push({
        id: 'title',
        type: ElementType.text,
        transform: createTransform(6, 40, 88, 15),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        text: { content: data?.title || 'CHAPTER TITLE', style: createTextStyle({ fontSize: 48, fontWeight: 'bold' }) }
      });
      break;

    case SlideStyleType.Reference:
      elements.push({
        id: 'gridRef',
        type: ElementType.grid,
        transform: createTransform(10, 15, 80, 70),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        grid: {
          columns: 2, rows: 2, gap: 15,
          items: Array.from({ length: 4 }).map((_, i) => ({
            id: `ref-slot-${i}`,
            elements: [
              {
                id: `ref-img-${i}`,
                type: ElementType.image,
                transform: createTransform(0, 0, 100, 100),
                zIndex: 0, opacity: 1, hidden: false, locked: false,
                image: { src: '', alt: `Reference ${i+1}`, objectFit: 'cover' }
              }
            ]
          }))
        }
      });
      break;

    default:
      elements.push({
        id: 'title',
        type: ElementType.text,
        transform: createTransform(10, 10, 80, 15),
        zIndex: 1, opacity: 1, hidden: false, locked: false,
        text: { content: data?.title || 'New Slide', style: createTextStyle() }
      });
  }

  // Final style intelligence application
  return SlideStyleApplicator.apply(styleType, elements);
};