// ============================================================
// QazLife API Client - Полный набор функций для работы с API
// ============================================================

const API_URL = 'http://localhost:3000/api';

// Хранение токена
let authToken = localStorage.getItem('token') || null;

// Базовая функция для API запросов
async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    },
    ...options,
  };
  
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  
  const response = await fetch(url, config);
  const data = await response.json().catch(() => null);
  
  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`);
  }
  
  return data;
}

// ============================================================
// 1. AUTH (Аутентификация)
// ============================================================

/**
 * Регистрация нового пользователя
 * @param {string} username - Имя пользователя
 * @param {string} email - Email
 * @param {string} password - Пароль (минимум 8 символов)
 */
async function registerUser(username, email, password) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: { username, email, password }
  });
  
  if (data.token) {
    authToken = data.token;
    localStorage.setItem('token', authToken);
  }
  
  return data;
}

/**
 * Вход в систему
 * @param {string} login - Email или username
 * @param {string} password - Пароль
 */
async function loginUser(login, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { login, password }
  });
  
  if (data.token) {
    authToken = data.token;
    localStorage.setItem('token', authToken);
  }
  
  return data;
}

/**
 * Получить текущего пользователя
 */
async function getCurrentUser() {
  return await apiRequest('/auth/me');
}

/**
 * Выход из системы
 */
function logoutUser() {
  authToken = null;
  localStorage.removeItem('token');
}

// ============================================================
// 2. POSTS CRUD (Основные посты)
// ============================================================

/**
 * Получить список постов
 * @param {Object} filters - Фильтры (status, user_id, search, page, limit)
 */
async function getPosts(filters = {}) {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.user_id) params.append('user_id', filters.user_id);
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.sort) params.append('sort', filters.sort);
  if (filters.order) params.append('order', filters.order);
  
  const query = params.toString() ? `?${params.toString()}` : '';
  return await apiRequest(`/posts${query}`);
}

/**
 * Получить один пост
 * @param {number} id - ID поста
 */
async function getPost(id) {
  return await apiRequest(`/posts/${id}`);
}

/**
 * Создать пост
 * @param {Object} post - { title, description, status }
 */
async function createPost(post) {
  return await apiRequest('/posts', {
    method: 'POST',
    body: post
  });
}

/**
 * Обновить пост
 * @param {number} id - ID поста
 * @param {Object} updates - { title, description, status }
 */
async function updatePost(id, updates) {
  return await apiRequest(`/posts/${id}`, {
    method: 'PUT',
    body: updates
  });
}

/**
 * Удалить пост (soft delete)
 * @param {number} id - ID поста
 */
async function deletePost(id) {
  return await apiRequest(`/posts/${id}`, {
    method: 'DELETE'
  });
}

// ============================================================
// 3. CATEGORY POSTS (Категории)
// ============================================================

const categories = ['tutors', 'freelance', 'volunteer', 'forum'];

categories.forEach(category => {
  // Создаём функции динамически
  window[`get${category.charAt(0).toUpperCase() + category.slice(1)}Posts`] = async () => {
    return await apiRequest(`/${category}/posts`);
  };
  
  window[`create${category.charAt(0).toUpperCase() + category.slice(1)}Post`] = async (post) => {
    return await apiRequest(`/${category}/posts`, {
      method: 'POST',
      body: post
    });
  };
  
  window[`delete${category.charAt(0).toUpperCase() + category.slice(1)}Post`] = async (id) => {
    return await apiRequest(`/${category}/posts/${id}`, {
      method: 'DELETE'
    });
  };
});

// ============================================================
// 4. USER POSTS
// ============================================================

/**
 * Получить все посты текущего пользователя
 */
async function getMyPosts() {
  return await apiRequest('/me/posts');
}

/**
 * Получить все посты по категориям
 */
async function getMyAllPosts() {
  return await apiRequest('/me/all-posts');
}

// ============================================================
// 5. LIKES (Лайки)
// ============================================================

/**
 * Получить лайки пользователя
 */
async function getMyLikes() {
  return await apiRequest('/likes');
}

/**
 * Поставить лайк
 * @param {number} post_id - ID поста
 * @param {string} post_type - Тип поста (tutors/freelance/volunteer/forum)
 */
async function addLike(post_id, post_type) {
  return await apiRequest('/likes', {
    method: 'POST',
    body: { post_id, post_type }
  });
}

/**
 * Убрать лайк
 * @param {number} post_id - ID поста
 * @param {string} post_type - Тип поста
 */
async function removeLike(post_id, post_type) {
  return await apiRequest('/likes', {
    method: 'DELETE',
    body: { post_id, post_type }
  });
}

// ============================================================
// 6. COMMENTS (Комментарии)
// ============================================================

/**
 * Получить комментарии
 * @param {number} post_id - ID поста
 * @param {string} post_type - Тип поста
 */
async function getComments(post_id, post_type) {
  const params = new URLSearchParams();
  if (post_id) params.append('post_id', post_id);
  if (post_type) params.append('post_type', post_type);
  
  return await apiRequest(`/comments?${params.toString()}`);
}

/**
 * Добавить комментарий
 * @param {Object} comment - { post_id, post_type, body }
 */
async function addComment(comment) {
  return await apiRequest('/comments', {
    method: 'POST',
    body: comment
  });
}

// ============================================================
// 7. PROFILES (Профили)
// ============================================================

/**
 * Получить профиль пользователя
 * @param {number} id - ID пользователя
 */
async function getProfile(id) {
  return await apiRequest(`/profiles/${id}`);
}

/**
 * Обновить свой профиль
 * @param {Object} profile - { full_name, city, bio, avatar_url }
 */
async function updateProfile(profile) {
  return await apiRequest('/profiles', {
    method: 'PUT',
    body: profile
  });
}

// ============================================================
// 8. STATS (Статистика)
// ============================================================

/**
 * Получить статистику платформы
 */
async function getStats() {
  return await apiRequest('/stats');
}

/**
 * Получить логи активности
 */
async function getLogs() {
  return await apiRequest('/logs');
}

// ============================================================
// Экспорт для использования в других файлах
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    registerUser, loginUser, getCurrentUser, logoutUser,
    getPosts, getPost, createPost, updatePost, deletePost,
    getMyPosts, getMyAllPosts,
    getMyLikes, addLike, removeLike,
    getComments, addComment,
    getProfile, updateProfile,
    getStats, getLogs,
    apiRequest, authToken
  };
}
