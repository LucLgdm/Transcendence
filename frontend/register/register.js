import { buildApiUrl } from "../api/api.js";
import { validateRegisterFields } from "../auth/auth-validation.js";
import { applyTranslations, initLanguage, t } from "../i18n/index.js";
const registerForm = document.getElementById("registerForm");
const newUserName = document.getElementById("userName");
const newEmail = document.getElementById("email");
const newPassword = document.getElementById("password");
initLanguage();
applyTranslations();
if (registerForm && newUserName && newEmail && newPassword) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const checked = validateRegisterFields({
            username: newUserName.value,
            email: newEmail.value,
            password: newPassword.value,
        });
        if (!checked.ok) {
            alert(t(checked.key));
            return;
        }
        try {
            const response = await fetch(buildApiUrl("/users/register"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: checked.username,
                    email: checked.email,
                    password: checked.password,
                }),
            });
            if (response.ok) {
                alert(t("register-success"));
                window.location.replace("./index.html");
                return;
            }
            const error = await response.json().catch(() => ({ error: "unknown-error" }));
            const errMsg = typeof error.error === "string" ? error.error : "register-failed";
            alert(t(errMsg));
            console.error("Erreur:", error);
        }
        catch (error) {
            console.error("Erreur réseau:", error);
            alert(t("network-register-error"));
        }
    });
}
