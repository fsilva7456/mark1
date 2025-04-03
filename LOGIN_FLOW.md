# Mark1 Login Flow Documentation

## Overview

This document outlines the authentication and login flow for the Mark1 application, using Next.js and Supabase. Authentication state and operations are managed globally via React Context.

## Core Components

*   **Supabase Client:** `lib/supabase.js` - Initializes the connection to the Supabase project using environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Configured for session persistence and auto token refreshing.
*   **Auth Context:** `contexts/AuthContext.js` - Manages global authentication state (`user`, `loading`) and provides wrapper functions (`signIn`, `signUp`, `signOut`, `signInWithOAuth`) around Supabase auth methods. It uses `supabase.auth.onAuthStateChange` to listen for login/logout events and keep the state synchronized.
*   **Global Provider:** `pages/_app.js` - Wraps the entire application with `AuthProvider` to make the authentication state (`user`, `loading`) and functions accessible via the `useAuth()` hook.
*   **Login Page:** `pages/login.js` - Renders the login form for email/password and a button for Google OAuth. Uses `useAuth()` to call Supabase authentication methods.
*   **Signup Page:** `pages/signup.js` - Renders the registration form. Uses `useAuth()` to call the `signUp` method.
*   **Navbar:** `components/Navbar.js` - Conditionally renders Login/Signup buttons or a Logout button based on the `user` state from `useAuth()`.

## Authentication Flow Steps

1.  **Initialization:** When the app loads, `AuthProvider` in `_app.js` uses `supabase.auth.getSession()` to check for an existing session and initializes the `user` state. It also sets up an `onAuthStateChange` listener to update the `user` state whenever login, logout, or token refresh events occur.
2.  **Route Protection:** Protected pages (e.g., `pages/marketing-plan.js`) import `useAuth()`. They use a `useEffect` hook to monitor `user` and `authLoading`. If `authLoading` is `false` and `user` is `null`, the hook redirects the user to `/login` using `router.push('/login')`. While `authLoading` is `true`, a loading indicator is typically shown.
3.  **Login Process (`/login`):**
    *   User provides email/password or clicks "Sign in with Google". Basic input validation uses HTML5 `required`.
    *   **Email/Password:** The form's `onSubmit` handler (`handleEmailLogin`) calls `signIn(email, password)` from `useAuth()`.
        *   *On Success:* The `signIn` promise resolves, the `onAuthStateChange` listener updates the global `user` state, and the handler redirects the user to `/marketing-plan` via `router.push`.
        *   *On Failure:* The promise rejects with an error. The handler catches the error and displays `error.message` in the form's error state.
    *   **Google OAuth:** The button's `onClick` handler (`handleGoogleLogin`) calls `signInWithOAuth({ provider: 'google' })` from `useAuth()`.
        *   Supabase handles the redirect to Google and back to the application.
        *   *On Success:* Google redirects back, Supabase validates the session, and the `onAuthStateChange` listener updates the global `user` state. The user is now authenticated and can access protected routes.
        *   *On Failure:* If the OAuth process fails (e.g., popup blocked, configuration issue), the promise might reject, or Supabase might redirect with an error parameter. The handler catches errors and updates the form's error state.
4.  **Signup Process (`/signup`):**
    *   User enters email, password, and password confirmation.
    *   The form's `onSubmit` handler (`handleSignup`) validates that passwords match. If they match, it calls `signUp(email, password)` from `useAuth()`.
    *   *On Success:* Supabase creates the user (but requires email confirmation). The handler displays a success message (e.g., "Check your email to confirm").
    *   *On Failure:* (e.g., user already exists, invalid password) The promise rejects. The handler catches the error and displays `error.message`.
5.  **Session Management:** Supabase client (`lib/supabase.js`) is configured with `persistSession: true` (uses `localStorage`) and `autoRefreshToken: true`. Supabase handles session persistence and background token refreshing automatically. The `AuthContext` reflects session changes via the `onAuthStateChange` listener.
6.  **Logout:** A user clicks the Logout button in the `Navbar`.
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
*   **OAuth Issues:** Ensure the Redirect URI in your Supabase Auth settings matches your deployment URL(s). Check Google Cloud Console configuration if using Google OAuth.
*   **Expired Tokens:** Supabase's `autoRefreshToken: true` should handle this automatically. If sessions expire unexpectedly, check Supabase project token expiry settings.
*   **Redirection Problems:** Verify the redirection logic in protected routes (`useEffect` checking `!authLoading && !user`) and ensure `router.push` is called correctly. Check browser console for errors.
*   **Environment Variables:** Double-check that the correct URL and Anon Key are being used in both local and production environments. Incorrect keys are a common cause of auth failures. 