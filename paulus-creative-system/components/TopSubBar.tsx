
import React from 'react';
import { Language } from '../types';
import LanguageToggle from './LanguageToggle';
import { Globe, MessageSquare } from 'lucide-react';

interface TopSubBarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isProjectActive?: boolean;
  isChatOpen?: boolean;
  onToggleChat?: () => void;
}

const TopSubBar: React.FC<TopSubBarProps> = ({ 
  language, 
  onLanguageChange, 
  isProjectActive,
  isChatOpen,
  onToggleChat
}) => {
  return (
    <div className="h-10 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-40">
      <div className="flex items-center gap-2">
        <Globe size={12} className="text-gray-300" />
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
          AI Translation Layer Active
        </span>
      </div>
      <div className="flex items-center gap-3">
        {isProjectActive && (
          <button 
            onClick={onToggleChat}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-2 group relative ${
              isChatOpen 
                ? 'bg-blue-50 text-blue-600 shadow-inner' 
                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
            }`}
            title="Toggle Project Chat"
          >
            <MessageSquare size={16} />
            <span className={`text-[9px] font-black uppercase tracking-tight ${isChatOpen ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
              Team Chat
            </span>
            {/* Visual unread badge placeholder (R14-3) */}
            {!isChatOpen && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full border border-white"></span>
            )}
          </button>
        )}
        <div className="h-4 w-px bg-gray-100 mx-1" />
        <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter mr-1">
          Working Language:
        </span>
        <LanguageToggle language={language} onToggle={onLanguageChange} />
      </div>
    </div>
  );
};

export default TopSubBar;
