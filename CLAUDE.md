# Claude Instructions

## Project Context
Mark1 is a marketing automation platform for fitness businesses.

## Key Files
- `/lib/logger.js` - Logging utility
- `/contexts/` - React contexts for state management 
- `/components/` - Reusable UI components
- `/pages/` - Next.js pages and API routes
- `/app/` - Next.js app directory components
- `/app/(modules)/content-mgmt/lib/dateUtils.js` - Date utilities for content management

## Data Structure
- The application uses Supabase as the database backend
- Content posts are stored in the `calendar_posts` table
- Content calendars are stored in the `calendars` table
- Content outlines are stored in the `content_outlines` table
- The `calendar_posts` table contains posts with a reference to the calendar they belong to

## Commands to Run
- Lint: `npm run lint`
- Typecheck: `npm run typecheck` 
- Test: `npm run test`

## Coding Standards
- Use ESLint configuration
- Follow existing code style and patterns
- Add comments only when requested
- Use utility functions for common operations
- Organize related logic in module-specific `lib` directories