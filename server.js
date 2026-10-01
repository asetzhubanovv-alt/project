/**
 * QazLife — Professional REST API Backend
 * Node.js + Express + Supabase
 * ─────────────────────────────────────────────────────────────
 * Features:
 *  ✓ JWT Authentication (register/login)
 *  ✓ Role-based access (admin/user)
 *  ✓ Full CRUD for posts
 *  ✓ Soft delete (deleted_at flag)
 *  ✓ Activity logging middleware
 *  ✓ Advanced filtering + sorting + pagination
 *  ✓ Admin panel endpoints
 *  ✓ Platform statistics
 *  ✓ Rate limiting
 *  ✓ Input validation
 *  ✓ Security headers (helmet)
 *  ✓ bcrypt password hashing
 * ─────────────────────────────────────────────────────────────
 */

require('dotenv').config();

const express    = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const { body, query, param, validationResult } = require('express-validator');

const app  = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════
//  SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection on startup
supabase.from('users').select('id', { count: 'exact', head: true })
  .then(() => console.log('✅ Supabase connected'))
  .catch(err => console.error('❌ Supabase connection failed:', err.message));

// ═══════════════════════════════════════════════════════════════
//  MIDDLEWARE STACK
// ═══════════════════════════════════════════════════════════════
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ═══════════════════════════════════════════════════════════════
//  RATE LIMITERS
// ═══════════════════════════════════════════════════════════════
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
const BCRYPT_ROUNDS = 12;
const JWT_SECRET    = process.env.JWT_SECRET || 'change_this_secret_in_production';
const JWT_EXPIRES   = process.env.JWT_EXPIRES_IN || '7d';

/** Validate express-validator results and send 422 on error */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

/** Sign a JWT for a user row */
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/** Log an action to activity_logs */
async function logAction(userId, action, metadata = {}, ip = null) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action: action,
      metadata: metadata,
      ip_address: ip
    });
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}

/** Generic error handler */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ═══════════════════════════════════════════════════════════════
//  AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/** Middleware: block blocked users from acting */
async function checkNotBlocked(req, res, next) {
  const { data, error } = await supabase
    .from('users')
    .select('is_blocked')
    .eq('id', req.user.id)
    .single();
  if (error || !data || data.is_blocked) {
    return res.status(403).json({ error: 'Your account has been blocked' });
  }
  next();
}

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/auth
// ═══════════════════════════════════════════════════════════════

/** POST /api/auth/register */
app.post('/api/auth/register',
  [
    body('username').trim().isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username: 3-50 chars, letters/numbers/underscore only'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password: min 8 chars with uppercase, lowercase, and number'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Check uniqueness
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`);
    if (existing && existing.length) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { data: user, error } = await supabase
      .from('users')
      .insert({ username, email, password: hashed })
      .select('id, username, email, role, created_at')
      .single();
    if (error || !user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }
    const token = signToken(user);

    await logAction(user.id, 'user.register', { username }, req.ip);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  })
);

/** POST /api/auth/login */
app.post('/api/auth/login',
  [
    body('login').trim().notEmpty().withMessage('Username or email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { login, password } = req.body;

    const { data: users } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${login},email.eq.${login}`);
    const user = users?.[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.is_blocked) {
      return res.status(403).json({ error: 'Your account has been blocked' });
    }

    const token = signToken(user);
    await logAction(user.id, 'user.login', { username: user.username }, req.ip);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  })
);

/** GET /api/auth/me */
app.get('/api/auth/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, role, is_blocked, created_at')
      .eq('id', req.user.id)
      .single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  })
);

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/posts
// ═══════════════════════════════════════════════════════════════

