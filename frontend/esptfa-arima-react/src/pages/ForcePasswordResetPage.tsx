import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forcePasswordReset, logoutUser } from "@/lib/api-teacher";
import { useUserStore } from "@/store/useUserStore";
import { LogOut, ShieldAlert, KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ForcePasswordResetPage() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { fetchProfile } = useUserStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        // We can just use the store logout or clear tokens and redirect to login
        await logoutUser();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await forcePasswordReset(newPassword);
            toast.success("Password updated successfully.");
            await fetchProfile(); // Refresh the user profile to clear requires_password_change
            navigate("/dashboard");
        } catch (err: any) {
            console.error("Password reset error:", err);
            setError(err.response?.data?.detail || "Failed to update password. Please try again.");
            toast.error("An error occurred during password reset.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center bg-slate-50 overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Background Decorations */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-rose-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob" />
                <div className="absolute top-0 left-0 -mt-20 -ml-20 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-4000" />
            </div>

            <div className="z-10 w-full max-w-md px-6">
                <Card className="border-none shadow-premium-xl rounded-[2.5rem] bg-white/80 backdrop-blur-xl ring-1 ring-white/50 overflow-hidden relative">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-indigo-500 to-indigo-600" />
                    <CardHeader className="p-10 pb-6 text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center ring-1 ring-rose-100 shadow-inner">
                            <ShieldAlert className="h-8 w-8 text-rose-500" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">Security Notice</CardTitle>
                            <CardDescription className="font-bold text-slate-500 text-sm mt-3 leading-relaxed">
                                For your security, you must change your auto-generated initial password before accessing your dashboard.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 pt-0 space-y-6">
                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-rose-50 rounded-2xl text-rose-800 border border-rose-100 animate-in zoom-in-95 duration-300">
                                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                <p className="text-sm font-bold leading-relaxed">{error}</p>
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2 relative group">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 transition-colors group-focus-within:text-indigo-600">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <KeyRound className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <Input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            className="pl-12 h-14 bg-white border-slate-200/60 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 font-bold text-slate-900 shadow-sm transition-all focus:bg-white text-base"
                                            placeholder="Enter new password"
                                        />
                                    </div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 pl-1 tracking-wider">
                                        Must be at least 8 characters
                                    </p>
                                </div>
                                <div className="space-y-2 relative group">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 transition-colors group-focus-within:text-indigo-600">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <CheckCircle2 className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <Input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="pl-12 h-14 bg-white border-slate-200/60 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 font-bold text-slate-900 shadow-sm transition-all focus:bg-white text-base"
                                            placeholder="Confirm new password"
                                        />
                                    </div>
                                </div>
                            </div>
                            <Button
                                type="submit"
                                disabled={loading || !newPassword || !confirmPassword}
                                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Secure Account & Continue"}
                            </Button>
                        </form>
                        
                        <div className="pt-4 border-t border-slate-100 text-center">
                            <Button 
                                variant="ghost" 
                                onClick={handleLogout}
                                className="text-slate-500 font-bold hover:text-slate-900 rounded-xl"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
