import { create } from 'zustand';
import { getCurrentUser } from '@/lib/api-teacher';

let profileFetchPromise: Promise<any> | null = null;
let lastFetchTime = 0;
const FETCH_CACHE_DURATION = 30000;

export interface UserProfile {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    acc_type: string;
    lrn?: string;
    section?: string;
}

interface UserState {
    user: UserProfile | null;
    loading: boolean;
    error: string | null;
    fetchProfile: () => Promise<UserProfile | null>;
    clearProfile: () => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    loading: true, // Start with true to check session
    error: null,

    fetchProfile: async () => {
        const now = Date.now();
        if (profileFetchPromise && (now - lastFetchTime) < FETCH_CACHE_DURATION) {
            return profileFetchPromise;
        }

        set({ loading: true, error: null });

        const fetchPromise = (async () => {
            try {
                const data = await getCurrentUser();
                set({ user: data, loading: false });
                lastFetchTime = Date.now();
                return data;
            } catch (err: any) {
                if (err.response?.status !== 401) {
                    console.error("Failed to fetch user profile:", err);
                }
                profileFetchPromise = null;
                set({
                    error: err.message || "Failed to load profile",
                    loading: false,
                    user: null
                });
                return null;
            }
        })();

        profileFetchPromise = fetchPromise;
        lastFetchTime = now;

        return fetchPromise;
    },

    clearProfile: () => {
        profileFetchPromise = null;
        lastFetchTime = 0;
        set({ user: null, loading: false, error: null });
    },
}));

