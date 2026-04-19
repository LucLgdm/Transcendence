import { buildApiUrl } from "../api/api.js";
import { validateRegisterFields } from "../auth/auth-validation.js";
import { applyTranslations, initLanguage, t } from "../i18n/index.js";

const registerForm = document.getElementById("registerForm") as HTMLFormElement | null;
const newUserName = document.getElementById("userName") as HTMLInputElement | null;
const newEmail = document.getElementById("email") as HTMLInputElement | null;
const newPassword = document.getElementById("password") as HTMLInputElement | null;

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
				const data = (await response.json()) as { token?: string };
				if (typeof data.token === "string" && data.token.length > 0) {
					localStorage.setItem("token", data.token);
				}
				alert(t("register-success"));
				window.location.replace("./index.html");
				return;
			}

			const error = await response.json().catch(() => ({ error: "unknown-error" }));
			const errMsg = typeof error.error === "string" ? error.error : "register-failed";
			alert(t(errMsg));
		} catch {
			alert(t("network-register-error"));
		}
	});
}