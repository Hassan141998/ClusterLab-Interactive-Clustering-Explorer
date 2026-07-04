import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClusterLab — Interactive Clustering Explorer",
  description: "Explore K-Means, DBSCAN, and Hierarchical clustering algorithms interactively",
  keywords: ["clustering", "machine learning", "k-means", "dbscan", "hierarchical"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Roboto+Mono:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
