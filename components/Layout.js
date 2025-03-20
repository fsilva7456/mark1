import Head from 'next/head';
import Navbar from './Navbar';

export default function Layout({ children, title = 'Mark1 - Social Media Management' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Mark1 - Social Media Management Tool" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-gray-100 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Mark1. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
} 