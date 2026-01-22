/**
 * Service for translating text from Thai to English using external APIs.
 * Default is MyMemory Translation API (free for basic use).
 */

import { ref, get, update } from "firebase/database";
import { database } from "../lib/firebase";

const MEMORY_API_URL = "https://api.mymemory.translated.net/get";
const DATA_TRANSLATIONS_COLLECTION = "data_translations";

/**
 * Translates text from Thai to English.
 * @param text The Thai text to translate
 * @returns The English translation
 */
export async function translateToEnglish(text: string): Promise<string> {
    if (!text || !/[ก-ฮ]/.test(text)) return text; // Skip if empty or doesn't contain Thai characters

    try {
        const response = await fetch(
            `${MEMORY_API_URL}?q=${encodeURIComponent(text)}&langpair=th|en`
        );

        if (!response.ok) {
            throw new Error(`Translation API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.responseData && data.responseData.translatedText) {
            let translated = data.responseData.translatedText;

            // Clean up common artifacts from free APIs if any
            // (e.g., HTML entities, unexpected prefixes)
            translated = translated.replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&amp;/g, "&");

            return translated;
        }

        return text; // Fallback to original text
    } catch (error) {
        console.error("Translation error:", error);
        return text; // Fallback to original text
    }
}

/**
 * Updates a specific translation.
 */
export async function updateTranslation(key: string, newValue: string): Promise<void> {
    if (!key) return;
    const translationsRef = ref(database, DATA_TRANSLATIONS_COLLECTION);
    try {
        await update(translationsRef, {
            [key]: newValue
        });
    } catch (error) {
        console.error("Error updating translation:", error);
        throw error;
    }
}

/**
 * Deletes a specific translation.
 */
export async function deleteTranslation(key: string): Promise<void> {
    if (!key) return;
    const translationsRef = ref(database, `${DATA_TRANSLATIONS_COLLECTION}/${key}`);
    try {
        // In Firebase Realtime Database, setting a path to null deletes it
        await update(ref(database, DATA_TRANSLATIONS_COLLECTION), {
            [key]: null
        });
    } catch (error) {
        console.error("Error deleting translation:", error);
        throw error;
    }
}

/**
 * Synchronizes a translation for a piece of text.
 */
export async function syncTranslation(text: string): Promise<void> {
    if (!text || !/[ก-ฮ]/.test(text)) return;

    const normalizedText = text.trim();
    const translationsRef = ref(database, DATA_TRANSLATIONS_COLLECTION);

    try {
        const snapshot = await get(translationsRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Case-insensitive check
            const alreadyExists = Object.keys(data).some(k => k.toLowerCase() === normalizedText.toLowerCase());
            if (alreadyExists) return;
        }

        const englishText = await translateToEnglish(normalizedText);
        if (englishText && englishText !== normalizedText) {
            await update(translationsRef, {
                [normalizedText]: englishText
            });
        }
    } catch (error: any) {
        // Silently suppress permission denied errors (user may not be logged in or have permissions)
        const errorCode = error?.code?.toLowerCase() || '';
        const errorMessage = error?.message?.toLowerCase() || '';
        if (!errorCode.includes('permission') && !errorMessage.includes('permission')) {
            console.error("Error syncing translation:", error);
        }
    }
}

/**
 * Fetches all dynamic translations.
 */
export async function getDynamicTranslations(): Promise<Record<string, string>> {
    try {
        const translationsRef = ref(database, DATA_TRANSLATIONS_COLLECTION);
        const snapshot = await get(translationsRef);
        return snapshot.exists() ? snapshot.val() : {};
    } catch (error) {
        console.error("Error fetching dynamic translations:", error);
        return {}; // Return empty object on error to prevent app crash
    }
}
