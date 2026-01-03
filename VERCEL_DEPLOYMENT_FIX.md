# Исправление ошибки 404 на Vercel

## Проблема

При деплое React SPA на Vercel возникала ошибка 404 (NOT_FOUND) при попытке прямого доступа к любым маршрутам, кроме корневого.

### Причина

React приложение использует клиентский роутинг через `react-router-dom`. Когда пользователь пытается напрямую открыть URL (например, `/dashboard` или `/login`), Vercel пытается найти физический файл по этому пути на сервере и возвращает 404, так как это Single Page Application (SPA) и все маршруты обрабатываются на клиенте.

## Решение

### 1. Создан файл `vercel.json`

Файл конфигурации Vercel в корне проекта с настройками:

```json
{
  "version": 2,
  "buildCommand": "cd automation-run/frontend && npm install && npm run build",
  "outputDirectory": "automation-run/frontend/dist",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Ключевые настройки:**
- `rewrites`: Перенаправляет все запросы на `index.html`, позволяя React Router обрабатывать маршрутизацию
- `buildCommand`: Команда для сборки frontend части из монорепозитория
- `outputDirectory`: Директория с собранными файлами Vite
- `headers`: Оптимальное кэширование статических ассетов

### 2. Создан файл `.vercelignore`

Исключает ненужные файлы из деплоя:
- Backend код
- node_modules
- Служебные файлы

### 3. Создан файл `.env.example`

Шаблон для настройки переменных окружения, включая URL backend API.

## Настройка переменных окружения в Vercel

1. Откройте настройки проекта в Vercel Dashboard
2. Перейдите в раздел "Environment Variables"
3. Добавьте переменную:
   - **Name**: `VITE_API_URL`
   - **Value**: URL вашего backend API (например, `https://your-backend.com/api/v1`)
   - **Environment**: Production (или все окружения)

## Проверка исправления

После деплоя проверьте:
1. ✅ Корневая страница `/` загружается
2. ✅ Прямой доступ к `/login` работает
3. ✅ Прямой доступ к `/dashboard` работает (с редиректом на login, если не авторизован)
4. ✅ Обновление страницы (F5) на любом маршруте не вызывает 404
5. ✅ История браузера (кнопки назад/вперед) работает корректно

## Дополнительные рекомендации

### Для production деплоя:
- Убедитесь, что backend API настроен и доступен
- Настройте CORS на backend для разрешения запросов с домена Vercel
- Используйте HTTPS для backend API

### Альтернативное решение (если нужно проксировать API):
Если backend также деплоится на Vercel, можно добавить проксирование в `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/v1/:path*",
      "destination": "https://your-backend.vercel.app/api/v1/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Тестирование локально

Для тестирования production build локально:

```bash
cd automation-run/frontend
npm run build
npm run preview
```

Затем попробуйте открыть различные маршруты напрямую.
