import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BeadForge - Bead Crochet Pattern Editor',
  description: 'Create and edit bead crochet rope patterns with our powerful online editor',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
