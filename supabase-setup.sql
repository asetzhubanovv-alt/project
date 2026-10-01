-- ============================================================
-- QazLife FULL Setup - Все таблицы для полноценного приложения
-- ============================================================

-- ============================================================
-- STEP 1: Основные таблицы
-- ============================================================

-- Users (пользователи)
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL        PRIMARY KEY,
  username    VARCHAR(50)   NOT NULL UNIQUE,
  email       VARCHAR(255)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,  -- bcrypt hash
  role        VARCHAR(20)   NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_blocked  BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Posts (основные посты)
CREATE TABLE IF NOT EXISTS posts (
  id          SERIAL        PRIMARY KEY,
  title       VARCHAR(255)  NOT NULL,
  description TEXT          NOT NULL,
  user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(20)   NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ   DEFAULT NULL  -- soft delete
);

-- Activity Logs (логирование)
CREATE TABLE IF NOT EXISTS activity_logs (
  id          SERIAL        PRIMARY KEY,
  user_id     INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100)  NOT NULL,
  metadata    JSONB         DEFAULT '{}',
  ip_address  INET          DEFAULT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 2: Дополнительные таблицы (для расширенного функционала)
-- ============================================================

-- Profiles (профили пользователей)
CREATE TABLE IF NOT EXISTS profiles (
  id          INTEGER       PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name   VARCHAR(100)  DEFAULT NULL,
  city        VARCHAR(50)   DEFAULT NULL,
  bio         TEXT          DEFAULT NULL,
  avatar_url  VARCHAR(255)  DEFAULT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Category-specific posts
CREATE TABLE IF NOT EXISTS tutors_posts (
  id          SERIAL        PRIMARY KEY,
  title       VARCHAR(255)  NOT NULL,
  description TEXT          NOT NULL,
  category    VARCHAR(50)   DEFAULT 'general',
  price       INTEGER       DEFAULT NULL,
  city        VARCHAR(50)   DEFAULT NULL,
  experience  VARCHAR(100)  DEFAULT NULL,
  format      VARCHAR(50)   DEFAULT NULL,
  skills      TEXT          DEFAULT NULL,
  contact     VARCHAR(100)  DEFAULT NULL,
  author_id   INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name VARCHAR(100)  DEFAULT NULL,
  likes       INTEGER       DEFAULT 0,
  rating      VARCHAR(10)   DEFAULT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS freelance_posts (
  id          SERIAL        PRIMARY KEY,
  title       VARCHAR(255)  NOT NULL,
  description TEXT          NOT NULL,
  category    VARCHAR(50)   DEFAULT 'general',
  price       INTEGER       DEFAULT NULL,
  deadline    VARCHAR(50)   DEFAULT NULL,
  skills      TEXT          DEFAULT NULL,
  contact     VARCHAR(100)  DEFAULT NULL,
  author_id   INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name VARCHAR(100)  DEFAULT NULL,
  likes       INTEGER       DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS volunteer_posts (
  id          SERIAL        PRIMARY KEY,
  title       VARCHAR(255)  NOT NULL,
  description TEXT          NOT NULL,
  category    VARCHAR(50)   DEFAULT 'general',
  event_date  VARCHAR(50)   DEFAULT NULL,
  place       VARCHAR(100)  DEFAULT NULL,
  volunteers_needed INTEGER DEFAULT NULL,
  contact     VARCHAR(100)  DEFAULT NULL,
  author_id   INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name VARCHAR(100)  DEFAULT NULL,
  likes       INTEGER       DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id          SERIAL        PRIMARY KEY,
  title       VARCHAR(255)  NOT NULL,
  body        TEXT          NOT NULL,
  category    VARCHAR(50)   DEFAULT 'general',
  replies     INTEGER       DEFAULT 0,
  author_id   INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name VARCHAR(100)  DEFAULT NULL,
  likes       INTEGER       DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Likes (лайки)
CREATE TABLE IF NOT EXISTS likes (
  id          SERIAL        PRIMARY KEY,
  user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     INTEGER       NOT NULL,
  post_type   VARCHAR(20)   NOT NULL CHECK (post_type IN ('tutors', 'freelance', 'volunteer', 'forum')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, post_id, post_type)
);

-- Comments (комментарии)
CREATE TABLE IF NOT EXISTS comments (
  id          SERIAL        PRIMARY KEY,
  post_id     INTEGER       NOT NULL,
  post_type   VARCHAR(20)   NOT NULL CHECK (post_type IN ('tutors', 'freelance', 'volunteer', 'forum')),
  body        TEXT          NOT NULL,
  author_id   INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(100)  DEFAULT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 3: Индексы для быстродействия
-- ============================================================

DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_posts_user_id;
DROP INDEX IF EXISTS idx_posts_status;
DROP INDEX IF EXISTS idx_posts_deleted;
DROP INDEX IF EXISTS idx_logs_user_id;
DROP INDEX IF EXISTS idx_tutors_author;
DROP INDEX IF EXISTS idx_freelance_author;
DROP INDEX IF EXISTS idx_volunteer_author;
DROP INDEX IF EXISTS idx_forum_author;
DROP INDEX IF EXISTS idx_likes_user;
DROP INDEX IF EXISTS idx_comments_post;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_deleted ON posts(deleted_at);
CREATE INDEX idx_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_tutors_author ON tutors_posts(author_id);
CREATE INDEX idx_freelance_author ON freelance_posts(author_id);
CREATE INDEX idx_volunteer_author ON volunteer_posts(author_id);
CREATE INDEX idx_forum_author ON forum_posts(author_id);
CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_comments_post ON comments(post_id, post_type);

-- ============================================================
-- STEP 4: Триггеры для автообновления updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_posts_updated_at ON posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STEP 5: Демо-данные
-- ============================================================

-- Admin пользователь (пароль: Admin1234!)
INSERT INTO users (username, email, password, role)
VALUES (
  'admin',
  'admin@qazlife.kz',
  '$2b$12$LQv3c1yqBwEHXtRXhHmDjOvJYGf/5hEY8o4hY5K5DLxPi3Rq3TrWu',
  'admin'
) ON CONFLICT (username) DO NOTHING;

-- Тестовый пользователь (пароль: Test1234!)
INSERT INTO users (username, email, password, role)
VALUES (
  'testuser',
  'test@qazlife.kz',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'user'
) ON CONFLICT (username) DO NOTHING;

-- Профили для пользователей
INSERT INTO profiles (id, full_name, city, bio)
VALUES 
  (1, 'Администратор', 'Алматы', 'Главный администратор платформы'),
  (2, 'Тест Пользователь', 'Астана', 'Тестовый аккаунт')
ON CONFLICT (id) DO NOTHING;

-- Примеры постов
INSERT INTO posts (title, description, user_id, status)
VALUES 
  ('Добро пожаловать на QazLife!', 'Это первая публикация на нашей платформе.', 1, 'published'),
  ('Как использовать платформу', 'Подробное руководство для новичков.', 1, 'published'),
  ('Черновик поста', 'Это неопубликованный черновик.', 2, 'draft')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 6: Политики безопасности (RLS) для Supabase
-- ============================================================

-- Включаем RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Политики для posts
CREATE POLICY "Anyone can view published posts" ON posts
  FOR SELECT USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "Users can manage own posts" ON posts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all posts" ON posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Политики для profiles
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can edit own profile" ON profiles
  FOR ALL USING (id = auth.uid());

-- Политики для likes
CREATE POLICY "Users can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON likes
  FOR ALL USING (user_id = auth.uid());

-- Политики для comments
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can manage own comments" ON comments
  FOR ALL USING (author_id = auth.uid());

-- ============================================================
-- ГОТОВО! Все таблицы созданы.
-- ============================================================
