import { User, userMap } from "./user.js";
import { buildApiUrl } from "./api.js";
import { applyTranslations, initLanguage, t } from "./i18n/index.js";

const registerForm = document.getElementById("registerForm") as HTMLFormElement;
const newUserName = document.getElementById("userName") as HTMLInputElement;
const newEmail = document.getElementById("email") as HTMLInputElement;
const newPassword = document.getElementById("password") as HTMLInputElement;

initLanguage();
applyTranslations();

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const response = await fetch(buildApiUrl("/users/register"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: newUserName.value,
			    email: newEmail.value,
                password: newPassword.value
            })
        });

        if (response.ok) {
            alert(t("register-success"));
            window.location.replace("./index.html");
            return;
        }

        const error = await response.json().catch(() => ({ error: t("unknown-error") }));
        alert(error.error || t("register-failed"));
        console.error("Erreur:", error);
    } catch (error) {
        console.error("Erreur réseau:", error);
        alert(t("network-register-error"));
    }
});