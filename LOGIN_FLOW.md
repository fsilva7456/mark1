# Mark1 Login Flow Documentation

## Overview

This document outlines the authentication and login flow for the Mark1 application, using Next.js and Supabase. Authentication state and operations are managed globally via React Context.

## Core Components

*   **Supabase Client:** `lib/supabase.js` - Initializes the connection to the Supabase project using environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Configured for session persistence and auto token refreshing.
*   **Auth Context:** `contexts/AuthContext.js` - Manages global authentication state (`user`, `loading`) and provides wrapper functions (`signIn`, `signUp`, `signOut`, `signInWithOAuth`) around Supabase auth methods. It uses `supabase.auth.onAuthStateChange` to listen for login/logout events and keep the state synchronized.
*   **Project Context:** `contexts/ProjectContext.js` - Manages project state (`projects`, `currentProject`), fetches projects from Supabase based on `user.id`, and handles project creation, selection, and deletion. Crucial for the post-login flow.
*   **Global Provider:** `pages/_app.js` - Wraps the entire application with `AuthProvider` and `ProjectProvider` to make authentication and project state accessible via `useAuth()` and `useProject()` hooks.
*   **Login Page:** `pages/login.js` - Renders the login form for email/password and a button for Google OAuth. Uses `useAuth()` to call Supabase authentication methods.
*   **Project Selection Page:** `pages/projects/select.js` - The page users are redirected to after login. Uses `useAuth()` and `useProject()` to display existing projects and allow creation of new ones. Users must select or create a project here before proceeding.
*   **Signup Page:** `pages/signup.js` - Renders the registration form. Uses `useAuth()` to call the `signUp` method.
*   **Navbar:** `components/Navbar.js` - Conditionally renders Login/Signup buttons or a Logout button based on the `user` state from `useAuth()`.

## Authentication Flow Steps

1.  **Initialization:** When the app loads, `AuthProvider` in `_app.js` uses `supabase.auth.getSession()` to check for an existing session and initializes the `user` state. It also sets up an `onAuthStateChange` listener to update the `user` state whenever login, logout, or token refresh events occur. `ProjectProvider` likely also initializes, potentially fetching projects if a user session exists.
2.  **Route Protection:** Protected pages (e.g., `pages/marketing-plan.js`) import `useAuth()`. They use a `useEffect` hook to monitor `user` and `authLoading`. If `authLoading` is `false` and `user` is `null`, the hook redirects the user to `/login` using `router.push('/login')`. While `authLoading` is `true`, a loading indicator is typically shown.
3.  **Login Process (`/login`):**
    *   User provides email/password or clicks "Sign in with Google". Basic input validation uses HTML5 `required`.
    *   **Email/Password:** The form's `onSubmit` handler (`handleEmailLogin`) calls `signIn(email, password)` from `useAuth()`.
        *   *On Success:* The `signIn` promise resolves, the `onAuthStateChange` listener updates the global `user` state, and the handler redirects the user to `/projects/select` via `router.push`.
        *   *On Failure:* The promise rejects with an error. The handler catches the error and displays `error.message` in the form's error state.
    *   **Google OAuth:** The button's `onClick` handler (`handleGoogleLogin`) calls `signInWithOAuth({ provider: 'google', options: { redirectTo: '/projects/select' } })` from `useAuth()`.
        *   Supabase handles the redirect to Google and back to the application (specifically to `/projects/select`).
        *   *On Success:* Google redirects back, Supabase validates the session, and the `onAuthStateChange` listener updates the global `user` state. The user lands on `/projects/select`.
        *   *On Failure:* If the OAuth process fails (e.g., popup blocked, configuration issue), the promise might reject, or Supabase might redirect with an error parameter. The handler catches errors and updates the form's error state.
4.  **Project Selection (`/projects/select`):**
    *   After login, users are taken to the project selection page.
    *   The page fetches the user's projects using `fetchProjects()` from `ProjectContext`.
    *   Users can select an existing project (calls `switchProject()`, which sets `currentProject` and redirects to `/marketing-plan`) or create a new one (calls `createProject()`, which saves, sets `currentProject`, and redirects to `/marketing-plan`).
    *   This step is mandatory before accessing the main application functionality (e.g., `/marketing-plan`).
5.  **Signup Process (`/signup`):**
    *   User enters email, password, and password confirmation.
    *   The form's `onSubmit` handler (`handleSignup`) validates that passwords match. If they match, it calls `signUp(email, password)` from `useAuth()`.
    *   *On Success:* Supabase creates the user (but requires email confirmation). The handler displays a success message (e.g., "Check your email to confirm").
    *   *On Failure:* (e.g., user already exists, invalid password) The promise rejects. The handler catches the error and displays `error.message`.
6.  **Session Management:** Supabase client (`lib/supabase.js`) is configured with `persistSession: true` (uses `localStorage`) and `autoRefreshToken: true`. Supabase handles session persistence and background token refreshing automatically. The `AuthContext` reflects session changes via the `onAuthStateChange` listener.
7.  **Logout:** A user clicks the Logout button in the `Navbar`.
    *   The `onClick` handler (`handleLogout`) calls `signOut()` from `useAuth()`.
    *   `signOut` calls `supabase.auth.signOut()`.
    *   The `onAuthStateChange` listener fires, setting the global `user` state to `null`.
    *   The `signOut` function in `AuthContext` then programmatically redirects the user to the homepage (`/`) using `router.push`.

## Environment Variables

Authentication requires the following environment variables:

*   `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase project public anonymous key.

Ensure these are correctly set in `.env.local` for development and as environment variables in your deployment environment (e.g., Vercel).

## Troubleshooting

*   **Login/Signup Errors:** Supabase errors (e.g., "Invalid login credentials", "User already registered") are caught and displayed directly in the forms.
*   **OAuth Issues:** Ensure the Redirect URI in your Supabase Auth settings points to `/projects/select` or is handled correctly by the `redirectTo` option. Check Google Cloud Console configuration if using Google OAuth.
*   **Project Loading Issues:** Check Supabase connection, RLS policies on the `projects` table, and errors in the `fetchProjects` function (`contexts/ProjectContext.js`).
*   **Expired Tokens:** Supabase's `autoRefreshToken: true` should handle this automatically. If sessions expire unexpectedly, check Supabase project token expiry settings.
*   **Redirection Problems:** Verify the redirection logic in `/login` (`router.push('/projects/select')`), `ProjectContext` (`switchProject`, `createProject`), and protected routes (`useEffect` checking `!authLoading && !user`). Check browser console for errors.
*   **Environment Variables:** Double-check that the correct URL and Anon Key are being used in both local and production environments. Incorrect keys are a common cause of auth failures. 