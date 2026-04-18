import { applyTranslations, getLanguage, initLanguage, nextLanguage, setLanguage } from "../i18n/index.js";

function syncDocumentLangAndDir(): void {
	document.documentElement.lang = getLanguage();
	document.documentElement.setAttribute("dir", "ltr");
}

function bindLanguageToggle(): void {
	const btn = document.getElementById("privacy-lang-btn");
	if (!btn) return;
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
