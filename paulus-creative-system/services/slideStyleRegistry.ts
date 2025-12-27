import { SlideStyleType, TextStyle, Transform, ElementType } from '../deck-editor';

/**
 * PAULUS.AI — RESTORE R3
 * slideStyleRegistry.ts
 * 
 * Purpose: Declarative definition of visual rules for each slide type.
 * Rule: Pure data only. No rendering logic.
 */

export interface SlideStyleDefinition {
  id: SlideStyleType;
  displayName: string;
  description: string;
  defaultFontFamily: string;
  titleTextStyle: Partial<TextStyle>;
  bodyTextStyle?: Partial<TextStyle>;
  captionTextStyle?: Partial<TextStyle>;
  imagePolicy?: {
    allowed: boolean;
    objectFit?: 'cover' | 'contain';
  };
  layoutPreset: 'TITLE_ONLY' | 'TITLE_BODY' | 'TITLE_BODY_IMAGE' | 'CENTERED' | 'FULL_BLEED' | 'GRID' | 'CUSTOM';
}

const BASE_FONT = 'Pretendard';
const MONO_FONT = 'Monospace';

export const SlideStyleRegistry: Record<SlideStyleType, SlideStyleDefinition> = {
  [SlideStyleType.MainTitle]: {
    id: SlideStyleType.MainTitle,
    displayName: 'Main Title',
    description: 'Impactful entry slide with high-contrast typography.',
    defaultFontFamily: BASE_FONT,
    titleTextStyle: { fontSize: 72, fontWeight: 900, color: '#000000', textAlign: 'left', lineHeight: 1.1 },
    bodyTextStyle: { fontSize: 40, fontWeight: 500, color: '#000000', textAlign: 'left' },
    layoutPreset: 'CUSTOM'
  },
  [SlideStyleType.Strategy]: {
    id: SlideStyleType.Strategy,
    displayName: 'Strategy Framework',
    description: 'Structured layout for narrative pillars and insights.',
    defaultFontFamily: BASE_FONT,
    titleTextStyle: { fontSize: 42, fontWeight: 800, color: '#000000', textAlign: 'left', letterSpacing: -1 },
    bodyTextStyle: { fontSize: 22, fontWeight: 400, color: '#334155', lineHeight: 1.6 },
    layoutPreset: 'TITLE_BODY_IMAGE'
  },
  [SlideStyleType.Concept]: {
    id: SlideStyleType.Concept,
    displayName: 'Core Concept',
    description: 'Minimalist focus on a single message.',
    defaultFontFamily: BASE_FONT,
    titleTextStyle: { fontSize: 64, fontWeight: 900, textAlign: 'center', color: '#000000' },
    layoutPreset: 'CENTERED'
  },
  [SlideStyleType.Standard]: {
    id: SlideStyleType.Standard,
    displayName: 'Standard Content',
    description: 'Balanced text and image layout.',
    defaultFontFamily: BASE_FONT,
    titleTextStyle: { fontSize: 36, fontWeight: 700, color: '#000000' },
    bodyTextStyle: { fontSize: 18, fontWeight: 400, color: '#334155', lineHeight: 1.5 },
    layoutPreset: 'TITLE_BODY'
  },
  [SlideStyleType.Visual]: {
    id: SlideStyleType.Visual,
    displayName: 'Visual Showcase',
    description: 'Full-bleed imagery with optional minimalist overlay.',
    defaultFontFamily: BASE_FONT,
    titleTextStyle: { fontSize: 32, fontWeight: 800, color: '#000000', textAlign: 'center' },
    layoutPreset: 'FULL_BLEED'
  },
  [SlideStyleType.Script]: {
    id: SlideStyleType.Script,
    displayName: 'Script & Dialogue',
    description: 'Formatted for readability of dialogue and scene directions.',
    defaultFontFamily: MONO_FONT,
    titleTextStyle: { fontSize: 28, fontWeight: 700, color: '#000000', fontFamily: BASE_FONT },
    bodyTextStyle: { fontSize: 16, fontWeight: 400, color: '#334155', lineHeight: 1.8, fontFamily: MONO_FONT },
    layoutPreset: 'TITLE_BODY'
  },
  [SlideStyleType.Storyboard]: {
    id: SlideStyleType.Storyboard,
    displayName: 'Storyboard',
    description: 'Sequential shot visualization grid.',
    defaultFontFamily: BASE_FONT,
    titleTextStyle: { fontSize: 24, fontWeight: 800, color: '#000000' },
    captionTextStyle: { fontSize: 11, fontWeight: 500, color: '#64748B', lineHeight: 1.4 },
    layoutPreset: 'GRID'
  },
  [SlideStyleType.DirectionBoard]: {
    id: SlideStyleType.DirectionBoard,
    displayName: 'Direction Assets',
    description: 'Mood board style grid for production assets.',
    defaultFontFamily: BASE_FONT,
    titleTextStyle: { fontSize: 24, fontWeight: 800, color: '#000000' },
    captionTextStyle: { fontSize: 12, fontWeight: 600, textAlign: 'center', color: '#000000' },
    layoutPreset: 'GRID'
  },
  [SlideStyleType.Section]: {
    id: SlideStyleType.Section,
    displayName: 'Section Divider',
    description: 'Visual break between chapters.',
    defaultFontFamily: BASE_FONT,
    titleTextStyle: { fontSize: 52, fontWeight: 900, textAlign: 'center', color: '#000000' },
    layoutPreset: 'CENTERED'
  },
  [SlideStyleType.Slogan]: {
    id: SlideStyleType.Slogan,
    displayName: 'Campaign Slogan',
    description: 'High-impact typographic slogan.',
    defaultFontFamily: BASE_FONT,
    titleTextStyle: { fontSize: 80, fontWeight: 900, textAlign: 'center', fontStyle: 'italic', color: '#000000' },
    layoutPreset: 'CENTERED'
  },
  // Fallbacks
  [SlideStyleType.Schedule]: { id: SlideStyleType.Schedule, displayName: 'Schedule', description: '', defaultFontFamily: BASE_FONT, titleTextStyle: { fontSize: 24, fontWeight: 800, color: '#000000' }, layoutPreset: 'CUSTOM' },
  [SlideStyleType.Estimate]: { id: SlideStyleType.Estimate, displayName: 'Estimate', description: '', defaultFontFamily: BASE_FONT, titleTextStyle: { fontSize: 24, fontWeight: 800, color: '#000000' }, layoutPreset: 'CUSTOM' },
  [SlideStyleType.MiddleTitle]: { id: SlideStyleType.MiddleTitle, displayName: 'Middle Title', description: '', defaultFontFamily: BASE_FONT, titleTextStyle: { fontSize: 40, fontWeight: 800, color: '#000000' }, layoutPreset: 'CENTERED' },
  [SlideStyleType.Category]: { id: SlideStyleType.Category, displayName: 'Category', description: '', defaultFontFamily: BASE_FONT, titleTextStyle: { fontSize: 32, fontWeight: 700, color: '#000000' }, layoutPreset: 'TITLE_BODY' },
  [SlideStyleType.Reference]: { id: SlideStyleType.Reference, displayName: 'Reference', description: '', defaultFontFamily: BASE_FONT, titleTextStyle: { fontSize: 24, fontWeight: 700, color: '#000000' }, layoutPreset: 'GRID' }
};