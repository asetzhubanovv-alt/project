# 🚀 QazLife — Professional Full-Stack Application

**Junior Developer Level · REST API · Supabase · JWT · CRUD · Admin Panel**

---

## 📁 Структура проекта

```
qazlife/
├── server.js              ← Node.js / Express Backend API (полный CRUD)
├── schema.sql             ← PostgreSQL схема (основные таблицы)
├── supabase-setup.sql     ← Полная схема со всеми таблицами
├── index.html             ← Frontend SPA (основной интерфейс)
├── test-api.html          ← Тестовый интерфейс API
├── api.js                 ← API клиент для frontend
├── package.json           ← Зависимости
├── .env.example           ← Переменные окружения (шаблон)
└── README.md              ← Этот файл
```

---

## ✅ Функционал (Всё реализовано!)

### 🔐 1. Аутентификация
- ✅ `POST /api/auth/register` — Регистрация (bcrypt, валидация)
- ✅ `POST /api/auth/login` — Логин + JWT токен
- ✅ `GET /api/auth/me` — Текущий пользователь
- ✅ Проверка уникальности email/username
- ✅ Роли: user / admin

### 📝 2. CRUD Постов
- ✅ `GET /api/posts` — Список (фильтры, сортировка, пагинация)
- ✅ `GET /api/posts/:id` — Один пост + автор (JOIN)
- ✅ `POST /api/posts` — Создать (только авторизованные)
- ✅ `PUT /api/posts/:id` — Обновить (только автор)
- ✅ `DELETE /api/posts/:id` — Soft delete (только автор)

### 📂 3. Категории (tutors, freelance, volunteer, forum)
- ✅ Отдельные таблицы для каждой категории
- ✅ Полный CRUD для каждой категории
- ✅ Связь с пользователями

### ❤️ 4. Лайки
- ✅ `GET /api/likes` — Мои лайки
- ✅ `POST /api/likes` — Поставить лайк
- ✅ `DELETE /api/likes` — Убрать лайк

### 💬 5. Комментарии
- ✅ `GET /api/comments` — Список комментариев
- ✅ `POST /api/comments` — Добавить комментарий

### 👤 6. Профили
- ✅ `GET /api/profiles/:id` — Профиль пользователя
- ✅ `PUT /api/profiles` — Обновить профиль

### 📊 7. Статистика и логи
- ✅ `GET /api/stats` — Статистика платформы
- ✅ `GET /api/logs` — Логи активности
- ✅ Автоматическое логирование всех действий

### 🔎 8. Поиск и фильтрация
- ✅ Поиск по title/description (SQL ILIKE)
- ✅ Фильтрация по статусу (draft/published/archived)
- ✅ Пагинация (page/limit)
- ✅ Сортировка (sort/order)

---

## 🧱 База данных (Supabase)

### Все таблицы

| Таблица | Назначение |
|---|---|
| `users` | Пользователи (bcrypt пароли, роли) |
| `posts` | Основные посты (soft delete) |
| `profiles` | Профили пользователей |
| `tutors_posts` | Репетиторы |
| `freelance_posts` | Фриланс |
| `volunteer_posts` | Волонтёрство |
| `forum_posts` | Форум |
| `likes` | Лайки |
| `comments` | Комментарии |
| `activity_logs` | Логи действий |

---

## ⚙️ Установка и запуск

