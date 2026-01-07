import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import {
    AlertCircle,
    Loader2,
    Lock,
    User,
    CheckCircle2,
    ArrowRight
} from "lucide-react";
import { useUserStore } from "@/store/useUserStore";

const FEATURES = [
    { id: "analytics", text: "Advanced Student Progress Analytics" },
    { id: "management", text: "Seamless Assessment Management" },
    { id: "insights", text: "Data-Driven Performance Insights" }
];

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const successMessage = location.state?.message;
    const fetchProfile = useUserStore((state) => state.fetchProfile);

    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const formik = useFormik({
        initialValues: {
            username: "",
            password: "",
        },
        validationSchema: Yup.object({
            username: Yup.string().required("Username is required"),
            password: Yup.string().required("Password is required"),
        }),
        onSubmit: async (values) => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await api.post("/login/", {
                    username: values.username,
                    password: values.password,
                });

                if (response.status === 200) {
                    await fetchProfile();
                    navigate("/dashboard");
                } else {
                    setError("Invalid server response.");
                }
            } catch (err: any) {
                console.error("Login failed", err);
                if (err.response?.data?.detail) {
                    setError(err.response.data.detail);
                } else if (err.response?.status === 403) {
                    setError("Access denied. Possibly a security/CORS issue.");
                } else {
                    setError("Invalid username or password.");
                }
            } finally {
                setIsLoading(false);
            }
        },
    });

    return (
        <div className="flex min-h-screen bg-white dark:bg-slate-950 overflow-hidden">
            {/* Left Side: Visual/Branding Section */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-indigo-600 items-center justify-center p-12 overflow-hidden">
                {/* Abstract background elements */}
                <div className="absolute top-0 left-0 w-full h-full">
                    <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500 rounded-full blur-[120px] opacity-50 animate-pulse" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-1/2 h-1/2 bg-violet-600 rounded-full blur-[100px] opacity-40 animate-pulse delay-700" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-400/20 via-transparent to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-lg text-center lg:text-left">
                    <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl mb-8 transform hover:scale-105 transition-transform duration-300">
                        <Lock className="text-white h-8 w-8" />
                    </div>
                    <h1 className="text-5xl font-black text-white leading-tight mb-6">
                        Unlock Your Academic <span className="text-indigo-200">Potential.</span>
                    </h1>
                    <p className="text-xl text-indigo-100/80 mb-10 leading-relaxed font-medium">
                        Welcome to ESPTFA-ARIMA, the next-generation academic tracking and analysis platform.
                        Empowering students and educators with data-driven insights.
                    </p>

                    <div className="space-y-4">
                        {FEATURES.map((feature) => (
                            <div key={feature.id} className="flex items-center gap-3 text-white/90 font-medium">
                                <div className="p-1 bg-indigo-400/30 rounded-full">
                                    <CheckCircle2 className="h-4 w-4 text-indigo-200" />
                                </div>
                                {feature.text}
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 pt-10 border-t border-white/10 text-indigo-200/60 text-sm">
                        &copy; {new Date().getFullYear()} ESPTFA-ARIMA. Excellence in Education.
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
                {/* Background Decorations (matching Register page) */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[100px]" />
                </div>

                <div className="w-full max-w-md relative z-10">
                    {successMessage && (
                        <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            <p className="text-sm font-semibold leading-none">{successMessage}</p>
                        </div>
                    )}

                    <div className="mb-10 text-center lg:text-left lg:hidden">
                        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl mb-6 shadow-xl shadow-indigo-600/20">
                            <Lock className="text-white h-7 w-7" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Sign in to your account to continue</p>
                    </div>

                    <div className="hidden lg:block mb-10">
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-3">Sign In</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Enter your credentials below</p>
                    </div>

                    <form onSubmit={formik.handleSubmit} className="space-y-6">
                        {error && (
                            <div className="flex items-center gap-3 p-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <span className="font-semibold">{error}</span>
                            </div>
                        )}

                        <div className="space-y-2.5">
                            <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 font-bold ml-1.5 flex items-center gap-2">
                                Username
                            </Label>
                            <div className="group relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <User className="h-5 w-5" />
                                </div>
                                <Input
                                    id="username"
                                    placeholder="your_username"
                                    className={`pl-11 h-13 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all duration-300 rounded-2xl text-base shadow-sm group-focus-within:shadow-indigo-600/5 group-focus-within:ring-4 group-focus-within:ring-indigo-600/5 ${formik.touched.username && formik.errors.username ? "border-rose-500 ring-4 ring-rose-500/10 focus:border-rose-500" : ""
                                        }`}
                                    {...formik.getFieldProps("username")}
                                />
                            </div>
                            {formik.touched.username && formik.errors.username && (
                                <p className="text-sm text-rose-500 font-semibold ml-2">
                                    {formik.errors.username}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between ml-1.5 px-0.5">
                                <Label htmlFor="password" title="password" className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-2">
                                    Password
                                </Label>
                            </div>
                            <div className="group relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className={`pl-11 h-13 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all duration-300 rounded-2xl text-base shadow-sm group-focus-within:shadow-indigo-600/5 group-focus-within:ring-4 group-focus-within:ring-indigo-600/5 ${formik.touched.password && formik.errors.password ? "border-rose-500 ring-4 ring-rose-500/10 focus:border-rose-500" : ""
                                        }`}
                                    {...formik.getFieldProps("password")}
                                />
                            </div>
                            {formik.touched.password && formik.errors.password && (
                                <p className="text-sm text-rose-500 font-semibold ml-2">
                                    {formik.errors.password}
                                </p>
                            )}
                        </div>

                        <Button
                            className="w-full h-14 text-lg font-black rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group overflow-hidden relative"
                            type="submit"
                            disabled={isLoading}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-10 pt-10 border-t border-slate-200 dark:border-slate-800 text-center">
                        <p className="text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-center gap-2">
                            New here?
                            <Link
                                to="/register"
                                className="text-indigo-600 hover:text-indigo-500 font-black flex items-center gap-1 group transition-colors"
                            >
                                Create an account
                                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
