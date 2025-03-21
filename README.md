This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Mark1 App Database Schema

This document outlines the database schema used in the Mark1 application. It includes details of all tables, their fields, relationships, and how they are used in the application.

## Database Tables

### 1. strategies

Used to store marketing strategies created by users.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Reference to the user who created the strategy |
| name | text | Name of the strategy |
| business_description | text | Description of the business this strategy is for |
| target_audience | jsonb | JSON array of target audience descriptions |
| objectives | jsonb | JSON array of marketing objectives |
| key_messages | jsonb | JSON array of key messages for the strategy |
| created_at | timestamp with time zone | Creation timestamp |
| updated_at | timestamp with time zone | Last update timestamp |

**Usage in Application:**
- Created when users complete the strategy questionnaire
- Referenced when generating content outlines
- Used to organize content plans and calendars

### 2. content_outlines

Stores generated content outlines derived from strategies.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| strategy_id | uuid | Reference to the strategy this outline is based on |
| user_id | uuid | Reference to the user who owns this outline |
| outline | jsonb | JSON containing the entire content outline structure |
| created_at | timestamp with time zone | Creation timestamp |
| updated_at | timestamp with time zone | Last update timestamp |

**Usage in Application:**
- Created when a user generates a content outline from a strategy
- Used as the basis for creating content calendars
- Contains weekly themes, content topics, and post ideas

### 3. content_plans

Stores comprehensive content plans that may include multiple calendars.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Reference to the user who owns this plan |
| name | text | Name of the content plan |
| strategy_id | uuid | Reference to the strategy this plan is based on |
| calendar_id | uuid | Reference to an associated calendar (if any) |
| campaigns | jsonb | JSON containing campaign details |
| daily_engagement | jsonb | JSON containing daily engagement content details |
| created_at | timestamp with time zone | Creation timestamp |
| updated_at | timestamp with time zone | Last update timestamp |

**Usage in Application:**
- Created when users save a content plan
- Links strategies to calendars
- Organizes content into campaigns and daily engagement activities

### 4. calendars

Stores content calendars with scheduled posts.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Reference to the user who owns this calendar |
| name | text | Name of the calendar (MISSING in current schema) |
| strategy_id | uuid | Reference to the strategy this calendar is based on |
| posts | jsonb | JSON array containing all posts data (MISSING in current schema) |
| status | text | Status of the calendar (MISSING in current schema) |
| posts_scheduled | integer | Number of scheduled posts (MISSING in current schema) |
| posts_published | integer | Number of published posts (MISSING in current schema) |
| progress | integer | Overall progress percentage (MISSING in current schema) |
| created_at | timestamp with time zone | Creation timestamp |
| updated_at | timestamp with time zone | Last update timestamp |
| modified_at | timestamp with time zone | (Currently referenced in code but missing in schema) |

**Usage in Application:**
- Created when users generate a content calendar
- Stores all posts with their scheduling details
- Tracks publishing progress

### 5. calendar_posts

Stores individual posts that belong to calendars.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| calendar_id | uuid | Reference to the calendar this post belongs to (MISSING in current schema) |
| title | text | Post title (MISSING in current schema) |
| content | text | Post content (MISSING in current schema) |
| post_type | text | Type of post (carousel, video, etc.) (MISSING in current schema) |
| target_audience | text | Target audience for this specific post (MISSING in current schema) |
| scheduled_date | timestamp with time zone | When the post is scheduled (MISSING in current schema) |
| channel | text | Social media channel for the post (MISSING in current schema) |
| status | text | Status of the post (scheduled, published, etc.) (MISSING in current schema) |
| engagement | jsonb | Engagement statistics (MISSING in current schema) |
| user_id | uuid | Reference to the user who owns this post |
| created_at | timestamp with time zone | Creation timestamp |
| updated_at | timestamp with time zone | Last update timestamp |

**Usage in Application:**
- Stores individual posts that are part of a calendar
- Tracks scheduling and publishing status for each post
- Manages engagement metrics for individual posts

## Schema Discrepancies and Required Updates

The following discrepancies were found between the schema and application code:

1. **calendars Table**:
   - Missing fields in database schema that are used in the application:
     - `name`: The name of the calendar
     - `posts`: JSONB array of posts
     - `status`: Status of the calendar
     - `posts_scheduled`: Count of scheduled posts
     - `posts_published`: Count of published posts
     - `progress`: Calendar completion percentage
   - Code attempted to use `modified_at` which isn't in the schema

2. **calendar_posts Table**:
   - Current schema is missing most of the required fields that the application would use:
     - `calendar_id`: Reference to parent calendar
     - `title`: Post title
     - `content`: Post content
     - `post_type`: Type of post
     - `target_audience`: Target audience
     - `scheduled_date`: When to post
     - `channel`: Social platform
     - `status`: Post status
     - `engagement`: Engagement metrics

## SQL Fixes

Run the following SQL statements in your Supabase SQL Editor to fix the schema issues:

```sql
-- Fix calendars table
ALTER TABLE calendars 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS posts JSONB,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS posts_scheduled INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_published INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP WITH TIME ZONE;

-- Fix calendar_posts table (assuming we need to recreate it)
DROP TABLE IF EXISTS calendar_posts;

CREATE TABLE calendar_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id UUID NOT NULL,
  title TEXT,
  content TEXT,
  post_type TEXT,
  target_audience TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  channel TEXT,
  status TEXT DEFAULT 'scheduled',
  engagement JSONB DEFAULT '{"likes": 0, "comments": 0, "shares": 0, "saves": 0, "clicks": 0}'::jsonb,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Relationships

- A user can have many strategies
- A strategy can have one content outline
- A strategy can have multiple content plans
- A content plan can be associated with one calendar
- A calendar can contain many posts (either in the `posts` JSONB field or as separate records in calendar_posts)

## Important Implementation Notes

1. The application currently uses both storage approaches for posts:
   - Embedded JSONB in the `posts` field of the `calendars` table
   - Potentially separate records in the `calendar_posts` table

2. When saving calendar data, ensure you're using the correct field names that exist in the database schema

3. To avoid errors like the "modified_at column not found", make sure any code that updates the database only references columns that exist in the schema
