"use client";

import { useEffect } from "react";
import { useLanguage } from "./contexts/LanguageContext";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary text-text-primary p-4">
      <div className="bg-bg-secondary p-8 rounded-2xl border border-white/5 shadow-xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("errorTitle") || "Something went wrong!"}</h2>
        <p className="text-text-secondary mb-6">
          {error.message || t("errorMessage") || "An unexpected error occurred."}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="btn btn-outline"
          >
            {t("actionRefresh") || "Reload Page"}
          </button>
          <button
            onClick={() => reset()}
            className="btn btn-primary"
          >
            {t("actionTryAgain") || "Try Again"}
          </button>
        </div>
      </div>
    </div>
  );
}
