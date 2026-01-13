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
import { Button } from "@/components/ui/button";

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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-8 animate-in fade-in duration-500">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-foreground">Hello, {user?.first_name}!</h1>
                            <span className="bg-primary/10 text-primary text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest">Student Portal</span>
                        </div>
                        <p className="text-muted-foreground font-medium h-5">Welcome back to your academic performance tracker.</p>
                    </div>
                    {studentProfile && (
                        <div className="flex items-center gap-4 animate-in fade-in duration-500 delay-100">
                            <div className="bg-background border border-border rounded-2xl px-5 py-3 shadow-premium-sm flex items-center gap-3 hover:shadow-premium-md transition-shadow">
                                <School className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Your Section</p>
                                    <p className="text-sm font-black text-foreground">{typeof studentProfile.section === 'object' ? (studentProfile.section as any).section_name : "Assigned Section"}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 border-none shadow-premium-sm border border-border rounded-[2rem] overflow-hidden hover:shadow-premium-md transition-shadow">
                        <CardHeader className="p-8">
                            <CardTitle className="text-xl font-black">Latest Academic Analysis</CardTitle>
                            <CardDescription>View your detailed performance reports and predictions</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/50 border-t border-border/50">
                                {loading && (
                                    <div className="p-12 space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div key={`skeleton-${i}`} className="h-16 bg-muted/50 animate-shimmer rounded-2xl" />
                                        ))}
                                    </div>
                                )}

                                {!loading && docs.length === 0 && (
                                    <div className="p-16 text-center italic text-muted-foreground font-medium">
                                        No reports have been published for your section yet.
                                    </div>
                                )}

                                {!loading && docs.length > 0 && studentProfile && (
                                    <>
                                        {docs.slice(0, 5).map((doc) => (
                                            <Link
                                                key={doc.analysis_document_id}
                                                to={`/dashboard/student-analysis/${doc.analysis_document_id}/${studentProfile?.lrn}`}
                                                className="group flex items-center justify-between p-6 hover:bg-accent/50 transition-all border-b border-border/50 last:border-0"
                                            >
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-background border border-border rounded-2xl flex items-center justify-center shadow-premium-sm group-hover:shadow-premium-md group-hover:border-primary/30 transition-all hover:scale-110">
                                                        <FileText className="h-6 w-6 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-foreground group-hover:text-primary transition-colors uppercase tracking-tight text-sm">
                                                            {doc.analysis_doc_title}
                                                        </p>
                                                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-bold">
                                                            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {typeof doc.subject === 'object' ? doc.subject.subject_name : "Subject"}</span>
                                                            <span>•</span>
                                                            <span>Uploaded {new Date(doc.upload_date).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center group-hover:bg-primary group-hover:text-background transition-all hover:scale-110">
                                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-background" />
                                                </div>
                                            </Link>
                                        ))}

                                        {docs.length > 5 && (
                                            <div className="p-6 bg-accent/30 flex justify-center border-t border-border/50">
                                                <Link to="/dashboard/analysis">
                                                    <Button variant="ghost" className="text-primary font-black text-xs uppercase tracking-widest gap-2 hover:bg-primary/10 rounded-xl px-6 h-10 transition-all active:scale-95">
                                                        View More Archive <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="border-none shadow-premium-sm border border-border rounded-[2rem] overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-foreground">
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
