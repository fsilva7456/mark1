# Mark1 Site Structure

## Main Pages

### `/pages/marketing-plan.js`
- **Purpose**: Main dashboard for managing marketing plans and workflows
- **Connected to**:
  - Strategy creation `/strategy/new`
  - Strategy detail view `/strategy/[id]`
  - Content outline creation `/content/new`
  - Calendar view `/calendar/[id]`
- **Key features**: Workflow diagram, status dashboard, list of strategies, outlines, and calendars

### `/pages/index.js`
- **Purpose**: Landing page/homepage for the application
- **Connected to**:
  - Login `/login`
  - Signup `/signup`
  - Marketing plan dashboard `/marketing-plan` (if logged in)

### `/pages/dashboard.js`
- **Purpose**: User dashboard overview
- **Connected to**: Marketing plan dashboard and other main sections

### `/pages/login.js`
- **Purpose**: User authentication
- **Connected to**: Marketing plan dashboard (on successful login)

### `/pages/signup.js`
- **Purpose**: User registration
- **Connected to**: Marketing plan dashboard (on successful signup)

### `/pages/setup.js`
- **Purpose**: Initial account/project setup for new users
- **Connected to**: Marketing plan dashboard (after setup)

## Strategy Pages

### `/pages/strategy/new.js`
- **Purpose**: Create a new marketing strategy
- **Connected to**:
  - Marketing plan dashboard `/marketing-plan`
  - Content creation `/content/new` (after strategy creation)
- **Key features**: Strategy definition form, audience targeting, objectives, key messages

### `/pages/strategy/[id].js`
- **Purpose**: View and manage a specific strategy
- **Connected to**:
  - Marketing plan dashboard `/marketing-plan`
  - Content creation `/content/new?strategy=[id]`
- **Key features**: Strategy details, generation of content outline based on strategy

## Content Pages

### `/pages/content/new.js`
- **Purpose**: Content outline creation based on a marketing strategy
- **Connected to**:
  - Marketing plan dashboard `/marketing-plan`
  - Strategy view `/strategy/[id]`
  - Calendar parameters `/content/calendar-params`
- **Key features**: Content outline generation by week, post ideas, content types

### `/pages/content/calendar-params.js`
- **Purpose**: Configure content calendar parameters before generation
- **Connected to**:
  - Marketing plan dashboard `/marketing-plan`
  - Content outline view `/content/new`
  - Calendar view `/calendar/[id]` (after creation)
- **Key features**: Calendar configuration (start date, posting frequency, channels)

### `/pages/content/calendar-view.js`
- **Purpose**: Alternative calendar view
- **Connected to**: Marketing plan dashboard

### `/pages/content/view/[id].js`
- **Purpose**: View details of a specific content piece
- **Connected to**: Content outline view

## Calendar Pages

### `/pages/calendar/[id].js`
- **Purpose**: Detailed view of a content calendar
- **Connected to**:
  - Marketing plan dashboard `/marketing-plan`
  - Content outline view
- **Key features**: Calendar display, post management, scheduling

### `/pages/calendar/view.js`
- **Purpose**: Alternative view of the calendar
- **Connected to**: Marketing plan dashboard
- **Key features**: Calendar view with event details

## API Endpoints

### Strategy API Endpoints
- `/api/strategy/generate-matrix.js`: Generates a strategy matrix
- `/api/strategy/generate-content.js`: Generates content based on strategy
- `/api/strategy/check-api.js`: Verifies API connectivity
- `/api/strategy/check-api-key.js`: Validates API keys
- `/api/strategy/generate-direct.js`: Direct strategy generation
- `/api/strategy/test-gemini.js`: Tests Gemini API integration

### Content API Endpoints
- Located in `/pages/api/content/`
- Manages content generation, saving, and retrieval

### Setup & Admin API Endpoints
- Located in `/pages/api/setup/` and `/pages/api/admin/`
- Handles application setup and administrative functions

## Navigation Flow

1. **User Journey**:
   - Landing page → Login/Signup → Setup (if new) → Marketing Plan Dashboard
   - Marketing Plan Dashboard serves as the central hub for all marketing activities

2. **Marketing Plan Workflow**:
   - Create Strategy (strategy/new)
   - View Strategy (strategy/[id]) 
   - Generate Content Outline (content/new)
   - Configure Calendar Parameters (content/calendar-params)
   - View and Manage Calendar (calendar/[id])

3. **Universal Navigation**:
   - The Navbar component provides access to Marketing Plan Dashboard from any page
   - BreadcrumbNavigation component helps users understand their location in the app
   - Most pages include "Back to Dashboard" links returning to Marketing Plan Dashboard

## Key Components

- **Navbar**: Main navigation component
- **BreadcrumbNavigation**: Shows user's location in the application hierarchy
- **StatusDashboard**: Displays metrics about strategies, outlines, calendars
- **WorkflowDiagram**: Visual representation of the marketing workflow
- **ContentPipeline**: Shows content in various stages 