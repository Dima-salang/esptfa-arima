import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import api from "@/lib/api";
import { AlertCircle, Loader2, Lock, User } from "lucide-react";

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const successMessage = location.state?.message;

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
                // Assuming SimpleJWT or standard DRF JWT endpoint at /api/token/ 
                // Or whatever the user sets up. For now, I'll hit /auth/login/ 
                // as per the earlier look at urls.py, but update for JWT.

                const response = await api.post("/login/", {
                    username: values.username,
                    password: values.password,
                });

                const token = response.data.access || response.data.token;
                if (token) {
                    localStorage.setItem("access", token);
                    if (response.data.refresh) {
                        localStorage.setItem("refresh", response.data.refresh);
                    }
                    navigate("/dashboard");
                } else {
                    // If standard LoginView was used, it might not return JSON token
                    // We'll need to check the backend. For now, assume JWT.
                    setError("Invalid server response. Token not found.");
                }
            } catch (err: any) {
                console.error("Login failed", err);
                setError("Invalid username or password.");
            } finally {
                setIsLoading(false);
            }
        },
    });

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
            <div className="w-full max-w-md space-y-4">
                {successMessage && (
                    <div className="p-4 text-sm bg-green-50 border border-green-200 text-green-700 rounded-lg shadow-sm">
                        {successMessage}
                    </div>
                )}

                <Card className="shadow-2xl border-none ring-1 ring-slate-200">
                    <CardHeader className="space-y-2 pb-8">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                                <Lock className="text-white h-8 w-8" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-extrabold tracking-tight text-center text-slate-900">
                            Welcome back
                        </CardTitle>
                        <CardDescription className="text-center text-slate-500 font-medium">
                            Enter your credentials to access your dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={formik.handleSubmit} className="space-y-5">
                            {error && (
                                <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-slate-700 font-semibold ml-1">Username</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="username"
                                        placeholder="Enter your username"
                                        className={`pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all duration-200 rounded-xl ${formik.touched.username && formik.errors.username ? "border-red-500 ring-red-500/20" : "focus:ring-indigo-500/20"
                                            }`}
                                        {...formik.getFieldProps("username")}
                                    />
                                </div>
                                {formik.touched.username && formik.errors.username && (
                                    <p className="text-xs text-red-500 font-medium ml-1">
                                        {formik.errors.username}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <Label htmlFor="password" title="password" className="text-slate-700 font-semibold">Password</Label>
                                    <Link
                                        to="/forgot-password"
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className={`pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all duration-200 rounded-xl ${formik.touched.password && formik.errors.password ? "border-red-500 ring-red-500/20" : "focus:ring-indigo-500/20"
                                            }`}
                                        {...formik.getFieldProps("password")}
                                    />
                                </div>
                                {formik.touched.password && formik.errors.password && (
                                    <p className="text-xs text-red-500 font-medium ml-1">
                                        {formik.errors.password}
                                    </p>
                                )}
                            </div>

                            <Button
                                className="w-full h-12 text-base font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 group relative overflow-hidden transition-all duration-300 active:scale-[0.98]"
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Sign in
                                    </span>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-6 pb-8">
                        <div className="relative w-full">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-3 text-slate-400 font-medium">
                                    New to the platform?
                                </span>
                            </div>
                        </div>

                        <Link
                            to="/register"
                            className="w-full"
                        >
                            <Button variant="outline" className="w-full h-11 rounded-xl border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 hover:text-slate-900 transition-all">
                                Create an account
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>

                <p className="text-center text-xs text-slate-400">
                    &copy; {new Date().getFullYear()} ESPTFA-ARIMA. All rights reserved.
                </p>
            </div>
        </div>
    );
}
