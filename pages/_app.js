import '../styles/globals.css'
// Temporarily comment out providers and error boundary for testing
// import { AuthProvider } from '../contexts/AuthContext'
// import { ProjectProvider } from '../contexts/ProjectContext'
// import { MarketingPlanProvider } from '../contexts/MarketingPlanContext'
// import { useState } from 'react'
// import React from 'react'
// import { Toaster } from 'react-hot-toast'

function MyApp({ Component, pageProps }) {
  console.log('MyApp component rendering... (Simplified)');

  // Directly render the component without providers or error boundary
  return <Component {...pageProps} />

  // --- Original Code commented out below ---
  // const [error, setError] = useState(null)
  //
  // if (error) {
  //   console.log('MyApp rendering error fallback UI.');
  //   return (
  //     <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
  //       <h1>Something went wrong</h1>
  //       <pre style={{ whiteSpace: 'pre-wrap', background: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
  //           {error.message}
  //           {"\n\n"}
  //           {error.stack}
  //       </pre>
  //       <button 
  //         onClick={() => window.location.reload()}
  //         style={{
  //           marginTop: '1rem',
  //           padding: '8px 16px',
  //           background: '#0070f3',
  //           color: 'white',
  //           border: 'none',
  //           borderRadius: '4px',
  //           cursor: 'pointer'
  //         }}
  //       >
  //         Reload page
  //       </button>
  //     </div>
  //   )
  // }
  //
  // console.log('MyApp rendering main application structure.');
  // return (
  //   <ErrorBoundary setError={setError}>
  //     <AuthProvider>
  //       <ProjectProvider>
  //         <MarketingPlanProvider>
  //           <Component {...pageProps} />
  //           <Toaster position="top-right" />
  //         </MarketingPlanProvider>
  //       </ProjectProvider>
  //     </AuthProvider>
  //   </ErrorBoundary>
  // )
}

// --- ErrorBoundary commented out ---
// class ErrorBoundary extends React.Component {
//   constructor(props) {
//     super(props)
//   }
//
//   componentDidCatch(error, errorInfo) {
//     console.error("ErrorBoundary caught an error:", error, errorInfo);
//     this.props.setError(error);
//   }
//
//   render() {
//     return this.props.children
//   }
// }

export default MyApp 