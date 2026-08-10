let noticeTimer;

export function openModal(modalId) {
    const modal = document.getElementById(modalId);

    if (modal instanceof HTMLDialogElement && !modal.open) {
        modal.showModal();
    }
}

export function closeModal(modal) {
    if (modal instanceof HTMLDialogElement && modal.open) {
        const beforeCloseEvent = new CustomEvent("modal:before-close", { cancelable: true });

        if (!modal.dispatchEvent(beforeCloseEvent)) {
            return;
        }

        modal.close();
    }
}

export function closeAllModals() {
    document.querySelectorAll("dialog[open]").forEach(closeModal);
}

export function bindModalControls() {
    document.querySelectorAll("[data-open-modal]").forEach((button) => {
        button.addEventListener("click", () => openModal(button.dataset.openModal));
    });

    document.querySelectorAll("[data-close-modal]").forEach((button) => {
        button.addEventListener("click", () => closeModal(button.closest("dialog")));
    });

    document.querySelectorAll("dialog").forEach((modal) => {
        modal.addEventListener("cancel", (event) => {
            event.preventDefault();
            closeModal(modal);
        });

        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeModal(modal);
            }
        });

        modal.addEventListener("close", () => {
            const form = modal.querySelector("form");
            if (form) {
                clearFormError(form);
            }
        });
    });
}

