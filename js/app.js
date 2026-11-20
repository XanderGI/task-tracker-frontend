import { initializeAuth } from "./auth.js";
import { initializeTasks } from "./tasks.js";
import { bindModalControls } from "./ui.js";

function initializeTheme() {
    const toggle = document.querySelector("#theme-toggle");
    const root = document.documentElement;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const storageKey = "taskTracker.theme";
    let preference;

    try {
        preference = window.localStorage.getItem(storageKey);
    } catch {
        // The theme can still be changed for the current page.
    }

    function applyTheme() {
        const dark = preference === "dark" || (preference !== "light" && systemTheme.matches);
        root.dataset.theme = dark ? "dark" : "light";
        toggle.setAttribute("aria-pressed", String(dark));
    }

    toggle.addEventListener("click", () => {
        preference = root.dataset.theme === "dark" ? "light" : "dark";
        applyTheme();
        try {
            window.localStorage.setItem(storageKey, preference);
        } catch {
            // Keep the chosen theme until the page is reloaded.
        }
    });
    systemTheme.addEventListener("change", applyTheme);
    applyTheme();
}

function initializeApp() {
    initializeTheme();
    bindModalControls();
    const taskController = initializeTasks();

    initializeAuth({
        onAuthenticated: taskController.loadTasks,
        onSignedOut: taskController.resetTasks,
    });
}

initializeApp();
