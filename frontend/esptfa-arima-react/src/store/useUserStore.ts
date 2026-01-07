import { create } from 'zustand';
import { getCurrentUser } from '@/lib/api-teacher';

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
        set({ loading: true, error: null });
        try {
            const data = await getCurrentUser();
            set({ user: data, loading: false });
        } catch (err: any) {
            console.error("Failed to fetch user profile:", err);
            set({
                error: err.message || "Failed to load profile",
                loading: false,
                user: null
            });
        }
    },

    clearProfile: () => set({ user: null, loading: false, error: null }),
}));

