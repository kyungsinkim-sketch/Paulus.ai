
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DeckYjsAdapter } from '../services/deckYjsService';
import { DeckLegacyAdapter } from '../services/deckLegacyAdapter';
import { DeckDoc, SlideDoc, ElementDoc, ElementType, SlideStyleType, TextStyle, Transform, DeckTheme, DeckDefaults } from '../deck-editor';
import { DeckRenderer } from './DeckRenderer';
import { 
  Trash2, 
  Box, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Type, 
  Settings,
  RefreshCw,
  SpellCheck,
  Languages,
  Sparkles,
  ChevronUp,
  X,
  Upload,
  Palette,
  FileText,
  Layout,
  ImageIcon,
  MessageSquare,
  Zap,
  List,
  Clapperboard,
  Clock,
  Briefcase,
  Compass,
  Target,
  Lightbulb,
  Check,
  MousePointer2,
  Maximize,
  ToggleLeft,
  ToggleRight,
  Camera,
  Maximize2,
  Sun,
  Shirt,
  Diamond,
  Loader2,
  AlertCircle,
  Globe
} from 'lucide-react';
import { Project, Language, User } from '../types';
import { generateCreativeImage, rewriteText, analyzeBrandIntelligence } from '../services/geminiService';
import { nanoBananaGenerateImage } from '../services/nanoBananaService';

const FONT_FAMILIES = ['Pretendard', 'Inter', 'Arial', 'Times New Roman', 'Georgia', 'Monospace'];

const STYLE_ICONS: Record<SlideStyleType, any> = {
  [SlideStyleType.MainTitle]: FileText,
  [SlideStyleType.Standard]: Layout,
  [SlideStyleType.Slogan]: Zap,
  [SlideStyleType.Visual]: ImageIcon,
  [SlideStyleType.Script]: MessageSquare,
  [SlideStyleType.Storyboard]: Clapperboard,
  [SlideStyleType.DirectionBoard]: MousePointer2,
  [SlideStyleType.Schedule]: Clock,
  [SlideStyleType.Estimate]: Briefcase,
  [SlideStyleType.MiddleTitle]: AlignCenter,
  [SlideStyleType.Section]: Compass,
  [SlideStyleType.Concept]: Lightbulb,
  [SlideStyleType.Category]: Layout,
  [SlideStyleType.Reference]: ImageIcon,
  [SlideStyleType.Strategy]: Target
};

// Helper: Calculate luminance for auto-text color switching
const getLuminance = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const a = [r, g, b].map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

interface CreativeDeckViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  language: Language;
  selectedSlideId: string | null;
  onSelectSlide: (slideId: string) => void;
  onAddSlide: () => void;
  currentUser: User;
  onEditorDirtyChange?: (isDirty: boolean) => void;
}

