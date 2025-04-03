import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../../pages/login';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { AuthProvider } from '../../contexts/AuthContext'; // Import AuthProvider for context wrapping if needed

// Mock the context and router
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
  // Keep AuthProvider as the actual implementation for wrapping if necessary
  AuthProvider: ({ children }) => <div>{children}</div>, 
}));

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

describe('Login Page', () => {
  let mockSignIn;
  let mockSignInWithOAuth;
  let mockPush;

  beforeEach(() => {
    // Reset mocks before each test
    mockSignIn = jest.fn();
    mockSignInWithOAuth = jest.fn();
    mockPush = jest.fn();
    
    // Provide the mock implementation for useAuth
    useAuth.mockReturnValue({ 
      signIn: mockSignIn, 
      signInWithOAuth: mockSignInWithOAuth,
      user: null, 
      loading: false 
    });
    
    // Provide the mock implementation for useRouter
    useRouter.mockReturnValue({ push: mockPush, pathname: '/login' });
  });

  test('renders login form correctly', () => {
    render(<Login />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  test('successful email login calls signIn and redirects', async () => {
    // Mock signIn to resolve successfully (no error)
    mockSignIn.mockResolvedValue({ data: { user: { id: 'user-123' }, session: {} }, error: null });
    
    render(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    // Check if loading state is shown (button disabled/text change)
    expect(screen.getByRole('button', { name: /logging in.../i })).toBeDisabled();

    // Wait for async operations
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
    
    // Wait for redirection
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/marketing-plan');
    });
  });

  test('failed email login calls signIn and displays error message', async () => {
    const errorMessage = 'Invalid login credentials';
    // Mock signIn to return an error
    mockSignIn.mockResolvedValue({ data: {}, error: { message: errorMessage } });
    
    render(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(screen.getByRole('button', { name: /logging in.../i })).toBeDisabled();

    // Wait for signIn to be called
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'wrongpassword');
    });

    // Check if error message is displayed
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    // Ensure no redirection happened
    expect(mockPush).not.toHaveBeenCalled();
    // Button should be enabled again
    expect(screen.getByRole('button', { name: /log in/i })).toBeEnabled();
  });

  test('Google OAuth login calls signInWithOAuth', async () => {
     // Mock OAuth sign in to resolve successfully (no error)
     mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null }); 
     
     render(<Login />);
     fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
     
     // Wait for the function call
     await waitFor(() => {
       expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
       // We expect the provider 'google' and potentially options
       expect(mockSignInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'google' }));
     });

     // Redirection is typically handled by Supabase itself after OAuth, 
     // so we usually don't mock or assert router.push here unless specific 
     // client-side redirection is implemented post-OAuth callback.
     expect(mockPush).not.toHaveBeenCalled(); 
  });
}); 