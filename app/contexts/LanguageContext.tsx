"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Language, TranslationKeys, dataTranslations } from "../translations";
import { database } from "../lib/firebase";
import { ref, onValue } from "firebase/database";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof TranslationKeys, params?: Record<string, string | number>) => string;
    tData: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>("th");
    const [mounted, setMounted] = useState(false);
    const [dynamicTranslations, setDynamicTranslations] = useState<Record<string, string>>({});

    useEffect(() => {
        setMounted(true);
        const savedLang = localStorage.getItem("language") as Language;
        if (savedLang && (savedLang === "th" || savedLang === "en")) {
            setLanguageState(savedLang);
        }

        // Listen for dynamic translations from Firebase
        const translationsRef = ref(database, "data_translations");
        const unsubscribe = onValue(translationsRef, (snapshot) => {
            if (snapshot.exists()) {
                setDynamicTranslations(snapshot.val());
            }
        }, (error) => {
            console.error("Error fetching translations:", error);
            // Don't crash the app, just ignore dynamic translations
        });

        return () => unsubscribe();
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("language", lang);
        document.documentElement.lang = lang;
    };

    const t = (key: keyof TranslationKeys, params?: Record<string, string | number>): string => {
        let text = translations[language][key] || key;
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
            });
        }
        return text;
    };

    const tData = (text: string): string => {
        if (!text || language === "th") return text;

        let translatedText = text;

        // 1. Check static dataTranslations map
        const staticMatch = Object.entries(dataTranslations).find(([th]) => th === text);
        if (staticMatch) return staticMatch[1];

        // 2. Check dynamic translations from Firebase
        const dynamicMatch = dynamicTranslations[text];
        if (dynamicMatch) return dynamicMatch;

        // 3. Partial replacement for terms (legacy behavior)
        Object.entries(dataTranslations).forEach(([thTerm, enTerm]) => {
            const regex = new RegExp(thTerm, 'g');
            translatedText = translatedText.replace(regex, enTerm);
        });

        return translatedText;
    };

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return (
            <LanguageContext.Provider value={{ language: "th", setLanguage, t, tData: (s => s) }}>
                {children}
            </LanguageContext.Provider>
        );
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, tData }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
