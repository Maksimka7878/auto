# AUTOMATION.RUN

Русскоязычная платформа для no-code автоматизации бизнес-процессов.

## Возможности

- 🔧 **Визуальный редактор** - создавайте автоматизации с помощью drag-and-drop интерфейса
- 🔗 **Множество интеграций** - Telegram, Slack, Email, HTTP запросы, Google Sheets и др.
- ⏰ **Триггеры** - Webhook, расписание, получение email, отправка формы
- 🔀 **Логика** - условия IF/ELSE, задержки, циклы, трансформации данных
- 📊 **Аналитика** - детальная статистика выполнений
- 💳 **Подписки** - гибкие тарифные планы (Free/Pro/Enterprise)

## Технологии

### Backend
- Node.js + NestJS
- MongoDB (хранение данных)
- Redis (очереди задач)
- Elasticsearch (логирование)
- JWT авторизация
- REST API + GraphQL

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- React Flow (визуальный редактор)
- Zustand (state management)
- React Query (data fetching)

### Инфраструктура
- Docker + Docker Compose
- Kubernetes
- GitHub Actions CI/CD
- Prometheus + Grafana (мониторинг)

## Быстрый старт

### Требования
- Node.js 20+
- Docker & Docker Compose
- Git

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/your-org/automation-run.git
cd automation-run

# Установить зависимости
npm install

# Запустить в Docker
npm run docker:up

# Или запустить для разработки
npm run dev
```

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# Backend
MONGODB_URI=mongodb://localhost:27017/automation-run
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-key
CORS_ORIGIN=http://localhost:3000

# Integrations
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

TELEGRAM_BOT_TOKEN=your-telegram-bot-token
SLACK_BOT_TOKEN=your-slack-bot-token

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Структура проекта

```
automation-run/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   │   ├── auth/       # Авторизация
│   │   │   ├── users/      # Пользователи
│   │   │   ├── workflows/  # Автоматизации
│   │   │   ├── executions/ # История выполнений
│   │   │   ├── subscriptions/ # Подписки
│   │   │   ├── payments/   # Платежи
│   │   │   └── integrations/ # Интеграции
│   │   ├── common/         # Shared code
│   │   └── config/         # Configuration
│   └── test/               # Tests
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── store/          # State management
│   │   └── types/          # TypeScript types
│   └── public/
├── infrastructure/         # DevOps
│   ├── docker/             # Docker configs
│   ├── kubernetes/         # K8s manifests
│   └── monitoring/         # Prometheus/Grafana
└── docs/                   # Documentation
```

## API Документация

После запуска backend, Swagger документация доступна по адресу:
```
http://localhost:4000/api/docs
```

## Разработка

```bash
# Запуск backend
cd backend && npm run start:dev

# Запуск frontend
cd frontend && npm run dev

# Запуск тестов
npm run test

# Lint
npm run lint
```

## Развертывание

### Docker Compose (Development/Staging)

```bash
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

### Kubernetes (Production)

```bash
kubectl apply -f infrastructure/kubernetes/
```

## Тарифные планы

| Функция | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Автоматизации | 3 | 50 | ∞ |
| Выполнений/мес | 100 | 10,000 | ∞ |
| Хранилище | 100 МБ | 10 ГБ | ∞ |
| Триггеры | Базовые | Все | Все |
| Поддержка | Email | Приоритетная | Выделенная |

## Лицензия

MIT License

## Поддержка

- 📧 Email: support@automation.run
- 💬 Telegram: @automation_run_support
- 📚 Документация: https://docs.automation.run