/** GET /api/posts — list with filter/sort/pagination */
app.get('/api/posts',
  [
    query('status').optional().isIn(['draft','published','archived']),
    query('user_id').optional().isInt({ min: 1 }),
    query('sort').optional().isIn(['created_at','updated_at','title']),
    query('order').optional().isIn(['asc','desc']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().trim().escape(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const {
      status, user_id, sort = 'created_at', order = 'desc',
      page = 1, limit = 20, search,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let queryBuilder = supabase
      .from('posts')
      .select('*, users!inner(id, username)', { count: 'exact' })
      .is('deleted_at', null)
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) queryBuilder = queryBuilder.eq('status', status);
    if (user_id) queryBuilder = queryBuilder.eq('user_id', parseInt(user_id));
    if (search) {
      queryBuilder = queryBuilder.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: posts, error, count } = await queryBuilder;
    if (error) throw error;

    // Format posts with author info
    const formattedPosts = posts?.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      created_at: p.created_at,
      updated_at: p.updated_at,
      author_id: p.users?.id,
      author_username: p.users?.username
    })) || [];

    res.json({
      posts: formattedPosts,
      pagination: {
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  })
);

/** GET /api/posts/:id */
app.get('/api/posts/:id',
  param('id').isInt({ min: 1 }),
  validate,
  asyncHandler(async (req, res) => {
    const { data: post, error } = await supabase
      .from('posts')
      .select('*, users!inner(id, username)')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .single();
    if (error || !post) return res.status(404).json({ error: 'Post not found' });
    res.json({
      post: {
        id: post.id,
        title: post.title,
        description: post.description,
        status: post.status,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author_id: post.users?.id,
        author_username: post.users?.username
      }
    });
  })
);

/** POST /api/posts */
app.post('/api/posts',
  authenticate,
  checkNotBlocked,
  [
    body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Title: 3-255 characters'),
    body('description').trim().isLength({ min: 10 }).withMessage('Description: minimum 10 characters'),
    body('status').optional().isIn(['draft','published','archived']).withMessage('Invalid status'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { title, description, status = 'draft' } = req.body;

    const { data: post, error } = await supabase
      .from('posts')
      .insert({ title, description, user_id: req.user.id, status })
      .select('id, title, description, status, created_at, updated_at')
      .single();
    if (error || !post) {
      return res.status(500).json({ error: 'Failed to create post' });
    }

    await logAction(req.user.id, 'post.create', {
      post_id: post.id, title: post.title, status: post.status,
    }, req.ip);

    res.status(201).json({ message: 'Post created', post });
  })
);

/** PUT /api/posts/:id */
app.put('/api/posts/:id',
  authenticate,
  checkNotBlocked,
  [
    param('id').isInt({ min: 1 }),
    body('title').optional().trim().isLength({ min: 3, max: 255 }),
    body('description').optional().trim().isLength({ min: 10 }),
    body('status').optional().isIn(['draft','published','archived']),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();
    if (error || !post) return res.status(404).json({ error: 'Post not found' });

    // Only owner or admin can edit
    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    const updateData = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.status !== undefined) updateData.status = req.body.status;

    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select('id, title, description, status, created_at, updated_at')
      .single();
    if (updateError || !updatedPost) {
      return res.status(500).json({ error: 'Failed to update post' });
    }

    await logAction(req.user.id, 'post.update', {
      post_id: parseInt(postId), changes: req.body,
    }, req.ip);

    res.json({ message: 'Post updated', post: updatedPost });
  })
);

/** DELETE /api/posts/:id — SOFT DELETE */
app.delete('/api/posts/:id',
  authenticate,
  checkNotBlocked,
  param('id').isInt({ min: 1 }),
  validate,
  asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();
    if (error || !post) return res.status(404).json({ error: 'Post not found' });

    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    const { error: updateError } = await supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId);
    if (updateError) {
      return res.status(500).json({ error: 'Failed to delete post' });
    }

    await logAction(req.user.id, 'post.delete', {
      post_id: parseInt(postId), title: post.title,
    }, req.ip);

    res.json({ message: 'Post deleted (soft)' });
  })
);

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/users  (Admin only)
// ═══════════════════════════════════════════════════════════════

