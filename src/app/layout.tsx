import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Orbitron } from "next/font/google";
import { StoreHydration } from "@/components/StoreHydration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Agent Orchestrator",
  description: "AI Agent Orchestration Command Center - Workflow automation with Claude, Gemini, Codex & more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="terminal" data-mode="dark" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${orbitron.variable} antialiased`}
      >
        <StoreHydration />
        {children}
      </body>
    </html>
  );
}
