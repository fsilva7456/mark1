import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/router';

// Create context
const ProjectContext = createContext(null);

// Custom hook to use the project context
export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  
  // Ref to track previous path (can likely be removed now)
  // const prevPath = useRef(router.pathname);

  // Fetch projects when user changes
  useEffect(() => {
    if (user) {
      console.log("User changed or logged in, fetching projects...");
      fetchProjects();
    } else {
      console.log("User logged out, resetting project state.");
      setProjects([]);
      setCurrentProject(null);
      setIsLoading(false);
      setShowProjectSelector(false); // Ensure modal is hidden on logout
    }
  }, [user]);

  // Fetch projects from the database
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Ensure user is available before fetching
      if (!user) {
          console.log("fetchProjects called without user, aborting.");
          setIsLoading(false);
          return;
      }

      console.log("Fetching projects for user:", user.id);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      console.log("Projects fetched:", data);
      
      setProjects(data || []);
      
      // Logic to determine if selector should show AFTER fetching
      if (data && data.length > 0) {
        const defaultProject = data.find(p => p.is_default);
        const projectToSet = defaultProject || data[0]; // Use default or most recent
        
        // Set the current project state, but don't automatically hide the selector
        console.log("Setting initial currentProject:", projectToSet);
        setCurrentProject(projectToSet);
        
        // Show the selector to allow user confirmation/choice on initial load
        console.log("Projects found, showing selector for confirmation/choice.");
        setShowProjectSelector(true); 
        
      } else if (data && data.length === 0) {
        // No projects exist, show selector to prompt creation
        console.log("No projects found, showing selector.");
        setCurrentProject(null); // Ensure no project is set
        setShowProjectSelector(true);
      } else {
          // Handle case where data is null unexpectedly
          console.log("No projects data received, showing selector.")
          setCurrentProject(null);
          setShowProjectSelector(true);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects');
      // Optionally show selector on error?
      // setShowProjectSelector(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to a different project
  const switchProject = (projectId) => {
    console.log('switchProject called with ID:', projectId);
    const project = projects.find(p => p.id === projectId);
    if (project) {
      console.log('Setting current project:', project.name);
      setCurrentProject(project);
      setShowProjectSelector(false);
      
      // Redirect to marketing plan page for the selected project
      console.log('Redirecting to marketing plan...');
      router.push('/marketing-plan');
    } else {
      console.error('Project not found with ID:', projectId);
    }
  };

  // Create a new project
  const createProject = async (name, description = '') => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if this is the first project
      const isFirstProject = projects.length === 0;
      
      const { data, error } = await supabase
        .from('projects')
        .insert([
          { 
            user_id: user.id, 
            name, 
            description, 
            is_default: isFirstProject 
          }
        ])
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Update projects list
        setProjects(prev => [data[0], ...prev]);
        
        // Set as current project
        setCurrentProject(data[0]);
        
        // Close selector and mark as selected
        setShowProjectSelector(false);
        
        // Redirect to marketing plan page
        router.push('/marketing-plan');
        
        return data[0];
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Failed to create project');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Set a project as default
  const setDefaultProject = async (projectId) => {
    try {
      setIsLoading(true);
      
      // First, unset any existing default
      await supabase
        .from('projects')
        .update({ is_default: false })
        .eq('user_id', user.id);
      
      // Then set the new default
      const { error } = await supabase
        .from('projects')
        .update({ is_default: true })
        .eq('id', projectId);
      
      if (error) throw error;
      
      // Update local state
      setProjects(prev => 
        prev.map(p => ({
          ...p,
          is_default: p.id === projectId
        }))
      );
      
      return true;
    } catch (error) {
      console.error('Error setting default project:', error);
      setError('Failed to set default project');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a project
  const deleteProject = async (projectId) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (error) throw error;
      
      // Update projects list
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      
      // If we deleted the current project, switch to another
      if (currentProject && currentProject.id === projectId) {
        if (updatedProjects.length > 0) {
          setCurrentProject(updatedProjects[0]);
        } else {
          setCurrentProject(null);
          setShowProjectSelector(true);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('Failed to delete project');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Provide the project context
  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      isLoading,
      error,
      showProjectSelector,
      setShowProjectSelector,
      fetchProjects,
      createProject,
      switchProject,
      setDefaultProject,
      deleteProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
}; 