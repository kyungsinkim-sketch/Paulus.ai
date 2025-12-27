
import React, { useRef, useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CanvasItem, CanvasConnection, User, Language, CanvasItemStyle } from '../types';
import CanvasSidePanel from './CanvasSidePanel';
import { rewriteText, summarizeTexts } from '../services/geminiService';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Image as ImageIcon,
  Presentation,
  Trash2,
  Scaling,
  Layers,
  Link as LinkIcon,
  ArrowUpRight,
  MoreVertical,
  Type,
  Palette,
  Minimize2
} from 'lucide-react';

interface CreativeCanvasProps {
  items: CanvasItem[];
  connections: CanvasConnection[];
  onUpdateItems: (items: CanvasItem[]) => void;
  onItemUpdateEvent?: (itemId: string, newContent: string) => void;
  onUpdateConnections: (connections: CanvasConnection[]) => void;
  onExportToDeck?: (itemIds: string[]) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  onDropSlide?: (slideId: string, x: number, y: number) => void;
  onJumpToSlide?: (slideId: string) => void;
  focusedItemId?: string | null;
  language: Language;
  currentUser: User;
}

// --- CONSTANTS ---
const DRAG_THRESHOLD = 4;
const DOUBLE_CLICK_DELAY = 300;
const ZOOM_SENSITIVITY = 0.001;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const VIEWPORT_PADDING = 500;

const MIN_NODE_WIDTH = 120;
const MIN_NODE_HEIGHT = 80;
const DEFAULT_NODE_WIDTH = 240;
const DEFAULT_NODE_HEIGHT = 140;

// --- OPTIMIZATION: SPATIAL INDEX ---
class SpatialGrid {
    cellSize: number;
    cells: Map<string, string[]>;

    constructor(cellSize = 500) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    clear() {
        this.cells.clear();
    }

    update(items: CanvasItem[]) {
        this.clear();
        items.forEach(item => {
            const startX = Math.floor(item.x / this.cellSize);
            const endX = Math.floor((item.x + item.width) / this.cellSize);
            const startY = Math.floor(item.y / this.cellSize);
            const endY = Math.floor((item.y + item.height) / this.cellSize);

            for (let x = startX; x <= endX; x++) {
                for (let y = startY; y <= endY; y++) {
                    const key = `${x},${y}`;
                    if (!this.cells.has(key)) this.cells.set(key, []);
                    this.cells.get(key)!.push(item.id);
                }
            }
        });
    }

    query(x: number, y: number, w: number, h: number): Set<string> {
        const result = new Set<string>();
        const startX = Math.floor(x / this.cellSize);
        const endX = Math.floor((x + w) / this.cellSize);
        const startY = Math.floor(y / this.cellSize);
        const endY = Math.floor((y + h) / this.cellSize);

        for (let cx = startX; cx <= endX; cx++) {
            for (let cy = startY; cy <= endY; cy++) {
                const ids = this.cells.get(`${cx},${cy}`);
                if (ids) {
                    for (const id of ids) result.add(id);
                }
            }
        }
        return result;
    }
    
    hitTest(x: number, y: number, itemMap: Map<string, CanvasItem>): string | null {
        const candidates = this.query(x, y, 1, 1);
        const candidateArray = Array.from(candidates);
        for (const id of candidateArray) {
            const item = itemMap.get(id);
            if (item && x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height) {
                return id;
            }
        }
        return null;
    }
}

// --- TYPES & AST ---
interface TextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}
interface TextBlock {
  type: 'paragraph' | 'list-item';
  children: TextSpan[];
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
}
interface RichTextAST {
  blocks: TextBlock[];
}
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
type InteractionState =
  | { type: 'IDLE' }
  | { type: 'PANNING_CANVAS'; startX: number; startY: number; startCamX: number; startCamY: number }
  | { type: 'LASSO_SELECT'; startX: number; startY: number; currentX: number; currentY: number }
  | { type: 'PENDING_NODE'; startX: number; startY: number; nodeId: string; wasSelected: boolean }
  | { type: 'DRAGGING_NODES'; startX: number; startY: number; currentX: number; currentY: number; initialPositions: Map<string, { x: number, y: number }> }
  | { type: 'RESIZING_NODE'; nodeId: string; handle: ResizeHandle; startX: number; startY: number; startXPos: number; startYPos: number; startWidth: number; startHeight: number }
  | { type: 'CREATING_EDGE'; startNodeId: string; startX: number; startY: number; currentX: number; currentY: number }
  | { type: 'EDITING_TEXT'; nodeId: string };

// --- HELPERS ---
const parseContentToAST = (content: string): RichTextAST => {
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.blocks)) return parsed;
  } catch (e) {}
  return {
    blocks: [{ type: 'paragraph', children: [{ text: content || '' }], align: 'center', fontSize: 16 }]
  };
};

const serializeAST = (ast: RichTextAST): string => JSON.stringify(ast);

