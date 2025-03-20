import styles from '../../../styles/Content.module.css';

<div className={styles.contentDetails}>
  {/* Existing content */}
  <div className={styles.contentVisual}>
    <h4>Proposed Visual</h4>
    <p>{contentItem.proposedVisual}</p>
  </div>
  
  {/* Add new proposed text/caption section */}
  <div className={styles.contentCaption}>
    <h4>Proposed Text/Caption</h4>
    <p>{contentItem.proposedCaption || "No caption proposed for this content."}</p>
  </div>
  
  {/* Other details */}
</div> 