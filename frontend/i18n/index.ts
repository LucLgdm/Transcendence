import en from './en.json';
import fr from './fr.json';
import pt from './pt.json';

type Lang = 'en' | 'fr' | 'pt';

const translations = {
  en,
  fr,
  pt,
};

let currentLang: Lang = 'en';

export function setLanguage(lang: Lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
}

export function getLanguage(): Lang {
  return currentLang;
}

export function initLanguage() {
  const saved = localStorage.getItem('lang') as Lang;
  if (saved && translations[saved]) {
    currentLang = saved;
  }
}

export function t(key: string): string {
  return translations[currentLang][key as keyof typeof en] || key;
}