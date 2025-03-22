import '../styles/globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import { ProjectProvider } from '../contexts/ProjectContext'
import { MarketingPlanProvider } from '../contexts/MarketingPlanContext'
import { useState } from 'react'
import React from 'react'
import { Toaster } from 'react-hot-toast'
import ProjectSelectorModal from '../components/ProjectSelectorModal'

function MyApp({ Component, pageProps }) {
  const [error, setError] = useState(null)

  if (error) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Something went wrong</h1>
        <p>{error.message}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            background: '#3454D1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload page
        </button>
      </div>
    )
  }

  return (
    <ErrorBoundary setError={setError}>
      <AuthProvider>
        <ProjectProvider>
          <MarketingPlanProvider>
            <Component {...pageProps} />
            <ProjectSelectorModal />
            <Toaster position="top-right" />
          </MarketingPlanProvider>
        </ProjectProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo)
    this.props.setError(error)
  }

  render() {
    return this.props.children
  }
}

export default MyApp 