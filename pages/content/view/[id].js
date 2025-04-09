import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import styles from '../../../styles/Content.module.css';
import StatusBadge from '../../../components/StatusBadge';

export default function ContentView() {
  const router = useRouter();
  const { id } = router.query;
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  // ... existing code ...

  // Render the content once it's loaded
  if (!loading && content) {
    return (
      <Layout>
        <div className={styles.contentContainer}>
          <div className={styles.contentHeader}>
            <h1>{content.title}</h1>
            <div className={styles.contentMeta}>
              <StatusBadge status={content.status} />
              <p>Created: {new Date(content.created_at).toLocaleDateString()}</p>
              {content.updated_at && <p>Updated: {new Date(content.updated_at).toLocaleDateString()}</p>}
            </div>
            <Link href={`/content/edit/${id}`}>
              <button className="btn-primary">Edit Content</button>
            </Link>
          </div>

          <div className={styles.contentDetails}>
            <div className={styles.contentDescription}>
              <h4>Description</h4>
              <p>{content.description}</p>
            </div>
            
            <div className={styles.contentPlatform}>
              <h4>Platform</h4>
              <p>{content.platform}</p>
            </div>
            
            <div className={styles.contentType}>
              <h4>Content Type</h4>
              <p>{content.content_type}</p>
            </div>
            
            <div className={styles.contentVisual}>
              <h4>Proposed Visual</h4>
              <p>{content.proposed_visual}</p>
            </div>
            
            {/* Add new proposed text/caption section */}
            <div className={styles.contentCaption}>
              <h4>Proposed Text/Caption</h4>
              <p>{content.proposed_caption || "No caption proposed for this content."}</p>
            </div>
          </div>
          
          {/* ... existing code ... */}
        </div>
      </Layout>
    );
  }

  // ... existing code ...
} 