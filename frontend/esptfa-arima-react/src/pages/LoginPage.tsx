import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { motion } from "framer-motion";
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
        <div className="flex min-h-screen bg-background overflow-hidden">
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-600 to-violet-700 items-center justify-center p-12 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, 45, 0],
                            opacity: [0.3, 0.5, 0.3],
                        }}
                        transition={{
                            duration: 15,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut"
                        }}
                        className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-indigo-400 rounded-full blur-[120px]"
                    />
                    <motion.div
                        animate={{
                            scale: [1, 1.3, 1],
                            rotate: [0, -30, 0],
                            opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                            duration: 18,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut",
                            delay: 2
                        }}
                        className="absolute bottom-[-20%] left-[-20%] w-[80%] h-[80%] bg-violet-500 rounded-full blur-[100px]"
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
                </div>

                <div className="relative z-10 max-w-lg text-center lg:text-left">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl mb-10 shadow-2xl"
                    >
                        <Lock className="text-white h-10 w-10" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-6xl font-black text-white leading-tight mb-8"
                    >
                        Unlock Your Academic <span className="text-indigo-200 inline-block relative">
                            Potential.
                            <motion.svg
                                viewBox="0 0 100 10"
                                className="absolute -bottom-2 left-0 w-full h-3 text-indigo-400/50"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1, delay: 1 }}
                            >
                                <motion.path
                                    d="M0 5 Q 50 10 100 5"
                                    fill="transparent"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                            </motion.svg>
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="text-xl text-indigo-100/90 mb-12 leading-relaxed font-medium"
                    >
                        Welcome to ESPTFA-ARIMA, the next-generation academic tracking and analysis platform.
                        Empowering students and educators with data-driven insights.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="space-y-5"
                    >
                        {FEATURES.map((feature, idx) => (
                            <motion.div
                                key={feature.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: 0.7 + idx * 0.1 }}
                                className="flex items-center gap-4 text-white/90 font-medium text-lg"
                            >
                                <div className="p-1.5 bg-indigo-400/30 rounded-full ring-1 ring-white/20">
                                    <CheckCircle2 className="h-5 w-5 text-indigo-100" />
                                </div>
                                {feature.text}
                            </motion.div>
                        ))}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 1.2 }}
                        className="mt-20 pt-10 border-t border-white/10 text-indigo-200/60 text-sm font-medium"
                    >
                        &copy; {new Date().getFullYear()} ESPTFA-ARIMA. Excellence in Education.
                    </motion.div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-muted/30 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                    <motion.div 
                        animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.1, 1] }}
                        transition={{ duration: 10, repeat: Infinity }}
                        className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" 
                    />
                    <motion.div 
                         animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.1, 1] }}
                         transition={{ duration: 12, repeat: Infinity, delay: 5 }}
                        className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/5 rounded-full blur-[100px]" 
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-md relative z-10 bg-background/60 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl"
                >
                    {successMessage && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl flex items-center gap-3"
                        >
                            <CheckCircle2 className="h-5 w-5" />
                            <p className="text-sm font-semibold leading-none">{successMessage}</p>
                        </motion.div>
                    )}

                    <div className="mb-10 text-center lg:hidden">
                        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-indigo-600 to-violet-500 rounded-2xl mb-6 shadow-lg">
                            <Lock className="text-white h-7 w-7" />
                        </div>
                        <h2 className="text-3xl font-black text-foreground mb-2">Welcome Back</h2>
                        <p className="text-muted-foreground font-medium">Sign in to your account to continue</p>
                    </div>

                    <div className="hidden lg:block mb-10">
                        <motion.h2 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="text-4xl font-black text-foreground mb-3"
                        >
                            Sign In
                        </motion.h2>
                        <motion.p 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="text-muted-foreground font-medium text-lg"
                        >
                            Enter your credentials below
                        </motion.p>
                    </div>

                    <form onSubmit={formik.handleSubmit} className="space-y-6">
                        <motion.div layout>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-3 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-2xl mb-6"
                                >
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <span className="font-semibold">{error}</span>
                                </motion.div>
                            )}
                        </motion.div>

                        <div className="space-y-2.5">
                            <Label htmlFor="username" className="text-foreground font-bold ml-1.5 flex items-center gap-2">
                                Username
                            </Label>
                            <div className="group relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <User className="h-5 w-5" />
                                </div>
                                <Input
                                    id="username"
                                    placeholder="your_username"
                                    className={`pl-11 h-14 bg-background/50 border-border focus:border-primary transition-all duration-300 rounded-2xl text-base shadow-sm group-focus-within:shadow-md group-focus-within:ring-4 group-focus-within:ring-primary/10 ${formik.touched.username && formik.errors.username ? "border-destructive ring-2 ring-destructive/10 focus:border-destructive" : ""
                                        }`}
                                    {...formik.getFieldProps("username")}
                                />
                            </div>
                            {formik.touched.username && formik.errors.username && (
                                <p className="text-sm text-destructive font-semibold ml-2">
                                    {formik.errors.username}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between ml-1.5 px-0.5">
                                <Label htmlFor="password" title="password" className="text-foreground font-bold flex items-center gap-2">
                                    Password
                                </Label>
                            </div>
                            <div className="group relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="•••••••••"
                                    className={`pl-11 h-14 bg-background/50 border-border focus:border-primary transition-all duration-300 rounded-2xl text-base shadow-sm group-focus-within:shadow-md group-focus-within:ring-4 group-focus-within:ring-primary/10 ${formik.touched.password && formik.errors.password ? "border-destructive ring-2 ring-destructive/10 focus:border-destructive" : ""
                                        }`}
                                    {...formik.getFieldProps("password")}
                                />
                            </div>
                            {formik.touched.password && formik.errors.password && (
                                <p className="text-sm text-destructive font-semibold ml-2">
                                    {formik.errors.password}
                                </p>
                            )}
                        </div>

                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                                className="w-full h-14 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group overflow-hidden relative"
                                type="submit"
                                disabled={isLoading}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
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
                        </motion.div>
                    </form>

                    <div className="mt-10 pt-10 border-t border-border/50 text-center">
                        <p className="text-muted-foreground font-semibold flex items-center justify-center gap-2">
                            New here?
                            <Link
                                to="/register"
                                className="text-primary hover:text-primary/80 font-black flex items-center gap-1 group transition-colors"
                            >
                                Create an account
                                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
