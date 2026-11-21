import { apiRequest } from "./api.js";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
});

export function initializeReports() {
    const modal = document.querySelector("#report-modal");
    const openButton = document.querySelector('[data-open-modal="report-modal"]');
    const retryButton = document.querySelector("#retry-report-button");
    const status = document.querySelector("#report-status");
    const content = document.querySelector("#report-content");
    const generatedAt = document.querySelector("#report-generated-at");
    const text = document.querySelector("#report-text");
    let requestVersion = 0;

    function resetReport() {
        requestVersion += 1;
        content.hidden = true;
        status.hidden = true;
        retryButton.hidden = true;
        status.textContent = "";
        generatedAt.textContent = "";
        generatedAt.removeAttribute("datetime");
        text.textContent = "";
    }

    function isCurrent(version) {
        return modal.open && version === requestVersion;
    }

    async function loadReport() {
        resetReport();
        const version = requestVersion;
        status.textContent = "Загружаем отчёт…";
        status.hidden = false;

        try {
            const { data } = await apiRequest("/reports/latest", { auth: true });

            if (!isCurrent(version)) {
                return;
            }

            const timestamp = Date.parse(data?.generatedAt);
            if (!Number.isFinite(timestamp) || typeof data?.text !== "string") {
                throw new Error("Некорректный ответ API отчётов");
            }

            generatedAt.dateTime = data.generatedAt;
            generatedAt.textContent = dateFormatter.format(timestamp);
            text.textContent = data.text;
            status.hidden = true;
            content.hidden = false;
        } catch (error) {
            if (!isCurrent(version) || error?.status === 401) {
                return;
            }
            if (error?.status === 404) {
                status.textContent = "Отчёт ещё не сформирован.";
                return;
            }

            status.textContent = "Не удалось загрузить отчёт.";
            retryButton.hidden = false;
        }
    }

    openButton.addEventListener("click", loadReport);
    retryButton.addEventListener("click", loadReport);
    modal.addEventListener("modal:before-close", resetReport);

    return { resetReport };
}