
import React from 'react';
import { Language } from '../types';

interface LanguageToggleProps {
  language: Language;
  onToggle: (lang: Language) => void;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ language, onToggle }) => {
  return (
    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 shadow-inner">
      <button
        onClick={() => onToggle('KO')}
        className={`px-3 py-1 rounded-md text-[10px] font-black transition-all duration-200 ${
          language === 'KO' 
            ? 'bg-white text-blue-600 shadow-sm border border-gray-100' 
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        KOR
      </button>
      <button
        onClick={() => onToggle('EN')}
        className={`px-3 py-1 rounded-md text-[10px] font-black transition-all duration-200 ${
          language === 'EN' 
            ? 'bg-white text-blue-600 shadow-sm border border-gray-100' 
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        ENG
      </button>
    </div>
  );
};

export default LanguageToggle;
