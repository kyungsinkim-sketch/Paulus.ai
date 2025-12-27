import { DeckDoc, SlideDoc, ElementDoc, ElementType, SlideStyleType, Transform } from '../deck-editor';

/**
 * PHASE 11-B: GOOGLE SLIDES BRIDGE
 * Stateless mapper for importing/exporting between Paulus and Google Slides.
 */

// Mapping point sizes based on common Google Slides defaults
// 16:9 -> 720 x 405 PT
// 4:3  -> 720 x 540 PT
const PAGE_WIDTH = 720;
const PAGE_HEIGHT_16_9 = 405;
const PAGE_HEIGHT_4_3 = 540;

export class GoogleSlidesBridge {
  
  /**
   * EXPORT: DeckDoc -> Google Slides JSON (Request Structure)
   */
  public static exportToGoogleSlides(deck: DeckDoc): any[] {
    const requests: any[] = [];
    const slideHeight = deck.aspectRatio === '4:3' ? PAGE_HEIGHT_4_3 : PAGE_HEIGHT_16_9;

    deck.slides.forEach((slideDoc, index) => {
      const pageId = `paulus_page_${index}_${Date.now()}`;
      
      // 1. Create Slide
      requests.push({
        createSlide: {
          objectId: pageId,
          insertionIndex: index,
          slideLayoutReference: { predefinedLayout: 'BLANK' }
        }
      });

      // 2. Background
      if (slideDoc.background.type === 'color') {
        requests.push({
          updatePageProperties: {
            objectId: pageId,
            pageProperties: {
              pageBackgroundFill: {
                solidFill: { color: this.hexToRgbColor(slideDoc.background.color) }
              }
            },
            fields: 'pageBackgroundFill.solidFill.color'
          }
        });
      }

      // 3. Elements (Flattened)
      const flattenedElements = this.flattenElements(slideDoc.elements);
      flattenedElements.forEach((el, elIndex) => {
        const elementId = `${pageId}_el_${elIndex}`;
        const { x, y, width, height } = el.transform;

        const commonTransform = {
          size: {
            width: { magnitude: (width / 100) * PAGE_WIDTH, unit: 'PT' },
            height: { magnitude: (height / 100) * slideHeight, unit: 'PT' }
          },
          transform: {
            scaleX: 1, scaleY: 1,
            translateX: (x / 100) * PAGE_WIDTH,
            translateY: (y / 100) * slideHeight,
            unit: 'PT'
          }
        };

        if (el.type === ElementType.text && el.text) {
          requests.push({
            createShape: {
              objectId: elementId,
              shapeType: 'TEXT_BOX',
              elementProperties: { pageObjectId: pageId, ...commonTransform }
            }
          });
          requests.push({
            insertText: {
              objectId: elementId,
              text: el.text.content,
              insertionIndex: 0
            }
          });
        } else if (el.type === ElementType.image && el.image) {
          requests.push({
            createImage: {
              objectId: elementId,
              url: el.image.src,
              elementProperties: { pageObjectId: pageId, ...commonTransform }
            }
          });
        }
      });
    });

    return requests;
  }