export function setAuthView(state, { user = null, message = "" } = {}) {
    const loadingView = document.querySelector("#auth-loading-view");
    const errorView = document.querySelector("#auth-error-view");
    const guestView = document.querySelector("#guest-view");
    const tasksView = document.querySelector("#tasks-view");
    const guestActions = document.querySelector("#guest-actions");
    const userActions = document.querySelector("#user-actions");
    const userEmail = document.querySelector("#current-user-email");
    const errorMessage = document.querySelector("#auth-error-message");

    loadingView?.classList.toggle("is-hidden", state !== "loading");
    errorView?.classList.toggle("is-hidden", state !== "error");
    guestView?.classList.toggle("is-hidden", state !== "guest");
    tasksView?.classList.toggle("is-hidden", state !== "authenticated");
    guestActions?.classList.toggle("is-hidden", state !== "guest");
    userActions?.classList.toggle("is-hidden", state !== "authenticated");

    if (userEmail) {
        userEmail.textContent = user?.email ?? "";
    }

    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

export function showFormError(form, message) {
    const errorElement = form.querySelector("[data-form-error]");

    if (!errorElement) {
        return;
    }

    errorElement.textContent = message;
    errorElement.classList.remove("is-hidden");
}

export function clearFormError(form) {
    const errorElement = form.querySelector("[data-form-error]");

    if (!errorElement) {
        return;
    }

    errorElement.textContent = "";
    errorElement.classList.add("is-hidden");
}

export function setFormPending(form, isPending) {
    const submitButton = form.querySelector("button[type='submit']");

    if (!submitButton) {
        return;
    }

    if (isPending) {
        submitButton.dataset.defaultLabel = submitButton.textContent.trim();
        submitButton.textContent = submitButton.dataset.pendingLabel ?? "Отправляем…";
    } else if (submitButton.dataset.defaultLabel) {
        submitButton.textContent = submitButton.dataset.defaultLabel;
    }

    submitButton.disabled = isPending;
    form.setAttribute("aria-busy", String(isPending));
}

export function setTasksLoading() {
    document.querySelector("#tasks-loading")?.classList.remove("is-hidden");
    document.querySelector("#tasks-error")?.classList.add("is-hidden");
    document.querySelector("#task-lists")?.classList.add("is-hidden");
}

export function setTasksError(message) {
    const errorState = document.querySelector("#tasks-error");
    const errorMessage = errorState?.querySelector("p");

    document.querySelector("#tasks-loading")?.classList.add("is-hidden");
    document.querySelector("#task-lists")?.classList.add("is-hidden");
    errorState?.classList.remove("is-hidden");

    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

function createTaskCard(task, onOpen) {
    const listItem = document.createElement("li");
    const button = document.createElement("button");
    const title = document.createElement("span");

    button.type = "button";
    button.className = "task-card";
    button.dataset.taskId = String(task.id);
    button.setAttribute("aria-label", `Открыть задачу: ${task.title}`);
    button.classList.toggle("is-completed", task.completed);
    button.addEventListener("click", () => onOpen(task.id));

    title.className = "task-card-title";
    title.textContent = task.title;
    button.append(title);

    if (task.description) {
        const description = document.createElement("span");
        description.className = "task-card-description";
        description.textContent = task.description;
        button.append(description);
    }

    listItem.append(button);
    return listItem;
}

export function renderTasks(tasks, onOpen) {
    const activeTasks = tasks.filter((task) => !task.completed);
    const completedTasks = tasks.filter((task) => task.completed);
    const activeList = document.querySelector("#active-task-list");
    const completedList = document.querySelector("#completed-task-list");

    activeList?.replaceChildren(...activeTasks.map((task) => createTaskCard(task, onOpen)));
    completedList?.replaceChildren(...completedTasks.map((task) => createTaskCard(task, onOpen)));

    document.querySelector("#tasks-loading")?.classList.add("is-hidden");
    document.querySelector("#tasks-error")?.classList.add("is-hidden");
    document.querySelector("#task-lists")?.classList.remove("is-hidden");
    document.querySelector("#active-tasks-empty")?.classList.toggle("is-hidden", activeTasks.length > 0);
    document.querySelector("#completed-tasks-empty")?.classList.toggle("is-hidden", completedTasks.length > 0);

    const activeCount = document.querySelector("#active-task-count");
    const completedCount = document.querySelector("#completed-task-count");
    const summary = document.querySelector("#tasks-summary");

    if (activeCount) {
        activeCount.textContent = String(activeTasks.length);
    }

    if (completedCount) {
        completedCount.textContent = String(completedTasks.length);
    }

    if (summary) {
        summary.textContent = activeTasks.length === 0
            ? "Нет активных задач"
            : `Активных задач: ${activeTasks.length}`;
    }
}

export function resetTasksView() {
    document.querySelector("#active-task-list")?.replaceChildren();
    document.querySelector("#completed-task-list")?.replaceChildren();
    document.querySelector("#tasks-loading")?.classList.add("is-hidden");
    document.querySelector("#tasks-error")?.classList.add("is-hidden");
    document.querySelector("#task-lists")?.classList.remove("is-hidden");
    document.querySelector("#create-task-form")?.reset();
    document.querySelector("#create-task-error")?.classList.add("is-hidden");
}

export function showTaskModal(task) {
    const modal = document.querySelector("#task-modal");
    const form = document.querySelector("#edit-task-form");

    if (!form) {
        return;
    }

    form.dataset.taskId = String(task.id);
    form.elements.title.value = task.title;
    form.elements.description.value = task.description ?? "";
    form.elements.completed.checked = task.completed;
    clearFormError(form);
    setTaskSaveStatus("Изменения сохраняются автоматически");
    openModal(modal?.id);
}

export function setTaskSaveStatus(message, state = "idle") {
    const status = document.querySelector("#task-save-status");

    if (!status) {
        return;
    }

    status.textContent = message;
    status.dataset.state = state;
}

export function showCreateTaskError(message) {
    const error = document.querySelector("#create-task-error");

    if (!error) {
        return;
    }

    error.textContent = message;
    error.classList.remove("is-hidden");
}

export function clearCreateTaskError() {
    const error = document.querySelector("#create-task-error");

    if (!error) {
        return;
    }

    error.textContent = "";
    error.classList.add("is-hidden");
}

export function showNotice(message) {
    const notice = document.querySelector("#app-notice");

    if (!notice) {
        return;
    }

    window.clearTimeout(noticeTimer);
    notice.textContent = message;
    notice.classList.remove("is-hidden");

    noticeTimer = window.setTimeout(() => {
        notice.classList.add("is-hidden");
    }, 3500);
}
