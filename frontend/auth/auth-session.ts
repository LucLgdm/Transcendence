let sessionRedirectScheduled = false;


export function consumeUnauthorizedResponse(res: Response): boolean {
	if (res.status !== 401) {
		return false;
	}
	if (!sessionRedirectScheduled) {
		sessionRedirectScheduled = true;
		localStorage.removeItem("token");
		const target = new URL("login.html", window.location.href);
		target.searchParams.set("session", "expired");
		window.location.replace(target.href);
	}
	return true;
}
