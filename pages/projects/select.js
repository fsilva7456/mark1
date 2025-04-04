import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import styles from '../../styles/SelectProject.module.css';

export default function SelectProjectPage() {
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

  // Fetch projects when user is loaded and available
  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user, fetchProjects]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setCreateError('Project name is required.');
      return;
    }
    setIsCreating(true);
    setCreateError('');
    try {
      const newProject = await createProject(newProjectName, newProjectDescription);
      if (newProject) {
        setNewProjectName('');
        setNewProjectDescription('');
        // ProjectContext's createProject handles the redirect now
        // router.push('/marketing-plan');
      } else {
        // Use error from context if available
        setCreateError(projectError || 'Failed to create project. Please try again.');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setCreateError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectProject = async (projectId) => {
    try {
        await switchProject(projectId);
        // switchProject now handles the redirect in ProjectContext
        // router.push('/marketing-plan');
    } catch (error) {
        console.error("Error switching project:", error);
        // Handle error display if needed
    }
  };

  const handleSetDefault = async (projectId) => {
    if (currentProject?.id === projectId && currentProject?.is_default) return; // Already default
    await setDefaultProject(projectId);
    // Optionally refetch or just update UI based on context state change
  };

  const handleDelete = async (projectId, projectName) => {
    if (window.confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
      await deleteProject(projectId);
      // Context handles state update
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
                      >
                        Select
                      </button>
                      {!project.is_default && (
                        <button
                          className={styles.secondaryButton}
                          onClick={() => handleSetDefault(project.id)}
                          disabled={projectLoading || isCreating}
                        >
                          Set as Default
                        </button>
                      )}
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(project.id, project.name)}
                        disabled={projectLoading || isCreating || currentProject?.id === project.id} // Prevent deleting current project? Or handle differently
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
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
} 