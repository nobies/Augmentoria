import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Media Dashboard | Pro Post-Production Hub',
  description: 'Modular post-production tools for film, video, and audio teams.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090b10] text-[#f1f5f9] min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
