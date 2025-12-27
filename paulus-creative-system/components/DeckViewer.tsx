
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { DeckDoc, SlideDoc, CommentDoc, DeckVersion } from '../deck-editor';
import { DeckRenderer } from './DeckRenderer';
import { 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare, 
  X, 
  Send, 
  Maximize2, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Monitor,
  Eye,
  Minimize2,
  Lock,
  History,
  ShieldAlert,
  Ghost,
  Edit,
  ArrowUpRight,
  Filter,
  Sparkles
} from 'lucide-react';

interface DeckViewerProps {
  deck: DeckDoc;
  versions: DeckVersion[];
  comments: CommentDoc[];
  onUpdateComments: (comments: CommentDoc[]) => void;
  onApproveVersion: (versionId: string) => void;
  onImportVersionToWorkingDraft: (versionId: string) => void;
  onClose: () => void;
}

const DeckViewer: React.FC<DeckViewerProps> = ({ 
    deck, 
    versions, 
    comments, 
    onUpdateComments, 
    onApproveVersion, 
    onImportVersionToWorkingDraft,
    onClose 
}) => {
  const [selectedVersionId, setSelectedVersionId] = useState<string | 'working'>(versions.length > 0 ? versions[versions.length - 1].id : 'working');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);
  
  // PHASE 15-A Filter logic
  const [filterType, setFilterType] = useState<'ALL' | 'AI_DRAFTS'>('ALL');

  const filteredVersions = useMemo(() => {
    if (filterType === 'ALL') return versions;
    return versions.filter(v => v.createdBy === 'ai-system' || v.name.includes('AI Draft'));
  }, [versions, filterType]);

  useEffect(() => {
      const handleNavToAI = () => setFilterType('AI_DRAFTS');
      window.addEventListener('NAV_TO_AI_DRAFTS', handleNavToAI);
      return () => window.removeEventListener('NAV_TO_AI_DRAFTS', handleNavToAI);
  }, []);

  const touchStartX = useRef<number | null>(null);

  // Resolved Deck for rendering
  const activeVersion = useMemo(() => {
    if (selectedVersionId === 'working') return null;
    return versions.find(v => v.id === selectedVersionId);
  }, [selectedVersionId, versions]);

  const activeDeck = activeVersion ? activeVersion.deckSnapshot : deck;
  const currentSlide = activeDeck.slides[currentSlideIndex] || activeDeck.slides[0];

  // --- NAVIGATION ---
  const handlePrev = useCallback(() => setCurrentSlideIndex(prev => Math.max(0, prev - 1)), []);
  const handleNext = useCallback(() => setCurrentSlideIndex(prev => Math.min(activeDeck.slides.length - 1, prev + 1)), [activeDeck.slides.length]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape' && isPresentationMode) setIsPresentationMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, isPresentationMode]);

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  const handleToggleResolve = (commentId: string) => {
    onUpdateComments(comments.map(c => 
      c.id === commentId ? { ...c, status: c.status === 'resolved' ? 'open' : 'resolved' } : c
    ));
  };

  const slideComments = useMemo(() => 
    comments.filter(c => c.slideId === currentSlide?.id),
  [comments, currentSlide?.id]);

  const openCommentsCount = useMemo(() => 
    comments.filter(c => c.status === 'open').length,
  [comments]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  if (!activeDeck || activeDeck.slides.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center text-white">
        <Ghost size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-bold uppercase tracking-widest opacity-50">Deck Unavailable</p>
        <button onClick={onClose} className="mt-8 px-6 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">Close</button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[100] bg-black flex flex-col font-sans select-none overflow-hidden animate-in fade-in duration-500`}>
      
      {/* TOP HEADER - Hidden in Presentation Mode */}
      {!isPresentationMode && (
        <header className="h-14 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 z-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-900 rounded-lg border border-gray-800">
              <History size={14} className="text-blue-400"/>
              <select 
                value={selectedVersionId} 
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="bg-transparent text-white text-[10px] font-black uppercase tracking-wider outline-none border-none cursor-pointer"
              >
                  <option value="working" className="bg-gray-900">Working Draft</option>
                  {filteredVersions.map(v => (
                    <option key={v.id} value={v.id} className="bg-gray-900">
                      {v.name} ({v.status})
                    </option>
                  ))}
              </select>
            </div>
            
            {/* Filter Toggle */}
            <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
                <button 
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${filterType === 'ALL' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Filter size={12} className="inline mr-1"/> All
                </button>
                <button 
                  onClick={() => setFilterType('AI_DRAFTS')}
                  className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${filterType === 'AI_DRAFTS' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Sparkles size={12} className="inline mr-1"/> AI Drafts
                </button>
            </div>

            {activeVersion && (
              <div className={`flex items-center gap-2`}>
                <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm ${
                    activeVersion.status === 'approved' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                }`}>
                    {activeVersion.status}
                </div>
                {/* PHASE 14: Import Version Button */}
                <button 
                  onClick={() => onImportVersionToWorkingDraft(activeVersion.id)}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-[10px] font-black uppercase transition-colors flex items-center gap-1.5 border border-white/5 shadow-lg"
                >
                    <ArrowUpRight size={12}/> Import to Editor
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowWatermark(!showWatermark)} 
              className={`p-2 rounded-lg transition-colors ${showWatermark ? 'text-blue-400 bg-blue-400/10' : 'text-gray-500 hover:text-white'}`}
              title="Toggle Watermark"
            >
              <ShieldAlert size={18}/>
            </button>

            {activeVersion && activeVersion.status !== 'approved' && (
              <div className="flex items-center gap-2">
                {openCommentsCount > 0 ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-orange-400 font-black uppercase bg-orange-400/10 px-3 py-1.5 rounded-full border border-orange-400/20">
                    <AlertTriangle size={14}/> {openCommentsCount} unresolved
                  </div>
                ) : (
                  <button 
                    onClick={() => onApproveVersion(activeVersion.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
                  >
                    <CheckCircle size={14}/> Approve
                  </button>
                )}
              </div>
            )}

            <div className="h-4 w-px bg-gray-800 mx-2"></div>

            <button onClick={() => setIsPresentationMode(true)} className="p-2 text-gray-500 hover:text-white transition-colors" title="Presentation Mode">
              <Monitor size={18}/>
            </button>
            <button onClick={toggleFullScreen} className="p-2 text-gray-500 hover:text-white transition-colors hidden md:block" title="Full Screen">
              <Maximize2 size={18}/>
            </button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 transition-colors relative ${isSidebarOpen ? 'text-blue-400' : 'text-gray-500 hover:text-white'}`} title="Comments">
              <MessageSquare size={18}/>
              {slideComments.some(c => c.status === 'open') && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-gray-950"></span>
              )}
            </button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-400 transition-colors" title="Exit">
              <X size={20}/>
            </button>
          </div>
        </header>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* PRESENTATION STAGE */}
        <main 
          className={`flex-1 flex flex-col relative transition-all duration-500 ${isPresentationMode ? 'bg-black p-0' : 'bg-gray-900 p-4 md:p-8'}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Presentation Mode Exit (Floating) */}
          {isPresentationMode && (
            <button 
              onClick={() => setIsPresentationMode(false)}
              className="absolute top-6 right-6 z-[110] p-2 bg-white/10 text-white/50 hover:text-white hover:bg-white/20 rounded-full backdrop-blur-md opacity-0 hover:opacity-100 transition-opacity"
            >
              <Minimize2 size={24}/>
            </button>
          )}

          <div className="flex-1 flex items-center justify-center overflow-hidden">
             <div 
               className={`relative shadow-2xl transition-all duration-500 ease-out 
                 ${activeDeck.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[4/3]'} 
                 ${isPresentationMode ? 'w-screen h-screen' : 'w-full max-w-7xl max-h-full'}`}
             >
                <DeckRenderer 
                  slide={currentSlide} 
                  deck={activeDeck}
                  highlightedElementId={highlightedElementId}
                  showWatermark={showWatermark}
                />
             </div>
          </div>

          {/* FLOATING CONTROLS */}
          <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center bg-gray-950/80 backdrop-blur-xl border border-gray-800 rounded-full p-1.5 shadow-2xl z-20 transition-opacity duration-300 ${isPresentationMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
             <button 
               onClick={handlePrev} 
               disabled={currentSlideIndex === 0}
               className="p-3 text-white hover:bg-white/10 rounded-full disabled:opacity-20 transition-colors"
             >
               <ChevronLeft size={24}/>
             </button>
             <div className="px-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="w-8 text-center text-white">{currentSlideIndex + 1}</span>
                <span className="opacity-20">/</span>
                <span className="w-8 text-center">{activeDeck.slides.length}</span>
             </div>
             <button 
               onClick={handleNext} 
               disabled={currentSlideIndex === activeDeck.slides.length - 1}
               className="p-3 text-white hover:bg-white/10 rounded-full disabled:opacity-20 transition-colors"
             >
               <ChevronRight size={24}/>
             </button>
          </div>
        </main>

        {/* FEEDBACK SIDEBAR - Hidden in Presentation Mode */}
        {isSidebarOpen && !isPresentationMode && (
          <aside className="w-full md:w-85 lg:w-96 bg-white border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-500 shadow-2xl z-30">
            <div className="h-14 flex items-center px-6 border-b border-gray-100 bg-gray-50 shrink-0">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-3">
                 <MessageSquare size={16} className="text-blue-500"/> Review Panel
               </span>
               <button onClick={() => setIsSidebarOpen(false)} className="ml-auto text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
                 <X size={20}/>
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white custom-scrollbar">
               {slideComments.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-gray-300 opacity-50 space-y-4 py-20">
                    <Ghost size={48} strokeWidth={1}/>
                    <p className="text-xs font-bold uppercase tracking-widest text-center">No feedback yet<br/><span className="text-[10px] font-medium normal-case">Select an element in the editor to comment.</span></p>
                 </div>
               ) : (
                 slideComments.map(comment => (
                   <div 
                     key={comment.id} 
                     onMouseEnter={() => setHighlightedElementId(comment.elementId || null)}
                     onMouseLeave={() => setHighlightedElementId(null)}
                     className={`p-4 rounded-xl border transition-all duration-300 ${
                       comment.status === 'resolved' 
                         ? 'bg-gray-50 border-gray-100 opacity-40 grayscale' 
                         : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-lg shadow-blue-900/5'
                     }`}
                   >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${comment.status === 'resolved' ? 'bg-gray-200 text-gray-400' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'}`}>
                            {comment.authorName.charAt(0)}
                          </div>
                          <div>
                            <span className={`text-[11px] font-black uppercase tracking-tight ${comment.status === 'resolved' ? 'text-gray-400' : 'text-gray-900'}`}>{comment.authorName}</span>
                            <div className="text-[9px] text-gray-400 font-mono">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleToggleResolve(comment.id)}
                          className={`p-1.5 rounded-full transition-all ${comment.status === 'resolved' ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-green-500 hover:bg-green-50'}`}
                          title={comment.status === 'resolved' ? "Re-open" : "Resolve"}
                        >
                          <CheckCircle size={18}/>
                        </button>
                      </div>
                      <p className={`text-xs leading-relaxed ${comment.status === 'resolved' ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                        {comment.content}
                      </p>
                      {comment.elementId && comment.status !== 'resolved' && (
                        <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-blue-500 uppercase bg-blue-50 px-2 py-1 rounded w-fit">
                          Linked Element
                        </div>
                      )}
                   </div>
                 ))
               )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100">
               <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl">
                  <Lock size={12} className="text-gray-400"/>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Read-Only Session</span>
               </div>
            </div>
          </aside>
        )}
      </div>

      {/* THUMBNAIL RAIL - Hidden in Presentation Mode */}
      {!isPresentationMode && (
        <div className="h-24 bg-gray-950 border-t border-gray-800 flex items-center px-6 gap-4 shrink-0 overflow-x-auto custom-scrollbar">
           {activeDeck.slides.map((slide, idx) => (
             <div 
               key={slide.id} 
               onClick={() => setCurrentSlideIndex(idx)}
               className={`h-14 aspect-video rounded-lg border-2 transition-all duration-300 cursor-pointer flex-shrink-0 relative overflow-hidden group ${idx === currentSlideIndex ? 'border-blue-500 ring-4 ring-blue-500/10 scale-105 shadow-2xl' : 'border-gray-800 opacity-40 hover:opacity-100 hover:border-gray-600'}`}
             >
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center group-hover:bg-gray-800 transition-colors">
                   <span className={`text-[10px] font-black transition-all ${idx === currentSlideIndex ? 'text-white' : 'text-gray-700'}`}>{idx + 1}</span>
                </div>
                <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/60 text-[8px] font-bold text-white px-1.5 rounded uppercase tracking-tighter">{slide.styleType.substring(0,3)}</div>
                </div>
             </div>
           ))}
        </div>
      )}

    </div>
  );
};

export default DeckViewer;
