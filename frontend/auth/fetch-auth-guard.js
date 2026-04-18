import { consumeUnauthorizedResponse } from "./auth-session.js";

const nativeFetch = globalThis.fetch.bind(globalThis);

function headersHadBearerAuth(headers) {
	if (!headers) return false;
	if (headers instanceof Headers) {
		const v = headers.get("Authorization") ?? headers.get("authorization");
		return typeof v === "string" && v.startsWith("Bearer ");
	}
	const v = headers.Authorization ?? headers.authorization;
	return typeof v === "string" && v.startsWith("Bearer ");
}

function requestUsedBearer(input, init) {
	if (init && headersHadBearerAuth(init.headers)) return true;
	if (input instanceof Request) {
		return headersHadBearerAuth(input.headers);
	}
	return false;
}

globalThis.fetch = async function patchedFetch(input, init) {
	const response = await nativeFetch(input, init);
	if (response.status !== 401) return response;
	if (!requestUsedBearer(input, init)) return response;
	consumeUnauthorizedResponse(response);
	return response;
};
