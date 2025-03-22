import React, { useState, useEffect } from 'react';
import styles from '../styles/ProjectSelectorModal.module.css';
import { useProject } from '../contexts/ProjectContext';

const ProjectSelectorModal = () => {
  const { 
    projects, 
    showProjectSelector, 
    setShowProjectSelector, 
    createProject, 
    switchProject,
    isLoading
  } = useProject();
  
  const [activeTab, setActiveTab] = useState(projects.length > 0 ? 'select' : 'create');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [formError, setFormError] = useState('');
  
  // Debug the modal state on mount and when relevant states change
  useEffect(() => {
    console.log('ProjectSelectorModal state:', { 
      showProjectSelector, 
      projectsCount: projects.length 
    });
    
    // Force show regardless of project count
    setShowProjectSelector(true);
  }, [projects.length, showProjectSelector]);
  
  // Close the modal (only if we have at least one project)
  const handleClose = () => {
    if (projects.length > 0) {
      setShowProjectSelector(false);
    }
  };
  
  // Handle form submission for new project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!projectName.trim()) {
      setFormError('Please enter a project name');
      return;
    }
    
    const result = await createProject(projectName, projectDescription);
    if (result) {
      setProjectName('');
      setProjectDescription('');
    }
  };
  
  // If modal is not visible, don't render anything
  if (!showProjectSelector) {
    return null;
  }
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Project Selection</h2>
          {projects.length > 0 && (
            <button 
              className={styles.closeButton} 
              onClick={handleClose}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
        
        {projects.length > 0 && (
          <div className={styles.tabs}>
            <button 
              className={`${styles.tabButton} ${activeTab === 'select' ? styles.active : ''}`}
              onClick={() => setActiveTab('select')}
            >
              Select Project
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'create' ? styles.active : ''}`}
              onClick={() => setActiveTab('create')}
            >
              Create New Project
            </button>
          </div>
        )}
        
        <div className={styles.modalBody}>
          {activeTab === 'select' && projects.length > 0 ? (
            <div className={styles.projectList}>
              <p className={styles.selectPrompt}>Select a project to work on:</p>
              {projects.map(project => (
                <div 
                  key={project.id} 
                  className={styles.projectCard}
                  onClick={() => {
                    console.log('Project card clicked:', project.name, project.id);
                    switchProject(project.id);
                  }}
                >
                  <h3>{project.name}</h3>
                  {project.description && (
                    <p className={styles.description}>{project.description}</p>
                  )}
                  <p className={styles.dateInfo}>
                    Created: {new Date(project.created_at).toLocaleDateString()}
                  </p>
                  {project.is_default && (
                    <span className={styles.defaultBadge}>Default</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleCreateProject} className={styles.createForm}>
              <div className={styles.formGroup}>
                <label htmlFor="projectName">Project Name *</label>
                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Business Project"
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="projectDescription">Description (optional)</label>
                <textarea
                  id="projectDescription"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Briefly describe what this project is for..."
                  rows={3}
                />
              </div>
              
              {formError && <p className={styles.errorText}>{formError}</p>}
              
              <button 
                type="submit" 
                className={styles.createButton}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Project'}
              </button>
              
              {projects.length === 0 && (
                <p className={styles.firstProjectNote}>
                  This will be your first project. You can create more projects later.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSelectorModal; 