# Task Tracker Frontend

Веб-клиент Task Tracker. Здесь можно зарегистрироваться, войти, создать, отредактировать, завершить или удалить задачу. Диалог «Последний отчёт» при открытии загружает последний успешно сгенерированный отчёт пользователя.

За основу взят фронтенд prplhd. [Исходный проект](https://github.com/prplhd/tack-tracker-frontend). При переделывании фронтенда вдохновлялся приложением [Tick-tick](https://ticktick.com).

Интерфейс написан на HTML, CSS и JavaScript. Запросы к REST API идут через Fetch, JWT хранится в `localStorage`. Nginx раздаёт статику и проксирует `/api/*` в backend, убирая префикс `/api`.

## Запуск

Для полного запуска выполните команду из каталога `task-tracker-deploy` после подготовки `.env`. [Инструкция по запуску стека](https://github.com/XanderGI/task-tracker-deploy#полный-стек).

```bash
docker compose -f docker-compose.prod.yaml up -d
```

## Локальная разработка

Запустите backend на хосте на порту `8080`. С запущенным Docker Desktop выполните команду из каталога `task-tracker-frontend`.

```bash
docker compose -f compose.local.yaml up -d
```

Фронтенд доступен по адресу: `http://127.0.0.1:8081`. Запросы к `/api` пойдут на `host.docker.internal:8080`. 
