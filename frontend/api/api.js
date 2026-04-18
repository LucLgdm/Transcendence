export const API_BASE_URL = `http://${window.location.hostname}:3000`;
export const buildApiUrl = (path) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};
