import { ApiError, apiRequest } from "./api.js";
import {
    clearCreateTaskError,
    clearFormError,
    closeModal,
    renderTasks,
    resetTasksView,
    setFormPending,
    setTaskSaveStatus,
    setTasksError,
    setTasksLoading,
    showCreateTaskError,
    showFormError,
    showNotice,
    showTaskModal,
} from "./ui.js";

const TEXT_SAVE_DELAY = 550;

let tasks = [];
let selectedTaskId = null;
let textSaveTimer = null;
let pendingTextSave = null;
let pendingImmediateSave = null;
let saveQueue = Promise.resolve();
let lastSavedText = null;
let allowModalClose = false;
let isDeleting = false;
let stateVersion = 0;

function getTask(taskId) {
    return tasks.find((task) => task.id === Number(taskId));
}

function replaceTask(updatedTask) {
    tasks = tasks.map((task) => task.id === updatedTask.id ? updatedTask : task);
    renderTasks(tasks, openTask);
}

function removeTask(taskId) {
    tasks = tasks.filter((task) => task.id !== taskId);
    renderTasks(tasks, openTask);
}

function getTextFields() {
    const form = document.querySelector("#edit-task-form");

    return {
        title: form?.elements.title.value ?? "",
        description: form?.elements.description.value ?? "",
    };
}

function taskText(task) {
    return {
        title: task.title,
        description: task.description ?? "",
    };
}

function textEquals(first, second) {
    return first?.title === second?.title && first?.description === second?.description;
}

function hasDirtyText() {
    return selectedTaskId !== null && !textEquals(getTextFields(), lastSavedText);
}

function queuePatch(taskId, changes) {
    const requestVersion = stateVersion;
    const operation = saveQueue.then(async () => {
        const { data } = await apiRequest(`/tasks/${taskId}`, {
            method: "PATCH",
            body: changes,
            auth: true,
        });

        if (requestVersion === stateVersion) {
            replaceTask(data);
        }

        return data;
    });

    saveQueue = operation.catch(() => undefined);
    return operation;
}

function handleTaskNotFound(error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
        return false;
    }

    allowModalClose = true;
    closeModal(document.querySelector("#task-modal"));
    allowModalClose = false;
    selectedTaskId = null;
    showNotice("Задача больше недоступна. Список обновлён.");
    loadTasks();
    return true;
}

export async function loadTasks() {
    const requestVersion = stateVersion;
    setTasksLoading();

    try {
        const { data } = await apiRequest("/tasks", { auth: true });
        if (requestVersion === stateVersion) {
            tasks = Array.isArray(data) ? data : [];
            renderTasks(tasks, openTask);
        }
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            return;
        }

        setTasksError(error instanceof Error ? error.message : "Не удалось загрузить задачи.");
    }
}

async function createTask(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const titleInput = form.elements.title;
    const title = titleInput.value.trim();
    const rawDescription = form.elements.description.value;
    const description = rawDescription.trim() ? rawDescription : null;
    clearCreateTaskError();

    if (!title) {
        showCreateTaskError("Название задачи не должно быть пустым.");
        titleInput.focus();
        return;
    }

    setFormPending(form, true);
    const requestVersion = stateVersion;

    try {
        const { data } = await apiRequest("/tasks", {
            method: "POST",
            body: { title, description },
            auth: true,
        });

        if (requestVersion === stateVersion) {
            tasks = [data, ...tasks];
            renderTasks(tasks, openTask);
            form.reset();
        }
    } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
            showCreateTaskError(error instanceof Error ? error.message : "Не удалось создать задачу.");
        }
    } finally {
        setFormPending(form, false);
    }
}

function openTask(taskId) {
    const task = getTask(taskId);

    if (!task) {
        return;
    }

    window.clearTimeout(textSaveTimer);
    selectedTaskId = task.id;
    lastSavedText = taskText(task);
    pendingTextSave = null;
    isDeleting = false;
    showTaskModal(task);
}

function scheduleTextSave() {
    window.clearTimeout(textSaveTimer);
    setTaskSaveStatus("Есть несохранённые изменения", "saving");
    textSaveTimer = window.setTimeout(() => {
        flushTextChanges().catch(() => undefined);
    }, TEXT_SAVE_DELAY);
}

