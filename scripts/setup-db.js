// scripts/setup-db.js
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function runMigrations() {
  console.log('🚀 Starting database setup...')
  
  try {
    // Read all migration files
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
    const files = fs.readdirSync(migrationsDir).sort()
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`📝 Running migration: ${file}`)
        
        const sql = fs.readFileSync(
          path.join(migrationsDir, file),
          'utf8'
        )
        
        // Split SQL by semicolons and execute each statement
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0)
        
        for (const statement of statements) {
          try {
            const { error } = await supabase.rpc('exec_sql', {
              sql_query: statement + ';'
            })
            
            if (error) {
              // If exec_sql doesn't exist, show instructions
              if (error.message.includes('exec_sql')) {
                console.log('⚠️  exec_sql function not found.')
                console.log('Please run the following SQL in your Supabase SQL editor:')
                console.log(`
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
                `)
                console.log('Then run this script again.')
                process.exit(1)
              }
              throw error
            }
          } catch (error) {
            console.error(`❌ Error executing statement:`, error.message)
            console.log('Statement:', statement.substring(0, 100) + '...')
            throw error
          }
        }
        
        console.log(`✅ ${file} completed`)
      }
    }
    
    // Create storage bucket
    console.log('📝 Creating storage bucket...')
    
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === 'resources')
    
    if (!bucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket('resources', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'application/zip',
          'application/x-rar-compressed',
          'image/jpeg',
          'image/png'
        ]
      })
      
      if (bucketError) {
        console.error('❌ Error creating storage bucket:', bucketError)
        throw bucketError
      }
      
      console.log('✅ Storage bucket created')
    } else {
      console.log('✅ Storage bucket already exists')
    }
    
    // Run seed data (optional)
    if (process.argv.includes('--seed')) {
      console.log('📝 Seeding database...')
      const seedFile = path.join(__dirname, '..', 'supabase', 'seed.sql')
      
      if (fs.existsSync(seedFile)) {
        const seedSql = fs.readFileSync(seedFile, 'utf8')
        const seedStatements = seedSql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0)
        
        for (const statement of seedStatements) {
          try {
            const { error: seedError } = await supabase.rpc('exec_sql', {
              sql_query: statement + ';'
            })
            
            if (seedError) {
              console.error('⚠️  Seed error (non-fatal):', seedError.message)
            }
          } catch (error) {
            console.error('⚠️  Seed error (non-fatal):', error.message)
          }
        }
        
        console.log('✅ Database seeded')
      }
    }
    
    console.log('🎉 Database setup completed successfully!')
    console.log('📋 Next steps:')
    console.log('1. Make sure your .env.local file is configured')
    console.log('2. Run "npm run dev" to start the development server')
    console.log('3. Visit http://localhost:3000 to see your app')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

// Create necessary RPC functions
async function createRPCFunctions() {
  console.log('📝 Creating RPC functions...')
  
  const rpcFunctions = `
    -- Increment functions
    CREATE OR REPLACE FUNCTION increment_upvotes(resource_id UUID)
    RETURNS void AS $$
    BEGIN
      UPDATE resources SET upvotes = upvotes + 1 WHERE id = resource_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION decrement_upvotes(resource_id UUID)
    RETURNS void AS $$
    BEGIN
      UPDATE resources SET upvotes = GREATEST(0, upvotes - 1) WHERE id = resource_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION increment_downvotes(resource_id UUID)
    RETURNS void AS $$
    BEGIN
      UPDATE resources SET downvotes = downvotes + 1 WHERE id = resource_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION decrement_downvotes(resource_id UUID)
    RETURNS void AS $$
    BEGIN
      UPDATE resources SET downvotes = GREATEST(0, downvotes - 1) WHERE id = resource_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION increment_user_points(user_id UUID, points INT)
    RETURNS void AS $$
    BEGIN
      UPDATE users SET points = points + points WHERE id = user_id;
      
      -- Update badge level
      UPDATE users SET badge_level = 
        CASE 
          WHEN points >= 1000 THEN 'Master'
          WHEN points >= 500 THEN 'Expert'
          WHEN points >= 200 THEN 'Advanced'
          WHEN points >= 50 THEN 'Intermediate'
          ELSE 'Freshman'
        END
      WHERE id = user_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `
  
  console.log('📋 Copy and run these functions in your Supabase SQL editor:')
  console.log(rpcFunctions)
}

// Run the setup
console.log('📋 Environment check:')
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set')
console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set')

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables!')
  console.log('Please create a .env.local file with:')
  console.log(`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  `)
  process.exit(1)
}

runMigrations()