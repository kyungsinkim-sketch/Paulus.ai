import React, { useState, useEffect, useRef } from 'react';
import { Project, Slide, Language, TextBlock, ImageBlock, ContentBlock, TextBlockFormatting, StoryboardFrameBlock } from '../types';
import { generateCopyVariations, refineScript, generateCreativeImage } from '../services/geminiService';
import { 
  Type, 
  Image as ImageIcon, 
  Sparkles, 
  Loader2, 
  Check, 
  RefreshCw, 
  Wand2, 
  AlignLeft,
  AlignCenter,
  AlignRight, 
  ArrowRight, 
  LayoutTemplate,
  MessageSquare,
  CheckCircle2,
  Upload,
  Plus,
  Bold,
  Italic,
  FileText,
  Film
} from 'lucide-react';

interface CopyScriptPageProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  language: Language;
}

const DEFAULT_SCRIPT_TEMPLATE = `Block 1:
Screen: Morning dining space. A chair quietly enters the frame.
Narration: “We spend more time sitting than we realize.”

Block 2:
Screen: A person sits down. The seat gently compresses and stabilizes.
Narration: “That’s why a chair must be more than just beautiful.”`;

const CopyScriptPage: React.FC<CopyScriptPageProps> = ({ project, onUpdateProject, language }) => {
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(project.deck.slides.length > 0 ? project.deck.slides[0].id : null);
  const [activeTab, setActiveTab] = useState<'COPY' | 'SCRIPT'>('COPY');
  
  const [copyPrompt, setCopyPrompt] = useState('');
  const [copyTone, setCopyTone] = useState('Professional');
  const [generatedCopies, setGeneratedCopies] = useState<Array<{ EN: string; KO: string }>>([]);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [selectedCopy, setSelectedCopy] = useState<{ EN: string; KO: string } | null>(null);

  const [customImage, setCustomImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [visualTextFormatting, setVisualTextFormatting] = useState<TextBlockFormatting>({
      alignment: 'center',
      fontSize: 32,
      fontStyle: 'normal',
      fontWeight: 'bold',
      top: 50,
      left: 50,
      color: '#ffffff'
  });
  
  const [isDraggingText, setIsDraggingText] = useState(false);
  const visualContainerRef = useRef<HTMLDivElement>(null);

  const [scriptContent, setScriptContent] = useState('');
  const [isRefiningScript, setIsRefiningScript] = useState(false);

  const t = (en: string, ko: string) => language === 'KO' ? ko : en;

  const selectedSlide = project.deck.slides.find(s => s.id === selectedSlideId);
  
  useEffect(() => {
      if (!scriptContent) {
          const scriptSlide = project.deck.slides.find(s => s.type === 'SCRIPT');
          if (scriptSlide) {
              const body = scriptSlide.blocks.find(b => b.type === 'BODY_TEXT') as TextBlock;
              if (body) {
                  setScriptContent(body.content.text);
              }
          } else {
              setScriptContent(DEFAULT_SCRIPT_TEMPLATE);
          }
      }
  }, []);

  const handleGenerateCopy = async () => {
      if (!copyPrompt.trim()) return;
      setIsGeneratingCopy(true);
      const results = await generateCopyVariations(copyPrompt, copyTone);
      setGeneratedCopies(results);
      setIsGeneratingCopy(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) setCustomImage(ev.target.result as string);
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleGenerateAIImage = async () => {
      const prompt = selectedCopy ? selectedCopy.EN : copyPrompt;
      if (!prompt) return;
      setIsGeneratingImage(true);
      const image = await generateCreativeImage(`Key Visual, High Quality, Advertising Style, ${prompt}`);
      if (image) setCustomImage(image);
      setIsGeneratingImage(false);
  };

  const handleDragStart = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingText(true);
  };

  const handleDragMove = (e: React.MouseEvent) => {
      if (!isDraggingText || !visualContainerRef.current) return;
      const rect = visualContainerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setVisualTextFormatting(prev => ({
          ...prev,
          left: Math.max(0, Math.min(100, x)),
          top: Math.max(0, Math.min(100, y))
      }));
  };

  const handleSyncToDeck = () => {
      if (!selectedCopy && !customImage) return;
      const newSlide: Slide = {
          id: `slide-kv-${Date.now()}`,
          pageNumber: project.deck.slides.length + 1,
          title: 'Key Visual',
          type: 'VISUAL',
          layout: 'BLANK',
          backgroundImage: customImage || undefined,
          blocks: [
              { id: `blk-${Date.now()}-img`, type: 'IMAGE', content: { url: customImage || '' } } as ImageBlock,
              { id: `blk-${Date.now()}-copy`, type: 'TITLE', content: { text: selectedCopy ? selectedCopy[language] : (copyPrompt || 'Key Visual'), formatting: visualTextFormatting }, bilingualContent: selectedCopy ? { EN: selectedCopy.EN, KO: selectedCopy.KO } : undefined } as TextBlock
          ],
          isFinal: false,
          syncStatus: 'SYNCED'
      };
      onUpdateProject({ ...project, deck: { ...project.deck, slides: [...project.deck.slides, newSlide] } });
      alert(t('Key Visual added as new slide.', '키 비주얼이 새 슬라이드로 추가되었습니다.'));
  };

  const handleRefineScript = async (action: 'GRAMMAR' | 'TONE' | 'EXPAND') => {
      if (!scriptContent.trim()) return;
      setIsRefiningScript(true);
      const result = await refineScript(scriptContent, action, language);
      setScriptContent(result); 
      setIsRefiningScript(false);
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
            <div className="w-[45%] bg-gray-100 flex flex-col border-r border-gray-200 relative overflow-y-auto custom-scrollbar">
                <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                        <ImageIcon size={16}/> {t('Key Visual Builder', '키 비주얼 빌더')}
                    </h3>
                    <div className="flex gap-2">
                        <label className="cursor-pointer bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1">
                            <Upload size={12}/> {t('Upload', '업로드')}
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload}/>
                        </label>
                        <button onClick={handleGenerateAIImage} disabled={isGeneratingImage || (!selectedCopy && !copyPrompt)} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50">
                            {isGeneratingImage ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} {t('AI Gen', 'AI 생성')}
                        </button>
                    </div>
                </div>
                <div className="shrink-0 flex items-center justify-center p-8 bg-gray-200/50 overflow-hidden relative min-h-[400px]">
                    <div ref={visualContainerRef} className="aspect-video w-full bg-white shadow-2xl rounded-sm overflow-hidden relative group cursor-crosshair" onMouseMove={handleDragMove} onMouseUp={() => setIsDraggingText(false)} onMouseLeave={() => setIsDraggingText(false)}>
                        {customImage ? <img src={customImage} className="w-full h-full object-cover pointer-events-none" /> : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                                <ImageIcon size={48} className="mb-2 opacity-20"/>
                                <p className="text-sm">{t('Upload or Generate Image', '이미지를 업로드하거나 생성하세요')}</p>
                            </div>
                        )}
                        <div className="absolute cursor-move select-none p-4" style={{ top: `${visualTextFormatting.top}%`, left: `${visualTextFormatting.left}%`, transform: 'translate(-50%, -50%)', textAlign: visualTextFormatting.alignment as any }} onMouseDown={handleDragStart}>
                            <h1 className="text-white drop-shadow-lg transition-all leading-tight" style={{ fontSize: `${visualTextFormatting.fontSize}px`, fontWeight: visualTextFormatting.fontWeight as any, fontStyle: visualTextFormatting.fontStyle as any, fontFamily: 'Inter, sans-serif' }}>
                                {selectedCopy ? selectedCopy[language] : (copyPrompt || t("Your Headline Here", "여기에 헤드라인 입력"))}
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-white border-t border-gray-200 grid grid-cols-2 gap-4 sticky bottom-0 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t('Typography', '타이포그래피')}</label>
                        <div className="flex gap-2">
                            <div className="flex bg-gray-100 rounded-lg p-1 flex-1">
                                {['left', 'center', 'right'].map((align: any) => (
                                    <button key={align} onClick={() => setVisualTextFormatting({ ...visualTextFormatting, alignment: align })} className={`flex-1 flex justify-center py-1 rounded ${visualTextFormatting.alignment === align ? 'bg-white shadow-sm' : 'text-gray-400'}`}>
                                        {align === 'left' ? <AlignLeft size={14}/> : align === 'center' ? <AlignCenter size={14}/> : <AlignRight size={14}/>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t('Text Size', '글꼴 크기')}: {visualTextFormatting.fontSize}px</label>
                        <input type="number" min="12" max="128" value={visualTextFormatting.fontSize as number} onChange={(e) => setVisualTextFormatting({ ...visualTextFormatting, fontSize: parseInt(e.target.value) })} className="w-full border border-gray-200 rounded p-1 text-xs" />
                    </div>
                </div>
            </div>

            <div className="w-[55%] flex flex-col bg-white">
                <div className="flex border-b border-gray-200 shrink-0">
                    <button onClick={() => setActiveTab('COPY')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'COPY' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                        <Type size={18}/> {t('Headlines & Slogans', '헤드라인 및 슬로건')}
                    </button>
                    <button onClick={() => setActiveTab('SCRIPT')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'SCRIPT' ? 'border-purple-600 text-purple-600 bg-purple-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                        <LayoutTemplate size={18}/> {t('Script & Narrative', '스크립트 및 내러티브')}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 relative custom-scrollbar">
                    {activeTab === 'COPY' && (
                        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700">{t('What message do you want to convey?', '어떤 메시지를 전달하고 싶으신가요?')}</label>
                                <div className="flex gap-2">
                                    <input type="text" value={copyPrompt} onChange={(e) => setCopyPrompt(e.target.value)} placeholder={t("e.g. Boundless freedom...", "예: 한계 없는 자유...")} className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" onKeyDown={(e) => e.key === 'Enter' && handleGenerateCopy()} />
                                    <button onClick={handleGenerateCopy} disabled={isGeneratingCopy || !copyPrompt} className="bg-blue-600 text-white px-5 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                                        {isGeneratingCopy ? <Loader2 className="animate-spin"/> : <Sparkles size={18}/>} {t('Generate', '생성')}
                                    </button>
                                </div>
                            </div>
                            {generatedCopies.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('AI Suggestions', 'AI 제안 카피')}</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {generatedCopies.map((copy, idx) => (
                                            <div key={idx} onClick={() => setSelectedCopy(copy)} className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md flex justify-between items-center group ${selectedCopy === copy ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-lg">{language === 'KO' ? copy.KO : copy.EN}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{language === 'KO' ? copy.EN : copy.KO}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'SCRIPT' && (
                        <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-center shrink-0">
                                <h3 className="text-sm font-bold text-gray-700">{t('Script Editor (30s Template)', '스크립트 에디터 (30초 템플릿)')}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => handleRefineScript('GRAMMAR')} disabled={isRefiningScript} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 flex items-center gap-1">
                                        <Check size={14}/> {t('Fix Grammar', '문법 교정')}
                                    </button>
                                    <button onClick={() => handleRefineScript('TONE')} disabled={isRefiningScript} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 flex items-center gap-1">
                                        <Wand2 size={14}/> {t('Adjust Tone', '톤 조정')}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 relative min-h-[300px]">
                                <textarea value={scriptContent} onChange={(e) => setScriptContent(e.target.value)} placeholder={t("Write your script here...", "여기에 스크립트를 작성하세요...")} className="w-full h-full p-6 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none resize-none font-mono text-sm leading-relaxed" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default CopyScriptPage;