async function flushTextChanges() {
    window.clearTimeout(textSaveTimer);

    if (pendingTextSave) {
        await pendingTextSave;

        if (hasDirtyText()) {
            return flushTextChanges();
        }

        return;
    }

    if (!hasDirtyText() || selectedTaskId === null) {
        return;
    }

    const form = document.querySelector("#edit-task-form");
    const currentText = getTextFields();

    if (!currentText.title.trim()) {
        const error = new Error("Название задачи не должно быть пустым.");
        showFormError(form, error.message);
        setTaskSaveStatus("Не сохранено", "error");
        throw error;
    }

    const changes = {};

    if (currentText.title !== lastSavedText.title) {
        changes.title = currentText.title;
    }

    if (currentText.description !== lastSavedText.description) {
        changes.description = currentText.description;
    }

    const taskId = selectedTaskId;
    clearFormError(form);
    setTaskSaveStatus("Сохраняем…", "saving");

    pendingTextSave = queuePatch(taskId, changes)
        .then((updatedTask) => {
            if (selectedTaskId === taskId) {
                lastSavedText = taskText(updatedTask);
                setTaskSaveStatus("Сохранено");
            }
        })
        .catch((error) => {
            if (!handleTaskNotFound(error) && selectedTaskId === taskId) {
                showFormError(form, error instanceof Error ? error.message : "Не удалось сохранить изменения.");
                setTaskSaveStatus("Не сохранено", "error");
            }

            throw error;
        })
        .finally(() => {
            pendingTextSave = null;
        });

    return pendingTextSave;
}

async function toggleCompleted(event) {
    if (selectedTaskId === null) {
        return;
    }

    const checkbox = event.currentTarget;
    const taskId = selectedTaskId;
    const previousValue = getTask(taskId)?.completed ?? !checkbox.checked;
    const form = document.querySelector("#edit-task-form");
    clearFormError(form);
    checkbox.disabled = true;
    setTaskSaveStatus("Сохраняем…", "saving");

    try {
        pendingImmediateSave = queuePatch(taskId, { completed: checkbox.checked });
        const updatedTask = await pendingImmediateSave;

        if (selectedTaskId === taskId) {
            checkbox.checked = updatedTask.completed;
            setTaskSaveStatus("Сохранено");
        }
    } catch (error) {
        checkbox.checked = previousValue;

        if (!handleTaskNotFound(error)) {
            showFormError(form, error instanceof Error ? error.message : "Не удалось изменить статус задачи.");
            setTaskSaveStatus("Не сохранено", "error");
        }
    } finally {
        pendingImmediateSave = null;
        checkbox.disabled = false;
    }
}

async function deleteTask() {
    if (selectedTaskId === null || isDeleting) {
        return;
    }

    if (!window.confirm("Удалить эту задачу?")) {
        return;
    }

    window.clearTimeout(textSaveTimer);
    const taskId = selectedTaskId;
    const button = document.querySelector("#delete-task-button");
    isDeleting = true;
    button.disabled = true;
    const defaultLabel = button.textContent.trim();
    button.textContent = button.dataset.pendingLabel ?? "Удаляем…";

    try {
        await saveQueue;
        await apiRequest(`/tasks/${taskId}`, { method: "DELETE", auth: true });
        removeTask(taskId);
        allowModalClose = true;
        closeModal(document.querySelector("#task-modal"));
        allowModalClose = false;
        selectedTaskId = null;
        showNotice("Задача удалена.");
    } catch (error) {
        if (!handleTaskNotFound(error)) {
            showFormError(
                document.querySelector("#edit-task-form"),
                error instanceof Error ? error.message : "Не удалось удалить задачу.",
            );
        }
    } finally {
        isDeleting = false;
        button.disabled = false;
        button.textContent = defaultLabel;
    }
}

function handleBeforeModalClose(event) {
    if (allowModalClose || isDeleting || (!hasDirtyText() && !pendingTextSave && !pendingImmediateSave)) {
        return;
    }

    event.preventDefault();
    Promise.resolve()
        .then(() => pendingImmediateSave)
        .then(() => flushTextChanges())
        .then(() => {
            allowModalClose = true;
            closeModal(event.currentTarget);
            allowModalClose = false;
        })
        .catch(() => undefined);
}

export function resetTasks() {
    window.clearTimeout(textSaveTimer);
    stateVersion += 1;
    tasks = [];
    selectedTaskId = null;
    pendingTextSave = null;
    pendingImmediateSave = null;
    lastSavedText = null;
    resetTasksView();
}

export function initializeTasks() {
    const createTaskForm = document.querySelector("#create-task-form");
    const editTaskForm = document.querySelector("#edit-task-form");
    const taskModal = document.querySelector("#task-modal");

    createTaskForm?.addEventListener("submit", createTask);
    editTaskForm?.addEventListener("submit", (event) => event.preventDefault());
    editTaskForm?.elements.title.addEventListener("input", scheduleTextSave);
    editTaskForm?.elements.description.addEventListener("input", scheduleTextSave);
    editTaskForm?.elements.title.addEventListener("blur", () => flushTextChanges().catch(() => undefined));
    editTaskForm?.elements.description.addEventListener("blur", () => flushTextChanges().catch(() => undefined));
    editTaskForm?.elements.completed.addEventListener("change", toggleCompleted);
    document.querySelector("#delete-task-button")?.addEventListener("click", deleteTask);
    document.querySelector("#retry-tasks-button")?.addEventListener("click", loadTasks);
    taskModal?.addEventListener("modal:before-close", handleBeforeModalClose);

    return { loadTasks, resetTasks };
}
