import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Signup from '../../pages/signup';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';

// Mock the context and router
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

describe('Signup Page', () => {
  let mockSignUp;
  let mockPush;

  beforeEach(() => {
    mockSignUp = jest.fn();
    mockPush = jest.fn();
    // Mock useAuth return value
    useAuth.mockReturnValue({ 
      signUp: mockSignUp, 
      user: null, // Assume no user initially
      loading: false 
    });
    // Mock useRouter return value
    useRouter.mockReturnValue({ push: mockPush, pathname: '/signup' });
  });

  test('renders signup form correctly', () => {
    render(<Signup />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument(); // Use regex for first password field
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  test('successful signup calls signUp and displays success message', async () => {
    // Mock successful signup (user created, needs confirmation)
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-456', identities: [{}] } }, error: null });
    
    render(<Signup />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'newpassword' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'newpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    // Check for loading state
    expect(screen.getByRole('button', { name: /creating account.../i })).toBeDisabled();

    // Wait for signUp to be called
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
      expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'newpassword');
    });

    // Check for success message
    expect(await screen.findByText(/signup successful! please check your email/i)).toBeInTheDocument();
    // Check if form fields were cleared (as implemented in signup.js)
    expect(screen.getByLabelText(/email/i)).toHaveValue('');
    expect(screen.getByLabelText(/^password/i)).toHaveValue('');
  });

  test('shows error if passwords do not match', () => {
    render(<Signup />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'mismatch' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    // Check for mismatch error message
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    // Ensure signUp was not called
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test('failed signup calls signUp and displays error message', async () => {
    const errorMessage = 'User already exists';
    // Mock signUp to return an error
    mockSignUp.mockResolvedValue({ data: {}, error: { message: errorMessage } });
    
    render(<Signup />);
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    expect(screen.getByRole('button', { name: /creating account.../i })).toBeDisabled();

    // Wait for signUp call
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
      expect(mockSignUp).toHaveBeenCalledWith('existing@example.com', 'password123');
    });

    // Check for error display
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    // Button should be enabled again
    expect(screen.getByRole('button', { name: /sign up/i })).toBeEnabled();
  });
}); 