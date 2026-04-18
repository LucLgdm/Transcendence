const USERNAME_MIN = 3;
const USERNAME_MAX = 32;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const LOGIN_USERNAME_MAX = 128;

/** Identique aux clés i18n côté frontend pour affichage cohérent */
const USERNAME_RE = /^[-a-zA-Z0-9_]+$/;

/** Pseudo pour recherche profil (mêmes règles que l’inscription). */
export function isValidLookupUsername(raw: string): boolean {
	const u = raw.trim();
	return u.length >= USERNAME_MIN && u.length <= USERNAME_MAX && USERNAME_RE.test(u);
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RegisterParseResult =
	| { ok: true; username: string; email: string; password: string }
	| { ok: false; error: string };

export type LoginParseResult =
	| { ok: true; username: string; password: string }
	| { ok: false; error: string };

function readString(value: unknown): string {
	if (typeof value !== "string") return "";
	return value;
}

export function parseRegisterBody(body: unknown): RegisterParseResult {
	if (body === null || typeof body !== "object") {
		return { ok: false, error: "validation-body-invalid" };
	}
	const raw = body as Record<string, unknown>;
	const username = readString(raw.username).trim();
	const email = readString(raw.email).trim();
	const password = readString(raw.password);

	if (!username) return { ok: false, error: "validation-username-required" };
	if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
		return { ok: false, error: "validation-username-length" };
	}
	if (!USERNAME_RE.test(username)) return { ok: false, error: "validation-username-format" };

	if (!email) return { ok: false, error: "validation-email-required" };
	if (email.length > 254) return { ok: false, error: "validation-email-invalid" };
	if (!EMAIL_RE.test(email)) return { ok: false, error: "validation-email-invalid" };

	if (!password) return { ok: false, error: "validation-password-required" };
	if (password.length < PASSWORD_MIN) return { ok: false, error: "validation-password-min" };
	if (password.length > PASSWORD_MAX) return { ok: false, error: "validation-password-max" };

	return { ok: true, username, email, password };
}

export function parseLoginBody(body: unknown): LoginParseResult {
	if (body === null || typeof body !== "object") {
		return { ok: false, error: "validation-body-invalid" };
	}
	const raw = body as Record<string, unknown>;
	const username = readString(raw.username).trim();
	const password = readString(raw.password);

	if (!username) return { ok: false, error: "validation-login-username-required" };
	if (username.length > LOGIN_USERNAME_MAX) {
		return { ok: false, error: "validation-login-username-length" };
	}
	if (!password) return { ok: false, error: "validation-login-password-required" };
	if (password.length > PASSWORD_MAX) {
		return { ok: false, error: "validation-login-password-too-long" };
	}

	return { ok: true, username, password };
}
