import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";

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
            last_name: "",
            password: "",
            confirmPassword: "",
            acc_type: "STUDENT", // Default to student
            lrn: "",
            section: "",
        },
        validationSchema: Yup.object({
            username: Yup.string().min(3, "Too short").required("Required"),
            email: Yup.string().email("Invalid email").required("Required"),
            first_name: Yup.string().required("Required"),
            last_name: Yup.string().required("Required"),
            password: Yup.string().min(6, "Password must be at least 6 characters").required("Required"),
            confirmPassword: Yup.string()
                .oneOf([Yup.ref("password")], "Passwords must match")
                .required("Required"),
            acc_type: Yup.string().required("Required"),
            lrn: Yup.string().when("acc_type", {
                is: "STUDENT",
                then: (schema) => schema.required("LRN is required for students").length(11, "LRN must be 11 digits"),
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
                    last_name: values.last_name,
                    password: values.password,
                    acc_type: values.acc_type,
                    lrn: values.acc_type === "STUDENT" ? values.lrn : null,
                    section: values.acc_type === "STUDENT" ? values.section : null,
                });

                // Registration successful
                navigate("/login", {
                    state: { message: "Registration successful! Please wait for administrator approval." }
                });
            } catch (err: any) {
                console.error("Registration failed", err);
                const data = err.response?.data;

                if (data) {
                    // Handle DRF validation error objects
                    if (typeof data === "object" && !Array.isArray(data)) {
                        if (data.detail) {
                            setError(data.detail);
                        } else if (data.message) {
                            setError(data.message);
                        } else {
                            // Extract first error from field errors
                            const fieldErrors = Object.entries(data).map(([field, msgs]) => {
                                const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace("_", " ");
                                const errorMsg = Array.isArray(msgs) ? msgs[0] : msgs;
                                return `${fieldName}: ${errorMsg}`;
                            });
                            setError(fieldErrors.join(" | "));

                            // Also optionally set formik field errors
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
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4 py-8">
            <Card className="w-full max-w-2xl shadow-xl border-t-4 border-t-indigo-600">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-2">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                            <UserPlus className="h-6 w-6" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-center">
                        Create an Account
                    </CardTitle>
                    <CardDescription className="text-center text-base">
                        Join the school community and start your journey
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={formik.handleSubmit} className="space-y-6">
                        {error && (
                            <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Account Role */}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="acc_type">I am a...</Label>
                                <Select
                                    onValueChange={(value) => formik.setFieldValue("acc_type", value)}
                                    defaultValue={formik.values.acc_type}
                                >
                                    <SelectTrigger id="acc_type" className="w-full">
                                        <SelectValue placeholder="Select your role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STUDENT">Student</SelectItem>
                                        <SelectItem value="TEACHER">Teacher</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Personal Info */}
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input
                                    id="first_name"
                                    placeholder="John"
                                    {...formik.getFieldProps("first_name")}
                                    className={formik.touched.first_name && formik.errors.first_name ? "border-red-500" : ""}
                                />
                                {formik.touched.first_name && formik.errors.first_name && (
                                    <p className="text-xs text-red-500">{formik.errors.first_name}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input
                                    id="last_name"
                                    placeholder="Doe"
                                    {...formik.getFieldProps("last_name")}
                                    className={formik.touched.last_name && formik.errors.last_name ? "border-red-500" : ""}
                                />
                                {formik.touched.last_name && formik.errors.last_name && (
                                    <p className="text-xs text-red-500">{formik.errors.last_name}</p>
                                )}
                            </div>

                            {/* Username & Email */}
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    placeholder="johndoe123"
                                    {...formik.getFieldProps("username")}
                                    className={formik.touched.username && formik.errors.username ? "border-red-500" : ""}
                                />
                                {formik.touched.username && formik.errors.username && (
                                    <p className="text-xs text-red-500">{formik.errors.username}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john@example.com"
                                    {...formik.getFieldProps("email")}
                                    className={formik.touched.email && formik.errors.email ? "border-red-500" : ""}
                                />
                                {formik.touched.email && formik.errors.email && (
                                    <p className="text-xs text-red-500">{formik.errors.email}</p>
                                )}
                            </div>

                            {/* Conditional Student Fields */}
                            {formik.values.acc_type === "STUDENT" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="lrn">LRN (11 digits)</Label>
                                        <Input
                                            id="lrn"
                                            placeholder="12345678901"
                                            {...formik.getFieldProps("lrn")}
                                            className={formik.touched.lrn && formik.errors.lrn ? "border-red-500" : ""}
                                        />
                                        {formik.touched.lrn && formik.errors.lrn && (
                                            <p className="text-xs text-red-500">{formik.errors.lrn}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="section">Section</Label>
                                        <Select
                                            onValueChange={(value) => formik.setFieldValue("section", value)}
                                        >
                                            <SelectTrigger id="section" className="w-full">
                                                <SelectValue placeholder="Select section" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sections.map((s) => (
                                                    <SelectItem key={s.section_id} value={s.section_id.toString()}>
                                                        {s.section_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {formik.touched.section && formik.errors.section && (
                                            <p className="text-xs text-red-500">{formik.errors.section}</p>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Passwords */}
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    {...formik.getFieldProps("password")}
                                    className={formik.touched.password && formik.errors.password ? "border-red-500" : ""}
                                />
                                {formik.touched.password && formik.errors.password && (
                                    <p className="text-xs text-red-500">{formik.errors.password}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    {...formik.getFieldProps("confirmPassword")}
                                    className={formik.touched.confirmPassword && formik.errors.confirmPassword ? "border-red-500" : ""}
                                />
                                {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                                    <p className="text-xs text-red-500">{formik.errors.confirmPassword}</p>
                                )}
                            </div>
                        </div>

                        <Button className="w-full h-11 text-base font-semibold" type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter>
                    <div className="text-center w-full text-sm text-slate-600">
                        Already have an account?{" "}
                        <Link
                            to="/login"
                            className="font-semibold text-indigo-600 hover:underline"
                        >
                            Sign in here
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