/** GET /api/users */
app.get('/api/users',
  authenticate,
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(['admin','user']),
    query('blocked').optional().isBoolean(),
    query('search').optional().trim(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, role, blocked, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let queryBuilder = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (role) queryBuilder = queryBuilder.eq('role', role);
    if (blocked !== undefined) queryBuilder = queryBuilder.eq('is_blocked', blocked === 'true');
    if (search) {
      queryBuilder = queryBuilder.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error, count } = await queryBuilder;
    if (error) throw error;

    // Fetch post counts and last activity separately
    const usersWithStats = await Promise.all((users || []).map(async (u) => {
      const { count: postCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', u.id)
        .is('deleted_at', null);
      const { data: lastLog } = await supabase
        .from('activity_logs')
        .select('created_at')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return {
        ...u,
        post_count: postCount || 0,
        last_active: lastLog?.created_at || null
      };
    }));

    res.json({
      users: usersWithStats,
      pagination: {
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  })
);

/** GET /api/users/:id */
app.get('/api/users/:id',
  authenticate,
  requireAdmin,
  param('id').isInt({ min: 1 }),
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });

    const { count: postCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);

    res.json({
      user: {
        ...user,
        post_count: postCount || 0
      }
    });
  })
);

/** PATCH /api/users/:id/block — Block / Unblock */
app.patch('/api/users/:id/block',
  authenticate,
  requireAdmin,
  param('id').isInt({ min: 1 }),
  body('blocked').isBoolean().withMessage('blocked must be boolean'),
  validate,
  asyncHandler(async (req, res) => {
    const targetId = parseInt(req.params.id);
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }
    const { data: user, error } = await supabase
      .from('users')
      .update({ is_blocked: req.body.blocked })
      .eq('id', targetId)
      .select('id, username, is_blocked')
      .single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });

    await logAction(req.user.id, req.body.blocked ? 'user.block' : 'user.unblock', {
      target_id: targetId, target_username: user.username,
    }, req.ip);

    res.json({
      message: `User ${req.body.blocked ? 'blocked' : 'unblocked'}`,
      user,
    });
  })
);

/** PATCH /api/users/:id/role — Change role */
app.patch('/api/users/:id/role',
  authenticate,
  requireAdmin,
  param('id').isInt({ min: 1 }),
  body('role').isIn(['admin','user']).withMessage('Role must be admin or user'),
  validate,
  asyncHandler(async (req, res) => {
    const targetId = parseInt(req.params.id);
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    const { data: user, error } = await supabase
      .from('users')
      .update({ role: req.body.role })
      .eq('id', targetId)
      .select('id, username, role')
      .single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });

    await logAction(req.user.id, 'user.role_change', {
      target_id: targetId, new_role: req.body.role,
    }, req.ip);

    res.json({ message: 'Role updated', user });
  })
);

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/logs  (Admin only)
// ═══════════════════════════════════════════════════════════════

