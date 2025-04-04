# Project Selector Flow

## Overview
After logging in, users are redirected to `/projects/select`, where they must select an existing project or create a new one to proceed to the main app (`/marketing-plan`).

## Flow
1.  **Redirection to Page**: Post-login (from `pages/login.js`), the user is immediately redirected to `/projects/select`.
2.  **Authentication Check**: The `pages/projects/select.js` page uses `useAuth()` to ensure a user is logged in. If not, it redirects back to `/login`.
3.  **Fetch Projects**: 
    - Once the user is confirmed, `useEffect` triggers `fetchProjects()` from `ProjectContext`.
    - `fetchProjects()` queries the Supabase `projects` table for records where `user_id` matches the authenticated `user.id`.
    - It sets the `projects` state in `ProjectContext` and determines the `currentProject` (default or most recent). Loading and error states are updated.
4.  **Display Projects**: 
    - The page renders the fetched `projects`.
    - If `projects` array is empty and not loading, a message prompts the user to create their first project.
    - If projects exist, they are displayed as cards, showing `name`, `description`, and formatted `created_at`.
    - The card corresponding to `currentProject.id` is visually highlighted (e.g., using the `.current` CSS class).
    - Each card has action buttons:
        - "Select": Calls `handleSelectProject` which triggers `switchProject(projectId)` in `ProjectContext`.
        - "Set as Default": (Shown if not already default) Calls `handleSetDefault` which triggers `setDefaultProject(projectId)`.
        - "Delete": Calls `handleDelete` which shows a `window.confirm()` dialog, then triggers `deleteProject(projectId)`.
5.  **Create New Project**: 
    - A separate form section is always visible.
    - It contains input fields for `name` (required) and `description` (optional).
    - The submit button is disabled during the creation process (`isCreating` state).
    - On submit (`handleCreateProject`):
        - Performs basic validation (name is not empty).
        - Sets `isCreating` to true.
        - Calls `createProject(name, description)` from `ProjectContext`.
        - Handles potential errors returned from `createProject` and displays them.
        - Clears the form on success.
        - Sets `isCreating` back to false.
6.  **Redirection to Main App**: 
    - When `switchProject(projectId)` is called successfully (after clicking "Select"), it updates `currentProject` in the context and then uses `router.push('/marketing-plan')` to navigate.
    - When `createProject(name, description)` is called successfully, it adds the project, updates `currentProject`, and then uses `router.push('/marketing-plan')` to navigate.
7.  **Error Handling**: 
    - Errors during `fetchProjects`, `createProject`, `setDefaultProject`, or `deleteProject` are caught in `ProjectContext` and set in the `error` state.
    - The `pages/projects/select.js` page can display these context errors (e.g., `projectError`) or specific errors from form submissions (`createError`).

## Key Files
- `pages/projects/select.js`: The project selection/creation page component.
- `contexts/ProjectContext.js`: Manages all project state and Supabase interactions (fetch, create, switch, set default, delete).
- `contexts/AuthContext.js`: Provides the authenticated `user` object needed for filtering projects.
- `styles/SelectProject.module.css`: Styles for the selection page.
- `pages/login.js`: Handles initial login and redirects to `/projects/select`.
- `pages/_app.js`: Wraps the application with `AuthProvider` and `ProjectProvider`.

## Troubleshooting
- **Redirect Loop**: Ensure `/projects/select` correctly checks for a logged-in user to prevent redirecting back to `/login` unnecessarily. Check `useEffect` dependencies.
- **No Projects Load**: 
    - Verify Supabase connection (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
    - Check network requests for errors from Supabase.
    - Ensure Row Level Security (RLS) policies on the `projects` table allow logged-in users to select based on their `user_id`.
    - Check console logs in `fetchProjects` for detailed errors.
- **Create/Update/Delete Fails**: 
    - Check Supabase RLS policies for `INSERT`, `UPDATE`, `DELETE` permissions.
    - Verify required columns (`user_id`, `name`) are being sent correctly.
    - Examine Supabase logs (Database -> Logs in Supabase dashboard) for specific database errors.
    - Check console logs in the corresponding context functions (`createProject`, `setDefaultProject`, `deleteProject`).
- **Redirect to `/marketing-plan` Fails**: 
    - Ensure `router.push('/marketing-plan')` is called correctly within `switchProject` and `createProject` *after* the Supabase operation and state updates succeed.
    - Check for any JavaScript errors in the browser console that might halt execution before the redirect.
- **Stuck Loading State**: Verify that `setIsLoading(false)` is called in the `finally` block of all async operations in `ProjectContext`. 