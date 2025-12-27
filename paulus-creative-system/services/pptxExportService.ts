import { DeckDoc, SlideDoc, ElementDoc, ElementType, Transform } from '../deck-editor';

/**
 * PHASE 11: PPTX EXPORT ENGINE
 * Converts the canonical DeckDoc into a .pptx file for client-side download.
 */

// Declare PptxGenJS as it's loaded via script tag in index.html
declare const pptxgen: any;

interface FlattenedElement {
  type: ElementType;
  transform: Transform;
  content?: any;
}

export class PptxExportEngine {
  /**
   * Main entry point to export a deck
   */
  public async exportDeck(deck: DeckDoc): Promise<void> {
    const pres = new pptxgen();

    // 1. Set Aspect Ratio
    if (deck.aspectRatio === '4:3') {
      pres.layout = 'LAYOUT_4x3';
    } else {
      pres.layout = 'LAYOUT_16x9';
    }

    // 2. Process Slides
    for (const slideDoc of deck.slides) {
      const slide = pres.addSlide();

      // Background
      if (slideDoc.background.type === 'color') {
        slide.background = { fill: slideDoc.background.color.replace('#', '') };
      } else if (slideDoc.background.type === 'image') {
        // Note: imageAssetId lookup would happen here. 
        // In this implementation, we assume URL or base64 if available.
        // For now, mapping to a default placeholder if asset resolution isn't implemented.
      }

      // Flatten nested elements (Grids -> Atomic)
      const flattened = this.flattenSlideElements(slideDoc.elements);

      // 3. Add Elements
      for (const el of flattened) {
        this.addElementToSlide(slide, el);
      }
    }

    // 4. Save/Download
    const fileName = `${deck.id || 'PAULUS_Deck'}_${new Date().getTime()}.pptx`;
    await pres.writeFile({ fileName });
  }

  /**
   * Recursively flattens nested elements (Grids, Groups) into absolute slide coordinates.
   */
  private flattenSlideElements(elements: ElementDoc[], parentTransform?: Transform): FlattenedElement[] {
    const result: FlattenedElement[] = [];

    elements.forEach(el => {
      if (el.hidden) return;

      // Calculate absolute transform relative to slide (0-100 range)
      const absTransform: Transform = parentTransform ? {
        x: parentTransform.x + (el.transform.x * parentTransform.width / 100),
        y: parentTransform.y + (el.transform.y * parentTransform.height / 100),
        width: el.transform.width * parentTransform.width / 100,
        height: el.transform.height * parentTransform.height / 100,
        rotation: el.transform.rotation + (parentTransform.rotation || 0)
      } : { ...el.transform };

      if (el.type === ElementType.grid && el.grid) {
        // Flatten Grid Items
        const { columns, rows, gap } = el.grid;
        // Approximation: gap is in percentage points of the grid size
        // If gap is '20' in spawner, and stage is 100, that's 2%.
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

          // Recursively flatten elements inside the grid item
          const subFlattened = this.flattenSlideElements(item.elements, {
            x: absTransform.x + (itemTransform.x * absTransform.width / 100),
            y: absTransform.y + (itemTransform.y * absTransform.height / 100),
            width: itemTransform.width * absTransform.width / 100,
            height: itemTransform.height * absTransform.height / 100,
            rotation: 0
          });
          result.push(...subFlattened);
        });
      } else if (el.type === ElementType.group && el.group) {
         // Logic for logically calculating children's absolute positions
         // In current DeckDoc, children are already in slide space mostly, 
         // but if Phase 8 nesting is implemented, we'd recurse here.
      } else {
        // Atomic Element
        result.push({
          type: el.type,
          transform: absTransform,
          content: el.text || el.image || el.videoThumb
        });
      }
    });

    return result;
  }

  /**
   * Maps a flattened element to a PptxGenJS slide object
   */
  private addElementToSlide(slide: any, el: FlattenedElement): void {
    const { x, y, width, height, rotation } = el.transform;
    const commonProps = {
      x: `${x}%`,
      y: `${y}%`,
      w: `${width}%`,
      h: `${height}%`,
      rotate: rotation
    };

    switch (el.type) {
      case ElementType.text:
        if (el.content) {
          const style = el.content.style;
          slide.addText(el.content.content, {
            ...commonProps,
            fontSize: style.fontSize,
            fontFace: style.fontFamily || 'Arial',
            color: style.color.replace('#', ''),
            align: style.textAlign,
            bold: style.fontWeight === 'bold' || style.fontWeight >= 700,
            italic: style.fontStyle === 'italic',
            lineSpacing: style.lineHeight * 10, // heuristic conversion
            valign: 'top'
          });
        }
        break;

      case ElementType.image:
        if (el.content && el.content.src) {
          slide.addImage({
            path: el.content.src,
            ...commonProps,
            sizing: { 
              type: el.content.objectFit === 'cover' ? 'crop' : 'contain' 
            }
          });
        }
        break;

      case ElementType.videoThumb:
        // PPTX Export creates a high-visibility placeholder for video
        slide.addText("[ VIDEO CONTENT ]", {
          ...commonProps,
          fill: { color: '000000' },
          color: 'FFFFFF',
          fontSize: 14,
          align: 'center',
          valign: 'middle'
        });
        break;
    }
  }
}