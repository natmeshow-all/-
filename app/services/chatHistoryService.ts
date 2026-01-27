import { ref, push, get, query, limitToLast, orderByChild, startAt } from "firebase/database";
import { database } from "../lib/firebase";
import { AIMessage } from "./aiService";

export interface ChatLog {
    userId: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number; // Use timestamp for easier querying
}

/**
 * Save a chat message to the user's history
 */
export async function saveChatLog(userId: string, role: "user" | "assistant", content: string) {
    if (!userId) return;

    try {
        const chatRef = ref(database, `users/${userId}/chat_history`);
        await push(chatRef, {
            userId,
            role,
            content,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error("Error saving chat log:", error);
    }
}

/**
 * Get chat history for the last 30 days
 */
export async function getRecentChatHistory(userId: string): Promise<ChatLog[]> {
    if (!userId) return [];

    try {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const chatRef = ref(database, `users/${userId}/chat_history`);

        // Query ordered by timestamp, starting from 30 days ago
        // Note: Firebase Realtime Database query limitations might apply if not indexed.
        // For now, fetching last 50 items and filtering is safer for performance if strict indexing isn't set up.
        const recentChatsQuery = query(chatRef, orderByChild("timestamp"), startAt(thirtyDaysAgo));

        const snapshot = await get(recentChatsQuery);

        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.values(data) as ChatLog[];
        }

        return [];
    } catch (error) {
        console.error("Error fetching chat history:", error);
        return [];
    }
}
