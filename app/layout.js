export const metadata = {
  title: 'Gemini AI Text Processor',
  description: 'Process text using Google Gemini 2.0 Flash AI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f5f7fa' }}>{children}</body>
    </html>
  );
} 