### README.md
```markdown
# ThinkChrist Note Sharing Platform - Think notes, ThinkChrist

A community-driven platform for Christ University students to share and discover academic resources.

## Features

- 📚 **Smart Resource Repository** - Upload and download notes, papers, and study materials
- 🏆 **Gamification System** - Earn points and badges for contributions
- 👥 **Community Driven** - Upvote/downvote system for quality control
- 🔍 **Advanced Search** - Filter by department, semester, subject, and more
- 📊 **Leaderboards** - Track top contributors
- 🌓 **Dark Mode** - Toggle between light and dark themes

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Christ University email (@christuniversity.in)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/christ-uniconnect.git
cd christ-uniconnect
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Update `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

5. Run database migrations:
```bash
npm run setup-db
```

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
christ-uniconnect/
├── src/
│   ├── app/           # Next.js app router pages
│   ├── components/    # React components
│   ├── lib/          # Utility functions and configs
│   ├── hooks/        # Custom React hooks
│   ├── types/        # TypeScript types
│   └── context/      # React context providers
├── supabase/         # Database migrations and seeds
├── public/           # Static assets
└── scripts/          # Utility scripts
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)

### README.md (continued)
```markdown
5. Open a Pull Request

## Database Schema

### Users Table
- Stores user profiles with points and badge levels
- Linked to Supabase Auth

### Resources Table
- Contains all uploaded study materials
- Tracks downloads, upvotes, and verification status

### Votes Table
- Manages upvote/downvote system
- Ensures one vote per user per resource

### Contributions Table
- Tracks all user activities for points calculation
- Used for leaderboard and gamification

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/christ-uniconnect)

### Environment Variables for Production

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Future Enhancements

- 📱 Mobile app (React Native)
- 💬 Real-time chat system
- 📝 Collaborative note-taking
- 🤖 AI-powered content recommendations
- 📊 Advanced analytics dashboard
- 🎯 Personalized learning paths
- 👥 Study group formation
- 📅 Academic calendar integration

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Christ University community
- Built with ❤️ for students, by students
```

## 21. Database Setup Script

### scripts/setup-db.js
```javascript
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
        
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: sql
        })
        
        if (error) {
          console.error(`❌ Error in ${file}:`, error)
          throw error
        }
        
        console.log(`✅ ${file} completed`)
      }
    }
    
    // Create RPC functions
    console.log('📝 Creating RPC functions...')
    
    const rpcFunctions = `
      -- Increment functions
      CREATE OR REPLACE FUNCTION increment_upvotes(resource_id UUID)
      RETURNS void AS $$
      BEGIN
        UPDATE resources SET upvotes = upvotes + 1 WHERE id = resource_id;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION decrement_upvotes(resource_id UUID)
      RETURNS void AS $$
      BEGIN
        UPDATE resources SET upvotes = GREATEST(0, upvotes - 1) WHERE id = resource_id;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION increment_downvotes(resource_id UUID)
      RETURNS void AS $$
      BEGIN
        UPDATE resources SET downvotes = downvotes + 1 WHERE id = resource_id;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION decrement_downvotes(resource_id UUID)
      RETURNS void AS $$
      BEGIN
        UPDATE resources SET downvotes = GREATEST(0, downvotes - 1) WHERE id = resource_id;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION increment_user_points(user_id UUID, points INT)
      RETURNS void AS $$
      BEGIN
        UPDATE users SET points = points + points WHERE id = user_id;
      END;
      $$ LANGUAGE plpgsql;

      -- Update badge level based on points
      CREATE OR REPLACE FUNCTION update_badge_level()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.points >= 1000 THEN
          NEW.badge_level = 'Master';
        ELSIF NEW.points >= 500 THEN
          NEW.badge_level = 'Expert';
        ELSIF NEW.points >= 200 THEN
          NEW.badge_level = 'Advanced';
        ELSIF NEW.points >= 50 THEN
          NEW.badge_level = 'Intermediate';
        ELSE
          NEW.badge_level = 'Freshman';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Create trigger for badge updates
      CREATE TRIGGER update_user_badge
      BEFORE UPDATE OF points ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_badge_level();
    `
    
    const { error: rpcError } = await supabase.rpc('exec_sql', {
      sql_query: rpcFunctions
    })
    
    if (rpcError) {
      console.error('❌ Error creating RPC functions:', rpcError)
      throw rpcError
    }
    
    console.log('✅ RPC functions created')
    
    // Create storage bucket
    console.log('📝 Creating storage bucket...')
    
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
    
    if (bucketError && bucketError.message !== 'Bucket already exists') {
      console.error('❌ Error creating storage bucket:', bucketError)
      throw bucketError
    }
    
    console.log('✅ Storage bucket ready')
    
    // Run seed data (optional)
    if (process.argv.includes('--seed')) {
      console.log('📝 Seeding database...')
      const seedFile = path.join(__dirname, '..', 'supabase', 'seed.sql')
      
      if (fs.existsSync(seedFile)) {
        const seedSql = fs.readFileSync(seedFile, 'utf8')
        const { error: seedError } = await supabase.rpc('exec_sql', {
          sql_query: seedSql
        })
        
        if (seedError) {
          console.error('❌ Error seeding database:', seedError)
          throw seedError
        }
        
        console.log('✅ Database seeded')
      }
    }
    
    console.log('🎉 Database setup completed successfully!')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

// Check if exec_sql function exists, if not create it
async function setupExecSql() {
  const createExecSql = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `
  
  // This is a chicken-egg problem, so we'll use a different approach
  console.log('⚠️  Note: You may need to run the migrations manually in Supabase SQL editor')
  console.log('📋 Copy the SQL files from supabase/migrations/ folder')
}

