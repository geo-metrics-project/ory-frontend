import type { Metadata } from "next";
import "./globals.css";

// 1. Global styles for Ory Elements must be imported here
import "@ory/elements-react/theme/styles.css";

export const metadata: Metadata = {
  title: "GEOMETRICS - Authentication",
  description: "Secure authentication with Ory",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}