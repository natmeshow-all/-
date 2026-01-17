"use client";

import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";

export default function VersionDisplay() {
    const { t } = useLanguage();
    // Default to "dev" if env var is missing (e.g. during development without build)
    const version = process.env.NEXT_PUBLIC_APP_VERSION || "dev";

    return (
        <div className="px-4 py-2 border-t border-border-light/50 mt-1">
            <div className="flex items-center justify-between text-[10px] text-text-muted">
                <span className="font-medium tracking-wide opacity-70">
                    VERSION
                </span>
                <div className="flex items-center gap-1.5 bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-light/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse"></div>
                    <span className="font-mono text-[9px] text-accent-purple font-semibold">
                        {version}
                    </span>
                </div>
            </div>
        </div>
    );
}
