import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/auth-context";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "WIMB - Where Is My Buddy?",
  description: "Real-time buddy finder app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-outfit" style={{
        '--primary-color': '#0f172a',
        '--bg-color': '#fafbfc',
      } as React.CSSProperties}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
