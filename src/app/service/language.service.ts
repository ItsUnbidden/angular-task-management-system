import { Injectable, signal } from '@angular/core';
import { LanguageCode, languageConfig } from '../config/languages';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private static readonly STORAGE_KEY = 'language';

  readonly currentLanguage = signal<LanguageCode | null>(null);

  constructor(private translate: TranslateService) {}

  initialize() {
    const code = (localStorage.getItem(LanguageService.STORAGE_KEY) as LanguageCode) ?? languageConfig.defaultLang;

    this.translate.use(code);
    this.currentLanguage.set(code);
  }

  setLanguage(code: LanguageCode) {
    localStorage.setItem(LanguageService.STORAGE_KEY, code);
    this.translate.use(code);
    this.currentLanguage.set(code);
  }
}
