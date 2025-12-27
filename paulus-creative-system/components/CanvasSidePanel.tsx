import React, { useState, useEffect } from 'react';
import { CanvasItem, Language } from '../types';
import { 
  Presentation, 
  Sparkles, 
  Wand2, 
  RefreshCw, 
  Check, 
  X, 
  Trash2, 
  Palette, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Type, 
  Info,
  Clock,
  Link as LinkIcon,
  Tag,
  List
} from 'lucide-react';

interface CanvasSidePanelProps {
  selectedItems: CanvasItem[];
  onUpdateItems: (updates: Partial<CanvasItem>[]) => void;
  onSyncAction: (itemId: string, direction: 'TO_DECK' | 'TO_CANVAS') => void;
  onAIAction: (action: 'REWRITE' | 'SUMMARIZE' | 'GENERATE_IMAGE' | 'DRAFT_SLIDE') => void;
  onAddToDeck?: (itemId: string, targetSlideId: 'NEW') => void;
  onDelete?: (ids: string[]) => void;
  onAutoDraft?: (items: CanvasItem[]) => void;
  onClose: () => void;
  isProcessingAI: boolean;
  language: Language;
  aiDraftResult?: { title: string; bullets: string[]; type: string } | null;
  onCreateSlideFromDraft?: (draft: { title: string; bullets: string[]; type: string }) => void;
}

const SectionHeader: React.FC<{ title: string; icon?: React.ElementType }> = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
        {Icon && <Icon size={12} />}
        <span>{title}</span>
    </div>
);

const Divider = () => <hr className="border-gray-100 my-4" />;

const NodePropertiesSection: React.FC<{ 
    item: CanvasItem; 
    onUpdate: (updates: Partial<CanvasItem>) => void; 
    onDelete: () => void;
    onExport: () => void;
    t: (en: string, ko: string) => string;
}> = ({ item, onUpdate, onDelete, onExport, t }) => {
    const colors = ['#fef3c7', '#dbeafe', '#d1fae5', '#fee2e2', '#f3f4f6', '#ffffff'];
    return (
        <div className="space-y-4">
            <SectionHeader title={t("Node Properties", "노드 속성")} icon={Palette} />
            <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-2 block">{t("Background Color", "배경 색상")}</label>
                <div className="flex gap-2 flex-wrap">
                    {colors.map(c => (
                        <button key={c} onClick={() => onUpdate({ color: c })} className={`w-6 h-6 rounded-full border border-gray-200 transition-transform hover:scale-110 ${item.color === c ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`} style={{ backgroundColor: c }} />
                    ))}
                </div>
            </div>
            <div className="flex gap-2 pt-1">
                <button onClick={onDelete} className="flex-1 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 flex items-center justify-center gap-1 transition-colors"><Trash2 size={14}/> {t("Delete", "삭제")}</button>
                <button onClick={onExport} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-gray-800 flex items-center justify-center gap-1 transition-colors shadow-sm"><Presentation size={14}/> {t("To Deck", "덱으로")}</button>
            </div>
        </div>
    );
};

