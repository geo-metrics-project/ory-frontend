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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            backgroundColor: "#f5f5f5",
          }}
        >
          <div style={{ width: "100%", maxWidth: "450px" }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}