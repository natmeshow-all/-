const SALT = "AOB_SECURE_SALT_2026";

/**
 * Basic obfuscation to prevent plain-text token exposure in Firebase database.
 * This is NOT true encryption, but satisfies the requirement of making it unreadable
 * to casual observers who might have read access to the database.
 */
export function encodeSecret(text: string): string {
    if (!text) return text;
    try {
        return "enc:" + btoa(encodeURIComponent(text + SALT));
    } catch (e) {
        return text;
    }
}

export function decodeSecret(text: string): string {
    if (!text || !text.startsWith("enc:")) return text;
    try {
        const decoded = decodeURIComponent(atob(text.replace("enc:", "")));
        if (decoded.endsWith(SALT)) {
            return decoded.slice(0, -SALT.length);
        }
        return decoded;
    } catch (e) {
        return text;
    }
}
