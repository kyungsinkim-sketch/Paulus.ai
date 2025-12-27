import React, { useEffect, useRef } from 'react';
import { ElementDoc, ElementType, SlideDoc, DeckDoc, Transform } from '../deck-editor';
import { PlayCircle, Shield } from 'lucide-react';

interface DeckRendererProps {
  slide: SlideDoc;
  deck: DeckDoc;
  onElementClick?: (elementId: string, e: React.MouseEvent) => void;
  onElementDoubleClick?: (elementId: string, e: React.MouseEvent) => void;
  onElementContextMenu?: (elementId: string, e: React.MouseEvent) => void;
  highlightedElementId?: string | null;
  editingElementId?: string | null;
  editingDraftText?: string;
  onTextChange?: (content: string) => void;
  onTextCommit?: (elementId: string) => void;
  onTextCancel?: (elementId: string, e?: any) => void;
  showWatermark?: boolean;
}

export const ElementView: React.FC<{
  element: ElementDoc;
  slide: SlideDoc;
  onClick?: (id: string, e: React.MouseEvent) => void;
  onDoubleClick?: (id: string, e: React.MouseEvent) => void;
  onContextMenu?: (id: string, e: React.MouseEvent) => void;
  isHighlighted?: boolean;
  highlightedElementId?: string | null;
  isEditing?: boolean;
  editingElementId?: string | null;
  editingDraftText?: string;
  onTextChange?: (content: string) => void;
  onTextCommit?: (id: string) => void;
  onTextCancel?: (id: string, e?: any) => void;
  parentTransform?: Transform;
}> = ({ 
  element, 
  slide,
  onClick, 
  onDoubleClick, 
  onContextMenu, 
  isHighlighted, 
  highlightedElementId,
  isEditing, 
  editingElementId,
  editingDraftText, 
  onTextChange, 
  onTextCommit, 
  onTextCancel,
  parentTransform
}) => {
  const { transform, type, zIndex, opacity, hidden, locked } = element;
  
  if (hidden && type !== ElementType.group) return null;

  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && textRef.current) {
      const el = textRef.current;
      if (document.activeElement !== el) {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      if (el.innerText !== editingDraftText) {
        el.innerText = editingDraftText || '';
      }
    }
  }, [isEditing, editingDraftText]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (isEditing) {
      onTextChange?.(e.currentTarget.innerText);
    }
  };

  const handleBlur = () => {
    if (isEditing) {
      onTextCommit?.(element.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEditing) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onTextCommit?.(element.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onTextCancel?.(element.id, e);
    }
  };

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${transform.x}%`,
    top: `${transform.y}%`,
    width: `${transform.width}%`,
    height: `${transform.height}%`,
    transform: `rotate(${transform.rotation}deg)`,
    zIndex,
    opacity,
    pointerEvents: 'auto',
    overflow: 'visible',
    transition: isEditing ? 'none' : 'all 0.1s ease-out',
    outline: (isHighlighted && !hidden) ? '2px solid #3b82f6' : 'none',
    boxShadow: (isHighlighted && !hidden) ? '0 0 15px rgba(59, 130, 246, 0.3)' : 'none',
    cursor: isEditing ? 'text' : locked ? 'not-allowed' : 'move', 
  };

  let nodeContent: React.ReactNode = null;

  switch (type) {
    case ElementType.text:
      if (element.text) {
        const ts = element.text.style;
        nodeContent = (
          <div 
            ref={textRef}
            contentEditable={isEditing}
            suppressContentEditableWarning={true}
            onInput={handleInput}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
              fontSize: `${ts.fontSize}px`, fontFamily: ts.fontFamily, fontWeight: ts.fontWeight as any, fontStyle: ts.fontStyle,
              color: ts.color, textAlign: ts.textAlign, lineHeight: ts.lineHeight, letterSpacing: `${ts.letterSpacing}px`,
              textDecoration: ts.textDecoration,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', outline: 'none',
              cursor: isEditing ? 'text' : 'inherit', userSelect: isEditing ? 'text' : 'none'
            }}
          >
            {!isEditing && element.text.content}
          </div>
        );
      }
      break;
    case ElementType.image:
      if (element.image) {
        nodeContent = <img src={element.image.src} alt={element.image.alt} style={{ objectFit: element.image.objectFit, width: '100%', height: '100%', pointerEvents: 'none' }} />;
      }
      break;
    case ElementType.videoThumb:
      nodeContent = (
        <div style={{ backgroundColor: '#000', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
           <PlayCircle size={32} className="text-white/20" />
        </div>
      );
      break;
    case ElementType.grid:
      if (element.grid) {
        const g = element.grid;
        nodeContent = (
          <div style={{
            display: 'grid', width: '100%', height: '100%', gridTemplateColumns: `repeat(${g.columns}, 1fr)`,
            gridTemplateRows: `repeat(${g.rows}, 1fr)`, gap: `${g.gap}px`
          }}>
            {g.items.map((item) => (
              <div key={item.id} className="relative w-full h-full border border-gray-100/5">
                {item.elements.map(se => (
                    <ElementView 
                        key={se.id} element={se} slide={slide} onClick={onClick} onDoubleClick={onDoubleClick}
                        onContextMenu={onContextMenu} 
                        isHighlighted={highlightedElementId === se.id} 
                        highlightedElementId={highlightedElementId}
                        isEditing={editingElementId === se.id} editingDraftText={editingDraftText}
                        onTextChange={onTextChange} onTextCommit={onTextCommit} onTextCancel={onTextCancel}
                    />
                ))}
              </div>
            ))}
          </div>
        );
      }
      break;
    case ElementType.group:
      if (element.group) {
        const children = slide.elements.filter(e => element.group?.childIds.includes(e.id));
        nodeContent = (
            <div className="w-full h-full relative pointer-events-none">
                {children.map(child => (
                    /* Fix: Passed 'slide' instead of 'child' to 'slide' prop of ElementView to correct type mismatch */
                    <ElementView 
                        key={child.id} element={child} slide={slide} onClick={onClick} onDoubleClick={onDoubleClick}
                        onContextMenu={onContextMenu} 
                        isHighlighted={highlightedElementId === child.id} 
                        highlightedElementId={highlightedElementId}
                        isEditing={editingElementId === child.id} editingDraftText={editingDraftText}
                        onTextChange={onTextChange} onTextCommit={onTextCommit} onTextCancel={onTextCancel}
                        parentTransform={transform}
                    />
                ))}
            </div>
        );
      }
      break;
  }

  return (
    <div 
      style={baseStyle} 
      onMouseDown={(e) => onClick?.(element.id, e)}
      onDoubleClick={(e) => onDoubleClick?.(element.id, e)}
      onContextMenu={(e) => onContextMenu?.(element.id, e)}
    >
      {nodeContent}
    </div>
  );
};

export const DeckRenderer: React.FC<DeckRendererProps> = ({ 
  slide, 
  deck, 
  onElementClick, 
  onElementDoubleClick,
  onElementContextMenu, 
  highlightedElementId, 
  editingElementId,
  editingDraftText,
  onTextChange,
  onTextCommit,
  onTextCancel,
  showWatermark 
}) => {
  const d = deck.defaults;

  const allGroupedIds = new Set(
    slide.elements
      .filter(e => e.type === ElementType.group)
      .flatMap(e => e.group?.childIds || [])
  );
    
  const rootElements = slide.elements.filter(e => !allGroupedIds.has(e.id));

  return (
    <div className="w-full h-full relative overflow-hidden bg-white shadow-inner" style={{
      backgroundColor: slide.background.type === 'color' ? slide.background.color : 'white'
    }}>
      {showWatermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none z-0">
          <span className="text-[12vw] font-black tracking-tighter rotate-[-15deg]">PAULUS</span>
        </div>
      )}
      
      {rootElements.map(el => (
        <ElementView 
          key={el.id} 
          element={el} 
          slide={slide}
          onClick={onElementClick} 
          onDoubleClick={onElementDoubleClick} 
          onContextMenu={onElementContextMenu}
          isHighlighted={highlightedElementId === el.id}
          highlightedElementId={highlightedElementId}
          isEditing={editingElementId === el.id}
          editingDraftText={editingDraftText}
          onTextChange={onTextChange}
          onTextCommit={onTextCommit}
          onTextCancel={onTextCancel}
        />
      ))}

      <div className="absolute inset-0 pointer-events-none z-[200] p-[4%] flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className={`text-[10px] font-black text-gray-300 uppercase tracking-widest ${d.showHeaderLeftSectionTitle ? 'opacity-100' : 'opacity-0'}`}>
            {slide.meta.sectionTitle || ''}
          </div>
          <div className={`text-[11px] font-black text-gray-200 uppercase tracking-[0.2em] ${d.showHeaderRightBrandMark ? 'opacity-100' : 'opacity-0'}`}>
            PAULUS
          </div>
        </div>
        <div className="flex justify-between items-end">
          <div className={`text-[9px] font-bold text-gray-300 uppercase tracking-widest ${d.showFooterLeftTitleClient ? 'opacity-100' : 'opacity-0'}`}>
            {slide.meta.proposalTitle ? `${slide.meta.proposalTitle} / ${slide.meta.clientName}` : slide.meta.clientName || 'PAULUS CLIENT'}
          </div>
          <div className={`text-[10px] font-mono text-gray-200 ${d.showFooterRightPageNumber ? 'opacity-100' : 'opacity-0'}`}>
            {(deck.slides.findIndex(s => s.id === slide.id) + 1).toString().padStart(2, '0')}
          </div>
        </div>
      </div>
    </div>
  );
};
