import { create } from 'zustand';
import { getTeacherProfile } from '@/lib/api-teacher';

interface TeacherProfile {
    teacher_id: number;
    user_id: {
        id: number;
        username: string;
        first_name: string;
        last_name: string;
        email: string;
        acc_type: string;
    };
    expertise?: string;
}

interface UserState {
    profile: TeacherProfile | null;
    loading: boolean;
    error: string | null;
    fetchProfile: () => Promise<void>;
    clearProfile: () => void;
}

export const useUserStore = create<UserState>((set) => ({
    profile: null,
    loading: false,
    error: null,

    fetchProfile: async () => {
        const token = localStorage.getItem("access");
        if (!token) {
            set({ profile: null, loading: false });
            return;
        }

        set({ loading: true, error: null });
        try {
            const data = await getTeacherProfile();
            set({ profile: data, loading: false });
        } catch (err: any) {
            console.error("Failed to fetch teacher profile:", err);
            set({
                error: err.message || "Failed to load profile",
                loading: false,
                profile: null
            });
        }
    },

    clearProfile: () => set({ profile: null, loading: false, error: null }),
}));
