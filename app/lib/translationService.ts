/**
 * Service for translating text from Thai to English using external APIs.
 * Default is MyMemory Translation API (free for basic use).
 */

const MEMORY_API_URL = "https://api.mymemory.translated.net/get";

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
