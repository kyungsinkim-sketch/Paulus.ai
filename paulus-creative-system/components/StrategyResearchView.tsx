
import React, { useState, useMemo } from 'react';
import { Project, StrategySection, StrategySectionType, Language } from '../types';
import { generateStrategyReport } from '../services/geminiService';
import { DeckYjsAdapter } from '../services/deckYjsService';
import { SlideStyleType, ElementType } from '../deck-editor';
import { Loader2, Sparkles, Target, TrendingUp, ArrowRight, Globe, Swords, Lightbulb, Compass, MessageSquare, RefreshCw } from 'lucide-react';

interface StrategyResearchViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  onProceed: () => void;
  language: Language;
}

const StrategyResearchView: React.FC<StrategyResearchViewProps> = ({ project, onUpdateProject, onProceed, language }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const adapter = useMemo(() => new DeckYjsAdapter(), []);

  const t = (en: string, ko: string) => language === 'KO' ? ko : en;

  const strategySections: { type: StrategySectionType; label: string; icon: React.ReactNode }[] = [
    { type: 'BACKGROUND', label: t('Market Overview', '시장 상황 개요'), icon: <Globe size={20} className="text-blue-600"/> },
    { type: 'PROBLEM', label: t('Competitor Analysis', '경쟁사 분석'), icon: <Swords size={20} className="text-red-600"/> },
    { type: 'AUDIENCE', label: t('Audience Insight', '타겟 소비자 인사이트'), icon: <Target size={20} className="text-emerald-600"/> },
    { type: 'STRATEGY', label: t('Brand Positioning', '브랜드 포지셔닝'), icon: <Compass size={20} className="text-purple-600"/> },
    { type: 'INSIGHTS', label: t('Key Strategic Insight', '핵심 전략 인사이트'), icon: <Lightbulb size={20} className="text-yellow-500"/> },
    { type: 'KEY_MESSAGE', label: t('Core Campaign Message', '캠페인 핵심 메시지'), icon: <MessageSquare size={20} className="text-indigo-600"/> }
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
        const generated = await generateStrategyReport(project.brief, language);
        
        // --- RSR-DECK PIPELINE RESTORATION ---
        // Load existing DeckDoc into Yjs adapter
        const currentDeckDoc = project.deck; // Assuming project.deck holds the DeckDoc in this context
        // If project.deck is legacy, we use the adapter to bridge, but here we assume canonical flow
        
        const newStrategies: StrategySection[] = [];
        
        // Atomic transaction for all slide updates
        adapter.transact(() => {
            generated.forEach((sec, idx) => {
                const sectionType = sec.type as StrategySectionType;
                const existingSection = project.strategyResearch.find(s => s.type === sectionType);
                
                let slideId = existingSection?.linkedSlideId;
                
                if (!slideId) {
                    // STEP A: Create deterministic Strategy Slide (Standard Style)
                    slideId = adapter.addSlide(SlideStyleType.Standard);
                }

                // STEP B: Find Left Main Text element (x≈6, y≈15, w≈42, h≈70)
                // spawnElements(Standard) creates an element with id 'body' at these coords
                const exportedDeck = adapter.exportToJSON();
                const slideIndex = exportedDeck.slides.findIndex(s => s.id === slideId);
                const targetSlide = exportedDeck.slides[slideIndex];
                
                if (targetSlide) {
                    const bodyElement = targetSlide.elements.find(el => 
                        el.id === 'body' || (el.type === ElementType.text && Math.abs(el.transform.x - 6) < 1)
                    );

                    if (bodyElement && !bodyElement.locked) {
                        adapter.updateTextContent(bodyElement.id, sec.content || "");
                    }
                }

                newStrategies.push({
                    id: existingSection?.id || `sec-${Date.now()}-${idx}`,
                    type: sectionType,
                    title: sec.title || 'Untitled Section',
                    content: sec.content || "",
                    linkedSlideId: slideId
                });
            });
        });

        const updatedDeckDoc = adapter.exportToJSON();

        onUpdateProject({ 
            ...project, 
            strategyResearch: newStrategies, 
            deck: updatedDeckDoc // Now writing to the canonical DeckDoc
        });
        
        alert(t('Strategy report generated and synced to Deck Editor.', '전략 리서치가 생성되었으며 덱 에디터와 동기화되었습니다.'));
    } catch (e) {
        console.error("Strategy generation failed", e);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleContentChange = (sectionId: string, newContent: string) => {
      const section = project.strategyResearch.find(s => s.id === sectionId);
      if (section?.linkedSlideId) {
          // Sync manual edits back to the slide
          const exported = adapter.exportToJSON();
          const slide = exported.slides.find(s => s.id === section.linkedSlideId);
          const bodyEl = slide?.elements.find(el => el.id === 'body');
          if (bodyEl) {
              adapter.updateTextContent(bodyEl.id, newContent);
          }
      }

      const updated = project.strategyResearch.map(s => s.id === sectionId ? { ...s, content: newContent } : s);
      onUpdateProject({ 
          ...project, 
          strategyResearch: updated,
          deck: adapter.exportToJSON()
      });
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
        <div className="px-12 py-8 border-b border-gray-100 bg-white z-10 sticky top-0 flex justify-between items-center">
          <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">{t('Strategy Research & Framework', '전략 리서치 및 프레임워크')}</h1>
              <p className="text-gray-500 text-sm">{t('AI-driven market analysis and brand strategy formulation.', 'AI 기반 시장 분석 및 브랜드 전략 수립 단계입니다.')}</p>
          </div>
          <div className="flex gap-3">
              <button 
                onClick={handleGenerate} 
                disabled={isGenerating} 
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 flex items-center gap-2 transition-all shadow-lg shadow-purple-100"
              >
                  {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>} 
                  {t('Auto-Generate Strategy', '전략 자동 생성')}
              </button>
              <button 
                onClick={onProceed} 
                className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-gray-800 flex items-center gap-2"
              >
                  {t('Proceed to Ideation', '아이디어 발상으로 이동')} <ArrowRight size={16}/>
              </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="max-w-4xl mx-auto px-12 py-12 pb-32">
                {project.strategyResearch.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200 text-center">
                        <TrendingUp size={48} className="text-blue-100 mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('No strategy data yet', '아직 생성된 전략이 없습니다')}</h2>
                        <p className="text-gray-500 max-w-sm text-sm">{t("Click 'Auto-Generate' to build your strategic framework from the brief.", "브리프를 기반으로 전략적 프레임워크를 구축하려면 '전략 자동 생성' 버튼을 클릭하세요.")}</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {strategySections.map((meta) => {
                            const section = project.strategyResearch.find(s => s.type === meta.type);
                            if (!section) return null;
                            return (
                                <div key={section.id} className="group">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm">{meta.icon}</div>
                                            <h2 className="text-xl font-bold text-gray-900">{meta.label}</h2>
                                        </div>
                                        {section.linkedSlideId && (
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                                <RefreshCw size={10} className="animate-spin-slow" /> {t('Deck Synced', '덱 동기화됨')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 hover:shadow-md transition-shadow relative min-h-[160px]">
                                        <div 
                                            contentEditable 
                                            suppressContentEditableWarning 
                                            className="prose prose-sm max-w-none focus:outline-none text-gray-700 leading-relaxed outline-none min-h-[100px]" 
                                            onBlur={(e) => handleContentChange(section.id, e.currentTarget.innerText)}
                                        >
                                            {section.content}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default StrategyResearchView;
