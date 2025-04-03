import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext'; 
import { useRouter } from 'next/router';
import Link from 'next/link'; // Needed if Link component is directly tested or rendered

// Mock child components or contexts used by Navbar
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../contexts/ProjectContext', () => ({
  useProject: jest.fn(),
}));
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));
// Mock next/link behavior if necessary, especially for navigation checks
jest.mock('next/link', () => {
    return ({children, href}) => {
        // Simulate link behavior
        return <a href={href}>{children}</a>
    }
});

describe('Navbar Component', () => {
  let mockSignOut;
  let mockPush;
  let mockUseAuth;
  let mockUseRouter;
  let mockUseProject;

  beforeEach(() => {
    // Reset mocks
    mockSignOut = jest.fn();
    mockPush = jest.fn();
    
    // Setup mock return values
    mockUseAuth = useAuth;
    mockUseRouter = useRouter;
    mockUseProject = useProject;

    // Default mock implementations
    mockUseRouter.mockReturnValue({ 
        push: mockPush, 
        pathname: '/' // Default pathname, override in tests as needed
    });
    mockUseProject.mockReturnValue({ 
      projects: [], 
      currentProject: null, 
      setShowProjectSelector: jest.fn(),
      switchProject: jest.fn()
    }); 
  });

  test('renders Login/Signup buttons when user is null and not on auth pages', () => {
    // Arrange: User is null, path is not / or /signup
    mockUseAuth.mockReturnValue({ user: null, signOut: mockSignOut, loading: false });
    mockUseRouter.mockReturnValue({ push: mockPush, pathname: '/some-other-page' }); 
    
    // Act
    render(<Navbar />);
    
    // Assert
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /marketing plan/i })).not.toBeInTheDocument();
  });

   test('does NOT render Login/Signup buttons on root page even when logged out', () => {
    // Arrange: User is null, path IS /
    mockUseAuth.mockReturnValue({ user: null, signOut: mockSignOut, loading: false });
    mockUseRouter.mockReturnValue({ push: mockPush, pathname: '/' }); 
    
    // Act
    render(<Navbar />);
    
    // Assert
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign up/i })).not.toBeInTheDocument();
  });

  test('renders Marketing Plan/Logout buttons when user is logged in', () => {
    // Arrange: User exists
    mockUseAuth.mockReturnValue({ 
      user: { id: 'user-789', email: 'test@example.com' }, 
      signOut: mockSignOut, 
      loading: false 
    });
    mockUseRouter.mockReturnValue({ push: mockPush, pathname: '/marketing-plan' }); // Authed path
    
    // Act
    render(<Navbar />);
    
    // Assert
    expect(screen.getByRole('link', { name: /marketing plan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign up/i })).not.toBeInTheDocument();
  });

  test('calls signOut and expects redirection (handled by AuthContext) on logout click', async () => {
    // Arrange: User exists
    mockUseAuth.mockReturnValue({ 
      user: { id: 'user-789' }, 
      signOut: mockSignOut, 
      loading: false 
    });
    mockUseRouter.mockReturnValue({ push: mockPush, pathname: '/marketing-plan' });
    // Mock signOut to simulate success
    mockSignOut.mockResolvedValue({ error: null }); 
    
    // Act
    render(<Navbar />);
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    
    // Assert
    // Wait for signOut to be called by the handler
    await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    // IMPORTANT: Redirection to '/' is handled *within* the signOut function 
    // in AuthContext.js. Therefore, we assert that `signOut` was called, 
    // but we DO NOT assert `mockPush('/')` here in the component test, 
    // as the component itself doesn't perform the redirect.
    // Testing the redirect would belong in an integration test or a test 
    // specifically for AuthContext.
    expect(mockPush).not.toHaveBeenCalled(); 
  });
  
  test('shows alert on logout failure', async () => {
    // Arrange: User exists, signOut will fail
    const logoutError = new Error("Logout failed");
    mockUseAuth.mockReturnValue({ 
      user: { id: 'user-789' }, 
      signOut: mockSignOut.mockRejectedValue(logoutError), // Mock rejection
      loading: false 
    });
    mockUseRouter.mockReturnValue({ push: mockPush, pathname: '/marketing-plan' });
    // Mock window.alert
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    // Act
    render(<Navbar />);
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    
    // Assert
    await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
    expect(window.alert).toHaveBeenCalledWith("Logout failed. Please try again.");
    
    // Restore alert mock
    window.alert.mockRestore();
  });
}); 