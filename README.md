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
| name | text | Name of the calendar |
| strategy_id | uuid | Reference to the strategy this calendar is based on |
| posts | jsonb | JSON array containing all posts data |
| status | text | Status of the calendar |
| posts_scheduled | integer | Number of scheduled posts |
| posts_published | integer | Number of published posts |
| progress | integer | Overall progress percentage |
| created_at | timestamp with time zone | Creation timestamp |
| updated_at | timestamp with time zone | Last update timestamp |
| modified_at | timestamp with time zone | Last modification timestamp |

**Usage in Application:**
- Created when users generate a content calendar
- Stores all posts with their scheduling details
- Tracks publishing progress

### 5. calendar_posts

Stores individual posts that belong to calendars.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| calendar_id | uuid | Reference to the calendar this post belongs to |
| title | text | Post title |
| content | text | Post content |
| post_type | text | Type of post (carousel, video, etc.) |
| target_audience | text | Target audience for this specific post |
| scheduled_date | timestamp with time zone | When the post is scheduled |
| channel | text | Social media channel for the post |
| status | text | Status of the post (scheduled, published, etc.) |
| engagement | jsonb | Engagement statistics |
| user_id | uuid | Reference to the user who owns this post |
| created_at | timestamp with time zone | Creation timestamp |
| updated_at | timestamp with time zone | Last update timestamp |

**Usage in Application:**
- Stores individual posts that are part of a calendar
- Tracks scheduling and publishing status for each post
- Manages engagement metrics for individual posts

## Schema Status

✅ All database tables are now correctly configured according to the application requirements. The following updates were applied:

1. **calendars Table**:
   - Added missing fields: `name`, `posts`, `status`, `posts_scheduled`, `posts_published`, `progress`, and `modified_at`

2. **calendar_posts Table**:
   - Completely recreated with all required fields including `calendar_id`, `title`, `content`, `post_type`, etc.

These schema updates ensure that the application code works correctly with the database structure.

## Application Workflow

The Mark1 app follows these key process flows for generating marketing strategies, content outlines, and content calendars:

### 1. Marketing Strategy Generation Process

The marketing strategy generation process creates a structured strategy matrix based on user input:

1. **User Questionnaire**:
   - User answers a series of questions about their fitness business
   - Questions cover business type, target audience, marketing objectives, unique approach, content preferences, and competitors

2. **AI Processing**:
   - User responses are collected and organized
   - Business description is extracted from responses
   - Data is sent to the Gemini AI model with a structured prompt

3. **Matrix Generation**:
   - AI generates a 3x3 strategy matrix containing:
     - 3 target audience segments
     - 3 business objectives (one per audience segment)
     - 3 key messages (one per audience-objective pair)
   - AI response is parsed to extract the JSON array

4. **Strategy Review and Customization**:
   - User can review the generated strategy matrix
   - User can edit any element of the matrix to customize it
   - AI suggestions are provided to help with customization

5. **Strategy Storage**:
   - When user saves the strategy, it's stored in the `strategies` table
   - Each element of the matrix (audience, objectives, key messages) is stored in a separate JSONB array
   - Strategy is linked to the user account via `user_id`

6. **Next Steps**:
   - User can generate a content outline based on the saved strategy
   - Strategy ID is passed to the content outline generation process

### 2. Content Outline Generation Process

The content outline process creates a structured 3-week content plan based on the marketing strategy:

1. **Strategy Retrieval**:
   - Content outline page loads the strategy ID from URL parameters or localStorage
   - Strategy data is fetched from the `strategies` table
   - The data includes business description, target audience, objectives, and key messages

2. **Multi-Stage Generation**:
   - The generation process uses a multi-stage approach for better results:
   
   a. **Weekly Themes Generation**:
      - Initial API call to `/api/content/multi-stage/generate-themes`
      - AI model creates 3 weekly themes based on strategy
      - Each theme includes a title, objective, target audience segment, and campaign phase
      - Has built-in retry logic (up to 3 attempts) with exponential backoff
   
   b. **Week-by-Week Content Generation**:
      - For each weekly theme, makes a separate API call to `/api/content/multi-stage/generate-week-content`
      - Generates 3-5 post ideas for each week
      - Each post includes type, topic, audience, call-to-action, persuasion principle, and visual ideas
      - Posts are designed to build on each other throughout the week

3. **User Feedback and Refinement**:
   - User can provide feedback on each week's content
   - Feedback can be used to regenerate specific weeks with refined instructions
   - Updates are applied immediately to the content outline display

4. **Storage Options**:
   - User can save the content outline to the `content_outlines` table
   - Content is also stored in localStorage for backup
   - Content outline is passed to the calendar generation process via URL parameters

### 3. Calendar Generation Process

The calendar generation process creates a scheduled content calendar from the content outline:

1. **Parameter Setup**:
   - User sets up calendar parameters including:
     - Start date
     - Posting frequency (light, moderate, heavy, intensive)
     - Posting days (Mon, Wed, Fri, etc.)
     - Posting time
     - Social media channels (Instagram, Facebook, etc.)

2. **AI-Powered Distribution**:
   - Content from the outline is sent to `/api/content/generate-calendar` along with parameters
   - The API uses Gemini AI to:
     - Distribute posts across selected posting days
     - Spread content evenly across weeks
     - Alternate between selected social channels
     - Follow frequency parameters
     - Maintain thematic consistency

3. **Robust Error Handling**:
   - Has retry mechanism (up to 3 attempts)
   - Increases AI temperature slightly in each retry for variation
   - Includes fallback content generation if API fails
   - Validates response format before proceeding

4. **Calendar Storage**:
   - Calendar is saved to the `calendars` table with:
     - Reference to the original strategy (`strategy_id`)
     - All posts stored in the `posts` JSONB array
     - Initializes tracking data (progress, posts_scheduled, posts_published)
     - Sets initial status to 'active'

5. **Viewing and Exporting**:
   - Calendar can be viewed in calendar or list format
   - Posts can be edited individually
   - Calendar can be exported to CSV
   - Changes can be saved back to database

Each of these processes leverages AI technology to automate complex marketing tasks while allowing user customization at each step. The workflow provides a streamlined path from strategy development to ready-to-implement content calendars with minimal manual effort.

## Relationships

- A user can have many strategies
- A strategy can have one content outline
- A strategy can have multiple content plans
- A content plan can be associated with one calendar
- A calendar can contain many posts (either in the `posts` JSONB field or as separate records in calendar_posts)

## Important Implementation Notes

1. The application currently uses both storage approaches for posts:
   - Embedded JSONB in the `posts` field of the `calendars` table
   - Separate records in the `calendar_posts` table

2. When saving calendar data, ensure you're using the correct field names that exist in the database schema