/** GET /api/logs */
app.get('/api/logs',
  authenticate,
  requireAdmin,
  [
    query('user_id').optional().isInt({ min: 1 }),
    query('action').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { user_id, action, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let queryBuilder = supabase
      .from('activity_logs')
      .select('*, users!left(id, username)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (user_id) queryBuilder = queryBuilder.eq('user_id', parseInt(user_id));
    if (action) queryBuilder = queryBuilder.ilike('action', `%${action}%`);

    const { data: logs, error, count } = await queryBuilder;
    if (error) throw error;

    // Format logs with user info
    const formattedLogs = logs?.map(l => ({
      id: l.id,
      action: l.action,
      metadata: l.metadata,
      ip_address: l.ip_address,
      created_at: l.created_at,
      user_id: l.users?.id || l.user_id,
      username: l.users?.username
    })) || [];

    res.json({
      logs: formattedLogs,
      pagination: {
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/stats  (Admin only)
// ═══════════════════════════════════════════════════════════════

/** GET /api/stats */
app.get('/api/stats',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    // Platform stats - separate queries for Supabase
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalUsers },
      { count: totalAdmins },
      { count: blockedUsers },
      { count: totalPosts },
      { count: publishedPosts },
      { count: draftPosts },
      { count: archivedPosts },
      { count: deletedPosts },
      { count: totalActions },
      { count: actions24h },
      { data: allUsers },
      { data: allPosts },
      { data: allLogs },
      { data: recentLogs }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_blocked', true),
      supabase.from('posts').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published').is('deleted_at', null),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'draft').is('deleted_at', null),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'archived').is('deleted_at', null),
      supabase.from('posts').select('*', { count: 'exact', head: true }).not('deleted_at', 'is', null),
      supabase.from('activity_logs').select('*', { count: 'exact', head: true }),
      supabase.from('activity_logs').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
      supabase.from('users').select('id, username, role'),
      supabase.from('posts').select('id, user_id, status, deleted_at'),
      supabase.from('activity_logs').select('id, user_id'),
      supabase.from('activity_logs').select('action, created_at').gte('created_at', sevenDaysAgo)
    ]);

    // Calculate user stats
    const userStats = allUsers?.map(u => {
      const userPosts = allPosts?.filter(p => p.user_id === u.id && !p.deleted_at) || [];
      const userLogs = allLogs?.filter(l => l.user_id === u.id) || [];
      const lastActive = allLogs?.filter(l => l.user_id === u.id).sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      )[0]?.created_at || null;
      return {
        id: u.id,
        username: u.username,
        role: u.role,
        post_count: userPosts.length,
        action_count: userLogs.length,
        last_active: lastActive
      };
    }).sort((a, b) => b.post_count - a.post_count).slice(0, 10) || [];

    // Calculate posts by status
    const postsByStatus = [
      { status: 'published', count: publishedPosts || 0 },
      { status: 'draft', count: draftPosts || 0 },
      { status: 'archived', count: archivedPosts || 0 }
    ];

    // Calculate recent activity by day
    const activityByDay = {};
    recentLogs?.forEach(l => {
      const day = l.created_at.split('T')[0];
      const key = `${day}-${l.action}`;
      if (!activityByDay[key]) {
        activityByDay[key] = { action: l.action, count: 0, day };
      }
      activityByDay[key].count++;
    });
    const recentActivity = Object.values(activityByDay).sort((a, b) =>
      b.day.localeCompare(a.day) || b.count - a.count
    );

    res.json({
      platform: {
        total_users: totalUsers || 0,
        total_admins: totalAdmins || 0,
        blocked_users: blockedUsers || 0,
        total_posts: totalPosts || 0,
        published_posts: publishedPosts || 0,
        draft_posts: draftPosts || 0,
        archived_posts: archivedPosts || 0,
        deleted_posts: deletedPosts || 0,
        total_actions: totalActions || 0,
        actions_24h: actions24h || 0
      },
      topUsers: userStats,
      recentActivity,
      postsByStatus
    });
  })
);

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/me/posts  (Own posts)
// ═══════════════════════════════════════════════════════════════

app.get('/api/me/posts',
  authenticate,
  [
    query('status').optional().isIn(['draft','published','archived']),
    query('include_deleted').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { status, include_deleted, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let queryBuilder = supabase
      .from('posts')
      .select('id, title, description, status, created_at, updated_at, deleted_at', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (include_deleted !== 'true') queryBuilder = queryBuilder.is('deleted_at', null);
    if (status) queryBuilder = queryBuilder.eq('status', status);

    const { data: posts, error, count } = await queryBuilder;
    if (error) throw error;

    res.json({
      posts: posts || [],
      pagination: {
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/tutors/posts
// ═══════════════════════════════════════════════════════════════
app.get('/api/tutors/posts', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('tutors_posts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ posts: data || [] });
}));

app.post('/api/tutors/posts', authenticate, checkNotBlocked, asyncHandler(async (req, res) => {
  const row = { ...req.body, author_id: req.user.id, author_name: req.user.username };
  const { data, error } = await supabase.from('tutors_posts').insert(row).select().single();
  if (error) throw error;
  await logAction(req.user.id, 'tutors.create', { post_id: data.id }, req.ip);
  res.status(201).json({ post: data });
}));

app.delete('/api/tutors/posts/:id', authenticate, checkNotBlocked, asyncHandler(async (req, res) => {
  const { data: post } = await supabase.from('tutors_posts').select('author_id').eq('id', req.params.id).single();
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
  const { error } = await supabase.from('tutors_posts').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ message: 'Post deleted' });
}));

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/freelance/posts
// ═══════════════════════════════════════════════════════════════
app.get('/api/freelance/posts', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('freelance_posts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ posts: data || [] });
}));

app.post('/api/freelance/posts', authenticate, checkNotBlocked, asyncHandler(async (req, res) => {
  const row = { ...req.body, author_id: req.user.id, author_name: req.user.username };
  const { data, error } = await supabase.from('freelance_posts').insert(row).select().single();
  if (error) throw error;
  await logAction(req.user.id, 'freelance.create', { post_id: data.id }, req.ip);
  res.status(201).json({ post: data });
}));

app.delete('/api/freelance/posts/:id', authenticate, checkNotBlocked, asyncHandler(async (req, res) => {
  const { data: post } = await supabase.from('freelance_posts').select('author_id').eq('id', req.params.id).single();
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
  const { error } = await supabase.from('freelance_posts').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ message: 'Post deleted' });
}));

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/volunteer/posts
// ═══════════════════════════════════════════════════════════════
app.get('/api/volunteer/posts', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('volunteer_posts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ posts: data || [] });
}));

app.post('/api/volunteer/posts', authenticate, checkNotBlocked, asyncHandler(async (req, res) => {
  const row = { ...req.body, author_id: req.user.id, author_name: req.user.username };
  const { data, error } = await supabase.from('volunteer_posts').insert(row).select().single();
  if (error) throw error;
  await logAction(req.user.id, 'volunteer.create', { post_id: data.id }, req.ip);
  res.status(201).json({ post: data });
}));

app.delete('/api/volunteer/posts/:id', authenticate, checkNotBlocked, asyncHandler(async (req, res) => {
  const { data: post } = await supabase.from('volunteer_posts').select('author_id').eq('id', req.params.id).single();
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
  const { error } = await supabase.from('volunteer_posts').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ message: 'Post deleted' });
}));

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/forum/posts
// ═══════════════════════════════════════════════════════════════
app.get('/api/forum/posts', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('forum_posts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ posts: data || [] });
}));