  /**
   * IMPORT: Google Slides Presentation JSON -> DeckDoc
   * Returns DeckDoc plus metadata for persistence.
   */
  public static importFromGoogleSlides(presentation: any): { deck: DeckDoc, externalMeta: any } {
    // Determine Aspect Ratio based on masters or first page size
    const pageSize = presentation.pageSize || { width: { magnitude: PAGE_WIDTH }, height: { magnitude: PAGE_HEIGHT_16_9 } };
    const importedRatio: '16:9' | '4:3' = Math.abs(pageSize.height.magnitude - PAGE_HEIGHT_4_3) < 10 ? '4:3' : '16:9';
    const slideHeight = importedRatio === '4:3' ? PAGE_HEIGHT_4_3 : PAGE_HEIGHT_16_9;

    const deck: DeckDoc = {
      id: `gs_import_${Date.now()}`,
      aspectRatio: importedRatio,
      theme: {
        primaryColor: '#000000',
        secondaryColor: '#FFFFFF',
        bgColor: '#FFFFFF',
        textColor: '#000000',
        fontFamilyPrimary: 'Arial',
        fontFamilySecondary: 'Arial',
        defaultTextStyles: {}
      },
      defaults: {
        showFooterLeftTitleClient: false,
        showHeaderLeftSectionTitle: false,
        showFooterRightPageNumber: true,
        showHeaderRightBrandMark: false
      },
      slides: []
    };

    const pages = presentation.slides || [];
    deck.slides = pages.map((page: any, index: number) => {
      const slideDoc: SlideDoc = {
        id: page.objectId,
        styleType: SlideStyleType.Standard,
        background: { type: 'color', color: '#FFFFFF' },
        meta: { sectionTitle: `Imported Slide ${index + 1}` },
        overrides: {},
        elements: []
      };

      // Map Background
      if (page.pageProperties?.pageBackgroundFill?.solidFill?.color?.rgbColor) {
        slideDoc.background = { 
            type: 'color', 
            color: this.rgbToHexColor(page.pageProperties.pageBackgroundFill.solidFill.color.rgbColor) 
        };
      }

      // Map Elements
      (page.pageElements || []).forEach((el: any) => {
        const transform: Transform = {
          x: (el.transform?.translateX || 0) / PAGE_WIDTH * 100,
          y: (el.transform?.translateY || 0) / slideHeight * 100,
          width: (el.size?.width?.magnitude || 100) / PAGE_WIDTH * 100,
          height: (el.size?.height?.magnitude || 100) / slideHeight * 100,
          rotation: 0
        };

        if (el.shape?.shapeType === 'TEXT_BOX') {
          const content = el.shape.text?.textElements?.map((te: any) => te.textRun?.content || '').join('') || '';
          slideDoc.elements.push({
            id: el.objectId,
            type: ElementType.text,
            transform,
            zIndex: slideDoc.elements.length,
            opacity: 1,
            hidden: false,
            locked: false,
            text: {
              content,
              style: {
                fontSize: 14,
                fontFamily: 'Arial',
                fontWeight: 'normal',
                fontStyle: 'normal',
                color: '#000000',
                textAlign: 'left',
                lineHeight: 1.2,
                letterSpacing: 0
              }
            }
          });
        } else if (el.image) {
          slideDoc.elements.push({
            id: el.objectId,
            type: ElementType.image,
            transform,
            zIndex: slideDoc.elements.length,
            opacity: 1,
            hidden: false,
            locked: false,
            image: {
              src: el.image.contentUrl || '',
              alt: 'Imported Image',
              objectFit: 'contain'
            }
          });
        }
      });

      return slideDoc;
    });

    return { 
        deck, 
        externalMeta: {
            origin: 'GOOGLE_SLIDES',
            presentationId: presentation.presentationId,
            importedAt: new Date().toISOString()
        } 
    };
  }

  /**
   * Flattening logic for Grids -> Absolute positioning
   */
  private static flattenElements(elements: ElementDoc[], parentTransform?: Transform): ElementDoc[] {
    const result: ElementDoc[] = [];

    elements.forEach(el => {
      const absTransform: Transform = parentTransform ? {
        x: parentTransform.x + (el.transform.x * parentTransform.width / 100),
        y: parentTransform.y + (el.transform.y * parentTransform.height / 100),
        width: el.transform.width * parentTransform.width / 100,
        height: el.transform.height * parentTransform.height / 100,
        rotation: el.transform.rotation + (parentTransform.rotation || 0)
      } : { ...el.transform };

      if (el.type === ElementType.grid && el.grid) {
        const { columns, rows, gap } = el.grid;
        const gapPct = (gap / 1000) * 100;
        const cellW = (100 - (columns - 1) * gapPct) / columns;
        const cellH = (100 - (rows - 1) * gapPct) / rows;

        el.grid.items.forEach((item, index) => {
          const col = index % columns;
          const row = Math.floor(index / columns);
          const itemTransform: Transform = {
            x: col * (cellW + gapPct),
            y: row * (cellH + gapPct),
            width: cellW,
            height: cellH,
            rotation: 0
          };
          const subFlattened = this.flattenElements(item.elements, {
            x: absTransform.x + (itemTransform.x * absTransform.width / 100),
            y: absTransform.y + (itemTransform.y * absTransform.height / 100),
            width: itemTransform.width * absTransform.width / 100,
            height: itemTransform.height * absTransform.height / 100,
            rotation: 0
          });
          result.push(...subFlattened);
        });
      } else {
        result.push({ ...el, transform: absTransform });
      }
    });

    return result;
  }

  private static hexToRgbColor(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { rgbColor: { red: r, green: g, blue: b } };
  }

  private static rgbToHexColor(rgb: any): string {
    const toHex = (c: number) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(rgb.red || 0)}${toHex(rgb.green || 0)}${toHex(rgb.blue || 0)}`;
  }
}
