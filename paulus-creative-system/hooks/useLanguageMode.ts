
import { useState, useCallback } from 'react';
import { Language } from '../types';

/**
 * PAULUS.AI — Language Mode Hook
 * Manages global UI language state and default translation direction.
 */
export const useLanguageMode = (initialLanguage: Language = 'EN') => {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'EN' ? 'KO' : 'EN');
  }, []);

  return { 
    language, 
    setLanguage, 
    toggleLanguage 
  };
};
