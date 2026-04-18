import { buildApiUrl } from "../api/api.js";
import { validateLoginFields } from "../auth/auth-validation.js";
import { applyTranslations, initLanguage, t } from "../i18n/index.js";


const form = document.getElementById("loginForm") as HTMLFormElement | null;
const usernameInput = document.getElementById("username") as HTMLInputElement | null;
const passwordInput = document.getElementById("password") as HTMLInputElement | null;
const oauth42Link = document.getElementById("oauth42Link") as HTMLAnchorElement | null;

initLanguage();
applyTranslations();

if (oauth42Link) {
	oauth42Link.href = buildApiUrl("/users/auth/42");
}

// Vérifier si on arrive du OAuth 42 callback
const params = new URLSearchParams(window.location.search);
const tokenFromUrl = params.get("token");
const errorFromUrl = params.get("error");

if (tokenFromUrl) {
	localStorage.setItem("token", tokenFromUrl);
	window.location.href = "./index.html";
} else if (errorFromUrl) {
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
				window.location.replace("./index.html");
				return;
			}

			const error = await response.json().catch(() => ({ error: "invalid-credentials" }));
			const errMsg = typeof error.error === "string" ? error.error : "login-failed";
			alert(t(errMsg));
		} catch {
			alert(t("network-login-error"));
		}
	});
}

const createAccountBtn = document.getElementById("createAccountBtn") as HTMLButtonElement | null;
createAccountBtn?.addEventListener("click", () => {
	window.location.href = "register.html";
});
