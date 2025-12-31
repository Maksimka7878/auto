# API Reference

## Базовый URL

```
https://api.automation.run/api/v1
```

## Аутентификация

API использует JWT токены. Добавьте заголовок:

```
Authorization: Bearer <access_token>
```

---

## Auth

### Регистрация

```
POST /auth/register
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Иван Петров"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "Иван Петров",
    "plan": "free"
  }
}
```

### Вход

```
POST /auth/login
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Обновление токена

```
POST /auth/refresh
```

**Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

---

## Users

### Получить профиль

```
GET /users/me
```

### Статистика пользователя

```
GET /users/me/stats
```

**Response:**
```json
{
  "workflowsCount": 5,
  "executionsThisMonth": 150,
  "storageUsed": 25,
  "plan": "pro",
  "limits": {
    "workflowsLimit": 50,
    "executionsLimit": 10000,
    "storageLimit": 10240
  }
}
```

### Обновить профиль

```
PUT /users/me
```

**Body:**
```json
{
  "name": "Новое имя"
}
```

---

## Workflows

### Список автоматизаций

```
GET /workflows
```

**Query params:**
- `page` - номер страницы (default: 1)
- `limit` - элементов на странице (default: 10)
- `status` - фильтр по статусу (draft, active, paused, error)
- `isActive` - только активные (true/false)

**Response:**
```json
{
  "workflows": [...],
  "total": 15,
  "page": 1,
  "pages": 2
}
```

### Создать автоматизацию

```
POST /workflows
```

**Body:**
```json
{
  "name": "Моя автоматизация",
  "description": "Описание"
}
```

### Получить автоматизацию

```
GET /workflows/:id
```

### Обновить автоматизацию

```
PUT /workflows/:id
```

**Body:**
```json
{
  "name": "Новое название",
  "nodes": [
    {
      "id": "webhook_1",
      "type": "webhook",
      "name": "Webhook",
      "position": { "x": 100, "y": 100 },
      "config": { "method": "POST" }
    },
    {
      "id": "email_1",
      "type": "send_email",
      "name": "Отправить Email",
      "position": { "x": 100, "y": 250 },
      "config": {
        "to": "{{trigger.body.email}}",
        "subject": "Привет!",
        "body": "Сообщение"
      }
    }
  ],
  "connections": [
    {
      "id": "conn_1",
      "sourceId": "webhook_1",
      "targetId": "email_1"
    }
  ]
}
```

### Активировать

```
POST /workflows/:id/activate
```

### Деактивировать

```
POST /workflows/:id/deactivate
```

### Дублировать

```
POST /workflows/:id/duplicate
```

### Удалить

```
DELETE /workflows/:id
```

---

## Executions

### История выполнений

```
GET /executions
```

**Query params:**
- `page`, `limit`
- `workflowId` - фильтр по автоматизации
- `status` - pending, running, success, error, cancelled
- `startDate`, `endDate` - период

### Детали выполнения

```
GET /executions/:id
```

**Response:**
```json
{
  "_id": "...",
  "workflowId": {...},
  "status": "success",
  "startedAt": "2024-01-15T10:00:00Z",
  "finishedAt": "2024-01-15T10:00:05Z",
  "duration": 5000,
  "steps": [
    {
      "nodeId": "webhook_1",
      "nodeName": "Webhook",
      "nodeType": "webhook",
      "status": "success",
      "startedAt": "...",
      "finishedAt": "...",
      "output": {...}
    }
  ]
}
```

### Статистика

```
GET /executions/stats
```

**Query params:**
- `workflowId` - фильтр по автоматизации

### Активность

```
GET /executions/activity
```

**Query params:**
- `days` - количество дней (default: 30)

### Отменить выполнение

```
POST /executions/:id/cancel
```

---

## Subscriptions

### Тарифные планы

```
GET /subscriptions/plans
```

### Текущая подписка

```
GET /subscriptions/current
```

### Изменить тариф

```
POST /subscriptions/upgrade
```

**Body:**
```json
{
  "plan": "pro"
}
```

### Отменить подписку

```
POST /subscriptions/cancel
```

---

## Payments

### Создать сессию оплаты

```
POST /payments/checkout
```

**Body:**
```json
{
  "plan": "pro"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### История платежей

```
GET /payments/history
```

### Портал управления

```
POST /payments/portal
```

---

## Webhooks

### Триггер автоматизации

```
POST /webhook/:webhookId
GET /webhook/:webhookId
```

Входящие данные доступны в автоматизации как `{{trigger.body}}` и `{{trigger.headers}}`.

---

## Интеграции

### Доступные интеграции

```
GET /integrations/available
```

Возвращает список всех доступных триггеров, действий и логических узлов с их параметрами.

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Некорректный запрос |
| 401 | Требуется авторизация |
| 403 | Доступ запрещен / лимит превышен |
| 404 | Ресурс не найден |
| 409 | Конфликт (например, email уже занят) |
| 429 | Слишком много запросов |
| 500 | Внутренняя ошибка сервера |

## Rate Limiting

- 100 запросов в минуту для обычных эндпоинтов
- Webhook вызовы не ограничены
