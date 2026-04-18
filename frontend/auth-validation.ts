const USERNAME_MIN = 3;
const USERNAME_MAX = 32;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const LOGIN_USERNAME_MAX = 128;

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RegisterFieldResult =
	| { ok: true; username: string; email: string; password: string }
	| { ok: false; key: string };

export type LoginFieldResult =
	| { ok: true; username: string; password: string }
	| { ok: false; key: string };

export function validateRegisterFields(raw: {
	username: string;
	email: string;
	password: string;
}): RegisterFieldResult {
	const username = raw.username.trim();
	const email = raw.email.trim();
	const password = raw.password;

	if (!username) return { ok: false, key: "validation-username-required" };
	if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
		return { ok: false, key: "validation-username-length" };
	}
	if (!USERNAME_RE.test(username)) return { ok: false, key: "validation-username-format" };

	if (!email) return { ok: false, key: "validation-email-required" };
	if (email.length > 254) return { ok: false, key: "validation-email-invalid" };
	if (!EMAIL_RE.test(email)) return { ok: false, key: "validation-email-invalid" };

	if (!password) return { ok: false, key: "validation-password-required" };
	if (password.length < PASSWORD_MIN) return { ok: false, key: "validation-password-min" };
	if (password.length > PASSWORD_MAX) return { ok: false, key: "validation-password-max" };

	return { ok: true, username, email, password };
}

export function validateLoginFields(raw: { username: string; password: string }): LoginFieldResult {
	const username = raw.username.trim();
	const password = raw.password;

	if (!username) return { ok: false, key: "validation-login-username-required" };
	if (username.length > LOGIN_USERNAME_MAX) {
		return { ok: false, key: "validation-login-username-length" };
	}
	if (!password) return { ok: false, key: "validation-login-password-required" };
	if (password.length > PASSWORD_MAX) {
		return { ok: false, key: "validation-login-password-too-long" };
	}

	return { ok: true, username, password };
}
