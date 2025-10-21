# Database Migrations

This directory contains SQL migration files for the ThinkChrist platform database schema.

## Migration History

### 001_create_users_table.sql
- Creates the base users table with authentication and profile information
- Includes RLS policies for user data security

### 002_create_resources_table.sql
- Creates the resources table for file uploads and sharing
- Includes indexes for performance and RLS policies

### 003_create_votes_table.sql
- Creates the voting system for resource ratings
- Includes unique constraints and RLS policies

### 004_create_contributions_table.sql
- Creates contribution tracking for gamification
- Tracks user activities and points earned

### 005_enhance_platform_schema.sql ⭐ **NEW**
- **Platform Enhancement Migration**
- Extends resources table with multi-resource type support
- Adds new tables for enhanced functionality:
  - `collections` - Content curation and organization
  - `collection_resources` - Junction table for collection-resource relationships
  - `user_preferences` - User settings and preferences
  - `user_interactions` - User behavior tracking for recommendations
  - `notifications` - User notification system

## Enhanced Schema Features

### Extended Resources Table
- `resource_type` - Support for documents, videos, links, code, articles
- `external_url` - Support for external links and resources
- `link_preview` - Rich preview data for external links
- `estimated_time` - Learning time estimation
- `difficulty_level` - Beginner, intermediate, advanced
- `content_metadata` - Flexible metadata storage
- `tags` - Array of tags for categorization
- `views` - View count tracking

### New Tables

#### Collections
- User-created content collections
- Public/private visibility settings
- Collaborative editing support
- Tag-based organization

#### User Preferences
- Notification settings
- Recommendation preferences
- Privacy controls
- Automatic creation via trigger

#### User Interactions
- Tracks user behavior (views, downloads, shares, etc.)
- Powers recommendation engine
- Analytics and insights

#### Notifications
- Achievement notifications
- Activity updates
- System messages
- Read/unread status

### Performance Optimizations
- Comprehensive indexing strategy
- GIN indexes for array fields (tags)
- Optimized queries for search and filtering
- Proper foreign key relationships

### Security Features
- Row Level Security (RLS) on all tables
- Granular access controls
- Privacy-respecting data policies
- Secure collection sharing

## Running Migrations

### Using Supabase CLI (Recommended)
```bash
# Apply all pending migrations
supabase db push

# Reset database and apply all migrations
supabase db reset
```

### Using the Migration Script
```bash
# Run the enhancement migration
node scripts/run-migration.js
```

### Manual Application
If you need to apply the migration manually, execute the SQL files in order using your preferred database client.

## Post-Migration Steps

1. **Verify Tables**: Check that all new tables are created in your Supabase dashboard
2. **Test RLS Policies**: Ensure proper access controls are working
3. **Update Application Code**: Use the new `DatabaseUtils` class for enhanced operations
4. **Populate Default Data**: Consider adding default user preferences for existing users

## Rollback Considerations

The enhancement migration is designed to be backward compatible:
- Existing file upload functionality continues to work
- New columns have sensible defaults
- Optional fields don't break existing queries

However, if rollback is needed:
1. Remove the new tables (collections, user_preferences, user_interactions, notifications)
2. Remove the new columns from the resources table
3. Restore original constraints on file-related columns

## Development Notes

- All new tables include `created_at` and `updated_at` timestamps
- Automatic triggers maintain `updated_at` fields
- User preferences are automatically created for new users
- The schema supports future enhancements and extensions