
import * as Y from 'yjs';
import { 
  DeckDoc, 
  SlideDoc, 
  ElementDoc, 
  ElementType, 
  SlideStyleType,
  DeckTheme,
  DeckDefaults,
  TextStyle,
  SlideBackground,
  Transform
} from '../deck-editor';
import { spawnElements } from './slideSpawnerService';

/**
 * PAULUS.AI — RESTORE R3–R9
 * deckYjsService.ts
 * 
 * Engine responsible for atomic Yjs mutations.
 */
export class DeckYjsAdapter {
  public doc: Y.Doc;
  public undoManager: Y.UndoManager;

  private rootMeta: Y.Map<any>;
  private theme: Y.Map<any>;
  private defaults: Y.Map<any>;
  private slides: Y.Array<Y.Map<any>>;

  constructor() {
    this.doc = new Y.Doc();
    this.rootMeta = this.doc.getMap('rootMeta');
    this.theme = this.doc.getMap('theme');
    this.defaults = this.doc.getMap('defaults');
    this.slides = this.doc.getArray('slides');
    this.undoManager = new Y.UndoManager([this.rootMeta, this.theme, this.defaults, this.slides]);
  }

  public transact(fn: () => void): void {
    this.doc.transact(fn);
  }

  public addSlide(styleType: SlideStyleType, insertIndex?: number): string {
    const id = `slide-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    this.doc.transact(() => {
      const slideMap = new Y.Map();
      slideMap.set('id', id);
      slideMap.set('styleType', styleType);
      
      const bgMap = new Y.Map();
      bgMap.set('type', 'color');
      bgMap.set('color', '#ffffff');
      slideMap.set('background', bgMap);
      
      const metaMap = new Y.Map();
      metaMap.set('sectionTitle', styleType);
      slideMap.set('meta', metaMap);
      
      const elementsArray = new Y.Array();
      const spawned = spawnElements(styleType);
      elementsArray.push(spawned.map(e => this.mapElementToYjs(e)));
      slideMap.set('elements', elementsArray);

      const targetIndex = insertIndex !== undefined ? insertIndex : this.slides.length;
      this.slides.insert(targetIndex, [slideMap]);
    });
    return id;
  }

  public updateTheme(patch: Partial<DeckTheme>): void {
    this.doc.transact(() => {
      Object.entries(patch).forEach(([k, v]) => {
        if (v !== undefined) this.theme.set(k, v);
      });
    });
  }

  public updateDeckDefaults(patch: Partial<DeckDefaults>): void {
    this.doc.transact(() => {
      Object.entries(patch).forEach(([k, v]) => {
        if (v !== undefined) this.defaults.set(k, v);
      });
    });
  }

  public updateSlideBackground(slideIndex: number, background: SlideBackground): void {
    this.doc.transact(() => {
      const slideMap = this.slides.get(slideIndex);
      if (slideMap) {
        const bgMap = new Y.Map();
        bgMap.set('type', background.type);
        if (background.type === 'color') bgMap.set('color', background.color);
        if (background.type === 'image') bgMap.set('imageAssetId', background.imageAssetId);
        slideMap.set('background', bgMap);
      }
    });
  }

  public reorderSlide(fromIndex: number, toIndex: number): void {
    this.doc.transact(() => {
      if (fromIndex < 0 || fromIndex >= this.slides.length) return;
      if (toIndex < 0 || toIndex >= this.slides.length) return;
      const item = this.slides.get(fromIndex);
      this.slides.delete(fromIndex, 1);
      this.slides.insert(toIndex, [item]);
    });
  }

  public updateElementTransform(slideIndex: number, elementId: string, next: Partial<Transform>): void {
    this.doc.transact(() => {
      const slideMap = this.slides.get(slideIndex);
      if (!slideMap) return;
      
      const elementsArray = slideMap.get('elements') as Y.Array<Y.Map<any>>;
      const elementMap = this.recursiveFindElement(elementsArray, elementId);
      
      if (elementMap) {
        if (elementMap.get('locked') || elementMap.get('hidden')) return;
        
        const transformMap = elementMap.get('transform') as Y.Map<any>;
        if (transformMap) {
          const currentW = transformMap.get('width') || 2;
          const currentH = transformMap.get('height') || 2;
          const nextW = next.width !== undefined ? Math.max(2, Math.min(100, next.width)) : currentW;
          const nextH = next.height !== undefined ? Math.max(2, Math.min(100, next.height)) : currentH;

          if (next.width !== undefined) transformMap.set('width', nextW);
          if (next.height !== undefined) transformMap.set('height', nextH);

          if (next.x !== undefined) {
            const clampedX = Math.max(0, Math.min(100 - nextW, next.x));
            transformMap.set('x', clampedX);
          }
          if (next.y !== undefined) {
            const clampedY = Math.max(0, Math.min(100 - nextH, next.y));
            transformMap.set('y', clampedY);
          }
          if (next.rotation !== undefined) {
            transformMap.set('rotation', next.rotation);
          }
        }
      }
    });
  }

  public batchUpdateTransforms(slideIndex: number, updates: Array<{ id: string; transform: Partial<Transform> }>): void {
    this.doc.transact(() => {
      updates.forEach(u => this.updateElementTransform(slideIndex, u.id, u.transform));
    });
  }

  public updateTextStyle(elementId: string, next: Partial<TextStyle>): void {
    this.doc.transact(() => {
      const elementMap = this.findElementById(elementId);
      if (elementMap && elementMap.get('type') === ElementType.text) {
        if (elementMap.get('locked') || elementMap.get('hidden')) return;
        
        const textMap = elementMap.get('text') as Y.Map<any>;
        if (textMap) {
          const styleMap = textMap.get('style') as Y.Map<any>;
          if (styleMap) {
            Object.entries(next).forEach(([k, v]) => {
              if (v !== undefined) styleMap.set(k, v);
            });
          }
        }
      }
    });
  }

  public replaceMediaSource(elementId: string, newSrc: string): void {
    this.doc.transact(() => {
      const elementMap = this.findElementById(elementId);
      if (!elementMap) return;
      if (elementMap.get('locked') || elementMap.get('hidden')) return;

      const type = elementMap.get('type') as ElementType;
      if (type === ElementType.image) {
        const image = elementMap.get('image') as Y.Map<any>;
        if (image) image.set('src', newSrc);
      } else if (type === ElementType.videoThumb) {
        const video = elementMap.get('videoThumb') as Y.Map<any>;
        if (video) video.set('src', newSrc);
      }
    });
  }

  public updateZOrder(slideIndex: number, elementId: string, action: 'FRONT' | 'BACK'): void {
    this.doc.transact(() => {
      const slideMap = this.slides.get(slideIndex);
      if (!slideMap) return;
      const elementsArray = slideMap.get('elements') as Y.Array<Y.Map<any>>;
      const elements = elementsArray.toArray();
      const currentIndex = elements.findIndex(el => el.get('id') === elementId);
      if (currentIndex === -1) return;

      const target = elements[currentIndex];
      elementsArray.delete(currentIndex, 1);
      if (action === 'FRONT') {
        elementsArray.push([target]);
      } else {
        elementsArray.insert(0, [target]);
      }
      elementsArray.forEach((el, idx) => el.set('zIndex', idx));
    });
  }

  public applySlideStyle(slideIndex: number, nextStyleType: SlideStyleType): void {
    this.doc.transact(() => {
      const slideMap = this.slides.get(slideIndex);
      if (!slideMap) return;
      slideMap.set('styleType', nextStyleType);
      const newElements = spawnElements(nextStyleType);
      const elementsArray = slideMap.get('elements') as Y.Array<Y.Map<any>>;
      elementsArray.delete(0, elementsArray.length);
      elementsArray.push(newElements.map(e => this.mapElementToYjs(e)));
    });
  }

  public updateTextContent(elementId: string, content: string): void {
    this.doc.transact(() => {
      const elementMap = this.findElementById(elementId);
      if (elementMap && elementMap.get('type') === ElementType.text) {
        const text = elementMap.get('text') as Y.Map<any>;
        if (text) text.set('content', content);
      }
    });
  }

  public updateElementMeta(elementId: string, updates: Partial<Pick<ElementDoc, 'hidden' | 'locked' | 'zIndex' | 'opacity'>>): void {
    this.doc.transact(() => {
      const elementMap = this.findElementById(elementId);
      if (elementMap) {
        Object.entries(updates).forEach(([k, v]) => elementMap.set(k, v));
      }
    });
  }

  public duplicateElement(slideIndex: number, elementId: string): string | null {
    let newId: string | null = null;
    this.doc.transact(() => {
      const slideMap = this.slides.get(slideIndex);
      const elementMap = this.findElementById(elementId);
      if (slideMap && elementMap) {
        const json = elementMap.toJSON() as ElementDoc;
        newId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const duplicated: ElementDoc = {
          ...json,
          id: newId,
          transform: { ...json.transform, x: json.transform.x + 2, y: json.transform.y + 2 },
          zIndex: json.zIndex + 1
        };
        const elementsArray = slideMap.get('elements') as Y.Array<Y.Map<any>>;
        elementsArray.push([this.mapElementToYjs(duplicated)]);
      }
    });
    return newId;
  }

  public deleteElementsFromSlide(slideIndex: number, elementIds: string[]): void {
    this.doc.transact(() => {
      const slideMap = this.slides.get(slideIndex);
      if (slideMap) {
        const elementsArray = slideMap.get('elements') as Y.Array<Y.Map<any>>;
        let i = 0;
        while (i < elementsArray.length) {
          const elMap = elementsArray.get(i);
          if (elementIds.includes(elMap.get('id'))) {
            elementsArray.delete(i, 1);
          } else {
            i++;
          }
        }
      }
    });
  }

  private findElementById(id: string): Y.Map<any> | null {
    for (const slide of this.slides) {
      const elements = slide.get('elements') as Y.Array<Y.Map<any>>;
      const found = this.recursiveFindElement(elements, id);
      if (found) return found;
    }
    return null;
  }

  private recursiveFindElement(arr: Y.Array<Y.Map<any>>, id: string): Y.Map<any> | null {
    for (const elMap of arr) {
      if (elMap.get('id') === id) return elMap;
      if (elMap.get('type') === ElementType.grid) {
        const grid = elMap.get('grid') as Y.Map<any>;
        if (grid) {
          const items = grid.get('items') as Y.Array<Y.Map<any>>;
          for (const itemMap of items) {
            const subElements = itemMap.get('elements') as Y.Array<Y.Map<any>>;
            const found = this.recursiveFindElement(subElements, id);
            if (found) return found;
          }
        }
      }
    }
    return null;
  }

  public loadFromJSON(json: DeckDoc): void {
    this.doc.transact(() => {
      this.rootMeta.set('id', json.id);
      this.rootMeta.set('aspectRatio', json.aspectRatio);
      const t = json.theme;
      this.theme.set('primaryColor', t.primaryColor);
      this.theme.set('secondaryColor', t.secondaryColor);
      this.theme.set('bgColor', t.bgColor);
      this.theme.set('textColor', t.textColor);
      this.theme.set('fontFamilyPrimary', t.fontFamilyPrimary);
      this.theme.set('fontFamilySecondary', t.fontFamilySecondary);
      const d = json.defaults;
      this.defaults.set('showFooterLeftTitleClient', d.showFooterLeftTitleClient);
      this.defaults.set('showHeaderLeftSectionTitle', d.showHeaderLeftSectionTitle);
      this.defaults.set('showFooterRightPageNumber', d.showFooterRightPageNumber);
      this.defaults.set('showHeaderRightBrandMark', d.showHeaderRightBrandMark);
      this.slides.delete(0, this.slides.length);
      this.slides.push(json.slides.map(s => this.mapSlideToYjs(s)));
    });
  }

  public exportToJSON(): DeckDoc {
    const meta = this.rootMeta.toJSON();
    return {
      id: meta.id,
      aspectRatio: meta.aspectRatio || '16:9',
      theme: this.theme.toJSON() as DeckTheme,
      defaults: this.defaults.toJSON() as DeckDefaults,
      slides: this.slides.toArray().map(s => s.toJSON()) as SlideDoc[]
    };
  }

  private mapSlideToYjs(json: SlideDoc): Y.Map<any> {
    const slideMap = new Y.Map();
    slideMap.set('id', json.id);
    slideMap.set('styleType', json.styleType);
    const bgMap = new Y.Map();
    bgMap.set('type', json.background.type);
    if (json.background.type === 'color') bgMap.set('color', json.background.color);
    if (json.background.type === 'image') bgMap.set('imageAssetId', json.background.imageAssetId);
    slideMap.set('background', bgMap);
    const metaMap = new Y.Map();
    Object.entries(json.meta).forEach(([k, v]) => metaMap.set(k, v));
    slideMap.set('meta', metaMap);
    const elementsArray = new Y.Array();
    elementsArray.push(json.elements.map(e => this.mapElementToYjs(e)));
    slideMap.set('elements', elementsArray);
    return slideMap;
  }

  private mapElementToYjs(json: ElementDoc): Y.Map<any> {
    const elementMap = new Y.Map();
    elementMap.set('id', json.id);
    elementMap.set('type', json.type);
    elementMap.set('zIndex', json.zIndex);
    elementMap.set('opacity', json.opacity);
    elementMap.set('hidden', json.hidden);
    elementMap.set('locked', json.locked);
    const transMap = new Y.Map();
    Object.entries(json.transform).forEach(([k, v]) => transMap.set(k, v));
    elementMap.set('transform', transMap);
    if (json.text) {
      const textMap = new Y.Map();
      textMap.set('content', json.text.content);
      const styleMap = new Y.Map();
      Object.entries(json.text.style).forEach(([k, v]) => styleMap.set(k, v));
      textMap.set('style', styleMap);
      elementMap.set('text', textMap);
    }
    if (json.image) {
      const imgMap = new Y.Map();
      Object.entries(json.image).forEach(([k, v]) => imgMap.set(k, v));
      elementMap.set('image', imgMap);
    }
    if (json.grid) {
      const gridMap = new Y.Map();
      gridMap.set('columns', json.grid.columns);
      gridMap.set('rows', json.grid.rows);
      gridMap.set('gap', json.grid.gap);
      const itemsArray = new Y.Array();
      itemsArray.push(json.grid.items.map(item => {
        const itemMap = new Y.Map();
        itemMap.set('id', item.id);
        const subElementsArray = new Y.Array();
        subElementsArray.push(item.elements.map(se => this.mapElementToYjs(se)));
        itemMap.set('elements', subElementsArray);
        return itemMap;
      }));
      gridMap.set('items', itemsArray);
      elementMap.set('grid', gridMap);
    }
    return elementMap;
  }
}
