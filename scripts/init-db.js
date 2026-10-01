/**
 * Supabase Database Initialization Script
 * Run: node scripts/init-db.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initDatabase() {
  console.log('🚀 Initializing Supabase database...\n');

  try {
    // Check connection
    const { error: connError } = await supabase.from('users').select('id', { count: 'exact', head: true });
    
    if (connError && connError.code !== 'PGRST116') {
      console.error('❌ Failed to connect to Supabase:', connError.message);
      process.exit(1);
    }

    console.log('✅ Connected to Supabase\n');

    // Note: Tables should be created via Supabase Dashboard SQL Editor
    // or using Supabase Migrations. This script assumes tables exist.
    
    // Create default admin user if not exists
    const adminUsername = 'admin';
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('username', adminUsername)
      .single();

    if (!existingAdmin) {
      console.log('👤 Creating default admin user...');
      
      const hashedPassword = await bcrypt.hash('Admin1234!', 12);
      
      const { error: insertError } = await supabase.from('users').insert({
        username: 'admin',
        email: 'admin@qazlife.kz',
        password: hashedPassword,
        role: 'admin',
        is_blocked: false
      });

      if (insertError) {
        console.error('❌ Failed to create admin user:', insertError.message);
      } else {
        console.log('✅ Admin user created successfully');
        console.log('   Username: admin');
        console.log('   Password: Admin1234!');
        console.log('   ⚠️  Change this password immediately!\n');
      }
    } else {
      console.log('ℹ️  Admin user already exists, skipping...\n');
    }

    console.log('✅ Database initialization complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Ensure tables are created in Supabase (use SQL Editor)');
    console.log('   2. Run: npm start');
    console.log('   3. Test API at: http://localhost:3000/api\n');

  } catch (err) {
    console.error('❌ Initialization error:', err.message);
    process.exit(1);
  }
}

// SQL for creating tables (to be run in Supabase SQL Editor)
const setupSQL = `
-- Run this in Supabase SQL Editor to create tables:

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address INET DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (optional, configure policies as needed)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
`;

console.log('\n' + '='.repeat(60));
console.log('SQL Setup Script (run in Supabase SQL Editor):');
console.log('='.repeat(60));
console.log(setupSQL);
console.log('='.repeat(60) + '\n');

initDatabase();
