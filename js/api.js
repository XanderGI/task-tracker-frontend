export const API_BASE_PATH = "/api";
const TOKEN_STORAGE_KEY = "taskTracker.accessToken";

let unauthorizedHandler = null;

export class ApiError extends Error {
    constructor(message, { status = 0, payload = null, cause } = {}) {
        super(message, { cause });
        this.name = "ApiError";
        this.status = status;
        this.payload = payload;
    }
}

export function configureUnauthorizedHandler(handler) {
    unauthorizedHandler = typeof handler === "function" ? handler : null;
}

export function getAccessToken() {
    try {
        return window.localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
        return null;
    }
}

export function saveAccessToken(token) {
    if (!token) {
        throw new ApiError("Сервер не вернул токен авторизации.");
    }

    try {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (error) {
        throw new ApiError("Не удалось сохранить авторизацию в браузере.", { cause: error });
    }
}

export function clearAccessToken() {
    try {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
        // Локальное состояние интерфейса всё равно будет сброшено.
    }
}

export function readBearerToken(headers) {
    const authorization = headers.get("Authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        throw new ApiError("Сервер не вернул токен авторизации.");
    }

    return match[1];
}

function getErrorMessage(payload, status) {
    const serverMessage = payload?.message;

    if (Array.isArray(serverMessage) && serverMessage.length > 0) {
        return serverMessage.join("\n");
    }

    if (typeof serverMessage === "string" && serverMessage.trim()) {
        return serverMessage;
    }

    if (status === 401) {
        return "Требуется авторизация.";
    }

    if (status >= 500) {
        return "На сервере произошла ошибка. Попробуйте ещё раз позже.";
    }

    return `Запрос завершился с ошибкой ${status}.`;
}

async function readResponseBody(response) {
    if (response.status === 204) {
        return null;
    }

    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

export async function apiRequest(path, { method = "GET", body, auth = false, headers: customHeaders } = {}) {
    const headers = new Headers(customHeaders);
    let requestToken = null;

    headers.set("Accept", "application/json");

    if (body !== undefined) {
        headers.set("Content-Type", "application/json");
    }

    if (auth) {
        requestToken = getAccessToken();

        if (!requestToken) {
            const error = new ApiError("Требуется авторизация.", { status: 401 });
            unauthorizedHandler?.(error);
            throw error;
        }

        headers.set("Authorization", `Bearer ${requestToken}`);
    }

    let response;

    try {
        response = await fetch(`${API_BASE_PATH}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch (error) {
        throw new ApiError("Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.", {
            cause: error,
        });
    }

    const data = await readResponseBody(response);

    if (!response.ok) {
        const error = new ApiError(getErrorMessage(data, response.status), {
            status: response.status,
            payload: data,
        });

        if (response.status === 401 && auth && getAccessToken() === requestToken) {
            unauthorizedHandler?.(error);
        }

        throw error;
    }

    return { data, response };
}
