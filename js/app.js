import { initializeAuth } from "./auth.js";
import { initializeTasks } from "./tasks.js";
import { bindModalControls } from "./ui.js";

function initializeApp() {
    bindModalControls();
    const taskController = initializeTasks();

    initializeAuth({
        onAuthenticated: taskController.loadTasks,
        onSignedOut: taskController.resetTasks,
    });
}

initializeApp();
