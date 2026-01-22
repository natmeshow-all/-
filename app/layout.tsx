import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import MaintenanceWrapper from "./components/MaintenanceWrapper";
import { ErrorBoundary } from "./components/ErrorBoundary";

const promptFont = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AOB | Maintenance Team",
  description: "Management system for machine maintenance and parts",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AOB Maintenance",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

  return (
    <html lang="th" className="dark" suppressHydrationWarning>
      <body className={`${promptFont.className} bg-bg-primary text-text-primary min-h-screen antialiased`} suppressHydrationWarning>
        <ErrorBoundary>
          <LanguageProvider>
            <ToastProvider>
              <AuthProvider>
                <MaintenanceWrapper>
                  {children}
                </MaintenanceWrapper>
              </AuthProvider>
            </ToastProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
