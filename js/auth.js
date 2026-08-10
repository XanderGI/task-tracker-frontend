import {
    ApiError,
    apiRequest,
    clearAccessToken,
    configureUnauthorizedHandler,
    getAccessToken,
    readBearerToken,
    saveAccessToken,
} from "./api.js";
import {
    closeAllModals,
    closeModal,
    clearFormError,
    setAuthView,
    setFormPending,
    showFormError,
    showNotice,
} from "./ui.js";

let onAuthenticated = () => {};
let onSignedOut = () => {};

function hasServerMessage(error) {
    const message = error?.payload?.message;
    return typeof message === "string" || (Array.isArray(message) && message.length > 0);
}

function getLoginErrorMessage(error) {
    if (error instanceof ApiError && error.status === 401 && !hasServerMessage(error)) {
        return "Неверный email или пароль.";
    }

    return error instanceof Error ? error.message : "Не удалось выполнить вход.";
}

function applyAuthenticatedResponse(data, response, form, successMessage) {
    const token = readBearerToken(response.headers);
    saveAccessToken(token);
    form.reset();
    closeModal(form.closest("dialog"));
    setAuthView("authenticated", { user: data });
    onAuthenticated();
    showNotice(successMessage);
}

async function register(event) {
    event.preventDefault();
    const form = event.currentTarget;
    clearFormError(form);

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const password = formData.get("password");

    if (password !== formData.get("passwordRepeat")) {
        showFormError(form, "Пароли не совпадают.");
        return;
    }

    setFormPending(form, true);

    try {
        const result = await apiRequest("/user", {
            method: "POST",
            body: {
                email: formData.get("email"),
                password,
            },
        });

        applyAuthenticatedResponse(result.data, result.response, form, "Аккаунт создан. Вы вошли в систему.");
    } catch (error) {
        showFormError(form, error instanceof Error ? error.message : "Не удалось зарегистрироваться.");
    } finally {
        setFormPending(form, false);
    }
}

async function login(event) {
    event.preventDefault();
    const form = event.currentTarget;
    clearFormError(form);

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    setFormPending(form, true);

    try {
        const result = await apiRequest("/auth/login", {
            method: "POST",
            body: {
                email: formData.get("email"),
                password: formData.get("password"),
            },
        });

        applyAuthenticatedResponse(result.data, result.response, form, "Вы вошли в систему.");
    } catch (error) {
        showFormError(form, getLoginErrorMessage(error));
    } finally {
        setFormPending(form, false);
    }
}

function logout() {
    clearAccessToken();
    onSignedOut();
    closeAllModals();
    setAuthView("guest");
    showNotice("Вы вышли из аккаунта.");
}

function handleUnauthorized() {
    clearAccessToken();
    onSignedOut();
    closeAllModals();
    setAuthView("guest");
    showNotice("Сессия завершена. Войдите снова.");
}

export async function checkCurrentUser() {
    if (!getAccessToken()) {
        setAuthView("guest");
        return;
    }

    setAuthView("loading");

    try {
        const { data } = await apiRequest("/user", { auth: true });
        setAuthView("authenticated", { user: data });
        onAuthenticated();
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            return;
        }

        setAuthView("error", {
            message: error instanceof Error ? error.message : "Не удалось проверить авторизацию.",
        });
    }
}

export function initializeAuth(callbacks = {}) {
    const registrationForm = document.querySelector("#registration-form");
    const loginForm = document.querySelector("#login-form");
    const logoutButton = document.querySelector("#logout-button");
    const retryButton = document.querySelector("#retry-auth-button");

    onAuthenticated = callbacks.onAuthenticated ?? (() => {});
    onSignedOut = callbacks.onSignedOut ?? (() => {});
    configureUnauthorizedHandler(handleUnauthorized);
    registrationForm?.addEventListener("submit", register);
    loginForm?.addEventListener("submit", login);
    logoutButton?.addEventListener("click", logout);
    retryButton?.addEventListener("click", checkCurrentUser);

    return checkCurrentUser();
}
