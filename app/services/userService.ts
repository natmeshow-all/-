import {
    ref,
    get,
    set,
    remove,
    update
} from "firebase/database";
import { database } from "../lib/firebase";
import { UserProfile, PendingUser, UserRole } from "../types";

const USER_COLLECTIONS = {
    USERS: "users",
    PENDING_USERS: "pendingUsers",
};

// Get user profile by UID
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            return snapshot.val() as UserProfile;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching user profile for ${uid}:`, error);
        throw error;
    }
}

// Get all users (Admin only)
export async function getAllUsers(): Promise<UserProfile[]> {
    try {
        const usersRef = ref(database, USER_COLLECTIONS.USERS);
        const snapshot = await get(usersRef);

        if (!snapshot.exists()) return [];

        const users: UserProfile[] = [];
        snapshot.forEach((child) => {
            users.push({ ...child.val(), uid: child.key });
        });

        return users.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } catch (error) {
        console.error("Error fetching all users:", error);
        throw error;
    }
}

// Get pending users (Admin only)
export async function getPendingUsers(): Promise<PendingUser[]> {
    try {
        const pendingRef = ref(database, USER_COLLECTIONS.PENDING_USERS);
        const snapshot = await get(pendingRef);

        if (!snapshot.exists()) return [];

        const pending: PendingUser[] = [];
        snapshot.forEach((child) => {
            pending.push({ ...child.val(), uid: child.key });
        });

        return pending.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    } catch (error) {
        console.error("Error fetching pending users:", error);
        throw error;
    }
}

// Create pending user (on first sign up)
export async function createPendingUser(
    uid: string,
    email: string,
    displayName: string,
    photoURL?: string
): Promise<void> {
    try {
        // Input validation
        if (!email || !email.includes("@")) {
            throw new Error("Invalid email address");
        }
        if (!displayName || displayName.trim().length === 0) {
            throw new Error("Display name is required");
        }
        if (displayName.length > 100) {
            throw new Error("Display name is too long (max 100 chars)");
        }

        const pendingRef = ref(database, `${USER_COLLECTIONS.PENDING_USERS}/${uid}`);

        await set(pendingRef, {
            uid,
            email,
            displayName: displayName.trim(),
            photoURL: photoURL || "",
            requestedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error(`Error creating pending user ${uid}:`, error);
        throw error;
    }
}

// Check if user is pending
export async function isPendingUser(uid: string): Promise<boolean> {
    try {
        const pendingRef = ref(database, `${USER_COLLECTIONS.PENDING_USERS}/${uid}`);
        const snapshot = await get(pendingRef);
        return snapshot.exists();
    } catch (error) {
        console.error(`Error checking if user ${uid} is pending:`, error);
        throw error;
    }
}

// Auto-register user (when approval is not required)
export async function autoRegisterUser(
    uid: string,
    email: string,
    displayName: string,
    photoURL?: string,
    role: UserRole = "viewer"
): Promise<void> {
    try {
        const now = new Date().toISOString();
        const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);

        await set(userRef, {
            uid,
            email,
            displayName,
            nickname: "",
            role,
            department: "General",
            isApproved: true,
        isActive: true,
        photoURL: photoURL || "",
        registeredAt: now,
        updatedAt: now,
        permissions: {
            canView: true,
            canEdit: role === "admin" || role === "supervisor",
            canDelete: role === "admin",
            canExport: role === "admin" || role === "supervisor",
        }
    });

    // Remove from pending if exists
    const pendingRef = ref(database, `${USER_COLLECTIONS.PENDING_USERS}/${uid}`);
    await remove(pendingRef);
    } catch (error) {
        console.error(`Error auto-registering user ${uid}:`, error);
        throw error;
    }
}

// Approve user (Admin/Supervisor)
export async function approveUser(
    uid: string,
    role: UserRole,
    department: string,
    nickname: string
): Promise<void> {
    try {
        if (!["admin", "supervisor", "technician", "viewer"].includes(role)) {
             throw new Error("Invalid role");
        }
        if (!nickname || nickname.trim().length === 0) {
            throw new Error("Nickname is required");
        }
        if (nickname.length > 50) {
            throw new Error("Nickname is too long (max 50 chars)");
        }

        const pendingRef = ref(database, `${USER_COLLECTIONS.PENDING_USERS}/${uid}`);
        const snapshot = await get(pendingRef);

        if (!snapshot.exists()) {
            throw new Error("Pending user not found");
        }

        const pendingData = snapshot.val();
        const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);
        const now = new Date().toISOString();

        await set(userRef, {
            ...pendingData,
            role,
            department: department || "General",
            nickname: nickname.trim(),
            isApproved: true,
            isActive: true,
            registeredAt: now,
            updatedAt: now,
            permissions: {
                canView: true,
                canEdit: role === "admin" || role === "supervisor" || role === "technician",
                canDelete: role === "admin",
                canExport: role === "admin" || role === "supervisor",
            }
        });

        // Remove from pending
        await remove(pendingRef);
    } catch (error) {
        console.error(`Error approving user ${uid}:`, error);
        throw error;
    }
}

// Reject pending user (Admin/Supervisor)
export async function rejectPendingUser(uid: string): Promise<void> {
    try {
        const pendingRef = ref(database, `${USER_COLLECTIONS.PENDING_USERS}/${uid}`);
        await remove(pendingRef);
    } catch (error) {
        console.error(`Error rejecting pending user ${uid}:`, error);
        throw error;
    }
}

// Deactivate user (Admin/Supervisor)
export async function deactivateUser(uid: string): Promise<void> {
    try {
        const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);
        await update(userRef, {
            isActive: false,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Error deactivating user ${uid}:`, error);
        throw error;
    }
}

// Reactivate user (Admin/Supervisor)
export async function reactivateUser(uid: string): Promise<void> {
    try {
        const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);
        await update(userRef, {
            isActive: true,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Error reactivating user ${uid}:`, error);
        throw error;
    }
}

// Update user profile
export async function updateUserProfile(
    uid: string,
    data: Partial<UserProfile>
): Promise<void> {
    try {
        const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);
        await update(userRef, {
            ...data,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Error updating user profile ${uid}:`, error);
        throw error;
    }
}

// Delete user (Admin only) - Logical delete or physical? 
// Usually physical delete from DB, but Auth user remains in Firebase Auth
export async function deleteUser(uid: string): Promise<void> {
    try {
        const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);
        await remove(userRef);
    } catch (error) {
        console.error(`Error deleting user ${uid}:`, error);
        throw error;
    }
}

// Check if email is initial admin
export function isInitialAdminEmail(email: string): boolean {
    const adminEmail = process.env.NEXT_PUBLIC_INITIAL_ADMIN_EMAIL;
    return adminEmail ? email.toLowerCase() === adminEmail.toLowerCase() : false;
}

// Create initial admin user (only if matches env variable)
export async function createInitialAdmin(
    uid: string,
    email: string,
    displayName: string,
    photoURL?: string
): Promise<boolean> {
    try {
        if (!isInitialAdminEmail(email)) {
            return false;
        }

        // Check if user already exists
        const existingUser = await getUserProfile(uid);
        if (existingUser) {
            return false;
        }

        const now = new Date().toISOString();
        const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);

        await set(userRef, {
            uid,
            email,
            displayName,
            nickname: "Admin",
            role: "admin" as UserRole,
            department: "Management",
            isApproved: true,
            isActive: true,
            photoURL: photoURL || "",
            createdAt: now,
            updatedAt: now,
        });

        return true;
    } catch (error) {
        console.error(`Error creating initial admin ${uid}:`, error);
        throw error;
    }
}