const domToAST = (el: HTMLElement): RichTextAST => {
  const blocks: TextBlock[] = [];
  const parseInline = (n: Node, currentStyle: { bold?: boolean, italic?: boolean, underline?: boolean }): TextSpan[] => {
    let spans: TextSpan[] = [];
    if (n.nodeType === Node.TEXT_NODE) {
      if (n.textContent) spans.push({ text: n.textContent, ...currentStyle });
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const element = n as HTMLElement;
      if (element.tagName === 'BR') return [{ text: '\n', ...currentStyle }];
      const newStyle = { ...currentStyle };
      if (element.tagName === 'B' || element.tagName === 'STRONG' || element.style.fontWeight === 'bold') newStyle.bold = true;
      if (element.tagName === 'I' || element.tagName === 'EM' || element.style.fontStyle === 'italic') newStyle.italic = true;
      if (element.tagName === 'U' || element.style.textDecoration.includes('underline')) newStyle.underline = true;
      element.childNodes.forEach(child => { spans = spans.concat(parseInline(child, newStyle)); });
    }
    return spans;
  };
  let inlineBuffer: Node[] = [];
  const flushBuffer = () => {
      if (inlineBuffer.length === 0) return;
      const children: TextSpan[] = [];
      inlineBuffer.forEach(node => children.push(...parseInline(node, {})));
      if (children.length > 0) {
          const align = (el.style.textAlign as any) || 'left';
          const fontSize = parseInt(el.style.fontSize) || 16;
          blocks.push({ type: 'paragraph', children, align, fontSize });
      }
      inlineBuffer = [];
  };
  const isBlock = (n: Node): boolean => {
      if (n.nodeType !== Node.ELEMENT_NODE) return false;
      return ['DIV', 'P', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'].includes((n as HTMLElement).tagName);
  };
  el.childNodes.forEach(node => {
      if (isBlock(node)) {
          flushBuffer();
          const element = node as HTMLElement;
          const tagName = element.tagName;
          if (tagName === 'UL' || tagName === 'OL') {
              Array.from(element.childNodes).forEach(c => {
                  if (c.nodeName === 'LI') {
                      const li = c as HTMLElement;
                      const children = parseInline(li, {});
                      if (children.length === 0) children.push({ text: '' });
                      const align = (li.style.textAlign as any) || (element.style.textAlign as any) || 'left';
                      const fontSize = parseInt(li.style.fontSize) || 16;
                      blocks.push({ type: 'list-item', children, align, fontSize });
                  }
              });
          } else {
              let type: 'paragraph' | 'list-item' = tagName === 'LI' ? 'list-item' : 'paragraph';
              const align = (element.style.textAlign as any) || 'left';
              const fontSize = parseInt(element.style.fontSize) || 16;
              const children = parseInline(element, {});
              if (children.length === 0) children.push({ text: '' });
              blocks.push({ type, children, align, fontSize });
          }
      } else {
          inlineBuffer.push(node);
      }
  });
  flushBuffer();
  if (blocks.length === 0) blocks.push({ type: 'paragraph', children: [{ text: '' }], align: 'center', fontSize: 16 });
  return { blocks };
};

const astToHTML = (ast: RichTextAST): string => {
  return ast.blocks.map(block => {
    const style = `text-align:${block.align || 'left'};`;
    const content = block.children.map(span => {
      let text = span.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
      if (span.bold) text = `<b>${text}</b>`;
      if (span.italic) text = `<i>${text}</i>`;
      if (span.underline) text = `<u>${text}</u>`;
      return text;
    }).join('');
    return block.type === 'list-item' ? `<li style="${style}">${content}</li>` : `<div style="${style}">${content || '<br/>'}</div>`;
  }).join('');
};

// --- STABILIZED INLINE EDITOR ---
const InlineNodeEditor = React.memo(({
  initialContent,
  style,
  onCommit,
  onUndo,
  onRedo,
  heightMode = 'auto',
  onAutoResize,
  currentHeight,
  onUpdateStyle
}: {
  initialContent: string;
  style: React.CSSProperties;
  onCommit: (newContent: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  heightMode?: 'auto' | 'manual';
  onAutoResize?: (height: number) => void;
  currentHeight?: number;
  onUpdateStyle?: (type: string, value?: any) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (ref.current && !ref.current.innerHTML) {
      const ast = parseContentToAST(initialContent || '');
      ref.current.innerHTML = astToHTML(ast);
      ref.current.focus();
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);

  // Real-time Save (Debounced)
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
        if (ref.current) {
            const newAST = domToAST(ref.current);
            onCommit(serializeAST(newAST));
        }
    }, 500);
  }, [onCommit]);

  useEffect(() => {
      const handleFormatEvent = (e: Event) => {
          const customEvent = e as CustomEvent;
          const { type, value } = customEvent.detail;
          applyTextStyle(type, value);
      };
      window.addEventListener('CANVAS_TEXT_FORMAT', handleFormatEvent);
      return () => {
          window.removeEventListener('CANVAS_TEXT_FORMAT', handleFormatEvent);
          if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      };
  }, [onUpdateStyle]);

  const applyTextStyle = (type: string, value?: any) => {
      const editor = ref.current;
      if (!editor) return;

      if (type === 'fontSize') {
          if (onUpdateStyle) onUpdateStyle('fontSize', value);
          editor.style.fontSize = `${value}px`;
      } else if (type === 'align') {
          const alignVal = value as string;
          editor.style.textAlign = alignVal;
          Array.from(editor.children).forEach((c) => { (c as HTMLElement).style.textAlign = alignVal; });
          if (onUpdateStyle) onUpdateStyle('align', alignVal);
      } else if (type === 'list') {
          const hasList = editor.querySelector('ul, ol');
          if (hasList) {
              const list = editor.querySelector('ul, ol') as HTMLElement;
              const fragment = document.createDocumentFragment();
              Array.from(list.children).forEach((c) => {
                  const li = c as HTMLElement;
                  const div = document.createElement('div');
                  div.style.textAlign = li.style.textAlign || editor.style.textAlign || 'left';
                  while (li.firstChild) div.appendChild(li.firstChild);
                  fragment.appendChild(div);
              });
              editor.innerHTML = '';
              editor.appendChild(fragment);
              if (onUpdateStyle) onUpdateStyle('list', null);
          } else {
              const ul = document.createElement('ul');
              ul.style.textAlign = editor.style.textAlign || 'left';
              if (editor.children.length === 0 && editor.firstChild) {
                   const li = document.createElement('li');
                   while (editor.firstChild) li.appendChild(editor.firstChild);
                   ul.appendChild(li);
              } else {
                  Array.from(editor.children).forEach((c) => {
                      const child = c as HTMLElement;
                      if (child.tagName === 'UL' || child.tagName === 'OL') { ul.appendChild(child); return; }
                      const li = document.createElement('li');
                      li.style.textAlign = child.style.textAlign;
                      while (child.firstChild) li.appendChild(child.firstChild);
                      ul.appendChild(li);
                  });
              }
              editor.innerHTML = '';
              editor.appendChild(ul);
              if (onUpdateStyle) onUpdateStyle('list', 'bullet');
          }
      } else {
          document.execCommand(type, false, value);
          if (onUpdateStyle) onUpdateStyle(type, value);
      }
      handleInput();
  };

  const handleInput = () => {
      debouncedSave();
      if (heightMode === 'auto' && ref.current && onAutoResize) {
          const scrollHeight = ref.current.scrollHeight;
          if (Math.abs(scrollHeight - (currentHeight || 0)) > 2) onAutoResize(scrollHeight);
      }
  };

  const handleBlur = () => {
    if (ref.current) {
        const newAST = domToAST(ref.current);
        onCommit(serializeAST(newAST));
    }
  };

  return (
    <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={`w-full h-full p-4 outline-none cursor-text [&_li]:list-disc [&_li]:list-inside [&_ul]:list-disc [&_ul]:list-inside [&_ol]:list-decimal [&_ol]:list-inside ${heightMode === 'manual' ? 'overflow-y-auto' : 'overflow-hidden'}`}
        style={{ 
            ...style, 
            userSelect: 'text', 
            WebkitUserSelect: 'text',
            cursor: 'text',
            pointerEvents: 'auto'
        }}
        onInput={handleInput} 
        onBlur={handleBlur}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
    />
  );
});

