import React, { useState } from 'react';
import Link from 'next/link';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import styles from '../styles/ContentPipeline.module.css';

// Post item with drag and drop functionality
const PostItem = ({ post, index, movePost, onStatusChange }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'POST',
    item: { id: post.id, index, status: post.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div 
      ref={drag}
      className={`${styles.postItem} ${isDragging ? styles.dragging : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className={styles.postHeader}>
        <h4 className={styles.postTitle}>{post.title}</h4>
        <span className={`${styles.postPlatform} ${styles[post.platform?.toLowerCase()]}`}>
          {post.platform}
        </span>
      </div>
      <div className={styles.postMeta}>
        {post.scheduled_date && (
          <span className={styles.postDate}>
            {new Date(post.scheduled_date).toLocaleDateString()}
          </span>
        )}
        <span className={styles.postType}>{post.post_type}</span>
      </div>
      <p className={styles.postExcerpt}>
        {post.content?.length > 60 
          ? post.content.substring(0, 60) + '...' 
          : post.content}
      </p>
      <div className={styles.postActions}>
        <Link href={`/calendar/${post.calendar_id}/post/${post.id}`} className={styles.editButton}>
          Edit
        </Link>
        <button 
          className={styles.previewButton}
          onClick={() => window.open(`/calendar/${post.calendar_id}/post/${post.id}/preview`, '_blank')}
        >
          Preview
        </button>
      </div>
    </div>
  );
};

// Pipeline column with drop functionality
const PipelineColumn = ({ title, status, posts, movePost, onStatusChange }) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'POST',
    drop: (item) => {
      if (item.status !== status) {
        onStatusChange(item.id, status);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div 
      ref={drop} 
      className={`${styles.pipelineColumn} ${isOver ? styles.isOver : ''}`}
    >
      <div className={styles.columnHeader}>
        <h3>{title}</h3>
        <span className={styles.postCount}>{posts.length}</span>
      </div>
      <div className={styles.columnContent}>
        {posts.map((post, index) => (
          <PostItem 
            key={post.id} 
            post={post} 
            index={index} 
            movePost={movePost} 
            onStatusChange={onStatusChange}
          />
        ))}
        {posts.length === 0 && (
          <div className={styles.emptyState}>
            No posts in this stage
          </div>
        )}
      </div>
    </div>
  );
};

// Main content pipeline component
export default function ContentPipeline({ posts = [], onStatusChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  
  // Filter posts based on search and platform
  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchTerm === '' || 
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesPlatform = selectedPlatform === 'All' || 
      post.platform === selectedPlatform;
      
    return matchesSearch && matchesPlatform;
  });
  
  // Group posts by status
  const draftPosts = filteredPosts.filter(post => post.status === 'draft');
  const scheduledPosts = filteredPosts.filter(post => post.status === 'scheduled');
  const publishedPosts = filteredPosts.filter(post => post.status === 'published');
  
  // Function to move posts between columns
  const movePost = (postId, newStatus) => {
    if (onStatusChange) {
      onStatusChange(postId, newStatus);
    }
  };
  
  // Get unique platforms for filter
  const platforms = ['All', ...new Set(posts.map(post => post.platform).filter(Boolean))];
  
  return (
    <div className={styles.pipelineContainer}>
      <div className={styles.pipelineHeader}>
        <h2>Content Pipeline</h2>
        <div className={styles.pipelineFilters}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterWrapper}>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className={styles.platformFilter}
            >
              {platforms.map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <DndProvider backend={HTML5Backend}>
        <div className={styles.pipelineColumns}>
          <PipelineColumn 
            title="Draft" 
            status="draft" 
            posts={draftPosts}
            movePost={movePost}
            onStatusChange={onStatusChange}
          />
          <PipelineColumn 
            title="Scheduled" 
            status="scheduled" 
            posts={scheduledPosts}
            movePost={movePost}
            onStatusChange={onStatusChange}
          />
          <PipelineColumn 
            title="Published" 
            status="published" 
            posts={publishedPosts}
            movePost={movePost}
            onStatusChange={onStatusChange}
          />
        </div>
      </DndProvider>
      
      <div className={styles.bulkActionBar}>
        <span className={styles.selectedCount}>
          {posts.filter(p => p.selected).length} posts selected
        </span>
        <div className={styles.bulkActions}>
          <button className={styles.bulkButton} disabled={!posts.some(p => p.selected)}>
            Bulk Edit
          </button>
          <button className={styles.bulkButton} disabled={!posts.some(p => p.selected)}>
            Reschedule
          </button>
          <button className={styles.bulkButton} disabled={!posts.some(p => p.selected)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
} 