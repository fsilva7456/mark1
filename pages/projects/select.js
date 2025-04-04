import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import styles from '../../styles/SelectProject.module.css';

export default function SelectProjectPage() {
  console.log('SelectProjectPage rendering...');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    projects,
    currentProject,
    isLoading: projectLoading,
    error: projectError,
    fetchProjects,
    createProject,
    switchProject,
    setDefaultProject,
    deleteProject,
  } = useProject();

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  console.log('SelectProjectPage state:', { authLoading, projectLoading, user: !!user, projectsCount: projects.length, currentProjectId: currentProject?.id, projectError });

  // Fetch projects when user is loaded and available
  useEffect(() => {
    console.log('SelectProjectPage effect (fetchProjects): Checking user...', { userId: user?.id });
    if (user) {
      console.log('SelectProjectPage effect (fetchProjects): User found, calling fetchProjects.');
      fetchProjects();
    } else {
      console.log('SelectProjectPage effect (fetchProjects): No user, skipping fetch.');
    }
    // fetchProjects is memoized with useCallback in context, safe dependency
  }, [user, fetchProjects]);

  // Redirect if not logged in
  useEffect(() => {
    console.log('SelectProjectPage effect (authRedirect): Checking auth state...', { authLoading, user: !!user });
    if (!authLoading && !user) {
      console.log('SelectProjectPage effect (authRedirect): Not authenticated, redirecting to /login.');
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    console.log('handleCreateProject triggered.');
    if (!newProjectName.trim()) {
      console.log('handleCreateProject: Validation failed - Project name required.');
      setCreateError('Project name is required.');
      return;
    }
    setIsCreating(true);
    setCreateError('');
    try {
      console.log(`handleCreateProject: Calling createProject context function with name: ${newProjectName}`);
      const newProject = await createProject(newProjectName, newProjectDescription);
      if (newProject) {
        console.log('handleCreateProject: createProject successful, clearing form.', newProject);
        setNewProjectName('');
        setNewProjectDescription('');
        // ProjectContext's createProject handles the redirect now
        // router.push('/marketing-plan');
      } else {
        // Use error from context if available
        console.log('handleCreateProject: createProject returned null, checking projectError from context.');
        setCreateError(projectError || 'Failed to create project. Please try again.');
      }
    } catch (error) {
      console.error('handleCreateProject: Exception caught:', error);
      setCreateError(error.message || 'An unexpected error occurred during creation.');
    } finally {
      console.log('handleCreateProject: Setting isCreating to false.');
      setIsCreating(false);
    }
  };

  const handleSelectProject = async (projectId) => {
    console.log(`handleSelectProject triggered for ID: ${projectId}`);
    try {
      await switchProject(projectId);
      // switchProject now handles the redirect in ProjectContext
      // router.push('/marketing-plan');
    } catch (error) {
      console.error(`handleSelectProject: Exception caught for ID ${projectId}:`, error);
      // Handle error display if needed
    }
  };

  const handleSetDefault = async (projectId) => {
    console.log(`handleSetDefault triggered for ID: ${projectId}`);
    if (currentProject?.id === projectId && currentProject?.is_default) return; // Already default
    try {
      await setDefaultProject(projectId);
      // Optionally refetch or just update UI based on context state change
    } catch (error) {
      console.error(`handleSetDefault: Exception caught for ID ${projectId}:`, error);
      // setPageError('Failed to set default project.');
    }
  };

  const handleDelete = async (projectId, projectName) => {
    console.log(`handleDelete triggered for ID: ${projectId}, Name: ${projectName}`);
    if (window.confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
      console.log(`handleDelete: User confirmed deletion for ${projectId}.`);
      try {
        await deleteProject(projectId);
        // Context handles state update
      } catch (error) {
        console.error(`handleDelete: Exception caught for ID ${projectId}:`, error);
        // setPageError('Failed to delete project.');
      }
    } else {
      console.log(`handleDelete: User cancelled deletion for ${projectId}.`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Format as MM/DD/YYYY
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Invalid Date';
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return <div className={styles.loadingText}>Loading authentication...</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Select Project | Mark1</title>
      </Head>

      <h1 className={styles.header}>Select or Create a Project</h1>

      <div className={styles.contentWrapper}>
        {/* Project List Section */}
        {projects.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>Your Projects</h2>
            {projectLoading && !projects.length ? (
              <p className={styles.loadingText}>Loading projects...</p>
            ) : (
              <div className={styles.projectList}>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`${styles.projectCard} ${
                      currentProject?.id === project.id ? styles.current : ''
                    }`}
                  >
                    <div className={styles.projectInfo}>
                      <h3>{project.name} {project.is_default && '(Default)'}</h3>
                      {project.description && <p>{project.description}</p>}
                      <p className={styles.dateInfo}>Created: {formatDate(project.created_at)}</p>
                    </div>
                    <div className={styles.projectActions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleSelectProject(project.id)}
                        disabled={projectLoading || isCreating}
                        aria-label={`Select project ${project.name}`}
                      >
                        Select
                      </button>
                      {!project.is_default && (
                        <button
                          className={styles.secondaryButton}
                          onClick={() => handleSetDefault(project.id)}
                          disabled={projectLoading || isCreating}
                          aria-label={`Set ${project.name} as default`}
                        >
                          Set as Default
                        </button>
                      )}
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(project.id, project.name)}
                        disabled={projectLoading || isCreating || currentProject?.id === project.id} // Prevent deleting current project? Or handle differently
                        aria-label={`Delete project ${project.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
             {projectError && <p className={styles.error}>Error loading projects: {projectError}</p>}
          </section>
        )}

        {/* Create Project Section */}
        <section className={styles.createSection}>
          <h2 className={styles.sectionTitle}>
            {projects.length > 0 ? 'Create New Project' : 'Create Your First Project'}
          </h2>
           {projects.length === 0 && !projectLoading && (
             <p className={styles.noProjectsMessage}>You don't have any projects yet. Create one below to get started!</p>
           )}
          <form onSubmit={handleCreateProject} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="projectName">Project Name *</label>
              <input
                id="projectName"
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., My Fitness Coaching Business"
                required
                disabled={isCreating}
                aria-required="true"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="projectDescription">Description (Optional)</label>
              <textarea
                id="projectDescription"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="e.g., Target audience: busy professionals"
                rows={3}
                disabled={isCreating}
              />
            </div>
            {createError && <p className={styles.error}>{createError}</p>}
            <button
              type="submit"
              className={styles.createButton}
              disabled={isCreating || projectLoading}
              aria-disabled={isCreating || projectLoading}
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
} 