const CreativeCanvas: React.FC<CreativeCanvasProps> = ({
  items,
  connections,
  onUpdateItems,
  onItemUpdateEvent,
  onUpdateConnections,
  onExportToDeck,
  onSelectionChange,
  onDropSlide,
  onJumpToSlide,
  focusedItemId,
  language,
  currentUser
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const camera = useRef({ x: 0, y: 0, z: 1 });
  const interaction = useRef<InteractionState>({ type: 'IDLE' });
  const lastCanvasClick = useRef<number>(0);
  const lastNodeClick = useRef<{ time: number; id: string | null }>({ time: 0, id: null });
  const [selection, setSelection] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempEdge, setTempEdge] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [, forceRender] = useState(0);
  const fixedEditPosition = useRef<{ id: string, x: number, y: number } | null>(null);
  const [visibleBounds, setVisibleBounds] = useState({ x: -1000, y: -1000, w: 4000, h: 3000 });
  const spatialIndex = useRef(new SpatialGrid());
  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

  useEffect(() => { spatialIndex.current.update(items); }, [items]);

  // --- WHEEL EVENT HANDLER (FIX JUMP BUG) ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelEvent = (e: WheelEvent) => {
        // Prevent default browser behavior (scroll/zoom)
        e.preventDefault();

        const zoomFactor = -e.deltaY * ZOOM_SENSITIVITY;
        let newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.current.z + zoomFactor));
        
        const rect = container.getBoundingClientRect();
        
        // Use relative pointer position within container
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        // Calculate world coordinates before zoom
        const beforePos = {
            x: (offsetX - camera.current.x) / camera.current.z,
            y: (offsetY - camera.current.y) / camera.current.z
        };

        camera.current.z = newZoom;
        
        // Correctly offset camera to keep the point under cursor stable
        camera.current.x = offsetX - beforePos.x * newZoom;
        camera.current.y = offsetY - beforePos.y * newZoom;
        
        updateVisuals();
    };

    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelEvent);
  }, []);

  useLayoutEffect(() => {
    let hasChanges = false;
    const newItems = items.map(item => {
        if (item.heightMode === 'auto') {
            const el = document.getElementById(`node-${item.id}`);
            if (el) {
                const currentHeight = el.offsetHeight;
                if (Math.abs(currentHeight - item.height) > 2) {
                    hasChanges = true;
                    return { ...item, height: currentHeight };
                }
            }
        }
        return item;
    });
    if (hasChanges) {
        const timer = setTimeout(() => { onUpdateItems(newItems); }, 100);
        return () => clearTimeout(timer);
    }
  }, [items]);

  const history = useRef<{ past: { items: CanvasItem[], connections: CanvasConnection[], selection: string[] }[], future: { items: CanvasItem[], connections: CanvasConnection[], selection: string[] }[] }>({ past: [], future: [] });

  const commitHistory = useCallback(() => {
      history.current.past.push({ items: JSON.parse(JSON.stringify(items)), connections: JSON.parse(JSON.stringify(connections)), selection: [...selection] });
      if (history.current.past.length > 50) history.current.past.shift();
      history.current.future = [];
  }, [items, connections, selection]);

  const handleUndo = useCallback(() => {
      if (history.current.past.length === 0) return;
      history.current.future.push({ items: JSON.parse(JSON.stringify(items)), connections: JSON.parse(JSON.stringify(connections)), selection: [...selection] });
      const previous = history.current.past.pop();
      if (previous) {
          onUpdateItems(previous.items);
          onUpdateConnections(previous.connections);
          setSelection(previous.selection || []);
          if (onSelectionChange) onSelectionChange(previous.selection || []);
          setEditingId(null);
          fixedEditPosition.current = null;
          interaction.current = { type: 'IDLE' };
      }
  }, [items, connections, selection, onUpdateItems, onUpdateConnections, onSelectionChange]);

  const handleRedo = useCallback(() => {
      if (history.current.future.length === 0) return;
      history.current.past.push({ items: JSON.parse(JSON.stringify(items)), connections: JSON.parse(JSON.stringify(connections)), selection: [...selection] });
      const next = history.current.future.pop();
      if (next) {
          onUpdateItems(next.items);
          onUpdateConnections(next.connections);
          setSelection(next.selection || []);
          if (onSelectionChange) onSelectionChange(next.selection || []);
          setEditingId(null);
          fixedEditPosition.current = null;
          interaction.current = { type: 'IDLE' };
      }
  }, [items, connections, selection, onUpdateItems, onUpdateConnections, onSelectionChange]);

  const handleEditorUpdateStyle = useCallback((type: string, value?: any) => {
      if (!editingId) return;
      const updatedItems = items.map(item => {
          if (item.id === editingId) {
              const currentStyle = item.textStyle || {};
              const newStyle = { ...currentStyle };
              if (type === 'bold') newStyle.bold = value !== undefined ? value : !currentStyle.bold;
              else if (type === 'italic') newStyle.italic = value !== undefined ? value : !currentStyle.italic;
              else if (type === 'underline') newStyle.underline = value !== undefined ? value : !currentStyle.underline;
              else if (type === 'align') newStyle.align = value;
              else if (type === 'fontSize') newStyle.fontSize = value;
              else if (type === 'list') newStyle.listType = value;
              return { ...item, textStyle: newStyle };
          }
          return item;
      });
      onUpdateItems(updatedItems);
  }, [editingId, items, onUpdateItems]);

  const rAF = useRef<number | null>(null);
  const updateVisibleBounds = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const zoom = camera.current.z;
      const vx = -camera.current.x / zoom;
      const vy = -camera.current.y / zoom;
      const buffer = VIEWPORT_PADDING / zoom;
      const newBounds = { x: vx - buffer, y: vy - buffer, w: (rect.width / zoom) + (buffer * 2), h: (rect.height / zoom) + (buffer * 2) };
      if (Math.abs(newBounds.x - visibleBounds.x) > 50 || Math.abs(newBounds.y - visibleBounds.y) > 50) setVisibleBounds(newBounds);
  };

  const updateVisuals = useCallback(() => {
    if (viewportRef.current) viewportRef.current.style.transform = `translate(${camera.current.x}px, ${camera.current.y}px) scale(${camera.current.z})`;
    updateVisibleBounds();
    if (interaction.current.type === 'DRAGGING_NODES') {
      const { startX, startY, currentX, currentY, initialPositions } = interaction.current;
      const dx = (currentX - startX) / camera.current.z;
      const dy = (currentY - startY) / camera.current.z;
      initialPositions.forEach((initial, id) => {
          const el = document.getElementById(`node-${id}`);
          if (el) el.style.transform = `translate(${initial.x + dx}px, ${initial.y + dy}px)`;
      });
      forceRender(n => n + 1);
    }
    if (interaction.current.type === 'RESIZING_NODE') {
        const { nodeId, handle, startX, startY, startXPos, startYPos, startWidth, startHeight } = interaction.current;
        const currentX = (interaction.current as any).currentX ?? startX;
        const currentY = (interaction.current as any).currentY ?? startY;
        const dx = (currentX - startX) / camera.current.z;
        const dy = (currentY - startY) / camera.current.z;
        const el = document.getElementById(`node-${nodeId}`);
        if (el) {
            let newW = startWidth, newH = startHeight, newX = startXPos, newY = startYPos;
            if (handle.includes('e')) newW = Math.max(MIN_NODE_WIDTH, startWidth + dx);
            if (handle.includes('s')) newH = Math.max(MIN_NODE_HEIGHT, startHeight + dy);
            if (handle.includes('w')) { const d = Math.min(startWidth - MIN_NODE_WIDTH, dx); newW = startWidth - d; newX = startXPos + d; }
            if (handle.includes('n')) { const d = Math.min(startHeight - MIN_NODE_HEIGHT, dy); newH = startHeight - d; newY = startYPos + d; }
            el.style.width = `${newW}px`; el.style.height = `${newH}px`; el.style.transform = `translate(${newX}px, ${newY}px)`;
        }
        forceRender(n => n + 1);
    }
    if (interaction.current.type === 'LASSO_SELECT') forceRender(n => n + 1);
    if (interaction.current.type === 'CREATING_EDGE') {
      const { startX, startY, currentX, currentY } = interaction.current;
      const p1 = screenToCanvas(startX, startY);
      const p2 = screenToCanvas(currentX, currentY);
      setTempEdge({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }
    rAF.current = requestAnimationFrame(updateVisuals);
  }, [visibleBounds]);

  useEffect(() => { rAF.current = requestAnimationFrame(updateVisuals); return () => { if (rAF.current) cancelAnimationFrame(rAF.current); }; }, [updateVisuals]);

  const screenToCanvas = (sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    return { x: (sx - rect.left - camera.current.x) / camera.current.z, y: (sy - rect.top - camera.current.y) / camera.current.z };
  };

  const getEdgePath = (x1: number, y1: number, x2: number, y2: number) => {
    const dist = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dist} ${y1}, ${x2 - dist} ${y2}, ${x2} ${y2}`;
  };

  const getNodeRenderPosition = (item: CanvasItem) => {
      if (editingId === item.id && fixedEditPosition.current?.id === item.id) return { ...item, x: fixedEditPosition.current.x, y: fixedEditPosition.current.y };
      if (interaction.current.type === 'DRAGGING_NODES' && interaction.current.initialPositions.has(item.id)) {
          const { startX, startY, currentX, currentY } = interaction.current;
          const dx = (currentX - startX) / camera.current.z;
          const dy = (currentY - startY) / camera.current.z;
          const init = interaction.current.initialPositions.get(item.id)!;
          return { ...item, x: init.x + dx, y: init.y + dy };
      }
      return item;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    
    // 1. Connection Handle
    if (target.dataset.handle === "true") {
      const nodeId = target.dataset.nodeId!;
      const node = itemMap.get(nodeId);
      if (node) {
        interaction.current = { 
            type: 'CREATING_EDGE', 
            startNodeId: nodeId, 
            startX: e.clientX, 
            startY: e.clientY,
            currentX: e.clientX, 
            currentY: e.clientY 
        };
        e.stopPropagation(); containerRef.current?.setPointerCapture(e.pointerId); return;
      }
    }

    // 2. Resize Handle
    if (target.dataset.resize) {
        const nodeId = target.dataset.nodeId!;
        const node = itemMap.get(nodeId);
        if (node) {
            interaction.current = { type: 'RESIZING_NODE', nodeId, handle: target.dataset.handle as ResizeHandle, startX: e.clientX, startY: e.clientY, startXPos: node.x, startYPos: node.y, startWidth: node.width, startHeight: node.height };
            e.stopPropagation(); containerRef.current?.setPointerCapture(e.pointerId); return;
        }
    }

    const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);
    const hitNodeId = spatialIndex.current.hitTest(cx, cy, itemMap);
    if (hitNodeId) {
      const nodeId = hitNodeId;
      const node = itemMap.get(nodeId);
      if (node) {
        e.stopPropagation(); containerRef.current?.setPointerCapture(e.pointerId);
        const isSelected = selection.includes(nodeId);
        if (e.shiftKey) { const newSelection = isSelected ? selection.filter(id => id !== nodeId) : [...selection, nodeId]; setSelection(newSelection); if (onSelectionChange) onSelectionChange(newSelection); }
        else { if (!isSelected) { setSelection([nodeId]); if (onSelectionChange) onSelectionChange([nodeId]); } }
        interaction.current = { type: 'PENDING_NODE', startX: e.clientX, startY: e.clientY, nodeId, wasSelected: isSelected };
        return;
      }
    }
    const edgeEl = target.closest('[data-edge-id]');
    if (edgeEl) {
        const edgeId = edgeEl.getAttribute('data-edge-id')!;
        e.stopPropagation();
        const newSel = e.shiftKey ? (selection.includes(edgeId) ? selection.filter(id => id !== edgeId) : [...selection, edgeId]) : [edgeId];
        setSelection(newSel); if (onSelectionChange) onSelectionChange(newSel); return;
    }
    if (e.shiftKey) interaction.current = { type: 'LASSO_SELECT', startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY };
    else interaction.current = { type: 'PANNING_CANVAS', startX: e.clientX, startY: e.clientY, startCamX: camera.current.x, startCamY: camera.current.y };
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const state = interaction.current;
    if (state.type === 'PANNING_CANVAS') { camera.current.x = state.startCamX + (e.clientX - state.startX); camera.current.y = state.startCamY + (e.clientY - state.startY); }
    else if (state.type === 'LASSO_SELECT') interaction.current = { ...state, currentX: e.clientX, currentY: e.clientY };
    else if (state.type === 'DRAGGING_NODES') interaction.current = { ...state, currentX: e.clientX, currentY: e.clientY };
    else if (state.type === 'PENDING_NODE') {
      if (Math.hypot(e.clientX - state.startX, e.clientY - state.startY) > DRAG_THRESHOLD) {
        const initialPositions = new Map<string, { x: number, y: number }>();
        const nodesToDrag = selection.includes(state.nodeId) ? selection : [state.nodeId];
        nodesToDrag.forEach(id => { const item = itemMap.get(id); if (item) initialPositions.set(id, { x: item.x, y: item.y }); });
        interaction.current = { type: 'DRAGGING_NODES', startX: state.startX, startY: state.startY, currentX: e.clientX, currentY: e.clientY, initialPositions };
      }
    } else if (state.type === 'RESIZING_NODE') { (interaction.current as any).currentX = e.clientX; (interaction.current as any).currentY = e.clientY; }
    else if (state.type === 'CREATING_EDGE') interaction.current = { ...state, currentX: e.clientX, currentY: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const state = interaction.current;
    containerRef.current?.releasePointerCapture(e.pointerId);
    if (state.type === 'DRAGGING_NODES') {
      const dx = (state.currentX - state.startX) / camera.current.z; const dy = (state.currentY - state.startY) / camera.current.z;
      if (dx !== 0 || dy !== 0) {
          commitHistory();
          const updatedItems = items.map(item => { if (state.initialPositions.has(item.id)) { const init = state.initialPositions.get(item.id)!; return { ...item, x: init.x + dx, y: init.y + dy }; } return item; });
          onUpdateItems(updatedItems);
      }
    } else if (state.type === 'LASSO_SELECT') {
        const x1 = Math.min(state.startX, state.currentX); const x2 = Math.max(state.startX, state.currentX);
        const y1 = Math.min(state.startY, state.currentY); const y2 = Math.max(state.startY, state.currentY);
        const p1 = screenToCanvas(x1, y1); const p2 = screenToCanvas(x2, y2);
        const lassoRect = { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
        const candidates = spatialIndex.current.query(lassoRect.x, lassoRect.y, lassoRect.w, lassoRect.h);
        const newSelection: string[] = [];
        for (const id of candidates) { const item = itemMap.get(id); if (item && item.x < lassoRect.x + lassoRect.w && item.x + item.width > lassoRect.x && item.y < lassoRect.y + lassoRect.h && item.y + item.height > lassoRect.y) newSelection.push(item.id); }
        setSelection(newSelection); if (onSelectionChange) onSelectionChange(newSelection);
    } else if (state.type === 'RESIZING_NODE') {
        const { nodeId, handle, startX, startY, startXPos, startYPos, startWidth, startHeight } = state;
        const cx = (state as any).currentX ?? e.clientX; const cy = (state as any).currentY ?? e.clientY;
        const dx = (cx - startX) / camera.current.z; const dy = (cy - startY) / camera.current.z;
        let newW = startWidth, newH = startHeight, newX = startXPos, newY = startYPos;
        if (handle.includes('e')) newW = Math.max(MIN_NODE_WIDTH, startWidth + dx);
        if (handle.includes('s')) newH = Math.max(MIN_NODE_HEIGHT, startHeight + dy);
        if (handle.includes('w')) { const d = Math.min(startWidth - MIN_NODE_WIDTH, dx); newW = startWidth - d; newX = startXPos + d; }
        if (handle.includes('n')) { const d = Math.min(startHeight - MIN_NODE_HEIGHT, dy); newH = startHeight - d; newY = startYPos + d; }
        if (newW !== startWidth || newH !== startHeight || newX !== startXPos || newY !== startYPos) {
            commitHistory();
            onUpdateItems(items.map(i => i.id === nodeId ? { ...i, x: newX, y: newY, width: newW, height: newH, heightMode: 'manual' as const } : i));
        }
    } else if (state.type === 'CREATING_EDGE') {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const targetNodeEl = target?.closest('.canvas-node');
      if (targetNodeEl) {
        const targetId = targetNodeEl.getAttribute('data-id')!;
        if (targetId !== state.startNodeId) {
          commitHistory();
          onUpdateConnections([...connections, { id: `conn-${Date.now()}`, fromId: state.startNodeId, toId: targetId }]);
        }
      }
      setTempEdge(null);
    } else if (state.type === 'PENDING_NODE') {
      const now = Date.now(); const last = lastNodeClick.current;
      const isRef = itemMap.get(state.nodeId)?.sourceReference?.type === 'DECK_SLIDE';
      if (last.id === state.nodeId && (now - last.time) < DOUBLE_CLICK_DELAY) {
        if (isRef) { const node = itemMap.get(state.nodeId); if (node?.sourceReference?.id && onJumpToSlide) onJumpToSlide(node.sourceReference.id); }
        else {
            const node = itemMap.get(state.nodeId);
            if (node) { fixedEditPosition.current = { id: node.id, x: node.x, y: node.y }; setEditingId(state.nodeId); }
        }
        lastNodeClick.current = { time: 0, id: null };
      } else {
        if (!e.shiftKey) { setSelection([state.nodeId]); if (onSelectionChange) onSelectionChange([state.nodeId]); }
        else if (e.shiftKey && state.wasSelected) { const newSel = selection.filter(id => id !== state.nodeId); setSelection(newSel); if (onSelectionChange) onSelectionChange(newSel); }
        lastNodeClick.current = { time: now, id: state.nodeId };
      }
    } else if (state.type === 'PANNING_CANVAS') {
      if (Math.hypot(e.clientX - state.startX, e.clientY - state.startY) < DRAG_THRESHOLD) {
        const now = Date.now();
        if (now - lastCanvasClick.current < DOUBLE_CLICK_DELAY) {
            commitHistory();
            const pos = screenToCanvas(e.clientX, e.clientY);
            const newNode: CanvasItem = { id: `node-${Date.now()}`, type: 'STICKY', status: 'IDEA', x: pos.x - (DEFAULT_NODE_WIDTH / 2), y: pos.y - (DEFAULT_NODE_HEIGHT / 2), width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT, heightMode: 'auto', content: '', color: '#fef3c7', authorId: currentUser.id, style: { alignment: 'center', fontSize: 16 } };
            onUpdateItems([...items, newNode]);
            fixedEditPosition.current = { id: newNode.id, x: newNode.x, y: newNode.y }; setSelection([newNode.id]); setEditingId(newNode.id); if (onSelectionChange) onSelectionChange([newNode.id]);
            lastCanvasClick.current = 0;
        } else { setSelection([]); setEditingId(null); fixedEditPosition.current = null; if (onSelectionChange) onSelectionChange([]); lastCanvasClick.current = now; }
      }
    }
    interaction.current = { type: 'IDLE' };
  };

  const handleAutoResize = useCallback((height: number) => {
      if (!editingId) return;
      onUpdateItems(items.map(i => i.id === editingId ? { ...i, height: Math.max(MIN_NODE_HEIGHT, height) } : i));
  }, [editingId, items, onUpdateItems]);

  const handleEditorCommit = useCallback((newContent: string) => {
    if (editingId) {
      const item = items.find(i => i.id === editingId);
      if (item && (item.content !== newContent || item.heightMode === 'auto')) {
          onUpdateItems(items.map(i => i.id === editingId ? { ...i, content: newContent } : i));
      }
    }
  }, [editingId, items, onUpdateItems]);

  const handlePartialUpdate = useCallback((updates: Partial<CanvasItem>[]) => {
      commitHistory();
      const updatedItems = items.map(item => {
          const update = updates.find(u => u.id === item.id);
          if (update) return { ...item, ...update };
          return item;
      });
      onUpdateItems(updatedItems);
  }, [items, onUpdateItems, commitHistory]);

  const handleAIAction = async (action: 'REWRITE' | 'SUMMARIZE' | 'GENERATE_IMAGE' | 'DRAFT_SLIDE') => {
      if (selection.length === 0) return;
      setIsProcessingAI(true);
      try {
          const selectedNodes = items.filter(i => selection.includes(i.id));
          if (action === 'REWRITE' && selectedNodes.length === 1) {
              const res = await rewriteText(selectedNodes[0].content || '', 'Professional and Concise');
              handlePartialUpdate([{ id: selectedNodes[0].id, content: res }]);
          } else if (action === 'SUMMARIZE') {
              const res = await summarizeTexts(selectedNodes.map(n => n.content || ''));
              // Create new summary node
              const pos = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
              const newNode: CanvasItem = { 
                  id: `node-summary-${Date.now()}`, 
                  type: 'STICKY', 
                  status: 'IDEA', 
                  x: pos.x - 150, y: pos.y - 100, 
                  width: 300, height: 200, 
                  heightMode: 'auto', 
                  content: res, 
                  color: '#dbeafe', 
                  authorId: currentUser.id 
              };
              onUpdateItems([...items, newNode]);
          }
      } catch (e) {
          console.error("AI action failed", e);
      } finally {
          setIsProcessingAI(false);
      }
  };

  const handleDelete = (ids: string[]) => {
      commitHistory();
      onUpdateItems(items.filter(i => !ids.includes(i.id)));
      onUpdateConnections(connections.filter(c => !ids.includes(c.id) && !ids.includes(c.fromId) && !ids.includes(c.toId)));
      setSelection([]);
  };

  const selectedItems = useMemo(() => items.filter(i => selection.includes(i.id)), [items, selection]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#f3f4f6]">
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px', transform: `translate(${camera.current.x % 20}px, ${camera.current.y % 20}px) scale(${camera.current.z})` }} />
        <div ref={viewportRef} className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform">
          <svg className="absolute top-0 left-0 w-[100000px] h-[100000px] overflow-visible pointer-events-none">
            {connections.map(conn => {
              const fromNode = itemMap.get(conn.fromId);
              const toNode = itemMap.get(conn.toId);
              if (!fromNode || !toNode) return null;

              const from = getNodeRenderPosition(fromNode);
              const to = getNodeRenderPosition(toNode);
              
              const x1 = from.x + from.width; const y1 = from.y + from.height / 2; const x2 = to.x; const y2 = to.y + to.height / 2;
              const isSelected = selection.includes(conn.id);
              return (
                <g key={conn.id}>
                    <path d={getEdgePath(x1, y1, x2, y2)} stroke="transparent" strokeWidth="15" fill="none" data-edge-id={conn.id} className="cursor-pointer pointer-events-auto"/>
                    <path d={getEdgePath(x1, y1, x2, y2)} stroke={isSelected ? "#3b82f6" : "#cbd5e1"} strokeWidth={isSelected ? "3" : "2"} fill="none" className="pointer-events-none"/>
                </g>
              );
            })}
            {tempEdge && <path d={`M ${tempEdge.x1} ${tempEdge.y1} L ${tempEdge.x2} ${tempEdge.y2}`} stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" fill="none" className="pointer-events-none"/>}
          </svg>

          {items.filter(i => i.id === editingId || (i.x < visibleBounds.x + visibleBounds.w && i.x + i.width > visibleBounds.x && i.y < visibleBounds.y + visibleBounds.h && i.y + i.height > visibleBounds.y)).map(item => {
            const isSelected = selection.includes(item.id); const isEditing = editingId === item.id;
            const textStyle = item.textStyle || {};
            const nodeStyle: React.CSSProperties = { 
                textAlign: (textStyle.align || item.style?.alignment || 'center') as any, 
                fontWeight: textStyle.bold ? 'bold' : 'normal', 
                fontStyle: textStyle.italic ? 'italic' : 'normal', 
                textDecoration: textStyle.underline ? 'underline' : 'none', 
                fontSize: `${textStyle.fontSize || item.style?.fontSize || 16}px` 
            };
            let renderX = item.x; let renderY = item.y;
            if (isEditing && fixedEditPosition.current?.id === item.id) { renderX = fixedEditPosition.current.x; renderY = fixedEditPosition.current.y; }

            return (
              <div key={item.id} id={`node-${item.id}`} data-id={item.id} className={`canvas-node absolute flex flex-col shadow-sm rounded-lg group ${isSelected ? 'ring-2 ring-blue-500 z-10' : 'z-0'} bg-white border border-gray-200 transition-shadow overflow-hidden`} style={{ transform: `translate(${renderX}px, ${renderY}px)`, width: item.width, height: item.heightMode === 'auto' ? 'auto' : item.height, minHeight: MIN_NODE_HEIGHT, backgroundColor: item.color || '#fff' }}>
                <div className="w-full h-full relative" style={nodeStyle}>
                  {isEditing ? (
                      <InlineNodeEditor key={item.id} initialContent={item.content || ''} style={nodeStyle} onCommit={handleEditorCommit} onUndo={handleUndo} onRedo={handleRedo} heightMode={item.heightMode} onAutoResize={handleAutoResize} currentHeight={item.height} onUpdateStyle={handleEditorUpdateStyle} />
                  ) : (
                      <div className="w-full h-full p-4 text-gray-800 pointer-events-none [&_li]:list-disc [&_li]:list-inside" dangerouslySetInnerHTML={{ __html: astToHTML(parseContentToAST(item.content || '')) }}/>
                  )}
                </div>
                
                <div 
                  data-handle="true" 
                  data-node-id={item.id} 
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-crosshair opacity-0 group-hover:opacity-100 translate-x-2 border-2 border-white hover:scale-125 transition-all z-30" 
                  title="Drag to connect"
                />

                {isSelected && !isEditing && (
                    <>
                        <div data-resize="true" data-handle="nw" data-node-id={item.id} className="absolute -top-1 -left-1 w-3 h-3 bg-white border border-blue-500 cursor-nw-resize z-20"/>
                        <div data-resize="true" data-handle="ne" data-node-id={item.id} className="absolute -top-1 -right-1 w-3 h-3 bg-white border border-blue-500 cursor-ne-resize z-20"/>
                        <div data-resize="true" data-handle="sw" data-node-id={item.id} className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border border-blue-500 cursor-sw-resize z-20"/>
                        <div data-resize="true" data-handle="se" data-node-id={item.id} className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border border-blue-500 cursor-se-resize z-20"/>
                    </>
                )}
              </div>
            );
          })}
        </div>

        {/* Lasso selection overlay */}
        {interaction.current.type === 'LASSO_SELECT' && (
            <div 
                className="absolute border border-blue-500 bg-blue-500/10 pointer-events-none z-[1000]"
                style={{
                    left: Math.min(interaction.current.startX, interaction.current.currentX),
                    top: Math.min(interaction.current.startY, interaction.current.currentY),
                    width: Math.abs(interaction.current.startX - interaction.current.currentX),
                    height: Math.abs(interaction.current.startY - interaction.current.currentY)
                }}
            />
        )}
      </div>

      {/* Restore Properties Sidebar */}
      {selection.length === 1 && selectedItems.length === 1 && (
        <CanvasSidePanel 
          selectedItems={selectedItems}
          onUpdateItems={handlePartialUpdate}
          onSyncAction={(id, dir) => console.log('Sync', id, dir)}
          onAIAction={handleAIAction}
          onAddToDeck={(id, slide) => onExportToDeck?.([id])}
          onDelete={handleDelete}
          onClose={() => { setSelection([]); setEditingId(null); }}
          isProcessingAI={isProcessingAI}
          language={language}
        />
      )}
    </div>
  );
};

export default CreativeCanvas;
