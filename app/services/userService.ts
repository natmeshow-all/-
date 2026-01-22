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
    const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        return snapshot.val() as UserProfile;
    }
    return null;
}

// Get all users (Admin only)
export async function getAllUsers(): Promise<UserProfile[]> {
    const usersRef = ref(database, USER_COLLECTIONS.USERS);
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) return [];

    const users: UserProfile[] = [];
    snapshot.forEach((child) => {
        users.push({ ...child.val(), uid: child.key });
    });

    return users.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

// Get pending users (Admin only)
export async function getPendingUsers(): Promise<PendingUser[]> {
    const pendingRef = ref(database, USER_COLLECTIONS.PENDING_USERS);
    const snapshot = await get(pendingRef);

    if (!snapshot.exists()) return [];

    const pending: PendingUser[] = [];
    snapshot.forEach((child) => {
        pending.push({ ...child.val(), uid: child.key });
    });

    return pending.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
}

// Create pending user (on first sign up)
export async function createPendingUser(
    uid: string,
    email: string,
    displayName: string,
    photoURL?: string
): Promise<void> {
    const pendingRef = ref(database, `${USER_COLLECTIONS.PENDING_USERS}/${uid}`);

    await set(pendingRef, {
        uid,
        email,
        displayName,
        photoURL: photoURL || "",
        requestedAt: new Date().toISOString(),
    });
}

// Check if user is pending
export async function isPendingUser(uid: string): Promise<boolean> {
    const pendingRef = ref(database, `${USER_COLLECTIONS.PENDING_USERS}/${uid}`);
    const snapshot = await get(pendingRef);
    return snapshot.exists();
}

// Auto-register user (when approval is not required)
export async function autoRegisterUser(
    uid: string,
    email: string,
    displayName: string,
    photoURL?: string,
    role: UserRole = "viewer"
): Promise<void> {
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
        createdAt: now,
        updatedAt: now,
    });
}

// Approve pending user (Admin only)
export async function approveUser(
    uid: string,
    role: UserRole = "technician",
    displayName?: string,
    nickname?: string
): Promise<void> {
    // Get pending user data
    const pendingRef = ref(database, `${USER_COLLECTIONS.PENDING_USERS}/${uid}`);
    const pendingSnapshot = await get(pendingRef);

    if (!pendingSnapshot.exists()) {
        throw new Error("Pending user not found");
    }

    const pendingData = pendingSnapshot.val() as PendingUser;
    const now = new Date().toISOString();

    // Create user profile
    const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);
    await set(userRef, {
        uid,
        email: pendingData.email,
        displayName: displayName || pendingData.displayName,
        nickname: nickname || "",
        role,
        department: "Maintenance",
        isApproved: true,
        isActive: true,
        photoURL: pendingData.photoURL || "",
        createdAt: now,
        updatedAt: now,
    });

    // Remove from pending
    await remove(pendingRef);
}

// Reject pending user (Admin only)
export async function rejectPendingUser(uid: string): Promise<void> {
    const pendingRef = ref(database, `${USER_COLLECTIONS.PENDING_USERS}/${uid}`);
    await remove(pendingRef);
}

// Update user profile
export async function updateUserProfile(
    uid: string,
    updates: Partial<Omit<UserProfile, "uid" | "email" | "createdAt">>
): Promise<void> {
    const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);
    await update(userRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
    });
}

// Deactivate user (soft delete)
export async function deactivateUser(uid: string): Promise<void> {
    await updateUserProfile(uid, { isActive: false });
}

// Reactivate user
export async function reactivateUser(uid: string): Promise<void> {
    await updateUserProfile(uid, { isActive: true });
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
}
