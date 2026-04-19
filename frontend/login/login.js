import { buildApiUrl } from "../api/api.js";
import { validateLoginFields } from "../auth/auth-validation.js";
import { applyTranslations, initLanguage, t } from "../i18n/index.js";
function readOAuthJwtFromReturnUrl() {
    const fromQuery = new URLSearchParams(window.location.search).get("token");
    if (fromQuery?.trim())
        return fromQuery.trim();
    if (window.location.hash.length <= 1)
        return null;
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("token");
    return fromHash?.trim() || null;
}
const jwtReturn = readOAuthJwtFromReturnUrl();
if (jwtReturn) {
    localStorage.setItem("token", jwtReturn);
    window.location.replace(new URL("index.html", window.location.href).href);
}
else {
    const form = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const oauth42Link = document.getElementById("oauth42Link");
    initLanguage();
    applyTranslations();
    if (oauth42Link) {
        oauth42Link.href = buildApiUrl("/users/auth/42");
    }
    const errorFromUrl = new URLSearchParams(window.location.search).get("error");
    if (errorFromUrl) {
        alert(`${t("oauth-failed")}: ${errorFromUrl}`);
    }
    if (form && usernameInput && passwordInput) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const checked = validateLoginFields({
                username: usernameInput.value,
                password: passwordInput.value,
            });
            if (!checked.ok) {
                alert(t(checked.key));
                return;
            }
            try {
                const response = await fetch(buildApiUrl("/users/login"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: checked.username,
                        password: checked.password,
                    }),
                });
                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem("token", data.token);
                    alert(t("login-success"));
                    window.location.replace(new URL("index.html", window.location.href).href);
                    return;
                }
                const error = await response.json().catch(() => ({ error: "invalid-credentials" }));
                const errMsg = typeof error.error === "string" ? error.error : "login-failed";
                alert(t(errMsg));
            }
            catch {
                alert(t("network-login-error"));
            }
        });
    }
    const createAccountBtn = document.getElementById("createAccountBtn");
    createAccountBtn?.addEventListener("click", () => {
        window.location.href = "register.html";
    });
}
