import { create } from 'zustand';
import { getCurrentUser } from '@/lib/api-teacher';

let profileFetchPromise: Promise<any> | null = null;
let lastFetchTime = 0;
const FETCH_CACHE_DURATION = 30000;

interface UserProfile {
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
    fetchProfile: () => Promise<void>;
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
                return data;
            } catch (err: any) {
                console.error("Failed to fetch user profile:", err);
                set({
                    error: err.message || "Failed to load profile",
                    loading: false,
                    user: null
                });
                throw err;
            } finally {
                profileFetchPromise = null;
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

