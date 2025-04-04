import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(true); // Initially true until first fetch attempt
  const [error, setError] = useState(null);
  // Removed showProjectSelector state

  // Fetch projects from the database
  // Use useCallback to prevent re-creation on every render unless dependencies change
  const fetchProjects = useCallback(async () => {
    // Only fetch if user is available
    if (!user) {
      setProjects([]);
      setCurrentProject(null);
      setIsLoading(false);
      return;
    }

    // console.log('Fetching projects for user:', user.id);
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id) // Ensure only user's projects are fetched
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Supabase fetch error:', fetchError);
        throw new Error(fetchError.message || 'Failed to load projects from database.');
      }
      
      // console.log('Fetched projects data:', data);
      const fetchedProjects = data || [];
      setProjects(fetchedProjects);

      // Determine initial currentProject if none is set or the current one is gone
      if (fetchedProjects.length > 0) {
          const defaultProject = fetchedProjects.find(p => p.is_default);
          const projectToSet = defaultProject || fetchedProjects[0]; // Default or most recent
          
          // Set current project only if it's not already set or different
          if (!currentProject || currentProject.id !== projectToSet.id) {
             // console.log('Setting initial current project:', projectToSet.name);
             setCurrentProject(projectToSet);
          }
      } else {
          // No projects found, ensure currentProject is null
          setCurrentProject(null);
      }

    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message || 'An unexpected error occurred while fetching projects.');
      setProjects([]); // Clear projects on error
      setCurrentProject(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentProject]); // Include currentProject to re-evaluate if it changes elsewhere

  // Fetch projects when user object becomes available
  useEffect(() => {
    // console.log('User state changed, user:', user);
    fetchProjects();
  }, [user, fetchProjects]); // fetchProjects is now stable due to useCallback

  // Switch to a different project and redirect
  const switchProject = useCallback(async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      // console.log('Switching to project:', project.name);
      setCurrentProject(project);
      // Redirect after setting the project
      router.push('/marketing-plan');
    } else {
      console.error('Attempted to switch to non-existent project ID:', projectId);
      setError('Selected project not found. Please refresh.');
      // Optional: redirect back to select page or show error
      // router.push('/projects/select'); 
    }
  }, [projects, router]);

  // Create a new project, set it as current, and redirect
  const createProject = useCallback(async (name, description = '') => {
    if (!user) {
        setError("User not logged in. Cannot create project.");
        return null;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const isFirstProject = projects.length === 0;
      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([
          { 
            user_id: user.id, 
            name: name.trim(), // Ensure name is trimmed 
            description: description?.trim(), // Trim description if provided
            is_default: isFirstProject 
            // created_at and updated_at are handled by Supabase
          }
        ])
        .select() // Select the newly created row
        .single(); // Expecting a single object back

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw new Error(insertError.message || 'Failed to save project to database.');
      }

      if (data) {
        // console.log('Project created successfully:', data);
        // Add to local state immediately
        setProjects(prev => [data, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))); // Add and re-sort
        setCurrentProject(data); // Set as current
        
        // Redirect after successful creation and state update
        router.push('/marketing-plan'); 
        return data;
      } else {
        // Should not happen if insertError is null, but handle defensively
        throw new Error('Failed to create project, no data returned.');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.message || 'An unexpected error occurred while creating the project.');
      // Don't redirect on error
      return null; // Indicate failure
    } finally {
      setIsLoading(false);
    }
  }, [user, projects, router]); // Depends on user, projects list, and router

  // Set a project as default
  const setDefaultProject = useCallback(async (projectId) => {
     if (!user) {
        setError("User not logged in. Cannot set default project.");
        return false;
    }
    setIsLoading(true); // Indicate activity
    setError(null);
    try {
      // Transaction: Unset existing default, then set new default
      const { error: unsetError } = await supabase
        .from('projects')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true);
        
      if (unsetError) {
         console.error('Error unsetting previous default project:', unsetError);
         throw new Error(unsetError.message || 'Failed to unset previous default.');
      }

      const { error: setError } = await supabase
        .from('projects')
        .update({ is_default: true })
        .eq('user_id', user.id) // Ensure we only update the user's project
        .eq('id', projectId);

      if (setError) {
        console.error('Error setting new default project:', setError);
        throw new Error(setError.message || 'Failed to set the new default project.');
      }

      // Update local state optimistically or after confirmation
      setProjects(prev => 
        prev.map(p => ({
          ...p,
          is_default: p.id === projectId
        }))
      );
      // Ensure current project reflects the change if it was the one set to default
      if (currentProject?.id === projectId) {
          setCurrentProject(prev => ({ ...prev, is_default: true }));
      }
      // console.log('Project set as default:', projectId);
      return true;
    } catch (err) {
      console.error('Error setting default project:', err);
      setError(err.message || 'An error occurred while setting the default project.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, currentProject?.id]); // Depends on user and currentProject ID

  // Delete a project
  const deleteProject = useCallback(async (projectId) => {
     if (!user) {
        setError("User not logged in. Cannot delete project.");
        return false;
    }
    // Prevent deleting the only project if needed, or handle redirect
    // if (projects.length <= 1) {
    //   setError("Cannot delete the last project.");
    //   return false;
    // }
    
    setIsLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('user_id', user.id) // Ensure user owns the project
        .eq('id', projectId);

      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        throw new Error(deleteError.message || 'Failed to delete project from database.');
      }

      // console.log('Project deleted successfully:', projectId);
      // Update local state
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);

      // Handle current project if it was deleted
      if (currentProject?.id === projectId) {
        if (updatedProjects.length > 0) {
          // Select the new default or the first remaining project
          const newDefault = updatedProjects.find(p => p.is_default) || updatedProjects[0];
          setCurrentProject(newDefault);
          // console.log('Deleted current project, switched to:', newDefault.name);
        } else {
          // No projects left, clear current project
          setCurrentProject(null);
          // console.log('Deleted last project.');
          // No redirect here, user stays on select page which will prompt creation
        }
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(err.message || 'An unexpected error occurred while deleting the project.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, projects, currentProject, router]); // Depends on user, projects, currentProject, and router

  // Value provided by the context
  const value = {
    projects,
    currentProject,
    isLoading,
    error,
    fetchProjects,
    createProject,
    switchProject,
    setDefaultProject,
    deleteProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}; 