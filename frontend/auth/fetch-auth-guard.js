import { consumeUnauthorizedResponse } from "./auth-session.js";
const nativeFetch = globalThis.fetch.bind(globalThis);
function headersHadBearerAuth(headers) {
    if (!headers)
        return false;
    if (headers instanceof Headers) {
        const v = headers.get("Authorization") ?? headers.get("authorization");
        return typeof v === "string" && v.startsWith("Bearer ");
    }
    const h = headers;
    const v = h.Authorization ?? h.authorization;
    return typeof v === "string" && v.startsWith("Bearer ");
}
function requestUsedBearer(input, init) {
    if (init && headersHadBearerAuth(init.headers))
        return true;
    if (input instanceof Request) {
        return headersHadBearerAuth(input.headers);
    }
    return false;
}
function resolveRequestUrl(input) {
    if (input instanceof URL)
        return input.href;
    if (typeof input === "string") {
        try {
            return new URL(input, window.location.origin).href;
        }
        catch {
            return input;
        }
    }
    if (input instanceof Request)
        return input.url;
    return "";
}
function shouldSkipSessionRedirectOn401(urlStr) {
    if (!urlStr)
        return false;
    try {
        return new URL(urlStr).pathname.includes("/users/lookup-username");
    }
    catch {
        return false;
    }
}
globalThis.fetch = async function patchedFetch(input, init) {
    const response = await nativeFetch(input, init);
    if (response.status !== 401)
        return response;
    if (!requestUsedBearer(input, init))
        return response;
    const url = resolveRequestUrl(input);
    if (shouldSkipSessionRedirectOn401(url))
        return response;
    consumeUnauthorizedResponse(response);
    return response;
};
