
import React, { useState, useEffect, useRef } from 'react';
import { Project, Brief, BriefSource, Language, BriefProblemDefinition, User } from '../types';
import { analyzeBrief, translateText, generateText } from '../services/geminiService';
import { 
  FileText, 
  UploadCloud, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Save, 
  Bot, 
  Globe, 
  X, 
  FileBox, 
  Layout, 
  Zap, 
  HelpCircle, 
  AlertTriangle, 
  Lightbulb, 
  Target, 
  MessageSquare, 
  Send, 
  Database
} from 'lucide-react';

interface ClientBriefViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  onProceed: () => void;
  language: Language;
  currentUser: User;
}

const ClientBriefView: React.FC<ClientBriefViewProps> = ({ project, onUpdateProject, onProceed, language, currentUser }) => {
  const [rawInput, setRawInput] = useState(project.brief.rawText || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showRawSourceModal, setShowRawSourceModal] = useState(false);
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const t = (en: string, ko: string) => language === 'KO' ? ko : en;

  const briefFields: { key: string; label: string; icon: any }[] = [
    { key: 'overview', label: t('Project Overview', '프로젝트 개요'), icon: FileText },
    { key: 'objectives', label: t('Objectives (Goals & KPIs)', '목표 (성과 지표)'), icon: Target },
    { key: 'targetAudience', label: t('Target Audience', '타겟 오디언스'), icon: MessageSquare },
    { key: 'keyMessage', label: t('Key Message (AI Candidate)', '핵심 메시지 (AI 후보)'), icon: Zap },
    { key: 'competitors', label: t('Competitors & Market', '경쟁사 및 시장 상황'), icon: Globe },
    { key: 'brandTone', label: t('Brand Positioning & Tone', '브랜드 톤앤매너'), icon: Layout },
    { key: 'deliverablesChannels', label: t('Deliverables & Channels', '산출물 및 채널'), icon: FileBox },
    { key: 'timelineBudget', label: t('Timeline & Budget', '일정 및 예산'), icon: MessageSquare },
  ];

  const ensureTranslation = async (fieldKey: string, sourceValue: string) => {
    if (!sourceValue || isTranslating[fieldKey]) return;
    
    const existing = project.brief.translations?.[fieldKey];
    if (existing?.[language]) return;

    setIsTranslating(prev => ({ ...prev, [fieldKey]: true }));
    try {
        const translated = await translateText(sourceValue, language);
        const currentTranslations = project.brief.translations || {};
        const fieldTrans = currentTranslations[fieldKey] || { EN: '', KO: '' };
        
        const originalLang: Language = language === 'KO' ? 'EN' : 'KO';
        fieldTrans[originalLang] = sourceValue;
        fieldTrans[language] = translated;

        onUpdateProject({
            ...project,
            brief: {
                ...project.brief,
                translations: {
                    ...currentTranslations,
                    [fieldKey]: fieldTrans
                }
            }
        });
    } catch (e) {
        console.error("Translation failed", e);
    } finally {
        setIsTranslating(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  useEffect(() => {
    briefFields.forEach(f => {
        const val = (project.brief as any)[f.key];
        if (val) ensureTranslation(f.key, val);
    });
    const pd = project.brief.problemDefinition;
    if (pd.statement) ensureTranslation('pd_statement', pd.statement);
    if (pd.why) ensureTranslation('pd_why', pd.why);
    if (pd.cause) ensureTranslation('pd_cause', pd.cause);
  }, [language, project.brief]);

  const performAnalysis = async (input: string | { data: string, mimeType: string }) => {
    setIsAnalyzing(true);
    try {
        const result = await analyzeBrief(input);
        
        const newBriefData: Brief = {
            ...project.brief,
            rawText: typeof input === 'string' ? input : project.brief.rawText,
            problemDefinition: {
                ...result.problemDefinition,
                isConfirmed: false,
                translations: {
                  statement: { EN: '', KO: '' },
                  why: { EN: '', KO: '' },
                  cause: { EN: '', KO: '' }
                }
            },
            gaps: result.gaps || [],
            assumptions: result.assumptions || [],
            translations: {} 
        };

        const newSources: Record<string, BriefSource> = {};
        
        result.categories.forEach((cat: any) => {
            const fieldKey = cat.key.toLowerCase().replace(/_([a-z])/g, (g:any) => g[1].toUpperCase()) as keyof Brief;
            (newBriefData as any)[fieldKey] = cat.content;
            newSources[fieldKey as string] = 'AI_EXTRACTED';
        });

        onUpdateProject({
            ...project,
            brief: { ...newBriefData, sources: newSources }
        });
        setShowRawSourceModal(false);
    } catch (err) {
        console.error("Analysis failed", err);
        alert("AI could not parse this document.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
      const currentTranslations = project.brief.translations || {};
      const fieldTrans = currentTranslations[key] || { EN: '', KO: '' };
      fieldTrans[language] = value;

      onUpdateProject({ 
          ...project, 
          brief: { 
              ...project.brief, 
              [key]: value,
              translations: { ...currentTranslations, [key]: fieldTrans },
              sources: { ...project.brief.sources, [key]: 'USER_EDITED' as BriefSource }
          } 
      });
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    setIsChatting(true);
    const userMsg = chatInput;
    setChatInput('');
    
    const systemMsg = `You are a professional Creative Strategist. Help the user refine their client brief. 
    Current Brief Context: ${JSON.stringify(project.brief)}. 
    Provide strategic feedback.`;

    try {
        const response = await generateText(userMsg, systemMsg);
        const aiMsg: any = {
            id: `msg-${Date.now()}`,
            userId: 'ai-bot',
            text: response,
            timestamp: new Date().toISOString(),
            type: 'AI_GENERATED'
        };
        onUpdateProject({ ...project, chatHistory: [...project.chatHistory, aiMsg] });
    } catch (e) {
        console.error("Chat failed", e);
    } finally {
        setIsChatting(false);
    }
  };

  const getDisplayValue = (fieldKey: string, defaultValue: string = '') => {
      const trans = project.brief.translations?.[fieldKey];
      return trans?.[language] || defaultValue || '';
  };

  return (
    <div className="flex h-full bg-[#f8fafc] overflow-hidden">
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative">
          <div className="px-12 py-8 bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
              <div className="max-w-5xl mx-auto flex justify-between items-center">
                  <div>
                      <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-3">
                          <Bot className="text-blue-600" size={28}/>
                          {t('Client Brief Intelligence', '클라이언트 브리프 인텔리전스')}
                      </h1>
                      <p className="text-gray-500 text-sm mt-1">
                          {t('Transforming raw data into strategic foundations.', '원천 자료를 전략적 토대로 변환합니다.')}
                      </p>
                  </div>
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setShowRawSourceModal(true)}
                        className="px-4 py-2 border border-blue-100 bg-blue-50/50 rounded-xl text-blue-600 font-bold text-xs hover:bg-blue-50 transition-all flex items-center gap-2"
                      >
                        <Database size={16}/> {t('Raw Source', '원천 자료')}
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-bold text-xs hover:bg-gray-50 transition-all flex items-center gap-2"
                      >
                        <UploadCloud size={16}/> {uploadedFileName || t('Upload File', '파일 업로드')}
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                              setUploadedFileName(file.name);
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                  const base64 = (ev.target?.result as string).split(',')[1];
                                  performAnalysis({ data: base64, mimeType: file.type });
                              };
                              reader.readAsDataURL(file);
                          }
                      }}/>
                      <button 
                        onClick={() => performAnalysis(rawInput)}
                        disabled={isAnalyzing || !rawInput.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                          {isAnalyzing ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
                          {t('Analyze Brief', '브리프 분석 실행')}
                      </button>
                  </div>
              </div>
          </div>

          <div className="max-w-5xl mx-auto w-full p-12 space-y-12">
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><AlertCircle size={120} /></div>
                    <div className="relative z-10 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-blue-300 flex items-center gap-2">
                                <Zap size={14}/> Problem Definition Layer
                            </h2>
                            {!project.brief.problemDefinition.isConfirmed && (
                                <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                                    AI Draft – Needs Confirmation
                                </span>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block mb-2">Core Problem Statement</label>
                                <div className="relative">
                                    <textarea 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-lg font-bold outline-none focus:bg-white/10 transition-all resize-none"
                                        value={getDisplayValue('pd_statement', project.brief.problemDefinition.statement)}
                                        onChange={(e) => handleFieldChange('pd_statement', e.target.value)}
                                        rows={2}
                                    />
                                    {isTranslating['pd_statement'] && <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center rounded-xl"><Loader2 size={24} className="animate-spin text-white"/></div>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="relative">
                                    <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block mb-2">The "Why"</label>
                                    <textarea 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:bg-white/10 transition-all"
                                        value={getDisplayValue('pd_why', project.brief.problemDefinition.why)}
                                        onChange={(e) => handleFieldChange('pd_why', e.target.value)}
                                        rows={3}
                                    />
                                    {isTranslating['pd_why'] && <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center rounded-xl"><Loader2 size={16} className="animate-spin text-white"/></div>}
                                </div>
                                <div className="relative">
                                    <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block mb-2">Root Cause</label>
                                    <textarea 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:bg-white/10 transition-all"
                                        value={getDisplayValue('pd_cause', project.brief.problemDefinition.cause)}
                                        onChange={(e) => handleFieldChange('pd_cause', e.target.value)}
                                        rows={3}
                                    />
                                    {isTranslating['pd_cause'] && <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center rounded-xl"><Loader2 size={16} className="animate-spin text-white"/></div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-6 pb-20">
                {briefFields.map((field) => (
                    <div key={field.key} className="bg-white rounded-[1.5rem] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all group relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:text-blue-500 transition-colors">
                                    <field.icon size={18}/>
                                </div>
                                <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">{field.label}</h4>
                            </div>
                        </div>
                        <div className="relative">
                            <textarea 
                                className="w-full text-sm text-gray-600 leading-relaxed outline-none border-none bg-transparent resize-none min-h-[100px]"
                                value={getDisplayValue(field.key, (project.brief as any)[field.key])}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                placeholder={t("Waiting for analysis...", "분석을 대기 중...")}
                            />
                            {isTranslating[field.key] && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
                                    <Loader2 size={20} className="animate-spin text-blue-500"/>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </section>
          </div>
      </div>

      {showRawSourceModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
                  <div className="h-16 bg-gray-50 border-b border-gray-100 flex items-center justify-between px-8 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200"><Database size={20}/></div>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Raw Source Material</h3>
                      </div>
                      <button onClick={() => setShowRawSourceModal(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-4 flex-1 flex flex-col">
                      <p className="text-xs text-gray-500 font-medium leading-relaxed">
                          {t("Paste raw text or meeting transcripts for strategic analysis.", "심층 분석을 위해 회의록이나 요청서 원문을 붙여넣으세요.")}
                      </p>
                      <textarea 
                          className="w-full flex-1 min-h-[300px] bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-gray-700 resize-none"
                          placeholder={t("Enter raw source...", "원천 자료 입력...")}
                          value={rawInput}
                          onChange={(e) => setRawInput(e.target.value)}
                      />
                  </div>
                  <div className="h-20 bg-gray-50 border-t border-gray-100 flex items-center justify-end px-8 gap-4 shrink-0">
                      <button onClick={() => setShowRawSourceModal(false)} className="px-6 py-2.5 text-[11px] font-black uppercase text-gray-500 hover:text-gray-900 transition-colors">Close</button>
                      <button 
                        onClick={() => performAnalysis(rawInput)}
                        disabled={isAnalyzing || !rawInput.trim()}
                        className="px-10 py-2.5 bg-gray-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-black transition-all flex items-center gap-3 disabled:opacity-30"
                      >
                          {isAnalyzing ? <Loader2 size={16} className="animate-spin text-blue-400"/> : <Sparkles size={16}/>}
                          {t('Analyze Now', '분석 시작')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-2xl z-30">
          <div className="h-16 px-6 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
               <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                 <Sparkles size={16} className="text-blue-600"/> Brief Assistant
               </h3>
               <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold uppercase tracking-widest">Active</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar" ref={scrollRef}>
              {project.chatHistory.filter(m => m.userId === 'ai-bot' || m.userId === currentUser.id).map((msg) => (
                  <div key={msg.id} className={`flex ${msg.userId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] shadow-sm ${
                          msg.userId === currentUser.id ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                      }`}>{msg.text}</div>
                  </div>
              ))}
          </div>
          <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 ring-offset-2 transition-all">
                  <input 
                    type="text" 
                    className="flex-1 bg-transparent border-none outline-none text-xs px-2"
                    placeholder={t("Refine brief with AI...", "AI와 함께 브리프 고도화...")}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button onClick={handleSendMessage} disabled={isChatting || !chatInput.trim()} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"><Send size={16}/></button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ClientBriefView;
