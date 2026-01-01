import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getAnalysisDocuments, getStudentProfile } from "@/lib/api-teacher";
import type { AnalysisDocument, Student } from "@/lib/api-teacher";
import { useUserStore } from "@/store/useUserStore";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    BookOpen,
    FileText,
    ChevronRight,
    GraduationCap,
    School,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function StudentDashboard() {
    const { user } = useUserStore();
    const [docs, setDocs] = useState<AnalysisDocument[]>([]);
    const [studentProfile, setStudentProfile] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudentData = async () => {
            try {
                const [docsData, profileData] = await Promise.all([
                    getAnalysisDocuments(),
                    getStudentProfile()
                ]);
                setDocs(Array.isArray(docsData) ? docsData : (docsData.results || []));
                setStudentProfile(profileData);
            } catch (error) {
                console.error("Error fetching student dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudentData();
    }, []);

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-slate-900">Hello, {user?.first_name}!</h1>
                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest">Student Portal</span>
                        </div>
                        <p className="text-slate-500 font-medium h-5">Welcome back to your academic performance tracker.</p>
                    </div>
                    {studentProfile && (
                        <div className="flex items-center gap-4">
                            <div className="bg-white ring-1 ring-slate-200 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-3">
                                <School className="h-5 w-5 text-indigo-600" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Your Section</p>
                                    <p className="text-sm font-black text-slate-800">{typeof studentProfile.section === 'object' ? (studentProfile.section as any).section_name : "Assigned Section"}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Analysis Documents for Student */}
                    <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-slate-200 rounded-[2rem] overflow-hidden">
                        <CardHeader className="p-8">
                            <CardTitle className="text-xl font-black">Latest Academic Analysis</CardTitle>
                            <CardDescription>View your detailed performance reports and predictions</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-50 border-t border-slate-50">
                                {loading ? (
                                    <div className="p-12 space-y-4">
                                        {new Array(3).fill(0).map((_, i) => (
                                            <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-2xl" />
                                        ))}
                                    </div>
                                ) : docs.length === 0 ? (
                                    <div className="p-16 text-center italic text-slate-400 font-medium">
                                        No reports have been published for your section yet.
                                    </div>
                                ) : (
                                    docs.map((doc) => (
                                        <Link
                                            key={doc.analysis_document_id}
                                            to={`/dashboard/student-analysis/${doc.analysis_document_id}/${studentProfile?.lrn}`}
                                            className="group flex items-center justify-between p-6 hover:bg-indigo-50/30 transition-all"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-white ring-1 ring-slate-200 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:ring-indigo-100 transition-all">
                                                    <FileText className="h-6 w-6 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-sm">
                                                        {doc.analysis_doc_title}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-bold">
                                                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {typeof doc.subject === 'object' ? doc.subject.subject_name : "Subject"}</span>
                                                        <span>•</span>
                                                        <span>Uploaded {new Date(doc.upload_date).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 transition-all">
                                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-white" />
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sidebar components */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-[2rem] overflow-hidden bg-slate-900 text-white">
                            <CardHeader className="p-8">
                                <GraduationCap className="h-8 w-8 text-indigo-400 mb-4" />
                                <CardTitle className="text-xl font-black">Performance Tracker</CardTitle>
                                <CardDescription className="text-slate-400">Track your progress throughout the quarter</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-0">
                                <p className="text-xs leading-relaxed text-slate-300 font-medium">
                                    Our ARIMA-powered analysis helps you understand your learning patterns and predict future outcomes. Use these reports to focus your study time effectively.
                                </p>
                                <Separator className="my-6 bg-white/10" />
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">LRN Number</span>
                                        <span className="font-black tracking-tighter">{studentProfile?.lrn || "Not Assigned"}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

const Separator = ({ className }: { className?: string }) => <div className={`h-px w-full ${className}`} />;