app.post('/api/forum/posts', authenticate, checkNotBlocked, asyncHandler(async (req, res) => {
  const row = { ...req.body, author_id: req.user.id, author_name: req.user.username };
  const { data, error } = await supabase.from('forum_posts').insert(row).select().single();
  if (error) throw error;
  await logAction(req.user.id, 'forum.create', { post_id: data.id }, req.ip);
  res.status(201).json({ post: data });
}));

app.delete('/api/forum/posts/:id', authenticate, checkNotBlocked, asyncHandler(async (req, res) => {
  const { data: post } = await supabase.from('forum_posts').select('author_id').eq('id', req.params.id).single();
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
  const { error } = await supabase.from('forum_posts').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ message: 'Post deleted' });
}));

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/likes
// ═══════════════════════════════════════════════════════════════
app.get('/api/likes', authenticate, asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('likes').select('*').eq('user_id', req.user.id);
  if (error) throw error;
  res.json({ likes: data || [] });
}));

app.post('/api/likes', authenticate, asyncHandler(async (req, res) => {
  const { post_id, post_type } = req.body;
  const { data, error } = await supabase.from('likes').insert({
    user_id: req.user.id, post_id, post_type
  }).select().single();
  if (error && error.code === '23505') return res.status(409).json({ error: 'Already liked' });
  if (error) throw error;
  res.status(201).json({ like: data });
}));

app.delete('/api/likes', authenticate, asyncHandler(async (req, res) => {
  const { post_id, post_type } = req.body;
  const { error } = await supabase.from('likes').delete()
    .eq('user_id', req.user.id).eq('post_id', post_id).eq('post_type', post_type);
  if (error) throw error;
  res.json({ message: 'Like removed' });
}));

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/comments
// ═══════════════════════════════════════════════════════════════
app.get('/api/comments', asyncHandler(async (req, res) => {
  const { post_id, post_type } = req.query;
  let q = supabase.from('comments').select('*').order('created_at', { ascending: true });
  if (post_id) q = q.eq('post_id', post_id);
  if (post_type) q = q.eq('post_type', post_type);
  const { data, error } = await q;
  if (error) throw error;
  res.json({ comments: data || [] });
}));

