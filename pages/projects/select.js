import React from 'react';

// Simple test component
export default function SelectProjectPageSimple() {
  console.log('--- SelectProjectPageSimple rendering ---'); // Add a unique log
  
  // Basic inline styles to ensure visibility
  const styles = {
      container: {
          minHeight: '100vh',
          padding: '2rem',
          backgroundColor: 'lightgoldenrodyellow', // Distinct background
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '5px dashed red' // Make it obvious
      },
      header: {
          fontSize: '2.5rem',
          color: '#333'
      },
      paragraph: {
          fontSize: '1.2rem',
          color: '#555'
      }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Simple Page Test</h1>
      <p style={styles.paragraph}>
        If you see this yellow page with a dashed border, the basic routing and page loading works.
      </p>
      <p style={styles.paragraph}>
        The issue is likely within the original SelectProjectPage component's logic or hooks.
      </p>
    </div>
  );
} 