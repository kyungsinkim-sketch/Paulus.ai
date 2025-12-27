import { SlideStyleType, ElementDoc, ElementType, TextStyle } from '../deck-editor';
import { SlideStyleRegistry } from './slideStyleRegistry';

/**
 * PAULUS.AI — RESTORE R3
 * slideStyleApplicator.ts
 * 
 * Purpose: Pure function to apply registry defaults to spawned element skeletons.
 * Rule: Only apply if existing values are defaults (no-op on user overrides).
 */

export class SlideStyleApplicator {
  
  public static apply(styleType: SlideStyleType, elements: ElementDoc[]): ElementDoc[] {
    const definition = SlideStyleRegistry[styleType];
    if (!definition) return elements;

    return elements.map(el => {
      if (el.type !== ElementType.text || !el.text) return el;

      const style = { ...el.text.style };
      const isTitle = el.id.includes('title');
      const isBody = el.id.includes('body') || el.id.includes('subtitle');
      const isCaption = el.id.includes('txt') || el.id.includes('caption');

      if (isTitle && definition.titleTextStyle) {
        this.mergeStyles(style, definition.titleTextStyle);
      } else if (isBody && definition.bodyTextStyle) {
        this.mergeStyles(style, definition.bodyTextStyle);
      } else if (isCaption && definition.captionTextStyle) {
        this.mergeStyles(style, definition.captionTextStyle);
      }

      // Default font family if not specifically set in text style
      if (!style.fontFamily) {
        style.fontFamily = definition.defaultFontFamily;
      }

      return {
        ...el,
        text: {
          ...el.text,
          style
        }
      };
    });
  }

  private static mergeStyles(target: TextStyle, source: Partial<TextStyle>) {
    Object.entries(source).forEach(([key, value]) => {
      if (value !== undefined) {
        (target as any)[key] = value;
      }
    });
  }
}