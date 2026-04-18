import { applyTranslations, getLanguage, initLanguage, nextLanguage, setLanguage } from "../i18n/index.js";
function syncDocumentLangAndDir() {
    document.documentElement.lang = getLanguage();
    document.documentElement.setAttribute("dir", "ltr");
}
function bindLanguageToggle() {
    const btn = document.getElementById("terms-lang-btn");
    if (!btn)
        return;
    btn.addEventListener("click", () => {
        setLanguage(nextLanguage());
        applyTranslations();
        syncDocumentLangAndDir();
    });
}
initLanguage();
applyTranslations();
syncDocumentLangAndDir();
bindLanguageToggle();
