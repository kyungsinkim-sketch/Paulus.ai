
import React, { useState, useEffect } from 'react';
import { Project, DirectionCategory, DirectionItem, StoryboardFrameBlock, Language, User } from '../types';
import DeckRail from './DeckRail';
import { generateCreativeImage, suggestDirectionItems } from '../services/geminiService';
import { 
  Plus, 
  Shirt, 
  Users, 
  Package, 
  MapPin, 
  Sparkles, 
  MoreVertical, 
  CheckCircle2, 
  Image as ImageIcon,
  Loader2,
  Trash2,
  AlertCircle,
  LayoutGrid,
  Zap,
  Check,
  X
} from 'lucide-react';

interface DirectionBoardPageProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  language: Language;
  currentUser: User;
}

const DirectionBoardPage: React.FC<DirectionBoardPageProps> = ({ project, onUpdateProject, language, currentUser }) => {
  const [activeCategory, setActiveCategory] = useState<DirectionCategory>('CAST');
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  
  const [isOptimizingGrid, setIsOptimizingGrid] = useState(false);
  const [suggestedOrder, setSuggestedOrder] = useState<string[] | null>(null);

  const t = (en: string, ko: string) => language === 'KO' ? ko : en;

  const storyboardSlides = project.deck.slides.filter(s => s.type === 'STORYBOARD');
  const allFrames: { slideId: string, frame: StoryboardFrameBlock }[] = [];
  storyboardSlides.forEach(slide => {
      slide.blocks.forEach(block => {
          if (block.type === 'STORYBOARD_FRAME') {
              allFrames.push({ slideId: slide.id, frame: block as StoryboardFrameBlock });
          }
      });
  });

  const boardItems = project.directionBoard || [];

  const categoryItems = boardItems.filter(item => item.category === activeCategory);
  
  const sortedItems = suggestedOrder 
    ? [...categoryItems].sort((a, b) => suggestedOrder.indexOf(a.id) - suggestedOrder.indexOf(b.id))
    : categoryItems;

  const handleGridAssist = async () => {
    setIsOptimizingGrid(true);
    await new Promise(r => setTimeout(r, 1500));
    const sortedIds = [...categoryItems]
        .sort((a,b) => a.status.localeCompare(b.status))
        .map(i => i.id);
    setSuggestedOrder(sortedIds);
    setIsOptimizingGrid(false);
  };

  const applyGridOptimization = () => {
    if (!suggestedOrder) return;
    const remainingItems = boardItems.filter(i => i.category !== activeCategory);
    onUpdateProject({ ...project, directionBoard: [...remainingItems, ...sortedItems] });
    setSuggestedOrder(null);
  };

  const handleAddItem = () => {
      const newItem: DirectionItem = {
          id: `dir-${Date.now()}`,
          category: activeCategory,
          name: t('New Item', '새 아이템'),
          description: '',
          linkedFrameIds: selectedFrameId ? [selectedFrameId] : [],
          status: 'DRAFT',
          authorId: currentUser.id
      };
      const newBoard = [...boardItems, newItem];
      onUpdateProject({ ...project, directionBoard: newBoard });
      setEditingItemId(newItem.id);
  };

  const handleUpdateItem = (id: string, updates: Partial<DirectionItem>) => {
      const newBoard = boardItems.map(item => item.id === id ? { ...item, ...updates } : item);
      onUpdateProject({ ...project, directionBoard: newBoard });
  };

  const handleDeleteItem = (id: string) => {
      if (confirm(t('Delete this item?', '이 아이템을 삭제하시겠습니까?'))) {
          const newBoard = boardItems.filter(item => item.id !== id);
          onUpdateProject({ ...project, directionBoard: newBoard });
      }
  };

  const handleAISuggest = async () => {
      const scriptSlide = project.deck.slides.find(s => s.type === 'SCRIPT');
      const scriptText = scriptSlide ? (scriptSlide.blocks.find(b => b.type === 'BODY_TEXT') as any)?.content?.text : project.brief.overview;
      
      if (!scriptText) {
          alert(t("No script or brief found to analyze.", "분석할 스크립트나 브리프가 없습니다."));
          return;
      }

      setIsProcessingAI(true);
      const suggestions = await suggestDirectionItems(scriptText, activeCategory, language);
      
      const newItems: DirectionItem[] = suggestions.map((s, i) => ({
          id: `ai-dir-${Date.now()}-${i}`,
          category: activeCategory,
          name: s.name,
          description: s.description,
          linkedFrameIds: [],
          status: 'DRAFT',
          authorId: 'ai-bot'
      }));

      onUpdateProject({ ...project, directionBoard: [...boardItems, ...newItems] });
      setIsProcessingAI(false);
  };

  const handleGenerateImage = async (item: DirectionItem) => {
      if (!item.description && !item.name) return;
      setIsProcessingAI(true);
      
      const prompt = `Direction asset, ${activeCategory}, ${item.name}, ${item.description || ''}, photorealistic, detailed`;
      const image = await generateCreativeImage(prompt);
      
      if (image) {
          handleUpdateItem(item.id, { imageUrl: image });
      }
      setIsProcessingAI(false);
  };

  const toggleFrameLink = (itemId: string, frameId: string) => {
      const item = boardItems.find(i => i.id === itemId);
      if (!item) return;
      
      const currentLinks = item.linkedFrameIds || [];
      let newLinks;
      if (currentLinks.includes(frameId)) {
          newLinks = currentLinks.filter(id => id !== frameId);
      } else {
          newLinks = [...currentLinks, frameId];
      }
      handleUpdateItem(itemId, { linkedFrameIds: newLinks });
  };

  const handleSyncToDeck = () => {
      const newSlide = {
          id: `slide-dir-${Date.now()}`,
          pageNumber: project.deck.slides.length + 1,
          title: `Direction: ${activeCategory}`,
          type: 'VISUAL' as const,
          layout: 'TITLE_BULLETS' as const,
          isFinal: false,
          blocks: [
              {
                  id: `blk-${Date.now()}-title`,
                  type: 'TITLE',
                  content: { text: `Direction List: ${activeCategory}` },
                  bilingualContent: { [language]: `Direction List: ${activeCategory}` }
              },
              {
                  id: `blk-${Date.now()}-body`,
                  type: 'BODY_TEXT',
                  content: { 
                      text: categoryItems.map(i => `- ${i.name}: ${i.description || ''}`).join('\n')
                  },
                  bilingualContent: { [language]: categoryItems.map(i => `- ${i.name}: ${i.description || ''}`).join('\n') }
              }
          ]
      };
      
      onUpdateProject({ 
          ...project, 
          deck: { ...project.deck, slides: [...project.deck.slides, newSlide as any] } 
      });
      alert(t("Created new slide in Deck with current items.", "현재 아이템으로 덱에 새 슬라이드를 생성했습니다."));
  };

  const renderCategoryTab = (cat: DirectionCategory, icon: React.ReactNode, labelEN: string, labelKO: string) => (
      <button 
          onClick={() => setActiveCategory(cat)}
          className={`flex-1 py-4 flex items-center justify-center gap-2 border-b-2 transition-all ${activeCategory === cat ? 'border-gray-900 text-gray-900 font-bold bg-gray-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
      >
          {icon} <span className="text-sm">{t(labelEN, labelKO)}</span>
      </button>
  );

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
        <div className="h-32 bg-gray-900 border-b border-gray-800 flex flex-col shrink-0">
            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex justify-between">
                <span>{t('Storyboard Reference', '스토리보드 참조')}</span>
                <span>{t('Select a frame to filter/link items', '아이템을 필터/연결하려면 프레임을 선택하세요')}</span>
            </div>
            <div className="flex-1 overflow-x-auto flex items-center gap-2 px-4 pb-2">
                {allFrames.map(({ frame }, idx) => (
                    <div 
                        key={frame.id}
                        onClick={() => setSelectedFrameId(selectedFrameId === frame.id ? null : frame.id)}
                        className={`
                            relative h-20 aspect-video rounded border-2 cursor-pointer transition-all shrink-0 overflow-hidden group
                            ${selectedFrameId === frame.id ? 'border-blue-500 ring-2 ring-blue-500 scale-105 z-10' : 'border-gray-700 opacity-60 hover:opacity-100'}
                        `}
                    >
                        {frame.content.imageUrl ? (
                            <img src={frame.content.imageUrl} className="w-full h-full object-cover"/>
                        ) : (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
                                <ImageIcon size={16}/>
                            </div>
                        )}
                        <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1">#{frame.frameIndex}</div>
                        {boardItems.some(i => i.linkedFrameIds.includes(frame.id)) && (
                            <div className="absolute top-1 left-1 w-2 h-2 bg-green-50 rounded-full"/>
                        )}
                    </div>
                ))}
                {allFrames.length === 0 && (
                    <div className="text-gray-500 text-xs px-4">{t('No storyboard frames found.', '스토리보드 프레임이 없습니다.')}</div>
                )}
            </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex border-b border-gray-200">
                {renderCategoryTab('CAST', <Users size={16}/>, 'Cast', '출연진')}
                {renderCategoryTab('COSTUME', <Shirt size={16}/>, 'Costume', '의상')}
                {renderCategoryTab('PROPS', <Package size={16}/>, 'Props', '소품')}
                {renderCategoryTab('LOCATION', <MapPin size={16}/>, 'Location', '장소')}
            </div>

            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-gray-800 text-lg">
                    <h2 className="font-bold">{activeCategory}</h2>
                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 ml-2">{categoryItems.length} {t('Items', '개')}</span>
                </div>
                <div className="flex gap-2">
                    <button 
                      onClick={handleGridAssist} 
                      disabled={isOptimizingGrid || categoryItems.length < 2} 
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-xs font-bold hover:bg-blue-100 flex items-center gap-1 border border-blue-100 disabled:opacity-30"
                    >
                        {isOptimizingGrid ? <Loader2 size={12} className="animate-spin"/> : <Zap size={12}/>} {t('AI Grid Assist', 'AI 그리드 최적화')}
                    </button>
                    <button onClick={handleAISuggest} disabled={isProcessingAI} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded text-xs font-bold hover:bg-purple-100 flex items-center gap-1 border border-purple-100">
                        {isProcessingAI ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} {t('Suggest (AI)', 'AI 제안')}
                    </button>
                    <button onClick={handleSyncToDeck} className="px-3 py-1.5 bg-white text-gray-700 rounded text-xs font-bold hover:bg-gray-100 border border-gray-200 flex items-center gap-1">
                        {t('Export to Deck', '덱으로 내보내기')}
                    </button>
                    <button onClick={handleAddItem} className="px-3 py-1.5 bg-gray-900 text-white rounded text-xs font-bold hover:bg-gray-700 flex items-center gap-1">
                        <Plus size={12}/> {t('Add Item', '추가')}
                    </button>
                </div>
            </div>

            {suggestedOrder && (
              <div className="px-6 py-2 bg-indigo-600 text-white flex justify-between items-center animate-in slide-in-from-top duration-300">
                 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <LayoutGrid size={14}/> {t('AI proposes a more logical arrangement based on status.', 'AI가 상태에 따른 논리적 정렬을 제안합니다.')}
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => setSuggestedOrder(null)} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-[10px] font-bold uppercase transition-colors"><X size={12}/></button>
                    <button onClick={applyGridOptimization} className="px-4 py-1 bg-white text-indigo-700 rounded text-[10px] font-black uppercase transition-all shadow-md flex items-center gap-1 hover:scale-105">
                       <Check size={12}/> {t('Apply Arrangement', '정렬 적용')}
                    </button>
                 </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sortedItems.map(item => {
                        const isHighlighted = selectedFrameId ? item.linkedFrameIds.includes(selectedFrameId) : false;
                        const opacityClass = selectedFrameId && !isHighlighted ? 'opacity-40' : 'opacity-100';

                        return (
                            <div key={item.id} className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all group hover:shadow-md ${opacityClass}`}>
                                <div className="h-40 bg-gray-100 relative group/img">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} className="w-full h-full object-cover"/>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                            <ImageIcon size={24} className="mb-2"/>
                                            <span className="text-xs">{t('No Image', '이미지 없음')}</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => handleGenerateImage(item)} className="bg-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                                            <Sparkles size={12}/> {item.imageUrl ? t('Regenerate', '재생성') : t('Generate', '생성')}
                                        </button>
                                    </div>
                                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {item.status}
                                    </div>
                                </div>

                                <div className="p-4 flex-1 flex flex-col gap-2">
                                    <input 
                                        className="font-bold text-gray-900 w-full outline-none bg-transparent placeholder:text-gray-300"
                                        placeholder={t('Item Name', '아이템 이름')}
                                        value={item.name}
                                        onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                                    />
                                    <textarea 
                                        className="text-xs text-gray-600 w-full resize-none outline-none bg-transparent placeholder:text-gray-300 h-12"
                                        placeholder={t('Description & Notes...', '설명 및 노트...')}
                                        value={item.description || ''}
                                        onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                                    />
                                    {selectedFrameId && (
                                        <div 
                                            onClick={() => toggleFrameLink(item.id, selectedFrameId)}
                                            className={`mt-2 p-2 rounded text-xs font-bold cursor-pointer text-center border transition-colors ${item.linkedFrameIds.includes(selectedFrameId) ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                                        >
                                            {item.linkedFrameIds.includes(selectedFrameId) ? t('Linked to Frame', '프레임에 연결됨') : t('Link to Frame', '프레임에 연결')}
                                        </div>
                                    )}
                                </div>

                                <div className="p-2 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                                    <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50">
                                        <Trash2 size={14}/>
                                    </button>
                                    <button 
                                        onClick={() => handleUpdateItem(item.id, { status: item.status === 'DRAFT' ? 'CONFIRMED' : 'DRAFT' })}
                                        className={`p-1.5 rounded hover:bg-gray-200 ${item.status === 'CONFIRMED' ? 'text-green-600' : 'text-gray-400'}`}
                                    >
                                        <CheckCircle2 size={16}/>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {categoryItems.length === 0 && (
                        <div onClick={handleAddItem} className="h-64 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                            <Plus size={32} className="mb-2"/>
                            <span className="text-sm font-medium">{t('Add First Item', '첫 아이템 추가')}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <DeckRail 
            slides={project.deck.slides}
            selectedSlideId={null}
            onSelectSlide={() => {}}
            onAddSlide={() => {}}
            onDeleteSlide={() => {}}
            onReorderSlides={() => {}}
        />
    </div>
  );
};

export default DirectionBoardPage;