app.post('/api/comments', authenticate, checkNotBlocked, asyncHandler(async (req, res) => {
  const row = { ...req.body, author_id: req.user.id, author_name: req.user.username };
  const { data, error } = await supabase.from('comments').insert(row).select().single();
  if (error) throw error;
  res.status(201).json({ comment: data });
}));

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/profiles
// ═══════════════════════════════════════════════════════════════
app.get('/api/profiles/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'Profile not found' });
  res.json({ profile: data });
}));

app.put('/api/profiles', authenticate, asyncHandler(async (req, res) => {
  const { full_name, city, bio, avatar_url } = req.body;
  const { data, error } = await supabase.from('profiles').upsert({
    id: req.user.id, full_name, city, bio, avatar_url, updated_at: new Date().toISOString()
  }, { onConflict: 'id' }).select().single();
  if (error) throw error;
  res.json({ profile: data });
}));

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/me/all-posts (all categories)
// ═══════════════════════════════════════════════════════════════
app.get('/api/me/all-posts', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [tutors, freelance, volunteer, forum] = await Promise.all([
    supabase.from('tutors_posts').select('*').eq('author_id', userId).order('created_at', { ascending: false }),
    supabase.from('freelance_posts').select('*').eq('author_id', userId).order('created_at', { ascending: false }),
    supabase.from('volunteer_posts').select('*').eq('author_id', userId).order('created_at', { ascending: false }),
    supabase.from('forum_posts').select('*').eq('author_id', userId).order('created_at', { ascending: false })
  ]);
  res.json({
    tutors: tutors.data || [],
    freelance: freelance.data || [],
    volunteer: volunteer.data || [],
    forum: forum.data || []
  });
}));

// ═══════════════════════════════════════════════════════════════
//  ROUTE: /api/categories (list all category posts)
// ═══════════════════════════════════════════════════════════════
app.get('/api/categories/:type/posts', asyncHandler(async (req, res) => {
  const type = req.params.type;
  const validTypes = ['tutors', 'freelance', 'volunteer', 'forum'];
  if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid category' });
  const { data, error } = await supabase.from(type + '_posts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ posts: data || [] });
}));

// ═══════════════════════════════════════════════════════════════
//  HEALTH CHECK
// ═══════════════════════════════════════════════════════════════
app.get('/health', asyncHandler(async (req, res) => {
  const { error } = await supabase.from('users').select('id', { count: 'exact', head: true });
  res.json({
    status: 'ok',
    database: error ? 'disconnected' : 'connected',
    serverTime: new Date().toISOString(),
    uptime: process.uptime(),
  });
}));

app.get('/api', (req, res) => {
  res.json({
    name: 'QazLife API',
    version: '2.0.0',
    endpoints: {
      auth:  ['POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/me'],
      posts: ['GET /api/posts', 'GET /api/posts/:id', 'POST /api/posts', 'PUT /api/posts/:id', 'DELETE /api/posts/:id'],
      me:    ['GET /api/me/posts'],
      users: ['GET /api/users', 'GET /api/users/:id', 'PATCH /api/users/:id/block', 'PATCH /api/users/:id/role'],
      admin: ['GET /api/logs', 'GET /api/stats'],
    },
  });
});

// ═══════════════════════════════════════════════════════════════
//  404 & GLOBAL ERROR HANDLER
// ═══════════════════════════════════════════════════════════════
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ═══════════════════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`🚀 QazLife API running on http://localhost:${PORT}`);
  console.log(`📘 API docs: http://localhost:${PORT}/api`);
  console.log(`❤️  Health:   http://localhost:${PORT}/health`);
});

module.exports = app;