const CreativeDeckView: React.FC<CreativeDeckViewProps> = ({ 
    project, 
    onUpdateProject, 
    currentUser,
    language,
    selectedSlideId,
    onSelectSlide,
    onAddSlide,
    onEditorDirtyChange
}) => {
  const adapter = useMemo(() => new DeckYjsAdapter(), []);
  const [deck, setDeck] = useState<DeckDoc | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [editingDraftText, setEditingDraftText] = useState<string>('');
  
  const [stageOffset, setStageOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [dragState, setDragState] = useState<{
    type: 'MOVE' | 'RESIZE';
    startX: number;
    startY: number;
    initialPositions: Map<string, Transform>;
  } | null>(null);

  const [isDesignExpanded, setIsDesignExpanded] = useState(true);
  const [isPropsExpanded, setIsPropsExpanded] = useState(true);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  
  const [aiBgPreviews, setAiBgPreviews] = useState<string[]>([]);
  const [brandUrl, setBrandUrl] = useState('');

  const [showImageGenModal, setShowImageGenModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenError, setImageGenError] = useState<string | null>(null);
  const [imageGenForm, setImageGenForm] = useState({
    camera: '',
    framing: '',
    lighting: '',
    background: '',
    wardrobe: '',
    accessories: ''
  });

  const stageRef = useRef<HTMLDivElement>(null);
  const lastLoadedDeckId = useRef<string | null>(null);
  const lastSelectedSlideIdRef = useRef<string | null>(null);
  const isEditing = editingElementId !== null;

  useEffect(() => {
    if (project.deck.id !== lastLoadedDeckId.current) {
        const canonicalDeck = DeckLegacyAdapter.toCanonicalDeck(project);
        adapter.loadFromJSON(canonicalDeck);
        lastLoadedDeckId.current = project.deck.id;
    }
  }, [project.deck.id, project, adapter]);

  useEffect(() => {
    const updateUI = () => {
        const exported = adapter.exportToJSON();
        setDeck(exported);
    };
    adapter.doc.on('update', updateUI);
    updateUI();
    return () => adapter.doc.off('update', updateUI);
  }, [adapter]);

  useEffect(() => {
    if (selectedSlideId && deck) {
        const idx = deck.slides.findIndex(s => s.id === selectedSlideId);
        if (idx !== -1) {
            setActiveSlideIndex(idx);
            // Surgical Fix: Only clear selection if actual slide changed, not on every deck update
            if (lastSelectedSlideIdRef.current !== selectedSlideId) {
                setSelectedElementIds([]);
                setEditingElementId(null);
                lastSelectedSlideIdRef.current = selectedSlideId;
            }
        }
    }
  }, [selectedSlideId, deck]);

  const activeSlide = deck?.slides[activeSlideIndex] || null;
  const selectedElements = useMemo(() => 
    activeSlide?.elements.filter(el => selectedElementIds.includes(el.id)) || [],
  [activeSlide, selectedElementIds]);

  // --- Handlers ---

  const handleStageMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target === stageRef.current || target.classList.contains('stage-bg')) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - stageOffset.x, y: e.clientY - stageOffset.y });
        setSelectedElementIds([]);
    }
  };

  const handleElementMouseDown = (elementId: string, e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    const el = activeSlide?.elements.find(e => e.id === elementId);
    if (!el) return;
    const isAlreadySelected = selectedElementIds.includes(elementId);
    let nextSelection = isAlreadySelected ? selectedElementIds : [elementId];
    if (e.shiftKey) nextSelection = isAlreadySelected ? selectedElementIds.filter(id => id !== elementId) : [...selectedElementIds, elementId];
    setSelectedElementIds(nextSelection);

    if (e.button === 0 && !el.locked) {
      const initialPositions = new Map<string, Transform>();
      activeSlide?.elements.forEach(item => {
        if (nextSelection.includes(item.id) && !item.locked) initialPositions.set(item.id, { ...item.transform });
      });
      setDragState({ type: 'MOVE', startX: e.clientX, startY: e.clientY, initialPositions });
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isEditing || selectedElementIds.length !== 1) return;
    e.stopPropagation();
    const elId = selectedElementIds[0];
    const el = activeSlide?.elements.find(item => item.id === elId);
    if (!el || el.locked) return;
    const initialPositions = new Map<string, Transform>();
    initialPositions.set(elId, { ...el.transform });
    setDragState({ type: 'RESIZE', startX: e.clientX, startY: e.clientY, initialPositions });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
        setStageOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        return;
    }
    if (!dragState || !stageRef.current) return;
    const slideRect = document.querySelector('.main-slide-surface')?.getBoundingClientRect();
    if (!slideRect) return;
    const dxPct = ((e.clientX - dragState.startX) / slideRect.width) * 100;
    const dyPct = ((e.clientY - dragState.startY) / slideRect.height) * 100;
    if (dragState.type === 'MOVE') {
      const updates = Array.from(dragState.initialPositions.entries()).map(([id, init]) => ({ id, transform: { x: init.x + dxPct, y: init.y + dyPct } }));
      adapter.batchUpdateTransforms(activeSlideIndex, updates);
    } else if (dragState.type === 'RESIZE') {
      const id = selectedElementIds[0];
      const init = dragState.initialPositions.get(id)!;
      adapter.updateElementTransform(activeSlideIndex, id, { width: Math.max(2, init.width + dxPct), height: Math.max(2, init.height + dyPct) });
    }
  };

  const handleMouseUp = () => {
      setDragState(null);
      setIsPanning(false);
  };

  const handleUpdateTextStyle = (patch: Partial<TextStyle>) => {
    if (isEditing || selectedElementIds.length === 0) return;
    selectedElementIds.forEach(id => {
        const el = activeSlide?.elements.find(e => e.id === id);
        if (el?.type === ElementType.text && !el.locked) adapter.updateTextStyle(id, patch);
    });
  };

  const handleApplySlideStyle = (type: SlideStyleType) => {
    if (isEditing) return;
    adapter.applySlideStyle(activeSlideIndex, type);
    setSelectedElementIds([]);
  };

  const handleProofread = async () => {
    if (selectedElements.length !== 1 || selectedElements[0].type !== ElementType.text) return;
    const el = selectedElements[0];
    setIsProcessingAI(true);
    const result = await rewriteText(el.text?.content || '', "professional, grammatically correct English");
    adapter.updateTextContent(el.id, result);
    setIsProcessingAI(false);
  };

  const handleBackgroundUpload = (scope: 'SLIDE' | 'DECK_ALL') => {
    if (isEditing) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const url = ev.target?.result as string;
                if (scope === 'SLIDE') {
                    adapter.updateSlideBackground(activeSlideIndex, { type: 'image', imageAssetId: url });
                } else if (scope === 'DECK_ALL') {
                    adapter.transact(() => {
                        adapter.updateTheme({ bgImage: url });
                        deck?.slides.forEach((_, idx) => {
                            adapter.updateSlideBackground(idx, { type: 'image', imageAssetId: url });
                        });
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
  };

  const handleApplyColorToAll = () => {
    if (!activeSlide || activeSlide.background.type !== 'color') {
        alert("Please select a background color first.");
        return;
    }
    const color = activeSlide.background.color;
    adapter.transact(() => {
        deck?.slides.forEach((_, idx) => {
            adapter.updateSlideBackground(idx, { type: 'color', color: color });
        });
    });
    alert(`Applied color ${color} to all slides.`);
  };

  const handleAIGenBackground = async () => {
      if (isEditing) return;
      setIsProcessingAI(true);
      setAiBgPreviews([]);
      const promptText = prompt("Describe the mood for AI background generation (Nano Banana Style):");
      if (promptText) {
          const img = await generateCreativeImage(promptText);
          if (img) setAiBgPreviews([img]);
      }
      setIsProcessingAI(false);
  };

  const applySelectedAiBg = (img: string) => {
    adapter.updateSlideBackground(activeSlideIndex, { type: 'image', imageAssetId: img });
    setAiBgPreviews([]);
  };

  const handleImageElementUpload = (elementId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const url = ev.target?.result as string;
          adapter.replaceMediaSource(elementId, url);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const executeImageGeneration = async () => {
    if (!selectedElementIds[0]) return;
    const isFormEmpty = Object.values(imageGenForm).every(val => (val as string).trim() === '');
    if (isFormEmpty) return;
    setIsGeneratingImage(true);
    setImageGenError(null);
    const assembledPrompt = `Camera & Lens:\n${imageGenForm.camera}\n\n` + `Framing:\n${imageGenForm.framing}\n\n` + `Lighting:\n${imageGenForm.lighting}\n\n` + `Background:\n${imageGenForm.background}\n\n` + `Wardrobe:\n${imageGenForm.wardrobe}\n\n` + `Accessories:\n${imageGenForm.accessories}`;
    try {
      const resultUrl = await nanoBananaGenerateImage(assembledPrompt);
      if (resultUrl) {
        adapter.replaceMediaSource(selectedElementIds[0], resultUrl);
        setShowImageGenModal(false);
        setImageGenForm({ camera: '', framing: '', lighting: '', background: '', wardrobe: '', accessories: '' });
      } else {
        setImageGenError("Image generation failed. Please check your prompt or try again.");
      }
    } catch (e) {
      setImageGenError("An unexpected error occurred during generation.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleExtractTheme = async () => {
    if (!brandUrl.trim()) return;
    setIsProcessingAI(true);
    try {
      const theme = await analyzeBrandIntelligence(brandUrl);
      if (theme.bgColor) {
        const luminance = getLuminance(theme.bgColor);
        const autoTextColor = luminance > 0.5 ? '#000000' : '#FFFFFF';
        adapter.transact(() => {
          adapter.updateTheme({ ...theme, textColor: autoTextColor });
        });
        alert(`Theme extracted. Default text color set to ${autoTextColor === '#000000' ? 'Black' : 'White'} based on background luminance.`);
      } else {
        adapter.updateTheme(theme);
      }
    } catch (e) {
      alert("Failed to extract theme.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden font-sans select-none" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      
      <div className="bg-gray-950 border-b border-gray-800 flex flex-col shrink-0 z-50">
        <div className="h-10 flex items-center justify-between px-4 border-b border-gray-900/50">
          <div className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em]">Paulus Deck Editor v1.0</div>
          <div className="flex items-center gap-4">
            <button disabled={isEditing} onClick={() => adapter.undoManager.undo()} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors disabled:opacity-20">Undo</button>
            <button disabled={isEditing} onClick={() => adapter.undoManager.redo()} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors disabled:opacity-20">Redo</button>
          </div>
        </div>
        
        <div className="h-14 flex items-center justify-center px-4">
          {activeSlide && (
             <div className={`flex items-center bg-gray-900/50 rounded-xl p-1 border border-gray-800 overflow-x-auto overflow-y-hidden max-w-[70vw] scrollbar-hide ${isEditing ? 'opacity-30 pointer-events-none' : ''}`}>
                <div className="flex flex-nowrap items-center">
                  {Object.values(SlideStyleType).map(style => {
                      const Icon = STYLE_ICONS[style] || Box;
                      const isActive = activeSlide.styleType === style;
                      return (
                          <button key={style} onClick={() => handleApplySlideStyle(style)} className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 shrink-0 relative whitespace-nowrap ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`} title={style}>
                              <Icon size={14} />
                              <span className="text-[10px] font-bold uppercase tracking-tight">{style}</span>
                          </button>
                      );
                  })}
                </div>
             </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div ref={stageRef} className="flex-1 bg-[#121212] relative overflow-hidden flex items-center justify-center p-8 custom-scrollbar stage-bg cursor-grab active:cursor-grabbing" onMouseDown={handleStageMouseDown}>
          <div className={`relative main-slide-surface shadow-[0_40px_100px_rgba(0,0,0,0.6)] bg-white ${deck?.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[4/3]'} w-full max-w-5xl transition-all duration-300`} style={{ transform: `translate(${stageOffset.x}px, ${stageOffset.y}px)` }}>
            {activeSlide && deck && (
              <>
                <DeckRenderer 
                  slide={activeSlide} deck={deck}
                  onElementClick={handleElementMouseDown}
                  highlightedElementId={selectedElementIds[0]}
                  editingElementId={editingElementId}
                  editingDraftText={editingDraftText}
                  onTextChange={setEditingDraftText}
                  onTextCommit={(id) => { adapter.updateTextContent(id, editingDraftText); setEditingElementId(null); }}
                  onTextCancel={() => setEditingElementId(null)}
                  onElementDoubleClick={(id) => {
                    const el = activeSlide.elements.find(e => e.id === id);
                    if (el?.type === ElementType.text && !el.locked) { setEditingElementId(id); setEditingDraftText(el.text?.content || ''); }
                  }}
                />
                {!isEditing && selectedElementIds.length === 1 && (
                  (() => {
                    const el = activeSlide.elements.find(e => e.id === selectedElementIds[0]);
                    if (!el) return null;
                    return (
                      <div className="absolute pointer-events-none border-2 border-blue-500 z-[100]" style={{ left: `${el.transform.x}%`, top: `${el.transform.y}%`, width: `${el.transform.width}%`, height: `${el.transform.height}%` }}>
                        {!el.locked && (
                            <div onMouseDown={handleResizeMouseDown} className="absolute bottom-[-6px] right-[-6px] w-3.5 h-3.5 bg-white border-2 border-blue-500 pointer-events-auto cursor-se-resize shadow-xl hover:scale-125 transition-transform" />
                        )}
                      </div>
                    );
                  })()
                )}
              </>
            )}
          </div>

          {aiBgPreviews.length > 0 && (
            <div className="absolute top-8 right-8 z-[60] w-64 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-4 space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2"><Sparkles size={12}/> AI Generation</span>
                    <button onClick={() => setAiBgPreviews([])} className="text-gray-500 hover:text-white"><X size={14}/></button>
                </div>
                <div className="space-y-2">
                    {aiBgPreviews.map((img, i) => (
                        <div key={i} className="group relative aspect-video bg-black rounded-lg overflow-hidden cursor-pointer border border-gray-800 hover:border-purple-500" onClick={() => applySelectedAiBg(img)}>
                            <img src={img} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>

        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 z-30 shadow-2xl overflow-hidden h-full">
          <div className="h-14 border-b border-gray-100 flex items-center px-6 bg-gray-50/50 shrink-0">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900 flex items-center gap-2">
                <Settings size={14} className="text-blue-500" /> Properties
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-white p-0">
            
            <div className="border-b border-gray-100">
                <button onClick={() => setIsPropsExpanded(!isPropsExpanded)} className="w-full px-6 py-4 flex items-center justify-between group">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">Properties</span>
                    <ChevronUp size={12} className={`text-gray-400 transition-transform ${isPropsExpanded ? '' : 'rotate-180'}`} />
                </button>
                {isPropsExpanded && (
                    <div className="px-6 pb-6 space-y-6">
                        {selectedElements.length > 0 ? (
                            <>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">Opacity</div>
                                    <input type="range" min="0" max="1" step="0.1" value={selectedElements[0].opacity} onChange={(e) => adapter.updateElementMeta(selectedElementIds[0], { opacity: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-blue-600" />
                                </div>
                                
                                {selectedElements[0].type === ElementType.text && selectedElements[0].text && (
                                    <div className="pt-4 border-t border-gray-100 space-y-4 animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Typography</span>
                                          <div className="flex items-center gap-2">
                                            <input 
                                                type="color" 
                                                value={selectedElements[0].text.style.color || '#000000'} 
                                                onChange={(e) => handleUpdateTextStyle({ color: e.target.value })}
                                                className="w-5 h-5 rounded-full border-none bg-transparent cursor-pointer shadow-sm"
                                            />
                                          </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Font Family</label>
                                                <select value={selectedElements[0].text.style.fontFamily} onChange={(e) => handleUpdateTextStyle({ fontFamily: e.target.value })} className="w-full bg-gray-50 border border-gray-100 p-2 rounded-lg text-xs font-bold outline-none cursor-pointer">
                                                    {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Font Size (px)</label>
                                                <input type="number" min="8" max="200" value={selectedElements[0].text.style.fontSize} onChange={(e) => handleUpdateTextStyle({ fontSize: parseInt(e.target.value) })} className="w-full bg-gray-50 border border-gray-100 p-2 rounded-lg text-xs font-bold outline-none"/>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleUpdateTextStyle({ fontWeight: selectedElements[0].text?.style.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`flex-1 p-2 rounded-lg border transition-all ${selectedElements[0].text?.style.fontWeight === 'bold' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-400 border-gray-100'}`} title="Bold"><Bold size={14}/></button>
                                            <button onClick={() => handleUpdateTextStyle({ fontStyle: selectedElements[0].text?.style.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`flex-1 p-2 rounded-lg border transition-all ${selectedElements[0].text?.style.fontWeight === 'bold' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-400 border-gray-100'}`} title="Italic"><Italic size={14}/></button>
                                            <button onClick={() => handleUpdateTextStyle({ textDecoration: selectedElements[0].text?.style.textDecoration === 'underline' ? 'none' : 'underline' })} className={`flex-1 p-2 rounded-lg border transition-all ${selectedElements[0].text?.style.textDecoration === 'underline' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-400 border-gray-100'}`} title="Underline"><Underline size={14}/></button>
                                            <button className={`flex-1 p-2 rounded-lg border bg-gray-50 text-gray-400`}><List size={14}/></button>
                                        </div>
                                        <div className="flex bg-gray-100 p-1 rounded-lg">
                                            {(['left', 'center', 'right', 'justify'] as const).map(align => (
                                                <button key={align} onClick={() => handleUpdateTextStyle({ textAlign: align })} className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${selectedElements[0].text?.style.textAlign === align ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>
                                                    {align === 'left' ? <AlignLeft size={14}/> : align === 'center' ? <AlignCenter size={14}/> : align === 'right' ? <AlignRight size={14}/> : <AlignJustify size={14}/>}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="pt-4 border-t border-gray-100 space-y-2">
                                            <button onClick={handleProofread} disabled={isProcessingAI} className="w-full py-2 bg-purple-50 text-purple-700 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-purple-100">
                                                {isProcessingAI ? <RefreshCw size={12} className="animate-spin"/> : <Languages size={12}/>} AI Proofread
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {selectedElements[0].type === ElementType.image && (
                                  <div className="pt-4 border-t border-gray-100 space-y-3 animate-in fade-in duration-300">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Image Assets</span>
                                    <button onClick={() => handleImageElementUpload(selectedElementIds[0])} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-gray-200 transition-all border border-gray-200"><Upload size={14}/> Image Upload</button>
                                    <button onClick={() => setShowImageGenModal(true)} className="w-full py-2 bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-md shadow-purple-100"><Sparkles size={14}/> AI Generate</button>
                                  </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-4 text-gray-300 italic text-[10px]">Select on stage to edit</div>
                        )}
                    </div>
                )}
            </div>

            <div className="border-b border-gray-100">
                <button onClick={() => setIsDesignExpanded(!isDesignExpanded)} className="w-full px-6 py-4 flex items-center justify-between group">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">Slide Theme</span>
                    <ChevronUp size={12} className={`text-gray-400 transition-transform ${isDesignExpanded ? '' : 'rotate-180'}`} />
                </button>
                {isDesignExpanded && deck && (
                    <div className="px-6 pb-6 space-y-8 animate-in fade-in duration-300">
                        <div className="space-y-4">
                             <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Sparkles size={12} className="text-purple-600"/> AI Theme Extraction</label>
                             <div className="space-y-2">
                                <div className="flex gap-2">
                                  <input type="text" value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)} placeholder="Enter Brand URL..." className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-purple-400" />
                                  <button onClick={handleExtractTheme} disabled={isProcessingAI || !brandUrl.trim()} className="bg-gray-900 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase disabled:opacity-20 transition-all flex items-center justify-center"><Globe size={14}/></button>
                                </div>
                                <p className="text-[9px] text-gray-400 italic">Automatically switches text color based on background luminance (R6).</p>
                             </div>
                        </div>

                        <div className="space-y-3">
                             <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Deck Aspect Ratio</label>
                             <div className="flex bg-gray-100 p-1 rounded-xl">
                                {(['16:9', '4:3'] as const).map(ratio => (
                                    <button key={ratio} onClick={() => adapter.transact(() => adapter.doc.getMap('rootMeta').set('aspectRatio', ratio))} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${deck.aspectRatio === ratio ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>{ratio}</button>
                                ))}
                             </div>
                        </div>

                        <div className="space-y-3">
                             <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Slide Background</label>
                             <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                                 <div className="flex items-center justify-between">
                                     <span className="text-[10px] font-bold text-gray-600">Color</span>
                                     <input type="color" value={activeSlide?.background.type === 'color' ? activeSlide.background.color : '#ffffff'} onChange={(e) => adapter.updateSlideBackground(activeSlideIndex, { type: 'color', color: e.target.value })} className="w-8 h-8 rounded border-none bg-transparent cursor-pointer shadow-sm"/>
                                 </div>
                                 <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleBackgroundUpload('SLIDE')} className="flex-1 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-gray-50"><Upload size={12}/> Upload</button>
                                    <button onClick={handleAIGenBackground} disabled={isProcessingAI} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-purple-700 shadow-md">{isProcessingAI ? <RefreshCw size={10} className="animate-spin"/> : <Sparkles size={10}/>} AI Gen</button>
                                 </div>
                             </div>
                        </div>

                        <div className="space-y-3">
                             <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Global Actions</label>
                             <button onClick={handleApplyColorToAll} className="w-full py-2 bg-gray-900 text-white rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-black transition-all"><Palette size={12}/> Apply Color to All Slides</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="border-b border-gray-100">
                <button onClick={() => setIsSettingsExpanded(!isSettingsExpanded)} className="w-full px-6 py-4 flex items-center justify-between group">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">Layout Settings</span>
                    <ChevronUp size={12} className={`text-gray-400 transition-transform ${isSettingsExpanded ? '' : 'rotate-180'}`} />
                </button>
                {isSettingsExpanded && deck && (
                    <div className="px-6 pb-4 space-y-0.5">
                        {[
                            { key: 'showHeaderLeftSectionTitle', label: 'Section Title' },
                            { key: 'showHeaderRightBrandMark', label: 'Brand Mark' },
                            { key: 'showFooterLeftTitleClient', label: 'Client Title' },
                            { key: 'showFooterRightPageNumber', label: 'Page Number' }
                        ].map((opt) => (
                            <div key={opt.key} className="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-gray-50/50 transition-colors">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">{opt.label}</span>
                                <button onClick={() => adapter.updateDeckDefaults({ [opt.key]: !(deck.defaults as any)[opt.key] })} className={`p-1 transition-colors ${ (deck.defaults as any)[opt.key] ? 'text-blue-600' : 'text-gray-300' }`}>
                                    { (deck.defaults as any)[opt.key] ? <ToggleRight size={24}/> : <ToggleLeft size={24}/> }
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        </aside>
      </div>

      {showImageGenModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100">
            <div className="h-16 bg-gray-50 border-b border-gray-100 flex items-center justify-between px-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-xl text-white shadow-lg shadow-purple-200"><Sparkles size={20}/></div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">AI Image Generate</h3>
              </div>
              <button onClick={() => setShowImageGenModal(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={24}/></button>
            </div>
            <div className="p-8 grid grid-cols-2 gap-x-8 gap-y-6">
              {[
                { id: 'camera', label: 'Camera & Lens', icon: Camera, placeholder: 'Sony A7R IV, 35mm f/1.4...' },
                { id: 'framing', label: 'Framing', icon: Maximize2, placeholder: 'Close up, High angle, Rule of thirds...' },
                { id: 'lighting', label: 'Lighting', icon: Sun, placeholder: 'Cinematic, Golden hour, Soft studio light...' },
                { id: 'background', label: 'Background', icon: Layout, placeholder: 'Minimalist interior, Neon cityscape...' },
                { id: 'wardrobe', label: 'Wardrobe', icon: Shirt, placeholder: 'High-end streetwear, Professional suit...' },
                { id: 'accessories', label: 'Accessories', icon: Diamond, placeholder: 'Silver watch, Matte sunglasses...' }
              ].map(field => (
                <div key={field.id} className="space-y-2">
                  <field.icon size={12} className="text-blue-500"/>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">{field.label}</label>
                  <textarea value={(imageGenForm as any)[field.id]} onChange={(e) => setImageGenForm(prev => ({ ...prev, [field.id]: e.target.value }))} placeholder={field.placeholder} className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none font-medium text-gray-700" />
                </div>
              ))}
            </div>
            {imageGenError && (
              <div className="px-8 pb-4">
                <p className="text-[10px] font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100 flex items-center gap-2"><AlertCircle size={12}/> {imageGenError}</p>
              </div>
            )}
            <div className="h-20 bg-gray-50 border-t border-gray-100 flex items-center justify-end px-8 gap-4">
              <button onClick={() => setShowImageGenModal(false)} className="px-6 py-2.5 text-[11px] font-black uppercase text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
              <button onClick={executeImageGeneration} disabled={isGeneratingImage || Object.values(imageGenForm).every(v => (v as string).trim() === '')} className="px-10 py-2.5 bg-gray-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-black transition-all flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed">
                {isGeneratingImage ? <Loader2 size={16} className="animate-spin text-blue-400"/> : <Sparkles size={16}/>} Generate (실행)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreativeDeckView;
