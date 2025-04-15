# Mark1 Application Architecture

## Directory Structure

The Mark1 application follows a modular architecture pattern organized by business domains:

```
mark1/
├── app/
│   └── (modules)/          # Core feature modules
│       ├── strategy/       # Strategy creation module
│       ├── content-outline/# Content outline generation
│       ├── calendar/       # Calendar creation module
│       └── content-mgmt/   # Content management module
├── components/
│   └── shared/             # Shared UI components
├── contexts/               # React contexts for state management
├── lib/                    # Shared utilities and types
└── pages/
    └── api/                # API routes organized by module
        ├── strategy/       # Strategy-related endpoints
        ├── content-outline/# Content outline endpoints
        ├── calendar/       # Calendar endpoints
        └── content-mgmt/   # Content management endpoints
```

## Module Structure

Each module in `app/(modules)/` typically contains:

```
module-name/
├── components/  # Module-specific components
├── pages/       # Next.js app router pages
├── hooks/       # Custom React hooks
└── lib/         # Module-specific utilities
```

## Cross-Module Communication

Modules should communicate through well-defined interfaces:

1. **API Endpoints**
   - Each module has corresponding API routes in `pages/api/`
   - Use fetch or axios for cross-module data requests
   - Example: `content-mgmt` module uses `/api/strategy` endpoints to access strategy data

2. **Shared Types**
   - Common types should be defined in `lib/types/`
   - Ensures type safety across module boundaries
   - Example: `StrategyType` used by multiple modules

3. **Context Providers**
   - Global state is managed in `contexts/`
   - Provides cross-cutting concerns like authentication
   - Example: `AuthContext` used by all modules

4. **Event-Based Communication**
   - For looser coupling, use custom events
   - Example: Strategy updates can emit events for other modules to react

## Recommended Practices

1. **Module Boundaries**
   - Modules should be as self-contained as possible
   - Cross-module imports should be minimized
   - Use the shared contexts and types for cross-module needs

2. **File Organization**
   - Keep related files close to each other
   - Group by feature, not by file type
   - Example: A component and its styles should be in the same directory

3. **Path Aliases**
   - Use the configured path aliases in imports
   - `@modules/*` for module imports
   - `@components/*` for shared components
   - `@lib/*` for shared utilities

4. **Testing**
   - Each module should have its own tests
   - Tests should be co-located with the module
   - Unit test utilities and API endpoints

## Next.js App Router Migration

The application is transitioning from the Pages Router to the App Router architecture:

1. **Current State**
   - Legacy pages in `pages/` directory (Pages Router)
   - New feature modules in `app/(modules)` (App Router)
   - API routes remain in `pages/api/`

2. **Migration Path**
   - New features should be implemented in the App Router
   - Gradually migrate existing pages to the App Router
   - Maintain backward compatibility during transition

## Database Schema

The application uses Supabase as the database, with key tables including:

- `strategies` - Marketing strategies
- `content_outlines` - Generated content outlines
- `calendars` - Content calendars with scheduled posts
- `calendar_posts` - Individual posts in calendars

For detailed schema information, refer to the schema documentation in README.md. 