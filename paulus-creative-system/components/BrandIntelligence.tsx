
import React, { useState } from 'react';
import { analyzeBrandIntelligence } from '../services/geminiService';
import { DeckTheme } from '../deck-editor';
import { Search, Sparkles, Loader2, Check, X, Palette, Globe, ExternalLink } from 'lucide-react';

interface BrandIntelligenceProps {
  onApplyTheme: (theme: Partial<DeckTheme>) => void;
  onClose: () => void;
}

const BrandIntelligence: React.FC<BrandIntelligenceProps> = ({ onApplyTheme, onClose }) => {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<Partial<DeckTheme> | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setIsAnalyzing(true);
    const result = await analyzeBrandIntelligence(url);
    setSuggestion(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Sparkles size={16} className="text-purple-600"/>
          Brand Intelligence
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
          <X size={18}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* URL Input */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Globe size={12}/> Client Website URL
          </label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://client-brand.com"
              className="flex-1 p-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || !url.trim()}
              className="px-4 py-2.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-gray-800 disabled:opacity-30 transition-all flex items-center gap-2"
            >
              {isAnalyzing ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>}
              Analyze
            </button>
          </div>
          <p className="text-[10px] text-gray-400">AI will extract colors and font styles from the landing page signature.</p>
        </div>

        {/* Suggestion Preview */}
        {suggestion && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/30 space-y-4">
              <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-2">
                <Palette size={14}/> Proposed Deck Theme
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Primary</span>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded border border-gray-200 shadow-sm" style={{ backgroundColor: suggestion.primaryColor }} />
                    <span className="text-xs font-mono text-gray-600">{suggestion.primaryColor}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Secondary</span>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded border border-gray-200 shadow-sm" style={{ backgroundColor: suggestion.secondaryColor }} />
                    <span className="text-xs font-mono text-gray-600">{suggestion.secondaryColor}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Background</span>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded border border-gray-200 shadow-sm" style={{ backgroundColor: suggestion.bgColor }} />
                    <span className="text-xs font-mono text-gray-600">{suggestion.bgColor}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Text</span>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded border border-gray-200 shadow-sm" style={{ backgroundColor: suggestion.textColor }} />
                    <span className="text-xs font-mono text-gray-600">{suggestion.textColor}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-purple-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Primary Font</span>
                  <span className="text-sm font-medium text-gray-800">{suggestion.fontFamilyPrimary}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Accent Font</span>
                  <span className="text-sm font-medium text-gray-800">{suggestion.fontFamilySecondary}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setSuggestion(null)}
                className="flex-1 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              >
                Discard
              </button>
              <button 
                onClick={() => { onApplyTheme(suggestion); onClose(); }}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-100"
              >
                <Check size={14}/>
                Apply Theme
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!suggestion && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
            <Palette size={48} strokeWidth={1} className="mb-4 text-gray-400"/>
            <p className="text-xs font-bold uppercase tracking-tight text-gray-500">No suggestions yet</p>
            <p className="text-[10px] max-w-[150px] mt-1 leading-relaxed text-gray-400">Enter a URL to see how AI interprets the brand's visual identity.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandIntelligence;