### 1. Требования
- Node.js 18+
- Аккаунт на [Supabase](https://supabase.com)

### 2. Настройка Supabase
```bash
# Выполните в SQL Editor Supabase:
1. supabase-setup.sql  -- Полная схема
```

### 3. Настройка .env
```bash
cp .env.example .env
# Отредактируйте .env:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-secret-key-min-32-chars-long
PORT=3000
```

### 4. Запуск
```bash
npm install
npm start
```

### 5. Тестирование
```
Backend API: http://localhost:3000
Тест API:    Откройте test-api.html в браузере
Frontend:    Откройте index.html в браузере
```

---

## 🔑 Demo доступ
```
Admin:  admin / Admin1234!
Test:   testuser / Test1234!
```
```

### 4. Установить зависимости
```bash
npm install
```

### 5. Инициализировать базу данных
```bash
npm run db:init
# или: node scripts/init-db.js
```

### 6. Запустить сервер
```bash
# Разработка (с автоперезагрузкой)
npm run dev

# Production
npm start
```

Сервер запустится на `http://localhost:3000`

### 7. Открыть фронтенд
Откройте `index.html` в браузере (через Live Server или напрямую).
Убедитесь что `API` в `index.html` указывает на `http://localhost:3000/api`.

---

## 🔐 API Endpoints

### Auth
| Method | Path | Auth | Описание |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Регистрация |
| `POST` | `/api/auth/login` | — | Вход, получение JWT |
| `GET`  | `/api/auth/me` | ✅ | Текущий пользователь |

### Posts
| Method | Path | Auth | Описание |
|---|---|---|---|
| `GET`    | `/api/posts` | — | Список (фильтр, сортировка, пагинация) |
| `GET`    | `/api/posts/:id` | — | Один пост |
| `POST`   | `/api/posts` | ✅ | Создать |
| `PUT`    | `/api/posts/:id` | ✅ | Обновить (владелец/admin) |
| `DELETE` | `/api/posts/:id` | ✅ | Soft delete |
| `GET`    | `/api/me/posts` | ✅ | Мои посты |

### Users (Admin only)
| Method | Path | Описание |
|---|---|---|
| `GET`   | `/api/users` | Список с фильтрацией |
| `GET`   | `/api/users/:id` | Один пользователь |
| `PATCH` | `/api/users/:id/block` | Блокировка / разблокировка |
| `PATCH` | `/api/users/:id/role` | Изменение роли |

### Admin
| Method | Path | Описание |
|---|---|---|
| `GET` | `/api/logs` | Логи действий |
| `GET` | `/api/stats` | Статистика платформы |

### Health
| Method | Path | Описание |
|---|---|---|
| `GET` | `/health` | Статус сервера + DB |
| `GET` | `/api` | Список endpoints |

---

## 🎯 Профессиональные функции

### 🔐 Безопасность
- **bcrypt** (12 rounds) для паролей
- **JWT** (7 дней) для сессий
- **Helmet** — security headers
- **Rate limiting** — 100 req/15min глобально, 10 req/15min для auth
- **express-validator** — валидация всех входных данных
- Защита паролей: мин. 8 символов, заглавная + строчная + цифра

### 📊 Фильтрация и запросы
- Фильтр по `status`, `user_id`, `search` (ILIKE)
- Сортировка по `created_at`, `updated_at`, `title`
- Пагинация с `page` + `limit`
- Комбинированные WHERE условия

### 🗑 Soft Delete
- Посты не удаляются физически
- `deleted_at` = NULL означает "активен"
- Через `include_deleted=true` видны удалённые (для своих постов)

### 📋 Логирование
Все действия пишутся в `activity_logs`:
- `user.register` — регистрация
- `user.login` — вход
- `post.create` — создание поста
- `post.update` — обновление поста
- `post.delete` — удаление поста (soft)
- `user.block` / `user.unblock`
- `user.role_change`

### 👮 Роли
- **user** — создание/редактирование/удаление своих постов
- **admin** — всё выше + управление пользователями + просмотр логов и статистики

---

## 🔑 Demo аккаунт

```
username: admin
password: Admin1234!
```

---

## 📦 Зависимости

| Пакет | Версия | Назначение |
|---|---|---|
| express | ^4.18 | HTTP сервер |
| @supabase/supabase-js | ^2.39 | Supabase клиент |
| bcryptjs | ^2.4 | Хеширование паролей |
| jsonwebtoken | ^9.0 | JWT токены |
| express-rate-limit | ^7.1 | Rate limiting |
| express-validator | ^7.0 | Валидация данных |
| helmet | ^7.1 | Security headers |
| cors | ^2.8 | CORS |
| morgan | ^1.10 | HTTP логгер |
| dotenv | ^16.3 | Переменные окружения |
