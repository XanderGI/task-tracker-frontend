import { initializeAuth } from "./auth.js";
import { initializeTasks } from "./tasks.js";
import { initializeReports } from "./reports.js";
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

        }
    });
    systemTheme.addEventListener("change", applyTheme);
    applyTheme();
}

function initializeApp() {
    initializeTheme();
    bindModalControls();

    const taskController = initializeTasks();
    const reportController = initializeReports();

    initializeAuth({
        onAuthenticated: taskController.loadTasks,
        onSignedOut() {
            taskController.resetTasks();
            reportController.resetReport();
        },
    });
}

initializeApp();