const TextPropertiesSection: React.FC<{ 
    item: CanvasItem; 
    onUpdate: (updates: Partial<CanvasItem>) => void;
    t: (en: string, ko: string) => string;
}> = ({ item, onUpdate, t }) => {
    const activeStyle = item.textStyle || {};

    const onTextStyleChange = (type: string, value?: any) => {
        const event = new CustomEvent('CANVAS_TEXT_FORMAT', { detail: { type, value } });
        window.dispatchEvent(event);

        const newStyle = { ...activeStyle };
        if (type === 'bold') newStyle.bold = !activeStyle.bold;
        else if (type === 'italic') newStyle.italic = !activeStyle.italic;
        else if (type === 'underline') newStyle.underline = !activeStyle.underline;
        else if (type === 'align') newStyle.align = value;
        else if (type === 'fontSize') newStyle.fontSize = value;
        else if (type === 'list') newStyle.listType = value;
        
        onUpdate({ textStyle: newStyle });
    };

    const preventFocusLoss = (e: React.MouseEvent) => e.preventDefault();

    return (
        <div className="space-y-4">
            <SectionHeader title={t("Text Formatting", "텍스트 서식")} icon={Type} />
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onMouseDown={preventFocusLoss} onClick={() => onTextStyleChange('bold')} className={`flex-1 p-1.5 flex justify-center rounded hover:shadow-sm transition-colors ${activeStyle.bold ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><Bold size={14}/></button>
                <button onMouseDown={preventFocusLoss} onClick={() => onTextStyleChange('italic')} className={`flex-1 p-1.5 flex justify-center rounded hover:shadow-sm transition-colors ${activeStyle.italic ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><Italic size={14}/></button>
                <button onMouseDown={preventFocusLoss} onClick={() => onTextStyleChange('underline')} className={`flex-1 p-1.5 flex justify-center rounded hover:shadow-sm transition-colors ${activeStyle.underline ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><Underline size={14}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onMouseDown={preventFocusLoss} onClick={() => onTextStyleChange('align', 'left')} className={`flex-1 p-1.5 flex justify-center rounded ${!activeStyle.align || activeStyle.align === 'left' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><AlignLeft size={14}/></button>
                    <button onMouseDown={preventFocusLoss} onClick={() => onTextStyleChange('align', 'center')} className={`flex-1 p-1.5 flex justify-center rounded ${activeStyle.align === 'center' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><AlignCenter size={14}/></button>
                    <button onMouseDown={preventFocusLoss} onClick={() => onTextStyleChange('align', 'right')} className={`flex-1 p-1.5 flex justify-center rounded ${activeStyle.align === 'right' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><AlignRight size={14}/></button>
                </div>
                <button onMouseDown={preventFocusLoss} onClick={() => onTextStyleChange('list', 'bullet')} className={`w-full h-full bg-gray-100 rounded-lg flex items-center justify-center gap-2 transition-colors ${activeStyle.listType === 'bullet' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' : 'text-gray-600'}`}><List size={14}/> <span className="text-xs font-bold">{t("List", "리스트")}</span></button>
            </div>
        </div>
    );
};

const CanvasSidePanel: React.FC<CanvasSidePanelProps> = ({ selectedItems, onUpdateItems, onSyncAction, onAIAction, onAddToDeck, onDelete, onAutoDraft, onClose, isProcessingAI, language }) => {
  const [showAutoDraftConfirm, setShowAutoDraftConfirm] = useState(false);
  if (selectedItems.length !== 1) return null;
  const activeItem = selectedItems[0];

  const t = (en: string, ko: string) => language === 'KO' ? ko : en;

  const handleUpdate = (updates: Partial<CanvasItem>) => {
      onUpdateItems([{ id: activeItem.id, ...updates }]);
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full flex flex-col shadow-2xl z-20 animate-in slide-in-from-right-10 duration-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white"><h3 className="font-bold text-gray-800 text-sm">{t("Properties", "상세 속성")}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded transition-colors"><X size={16}/></button></div>
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <NodePropertiesSection item={activeItem} onUpdate={handleUpdate} onDelete={() => onDelete && onDelete([activeItem.id])} onExport={() => onAddToDeck && onAddToDeck(activeItem.id, 'NEW')} t={t} />
            <Divider />
            <TextPropertiesSection item={activeItem} onUpdate={handleUpdate} t={t} />
            <Divider />
            
            <SectionHeader title={t("AI Assistant", "AI 어시스턴트")} icon={Sparkles} />
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onAIAction('REWRITE')} disabled={isProcessingAI} className="py-2.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 flex flex-col items-center gap-1 transition-colors"><Wand2 size={14} className="text-purple-500"/> {t("Rewrite", "문장 다듬기")}</button>
                <button onClick={() => onAIAction('SUMMARIZE')} disabled={isProcessingAI} className="py-2.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 flex flex-col items-center gap-1 transition-colors"><RefreshCw size={14} className="text-blue-500"/> {t("Summarize", "요약하기")}</button>
            </div>
            
            <button onClick={() => setShowAutoDraftConfirm(true)} disabled={isProcessingAI} className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-xs font-bold hover:from-purple-700 hover:to-blue-700 flex items-center justify-center gap-2 shadow-md transition-all"><Sparkles size={14}/> {t("Generate Draft Slides", "초안 슬라이드 생성")}</button>

            {showAutoDraftConfirm && (
                <div className="mt-4 bg-purple-50 rounded-xl border border-purple-100 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-start"><h4 className="font-bold text-purple-900 text-xs">{t("Generate Auto-Draft?", "AI 초안을 생성할까요?")}</h4><button onClick={() => setShowAutoDraftConfirm(false)} className="text-purple-400 hover:text-purple-600"><X size={12}/></button></div>
                    <button onClick={() => { if (onAutoDraft) onAutoDraft([activeItem]); setShowAutoDraftConfirm(false); }} disabled={isProcessingAI} className="w-full py-1.5 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 flex items-center justify-center gap-1">{isProcessingAI ? <RefreshCw size={10} className="animate-spin"/> : <Check size={10}/>} {t("Confirm", "확인")}</button>
                </div>
            )}
        </div>
    </div>
  );
};
export default CanvasSidePanel;