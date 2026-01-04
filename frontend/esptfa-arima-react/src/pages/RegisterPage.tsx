import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import {
    AlertCircle,
    Loader2,
    UserPlus,
    User,
    Mail,
    Lock,
    GraduationCap,
    School,
    ArrowRight,
    ChevronLeft,
    CheckCircle2
} from "lucide-react";

interface Section {
    section_id: number;
    section_name: string;
}

export default function RegisterPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sections, setSections] = useState<Section[]>([]);

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const response = await api.get("/section/");
                // Handle both paginated and non-paginated responses
                if (response.data && Array.isArray(response.data)) {
                    setSections(response.data);
                } else if (response.data && Array.isArray(response.data.results)) {
                    setSections(response.data.results);
                } else {
                    console.error("Unexpected section data format:", response.data);
                    setSections([]);
                }
            } catch (err) {
                console.error("Failed to fetch sections", err);
            }
        };
        fetchSections();
    }, []);

    const formik = useFormik({
        initialValues: {
            username: "",
            email: "",
            first_name: "",
            middle_name: "",
            last_name: "",
            password: "",
            confirmPassword: "",
            acc_type: "STUDENT",
            lrn: "",
            section: "",
        },
        validationSchema: Yup.object({
            username: Yup.string().min(3, "Too short").required("Username is required"),
            email: Yup.string().email("Invalid email").required("Email is required"),
            first_name: Yup.string().required("First name is required"),
            middle_name: Yup.string().optional(),
            last_name: Yup.string().required("Last name is required"),
            password: Yup.string().min(8, "Password must be at least 8 characters").required("Password is required"),
            confirmPassword: Yup.string()
                .oneOf([Yup.ref("password")], "Passwords must match")
                .required("Please confirm your password"),
            acc_type: Yup.string().required("Account type is required"),
            lrn: Yup.string().when("acc_type", {
                is: "STUDENT",
                then: (schema) => schema.required("LRN is required for students").length(11, "LRN must be exactly 11 digits"),
                otherwise: (schema) => schema.notRequired(),
            }),
            section: Yup.string().when("acc_type", {
                is: "STUDENT",
                then: (schema) => schema.required("Section is required for students"),
                otherwise: (schema) => schema.notRequired(),
            }),
        }),
        onSubmit: async (values) => {
            setIsLoading(true);
            setError(null);
            try {
                await api.post("/register/", {
                    username: values.username,
                    email: values.email,
                    first_name: values.first_name,
                    middle_name: values.middle_name,
                    last_name: values.last_name,
                    password: values.password,
                    acc_type: values.acc_type,
                    lrn: values.acc_type === "STUDENT" ? values.lrn : null,
                    section: values.acc_type === "STUDENT" ? values.section : null,
                });

                navigate("/login", {
                    state: { message: "Registration successful! Please wait for administrator approval." }
                });
            } catch (err: any) {
                console.error("Registration failed", err);
                const data = err.response?.data;

                if (data) {
                    if (typeof data === "object" && !Array.isArray(data)) {
                        if (data.detail) {
                            setError(data.detail);
                        } else if (data.message) {
                            setError(data.message);
                        } else {
                            const fieldErrors = Object.entries(data).map(([field, msgs]) => {
                                if (field === "non_field_errors") return Array.isArray(msgs) ? msgs.join(" ") : msgs;
                                if (field === "detail") return msgs;
                                const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace("_", " ");
                                const errorMsg = Array.isArray(msgs) ? msgs[0] : msgs;
                                return `${fieldName}: ${errorMsg}`;
                            });
                            setError(fieldErrors.join(" | "));

                            const errors: any = {};
                            Object.entries(data).forEach(([key, value]) => {
                                if (Array.isArray(value)) {
                                    errors[key] = value[0];
                                } else {
                                    errors[key] = value;
                                }
                            });
                            formik.setErrors(errors);
                        }
                    } else {
                        setError("Registration failed. Please check your details.");
                    }
                } else {
                    setError("Network error or server is unreachable. Please try again.");
                }
            } finally {
                setIsLoading(false);
            }
        },
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 py-12 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-3xl relative z-10">
                <div className="mb-8 flex items-center justify-between">
                    <Link
                        to="/login"
                        className="group flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold"
                    >
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group-hover:border-indigo-600/30 group-hover:shadow-lg group-hover:shadow-indigo-600/5 transition-all">
                            <ChevronLeft className="h-5 w-5" />
                        </div>
                        Back to Login
                    </Link>
                    <div className="hidden sm:block">
                        <span className="text-slate-400 font-medium text-sm">Join the platform</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden border border-slate-200/50 dark:border-slate-800/50">
                    <div className="p-8 md:p-12">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                            <div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-black mb-4 tracking-wider uppercase">
                                    <UserPlus className="h-4 w-4" />
                                    Get Started
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Create Account
                                </h1>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs transition-all">
                                Fill in your details to begin your journey with ESPTFA-ARIMA.
                            </p>
                        </div>

                        <form onSubmit={formik.handleSubmit} className="space-y-10">
                            {error && (
                                <div className="flex items-center gap-3 p-5 text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <span className="font-semibold">{error}</span>
                                </div>
                            )}

                            {/* Section 1: Role Selection */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 ml-1">
                                    <div className="h-8 w-1 bg-indigo-600 rounded-full" />
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Account Type</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        { id: "STUDENT", label: "Student", icon: GraduationCap, desc: "Access your grades and track progress" },
                                        { id: "TEACHER", label: "Teacher", icon: School, desc: "Manage assessments and analyze data" }
                                    ].map((role) => (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => formik.setFieldValue("acc_type", role.id)}
                                            className={`relative flex flex-col items-start p-6 rounded-[2rem] border-2 transition-all duration-300 text-left group ${formik.values.acc_type === role.id
                                                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-xl shadow-indigo-600/10"
                                                : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                                                }`}
                                        >
                                            <div className={`p-3 rounded-2xl mb-4 transition-colors ${formik.values.acc_type === role.id
                                                ? "bg-indigo-600 text-white"
                                                : "bg-white dark:bg-slate-900 text-slate-400 group-hover:text-slate-600"
                                                }`}>
                                                <role.icon className="h-6 w-6" />
                                            </div>
                                            <span className={`text-lg font-black mb-1 ${formik.values.acc_type === role.id ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>
                                                {role.label}
                                            </span>
                                            <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                                {role.desc}
                                            </p>
                                            {formik.values.acc_type === role.id && (
                                                <div className="absolute top-6 right-6 text-indigo-600 animate-in zoom-in-50 duration-300">
                                                    <CheckCircle2 className="h-6 w-6 fill-indigo-600 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section 2: Personal Information */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 ml-1">
                                    <div className="h-8 w-1 bg-indigo-600 rounded-full" />
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Personal Information</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2.5">
                                        <Label htmlFor="first_name" className="text-slate-700 dark:text-slate-300 font-bold ml-1 flex items-center gap-2">
                                            First Name
                                        </Label>
                                        <Input
                                            id="first_name"
                                            placeholder="John"
                                            className={`h-12 bg-slate-50 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 rounded-2xl transition-all ${formik.touched.first_name && formik.errors.first_name ? "border-rose-500 ring-4 ring-rose-500/10" : ""}`}
                                            {...formik.getFieldProps("first_name")}
                                        />
                                        {formik.touched.first_name && formik.errors.first_name && (
                                            <p className="text-xs text-rose-500 font-bold ml-2">{formik.errors.first_name}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between ml-1">
                                            <Label htmlFor="middle_name" className="text-slate-700 dark:text-slate-300 font-bold">Middle</Label>
                                            <span className="text-[10px] uppercase font-black text-slate-400 tracking-tighter bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">Optional</span>
                                        </div>
                                        <Input
                                            id="middle_name"
                                            placeholder="Quincy"
                                            className="h-12 bg-slate-50 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 rounded-2xl transition-all"
                                            {...formik.getFieldProps("middle_name")}
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label htmlFor="last_name" className="text-slate-700 dark:text-slate-300 font-bold ml-1">Last Name</Label>
                                        <Input
                                            id="last_name"
                                            placeholder="Doe"
                                            className={`h-12 bg-slate-50 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 rounded-2xl transition-all ${formik.touched.last_name && formik.errors.last_name ? "border-rose-500 ring-4 ring-rose-500/10" : ""}`}
                                            {...formik.getFieldProps("last_name")}
                                        />
                                        {formik.touched.last_name && formik.errors.last_name && (
                                            <p className="text-xs text-rose-500 font-bold ml-2">{formik.errors.last_name}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Account Security */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 ml-1">
                                    <div className="h-8 w-1 bg-indigo-600 rounded-full" />
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Account Credentials</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2.5">
                                        <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 font-bold ml-1 flex items-center gap-2">
                                            <User className="h-4 w-4" /> Username
                                        </Label>
                                        <Input
                                            id="username"
                                            placeholder="johndoe123"
                                            className={`h-12 bg-slate-50 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 rounded-2xl transition-all ${formik.touched.username && formik.errors.username ? "border-rose-500 ring-4 ring-rose-500/10" : ""}`}
                                            {...formik.getFieldProps("username")}
                                        />
                                        {formik.touched.username && formik.errors.username && (
                                            <p className="text-xs text-rose-500 font-bold ml-2">{formik.errors.username}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-bold ml-1 flex items-center gap-2">
                                            <Mail className="h-4 w-4" /> Email address
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="john@example.com"
                                            className={`h-12 bg-slate-50 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 rounded-2xl transition-all ${formik.touched.email && formik.errors.email ? "border-rose-500 ring-4 ring-rose-500/10" : ""}`}
                                            {...formik.getFieldProps("email")}
                                        />
                                        {formik.touched.email && formik.errors.email && (
                                            <p className="text-xs text-rose-500 font-bold ml-2">{formik.errors.email}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label htmlFor="password" title="password" className="text-slate-700 dark:text-slate-300 font-bold ml-1 flex items-center gap-2">
                                            <Lock className="h-4 w-4" /> Password
                                        </Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            className={`h-12 bg-slate-50 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 rounded-2xl transition-all ${formik.touched.password && formik.errors.password ? "border-rose-500 ring-4 ring-rose-500/10" : ""}`}
                                            {...formik.getFieldProps("password")}
                                        />
                                        {formik.touched.password && formik.errors.password && (
                                            <p className="text-xs text-rose-500 font-bold ml-2">{formik.errors.password}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label htmlFor="confirmPassword" title="confirmPassword" className="text-slate-700 dark:text-slate-300 font-bold ml-1">
                                            Confirm Password
                                        </Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            className={`h-12 bg-slate-50 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 rounded-2xl transition-all ${formik.touched.confirmPassword && formik.errors.confirmPassword ? "border-rose-500 ring-4 ring-rose-500/10" : ""}`}
                                            {...formik.getFieldProps("confirmPassword")}
                                        />
                                        {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                                            <p className="text-xs text-rose-500 font-bold ml-2">{formik.errors.confirmPassword}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Academic Information (Student Only) */}
                            {formik.values.acc_type === "STUDENT" && (
                                <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
                                    <div className="flex items-center gap-3 ml-1">
                                        <div className="h-8 w-1 bg-indigo-600 rounded-full" />
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Academic Details</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2.5">
                                            <Label htmlFor="lrn" className="text-slate-700 dark:text-slate-300 font-bold ml-1">LRN (11 digits)</Label>
                                            <Input
                                                id="lrn"
                                                placeholder="12345678901"
                                                className={`h-12 bg-slate-50 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 rounded-2xl transition-all ${formik.touched.lrn && formik.errors.lrn ? "border-rose-500 ring-4 ring-rose-500/10" : ""}`}
                                                {...formik.getFieldProps("lrn")}
                                            />
                                            {formik.touched.lrn && formik.errors.lrn && (
                                                <p className="text-xs text-rose-500 font-bold ml-2">{formik.errors.lrn}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label htmlFor="section" className="text-slate-700 dark:text-slate-300 font-bold ml-1">Section</Label>
                                            <Select
                                                onValueChange={(value) => formik.setFieldValue("section", value)}
                                            >
                                                <SelectTrigger id="section" className={`h-12 bg-slate-50 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 rounded-2xl transition-all ${formik.touched.section && formik.errors.section ? "border-rose-500 ring-4 ring-rose-500/10" : ""}`}>
                                                    <SelectValue placeholder="Choose your section" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800">
                                                    {sections.map((s) => (
                                                        <SelectItem key={s.section_id} value={s.section_id.toString()} className="rounded-xl my-1">
                                                            {s.section_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {formik.touched.section && formik.errors.section && (
                                                <p className="text-xs text-rose-500 font-bold ml-2">{formik.errors.section}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-6">
                                <Button
                                    className="w-full h-16 text-xl font-black rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
                                    type="submit"
                                    disabled={isLoading}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-7 w-7 animate-spin" />
                                            <span>Creating Account...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Complete Registration</span>
                                            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </Button>
                                <p className="mt-8 text-center text-slate-400 font-medium">
                                    By creating an account, you agree to our{" "}
                                    <Link to="/terms" className="text-indigo-600 underline underline-offset-4 font-bold">Terms of Service</Link>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="mt-12 text-center text-slate-400 font-semibold text-sm">
                    &copy; {new Date().getFullYear()} ESPTFA-ARIMA Academic Analysis. Excellence Driven.
                </div>
            </div>
        </div>
    );
}
