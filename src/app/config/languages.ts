export interface LanguageConfig {
  supportedLangs: LanguageOption[];
  defaultLang: LanguageCode;
  fallbackLang: LanguageCode;
}

export interface LanguageOption {
  key: LanguageCode,
  view: string
}


export type LanguageCode = 'en';

export const languageConfig: LanguageConfig = {
  supportedLangs: [{
      key: 'en',
      view: 'English'
    }
  ],
  defaultLang: 'en',
  fallbackLang: 'en',
}
