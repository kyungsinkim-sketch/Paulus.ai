// --- CORE TYPES (MOVED FROM types.ts TO BREAK CIRCULARITY) ---

export type Language = 'EN' | 'KO';

export interface BilingualContent {
  EN?: string;
  KO?: string;
  sourceHash?: string;
  lastTranslatedAt?: string;
  [key: string]: string | undefined;
}

export type SyncStatus = 'SYNCED' | 'OUT_OF_SYNC';

// --- ENUMS ---

export enum SlideStyleType {
  MainTitle = 'MainTitle',
  Standard = 'Standard',
  Slogan = 'Slogan',
  Visual = 'Visual',
  Script = 'Script',
  Storyboard = 'Storyboard',
  DirectionBoard = 'DirectionBoard',
  Schedule = 'Schedule',
  Estimate = 'Estimate',
  MiddleTitle = 'MiddleTitle',
  Section = 'Section',
  Concept = 'Concept',
  Category = 'Category',
  Reference = 'Reference',
  Strategy = 'Strategy'
}

export enum ElementType {
  text = 'text',
  image = 'image',
  shape = 'shape',
  group = 'group',
  grid = 'grid',
  videoThumb = 'videoThumb'
}

// --- PHASE 12 & Y: COMMENT MODELS ---

export interface CommentDoc {
  id: string;
  authorName: string;
  content: string;
  timestamp: string;
  elementId?: string; // Optional: link to specific element
  slideId: string;
  position?: { x: number; y: number }; // Percentage position on slide
  status: 'open' | 'resolved'; // PHASE Y: Resolution status
}

// --- PHASE Y & 11-B: VERSIONING MODELS ---

export type DeckVersionStatus = 'draft' | 'approved' | 'archived';

export interface DeckVersion {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  deckSnapshot: DeckDoc;
  status: DeckVersionStatus;
  meta?: {
    origin?: 'INTERNAL' | 'GOOGLE_SLIDES';
    externalPresentationId?: string;
    importedAt?: string;
    exportedAt?: string;
  };
}

// --- PHASE 10: ATOMIC ELEMENT MODELS ---

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  fontStyle: string;
  color: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  letterSpacing: number;
  textDecoration?: string; // R3: Added for underline support
}

export interface TextElement {
  content: string;
  style: TextStyle;
}

export interface ImageElement {
  src: string;
  alt: string;
  objectFit: 'cover' | 'contain' | 'fill';
}

export interface VideoThumbElement {
  src: string;
  thumbnailTime: number;
}

export interface GridItem {
  id: string;
  elements: ElementDoc[];
}

export interface GridElement {
  columns: number;
  rows: number;
  gap: number;
  items: GridItem[];
}

// PHASE 8: Group Element logical structure
export interface GroupElement {
  childIds: string[];
}

export interface ElementDoc {
  id: string;
  type: ElementType;
  transform: Transform;
  zIndex: number;
  opacity: number;
  hidden: boolean;
  locked: boolean;
  text?: TextElement;
  image?: ImageElement;
  grid?: GridElement;
  videoThumb?: VideoThumbElement;
  group?: GroupElement; // PHASE 8
}

// --- CANONICAL SLIDE & DECK MODELS (PHASE 10) ---

export type SlideBackground = 
  | { type: 'color'; color: string }
  | { type: 'image'; imageAssetId: string };

export interface SlideMeta {
  sectionTitle?: string;
  proposalTitle?: string;
  clientName?: string;
}

export interface SlideOverrides {
  themeId?: string;
  background?: SlideBackground;
}

export interface SlideDoc {
  id: string;
  styleType: SlideStyleType;
  background: SlideBackground;
  meta: SlideMeta;
  overrides: SlideOverrides;
  elements: ElementDoc[];
}

export interface DeckDefaults {
  showFooterLeftTitleClient: boolean;
  showHeaderLeftSectionTitle: boolean;
  showFooterRightPageNumber: boolean;
  showHeaderRightBrandMark: boolean;
}

export interface DeckTheme {
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  textColor: string;
  fontFamilyPrimary: string;
  fontFamilySecondary: string;
  defaultTextStyles: Record<string, any>;
  bgImage?: string; // R12: Added for deck-level background image default
}

export interface DeckDoc {
  id: string;
  aspectRatio: '16:9' | '4:3';
  theme: DeckTheme;
  defaults: DeckDefaults;
  slides: SlideDoc[];
}

// --- BLOCK-BASED MODELS (ADDITION) ---

export interface TextBlockFormatting {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: number;
  fontStyle?: 'normal' | 'italic';
  fontWeight?: 'normal' | 'bold';
  color?: string;
  top?: number;
  left?: number;
  width?: number;
  height?: number;
  fontFamily?: string;
}

export interface TextBlock {
  id: string;
  type: 'TITLE' | 'BODY_TEXT';
  content: {
    text: string;
    formatting?: TextBlockFormatting;
  };
  bilingualContent?: BilingualContent;
  generatedBy?: string;
}

export interface ImageBlock {
  id: string;
  type: 'IMAGE';
  content: {
    url: string;
    formatting?: {
      top?: number;
      left?: number;
      width?: number;
      height?: number;
    };
  };
}

export interface StoryboardFrameBlock {
  id: string;
  type: 'STORYBOARD_FRAME';
  frameIndex: number;
  content: {
    caption?: string;
    dialogue?: string;
    shotType?: string;
    imageUrl?: string;
    aiPrompt?: string;
  };
  bilingualCaption?: BilingualContent;
}

export type ContentBlock = TextBlock | ImageBlock | StoryboardFrameBlock;

export interface DeckEvent {
  id: string;
  type: 'SLIDE_ADDED' | 'SLIDE_REMOVED' | 'SLIDE_UPDATED' | 'SYNC_ACTION';
  targetId: string;
  sourceId: string;
  userId: string;
  timestamp: string;
  details: string;
}

// --- LEGACY MODELS ---
export type SlideType = 'COVER' | 'AGENDA' | 'SECTION_DIVIDER' | 'CONCEPT' | 'KEY_MESSAGE' | 'STRATEGY' | 'SCRIPT' | 'VISUAL_REFERENCE' | 'STORYBOARD' | 'VISUAL' | 'DIRECTION';

export interface Slide {
  id: string;
  pageNumber: number;
  title: string;
  type: SlideType;
  layout: string;
  blocks: ContentBlock[];
  isFinal: boolean;
  createdBy?: string;
  sourceReference?: { type: string; id: string };
  isDraft?: boolean;
  backgroundColor?: string;
  backgroundImage?: string;
  syncStatus?: SyncStatus;
  generatedBy?: string;
}

export interface Deck {
  id: string;
  projectId: string;
  title: string;
  slides: Slide[];
  history: DeckEvent[];
}