// Run the setup
runMigrations()
```

## 22. Sample Seed Data

### supabase/seed.sql
```sql
-- Sample seed data for development/testing
-- Only run this in development environment

-- Insert sample users
INSERT INTO users (id, email, full_name, department, semester, points, badge_level)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'john.doe@christuniversity.in', 'John Doe', 'Computer Science', 5, 150, 'Intermediate'),
  ('550e8400-e29b-41d4-a716-446655440002', 'jane.smith@christuniversity.in', 'Jane Smith', 'Commerce', 3, 300, 'Advanced'),
  ('550e8400-e29b-41d4-a716-446655440003', 'bob.wilson@christuniversity.in', 'Bob Wilson', 'Psychology', 7, 50, 'Freshman')
ON CONFLICT (id) DO NOTHING;

-- Insert sample resources
INSERT INTO resources (
  title, description, file_url, file_name, file_size, file_type,
  department, course, semester, subject, topic, uploaded_by
)
VALUES 
  (
    'Data Structures Notes - Complete',
    'Comprehensive notes covering all topics in Data Structures including arrays, linked lists, trees, and graphs.',
    'https://example.com/ds-notes.pdf',
    'ds-notes.pdf',
    2048576,
    'application/pdf',
    'Computer Science',
    'BCA',
    3,
    'Data Structures',
    'Complete Notes',
    '550e8400-e29b-41d4-a716-446655440001'
  ),
  (
    'Financial Accounting Summary',
    'Quick revision notes for Financial Accounting end semester exam.',
    'https://example.com/accounting.pdf',
    'accounting-summary.pdf',
    1024000,
    'application/pdf',
    'Commerce',
    'BCom',
    2,
    'Financial Accounting',
    'Exam Summary',
    '550e8400-e29b-41d4-a716-446655440002'
  );

-- Insert sample votes
INSERT INTO votes (user_id, resource_id, vote_type)
SELECT 
  '550e8400-e29b-41d4-a716-446655440002',
  id,
  'upvote'
FROM resources
LIMIT 1;

-- Update vote counts
UPDATE resources SET upvotes = 1 WHERE uploaded_by = '550e8400-e29b-41d4-a716-446655440001';

-- Insert sample contributions
INSERT INTO contributions (user_id, type, resource_id, points_earned)
SELECT 
  uploaded_by,
  'upload',
  id,
  10
FROM resources;
```

## 23. Environment Example File

### .env.local.example
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Analytics (add when needed)
# NEXT_PUBLIC_GA_ID=your-google-analytics-id
# NEXT_PUBLIC_HOTJAR_ID=your-hotjar-id
```

## Summary

This completes the full Christ UniConnect project structure with:

1. **Complete file structure** with all necessary folders and files
2. **Authentication system** restricted to Christ University emails
3. **Resource management** with upload, view, vote, and download features
4. **Gamification system** with points, badges, and leaderboards
5. **Modern UI** with Tailwind CSS and shadcn/ui components
6. **Dark/Light mode** support
7. **Responsive design** for all screen sizes
8. **Type safety** with TypeScript
9. **Database integration** with Supabase
10. **API routes** for backend functionality

### To deploy:

1. Set up a Supabase project
2. Run the database migrations
3. Configure environment variables
4. Deploy to Vercel
5. Share with Christ University students!