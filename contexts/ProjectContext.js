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
  console.log('ProjectProvider rendering...');
  const { user } = useAuth();
  const router = useRouter();
  
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Initially true until first fetch attempt
  const [error, setError] = useState(null);
  // Removed showProjectSelector state

  // Fetch projects from the database
  const fetchProjects = useCallback(async () => {
    console.log('ProjectProvider: fetchProjects called.');
    if (!user) {
      console.log('ProjectProvider: fetchProjects aborted, no user.');
      setProjects([]);
      setCurrentProject(null);
      setIsLoading(false);
      return;
    }

    console.log(`ProjectProvider: Fetching projects for user: ${user.id}`);
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id) // Ensure only user's projects are fetched
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('ProjectProvider: Supabase fetch error:', fetchError);
        throw new Error(fetchError.message || 'Failed to load projects from database.');
      }
      
      console.log('ProjectProvider: Fetched projects data:', data);
      const fetchedProjects = data || [];
      setProjects(fetchedProjects);

      // Determine initial currentProject if none is set or the current one is gone
      if (fetchedProjects.length > 0) {
          const defaultProject = fetchedProjects.find(p => p.is_default);
          const projectToSet = defaultProject || fetchedProjects[0]; // Default or most recent
          
          // Set current project only if it's not already set or different
          if (!currentProject || currentProject.id !== projectToSet.id) {
             console.log('ProjectProvider: Setting initial/updated current project:', projectToSet.name, projectToSet.id);
             setCurrentProject(projectToSet);
          }
      } else {
          console.log('ProjectProvider: No projects found for user, setting currentProject to null.');
          setCurrentProject(null);
      }

    } catch (err) {
      console.error('ProjectProvider: Exception during fetchProjects:', err);
      setError(err.message || 'An unexpected error occurred while fetching projects.');
      setProjects([]); // Clear projects on error
      setCurrentProject(null);
    } finally {
      console.log('ProjectProvider: fetchProjects finished, setting loading to false.');
      setIsLoading(false);
    }
  }, [user, currentProject?.id]); // Depend on user and currentProject ID for stability

  // Fetch projects when user object becomes available or fetchProjects changes
  useEffect(() => {
    console.log('ProjectProvider effect: User changed, calling fetchProjects. User:', user?.id);
    fetchProjects();
  }, [user, fetchProjects]); // fetchProjects is stable due to useCallback

  // Switch to a different project and redirect
  const switchProject = useCallback(async (projectId) => {
    console.log(`ProjectProvider: switchProject called for ID: ${projectId}`);
    const project = projects.find(p => p.id === projectId);
    if (project) {
      console.log('ProjectProvider: Setting current project:', project.name);
      setCurrentProject(project);
      console.log('ProjectProvider: Redirecting to /marketing-plan after switch.');
      router.push('/marketing-plan');
    } else {
      console.error('ProjectProvider: switchProject failed - project not found with ID:', projectId);
      setError('Selected project not found. Please refresh.');
    }
  }, [projects, router]);

  // Create a new project, set it as current, and redirect
  const createProject = useCallback(async (name, description = '') => {
    console.log(`ProjectProvider: createProject called with name: ${name}`);
    if (!user) {
        console.error("ProjectProvider: createProject failed - User not logged in.");
        setError("User not logged in. Cannot create project.");
        return null;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const isFirstProject = projects.length === 0;
      console.log(`ProjectProvider: Inserting project. Is first project: ${isFirstProject}`);
      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([
          { 
            user_id: user.id, 
            name: name.trim(), 
            description: description?.trim(),
            is_default: isFirstProject 
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error('ProjectProvider: Supabase insert error:', insertError);
        throw new Error(insertError.message || 'Failed to save project to database.');
      }

      if (data) {
        console.log('ProjectProvider: Project created successfully:', data);
        setProjects(prev => [data, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))); 
        setCurrentProject(data);
        console.log('ProjectProvider: Redirecting to /marketing-plan after create.');
        router.push('/marketing-plan'); 
        return data;
      } else {
         console.error('ProjectProvider: createProject failed - no data returned after insert.');
        throw new Error('Failed to create project, no data returned.');
      }
    } catch (err) {
      console.error('ProjectProvider: Exception during createProject:', err);
      setError(err.message || 'An unexpected error occurred while creating the project.');
      return null; // Indicate failure
    } finally {
      console.log('ProjectProvider: createProject finished, setting loading to false.');
      setIsLoading(false);
    }
  }, [user, projects, router]);

  // Set a project as default
  const setDefaultProject = useCallback(async (projectId) => {
     console.log(`ProjectProvider: setDefaultProject called for ID: ${projectId}`);
     if (!user) {
        console.error("ProjectProvider: setDefaultProject failed - User not logged in.");
        setError("User not logged in. Cannot set default project.");
        return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      console.log('ProjectProvider: Unsetting previous default project...');
      const { error: unsetError } = await supabase
        .from('projects')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true);
        
      if (unsetError) {
         console.error('ProjectProvider: Error unsetting previous default project:', unsetError);
         throw new Error(unsetError.message || 'Failed to unset previous default.');
      }
      
      console.log(`ProjectProvider: Setting project ${projectId} as default...`);
      const { error: setError } = await supabase
        .from('projects')
        .update({ is_default: true })
        .eq('user_id', user.id)
        .eq('id', projectId);

      if (setError) {
        console.error('ProjectProvider: Error setting new default project:', setError);
        throw new Error(setError.message || 'Failed to set the new default project.');
      }

      console.log('ProjectProvider: Updating local state for default project.');
      setProjects(prev => 
        prev.map(p => ({
          ...p,
          is_default: p.id === projectId
        }))
      );
      if (currentProject?.id === projectId) {
          console.log('ProjectProvider: Updating currentProject state to reflect default status.');
          setCurrentProject(prev => ({ ...prev, is_default: true }));
      }
      return true;
    } catch (err) {
      console.error('ProjectProvider: Exception during setDefaultProject:', err);
      setError(err.message || 'An error occurred while setting the default project.');
      return false;
    } finally {
      console.log('ProjectProvider: setDefaultProject finished, setting loading to false.');
      setIsLoading(false);
    }
  }, [user, currentProject?.id]); 

  // Delete a project
  const deleteProject = useCallback(async (projectId) => {
     console.log(`ProjectProvider: deleteProject called for ID: ${projectId}`);
     if (!user) {
         console.error("ProjectProvider: deleteProject failed - User not logged in.");
        setError("User not logged in. Cannot delete project.");
        return false;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('user_id', user.id)
        .eq('id', projectId);

      if (deleteError) {
        console.error('ProjectProvider: Supabase delete error:', deleteError);
        throw new Error(deleteError.message || 'Failed to delete project from database.');
      }

      console.log('ProjectProvider: Project deleted successfully from DB:', projectId);
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      console.log('ProjectProvider: Local project list updated after delete.');

      // Handle current project if it was deleted
      if (currentProject?.id === projectId) {
        console.log('ProjectProvider: Current project was deleted.');
        if (updatedProjects.length > 0) {
          const newDefault = updatedProjects.find(p => p.is_default) || updatedProjects[0];
          console.log('ProjectProvider: Setting new current project:', newDefault.name);
          setCurrentProject(newDefault);
        } else {
          console.log('ProjectProvider: No projects left, setting currentProject to null.');
          setCurrentProject(null);
        }
      }
      
      return true;
    } catch (err) {
      console.error('ProjectProvider: Exception during deleteProject:', err);
      setError(err.message || 'An unexpected error occurred while deleting the project.');
      return false;
    } finally {
       console.log('ProjectProvider: deleteProject finished, setting loading to false.');
      setIsLoading(false);
    }
  }, [user, projects, currentProject, router]); 

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

  console.log('ProjectProvider: Providing context value:', { isLoading, error: !!error, projectsCount: projects.length, currentProjectId: currentProject?.id });
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}; 