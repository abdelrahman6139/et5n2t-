import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { storage } from './utils/storage';

type Lang = 'ar' | 'en';

type Dict = Record<string, { ar: string; en: string; }>;

const DICT: Dict = {
  'logout': { ar: 'تسجيل الخروج', en: 'Logout' },
  'closeShift': { ar: 'إغلاق الشيفت', en: 'Close Shift' },
  'closeDay': { ar: 'إغلاق اليوم', en: 'Close Day' },
  'closingTitle': { ar: 'الإغلاق اليومي والشيفت', en: 'Shift & Day Closing' },
  'closingDesc': { ar: 'اختر الإجراء المناسب لإنهاء الشيفت أو اليوم المالي.', en: 'Choose an action to end the current shift or the financial day.' },
  'hasOpenTables': { ar: 'لا يمكنك الإغلاق لوجود طاولات مفتوحة.', en: 'You cannot close while tables are open.' },
  'confirmShift': { ar: 'هل أنت متأكد من إغلاق الشيفت؟ سيتم طباعة تقرير وتصفير رقم الفاتورة.', en: 'Close the shift? A report will be printed and the invoice number will reset.' },
  'confirmDay': { ar: 'هل أنت متأكد من إغلاق اليوم؟ سيتم طباعة التقرير الشامل وتصفير العدادات.', en: 'Close the day? A full report will be printed and counters will reset.' },
  'themeLight': { ar: 'وضع فاتح', en: 'Light' },
  'themeDark': { ar: 'وضع داكن', en: 'Dark' },
  'langArabic': { ar: 'العربية', en: 'Arabic' },
  'langEnglish': { ar: 'الإنجليزية', en: 'English' },
};

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang)=>void; t: (k: string)=>string }>({
  lang: 'ar', setLang: ()=>{}, t: (k)=>k
});

export const LangProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(storage.get<Lang>('pos_lang', 'ar'));
  useEffect(()=>{ storage.set('pos_lang', lang); document.dir = lang === 'ar' ? 'rtl' : 'ltr'; }, [lang]);
  const setLang = (l: Lang)=> setLangState(l);
  const t = (k: string)=> DICT[k] ? DICT[k][lang] : k;
  const value = useMemo(()=>({ lang, setLang, t }), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export const useLang = ()=> useContext(LangContext);
