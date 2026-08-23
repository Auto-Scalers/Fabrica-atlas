import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/layout-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mission Control",
  description: "The command center for humans supervising AI agents — Eisenhower matrix, Kanban, objectives, and agent deployment",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          <LayoutShell>{children}</LayoutShell>
          <Toaster
            theme="system"
            position="bottom-right"
            toastOptions={{
              className: "border-border bg-card text-card-foreground",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
