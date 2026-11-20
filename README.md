# Task Tracker Frontend

Фронтенд проекта Task Tracker. Основан на [оригинальном фронтенде prplhd](https://github.com/prplhd/tack-tracker-frontend) и адаптирован под API моего проекта.

Одностраничный веб-интерфейс для регистрации и авторизации пользователей, создания, редактирования, завершения и удаления задач. Для взаимодействия с backend используется REST API, JWT хранится в `localStorage`.

## Стек

- HTML
- CSS
- JavaScript
- Fetch API
- Nginx
- Docker

## Структура

- `index.html` — основная страница приложения
- `css/` — стили
- `js/` — логика интерфейса и работа с API
- `nginx/default.conf` — конфигурация Nginx
- `Dockerfile` — Docker-образ frontend

## Запуск

В production frontend запускается в составе общего Docker Compose:

https://github.com/XanderGI/task-tracker-deploy

```bash
docker compose -f docker-compose.prod.yml up -d
```

Nginx раздаёт статические файлы приложения на порту `80` и проксирует запросы `/api/*` в backend-сервис.

## Локальная разработка

Frontend не требует сборки или установки зависимостей. Проект можно открыть в IDE и запускать через локальный веб-сервер.

Для работы приложения backend должен быть доступен через путь `/api`.
