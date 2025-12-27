
import { Project, Slide, ContentBlock, TextBlock, ImageBlock } from '../types';
import { 
  DeckDoc, 
  SlideDoc, 
  ElementDoc, 
  ElementType, 
  SlideStyleType, 
  SlideBackground 
} from '../deck-editor';
import { spawnElements } from './slideSpawnerService';

/**
 * PAULUS.AI — RESTORE R3
 * deckLegacyAdapter.ts
 * 
 * Maps legacy Project/Slide structures into the canonical DeckDoc format.
 */

export class DeckLegacyAdapter {
  
  public static toCanonicalDeck(project: Project): DeckDoc {
    return {
      id: project.deck.id,
      aspectRatio: '16:9',
      theme: {
        primaryColor: '#3b82f6',
        secondaryColor: '#1e293b',
        bgColor: '#ffffff',
        textColor: '#000000',
        fontFamilyPrimary: 'Pretendard',
        fontFamilySecondary: 'Inter',
        defaultTextStyles: {}
      },
      defaults: {
        showFooterLeftTitleClient: true,
        showHeaderLeftSectionTitle: true,
        showFooterRightPageNumber: true,
        showHeaderRightBrandMark: true
      },
      slides: project.deck.slides.map(s => this.toCanonicalSlide(s, project.client, project.title))
    };
  }

  private static toCanonicalSlide(legacySlide: Slide, clientName: string, projectTitle: string): SlideDoc {
    const styleType = this.mapTypeToStyle(legacySlide.type);
    
    const meta = {
      sectionTitle: legacySlide.title,
      proposalTitle: projectTitle,
      clientName: clientName
    };

    // Extract basic content blocks for spawner payload
    const titleBlock = legacySlide.blocks.find(b => b.type === 'TITLE') as TextBlock;
    const bodyBlock = legacySlide.blocks.find(b => b.type === 'BODY_TEXT') as TextBlock;
    
    // Create base canonical skeleton (R3-A Semantic)
    // R17: Pass clientName as subtitle for MainTitle slides
    const spawnedElements = spawnElements(styleType, {
      title: titleBlock?.content.text || legacySlide.title,
      body: bodyBlock?.content.text,
      subtitle: clientName
    });

    // Map any additional free-floating blocks
    const customElements = this.mapBlocksToElements(legacySlide.blocks.filter(b => 
      b.type !== 'TITLE' && b.type !== 'BODY_TEXT'
    ));

    // R3 Fix: Correct union mapping for SlideBackground
    const background: SlideBackground = legacySlide.backgroundImage 
      ? { type: 'image', imageAssetId: legacySlide.backgroundImage }
      : { type: 'color', color: legacySlide.backgroundColor || '#ffffff' };

    return {
      id: legacySlide.id,
      styleType,
      background,
      meta,
      overrides: {},
      elements: [...spawnedElements, ...customElements]
    };
  }

  private static mapTypeToStyle(type: string): SlideStyleType {
    switch (type) {
      case 'COVER': return SlideStyleType.MainTitle;
      case 'AGENDA': return SlideStyleType.Standard;
      case 'SECTION_DIVIDER': return SlideStyleType.Section;
      case 'CONCEPT': return SlideStyleType.Concept;
      case 'KEY_MESSAGE': return SlideStyleType.Slogan;
      case 'STRATEGY': return SlideStyleType.Strategy;
      case 'SCRIPT': return SlideStyleType.Script;
      case 'VISUAL_REFERENCE': return SlideStyleType.Reference;
      case 'STORYBOARD': return SlideStyleType.Storyboard;
      case 'VISUAL': return SlideStyleType.Visual;
      case 'DIRECTION': return SlideStyleType.DirectionBoard;
      default: return SlideStyleType.Standard;
    }
  }

  private static mapBlocksToElements(blocks: ContentBlock[]): ElementDoc[] {
    return blocks.map((block, idx) => {
      if (block.type === 'IMAGE') {
        const img = block as ImageBlock;
        return {
          id: img.id || `el-img-${idx}`,
          type: ElementType.image,
          transform: { 
            x: img.content.formatting?.left ?? 10, 
            y: img.content.formatting?.top ?? 10, 
            width: img.content.formatting?.width ?? 40, 
            height: img.content.formatting?.height ?? 40, 
            rotation: 0 
          },
          zIndex: 10 + idx, opacity: 1, hidden: false, locked: false,
          image: { src: img.content.url, alt: 'Block Image', objectFit: 'cover' }
        };
      }
      return null;
    }).filter(Boolean) as ElementDoc[];
  }
}
