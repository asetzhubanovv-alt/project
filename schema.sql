-- ============================================================
--  QazLife — Supabase Schema
--  Professional Full-Stack Application
--  Run this in Supabase SQL Editor (separate statements)
-- ============================================================

-- ============================================================
-- STEP 1: Create users table first (no dependencies)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL        PRIMARY KEY,
  username    VARCHAR(50)   NOT NULL UNIQUE,
  email       VARCHAR(255)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  role        VARCHAR(20)   NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_blocked  BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);

-- ============================================================
-- STEP 2: Create posts table (depends on users)
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id          SERIAL        PRIMARY KEY,
  title       VARCHAR(255)  NOT NULL,
  description TEXT          NOT NULL,
  user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(20)   NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ   DEFAULT NULL
);

-- ============================================================
-- STEP 3: Create activity_logs table (depends on users)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id          SERIAL        PRIMARY KEY,
  user_id     INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100)  NOT NULL,
  metadata    JSONB         DEFAULT '{}',
  ip_address  INET          DEFAULT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 4: Create trigger function for auto-updating updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-update
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
-- STEP 5: Indexes (drop if exists then create)
-- ============================================================

DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_role;

DROP INDEX IF EXISTS idx_posts_user_id;
DROP INDEX IF EXISTS idx_posts_status;
DROP INDEX IF EXISTS idx_posts_deleted;
DROP INDEX IF EXISTS idx_posts_created;

DROP INDEX IF EXISTS idx_logs_user_id;
DROP INDEX IF EXISTS idx_logs_action;
DROP INDEX IF EXISTS idx_logs_created;

DROP INDEX IF EXISTS idx_tutors_author;
DROP INDEX IF EXISTS idx_tutors_city;
DROP INDEX IF EXISTS idx_tutors_category;

DROP INDEX IF EXISTS idx_freelance_author;
DROP INDEX IF EXISTS idx_freelance_category;

DROP INDEX IF EXISTS idx_volunteer_author;
DROP INDEX IF EXISTS idx_volunteer_date;

DROP INDEX IF EXISTS idx_forum_author;
DROP INDEX IF EXISTS idx_forum_category;

DROP INDEX IF EXISTS idx_likes_user;
DROP INDEX IF EXISTS idx_likes_post;

DROP INDEX IF EXISTS idx_comments_post;
DROP INDEX IF EXISTS idx_comments_author;

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role     ON users(role);

CREATE INDEX idx_posts_user_id   ON posts(user_id);
CREATE INDEX idx_posts_status    ON posts(status);
CREATE INDEX idx_posts_deleted   ON posts(deleted_at);
CREATE INDEX idx_posts_created   ON posts(created_at DESC);

CREATE INDEX idx_logs_user_id   ON activity_logs(user_id);
CREATE INDEX idx_logs_action    ON activity_logs(action);
CREATE INDEX idx_logs_created   ON activity_logs(created_at DESC);

CREATE INDEX idx_tutors_author ON tutors_posts(author_id);
CREATE INDEX idx_tutors_city ON tutors_posts(city);
CREATE INDEX idx_tutors_category ON tutors_posts(category);

CREATE INDEX idx_freelance_author ON freelance_posts(author_id);
CREATE INDEX idx_freelance_category ON freelance_posts(category);

CREATE INDEX idx_volunteer_author ON volunteer_posts(author_id);
CREATE INDEX idx_volunteer_date ON volunteer_posts(event_date);

CREATE INDEX idx_forum_author ON forum_posts(author_id);
CREATE INDEX idx_forum_category ON forum_posts(category);

CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_likes_post ON likes(post_id, post_type);

CREATE INDEX idx_comments_post ON comments(post_id, post_type);
CREATE INDEX idx_comments_author ON comments(author_id);

-- ============================================================
-- STEP 5: Profiles table (user profiles with extra info)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          INTEGER       PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name   VARCHAR(100)  DEFAULT NULL,
  city        VARCHAR(50)   DEFAULT NULL,
  bio         TEXT          DEFAULT NULL,
  avatar_url  VARCHAR(255)  DEFAULT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STEP 6: Category-specific posts tables
-- ============================================================

-- Tutors posts
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

CREATE INDEX idx_tutors_author ON tutors_posts(author_id);
CREATE INDEX idx_tutors_city ON tutors_posts(city);
CREATE INDEX idx_tutors_category ON tutors_posts(category);

-- Freelance posts
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

CREATE INDEX idx_freelance_author ON freelance_posts(author_id);
CREATE INDEX idx_freelance_category ON freelance_posts(category);

-- Volunteer posts
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

CREATE INDEX idx_volunteer_author ON volunteer_posts(author_id);
CREATE INDEX idx_volunteer_date ON volunteer_posts(event_date);

-- Forum posts
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

CREATE INDEX idx_forum_author ON forum_posts(author_id);
CREATE INDEX idx_forum_category ON forum_posts(category);

-- ============================================================
-- STEP 7: Likes table
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
  id          SERIAL        PRIMARY KEY,
  user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     INTEGER       NOT NULL,
  post_type   VARCHAR(20)   NOT NULL CHECK (post_type IN ('tutors', 'freelance', 'volunteer', 'forum')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, post_id, post_type)
);

CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_likes_post ON likes(post_id, post_type);

-- ============================================================
-- STEP 8: Comments table
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id          SERIAL        PRIMARY KEY,
  post_id     INTEGER       NOT NULL,
  post_type   VARCHAR(20)   NOT NULL CHECK (post_type IN ('tutors', 'freelance', 'volunteer', 'forum')),
  body        TEXT          NOT NULL,
  author_id   INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(100)  DEFAULT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id, post_type);
CREATE INDEX idx_comments_author ON comments(author_id);

-- ============================================================
-- STEP 9: Seed default admin user
-- Password: Admin1234! (change immediately)
-- ============================================================
INSERT INTO users (username, email, password, role)
VALUES (
  'admin',
  'admin@qazlife.kz',
  '$2b$12$LQv3c1yqBwEHXtRXhHmDjOvJYGf/5hEY8o4hY5K5DLxPi3Rq3TrWu',
  'admin'
) ON CONFLICT (username) DO NOTHING;
