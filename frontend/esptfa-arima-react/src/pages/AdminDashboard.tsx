import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getSystemStats } from "@/lib/api-admin";
import { getAnalysisDocuments } from "@/lib/api-teacher";
import type { AnalysisDocument } from "@/lib/api-teacher";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Users,
    School,
    BookOpen,
    FileText,
    TrendingUp,
    ChevronRight,
    LayoutGrid,
    UserPlus,
    ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface SystemStats {
    total_students: number;
    total_teachers: number;
    total_sections: number;
    total_subjects: number;
    total_documents: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [recentDocs, setRecentDocs] = useState<AnalysisDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const [statsData, docsData] = await Promise.all([
                    getSystemStats(),
                    getAnalysisDocuments()
                ]);
                setStats(statsData);
                setRecentDocs(Array.isArray(docsData) ? docsData.slice(0, 5) : (docsData.results?.slice(0, 5) || []));
            } catch (error) {
                console.error("Error fetching admin dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, []);

    const statCards = [
        { title: "Total Students", value: stats?.total_students || 0, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
        { title: "Active Teachers", value: stats?.total_teachers || 0, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
        { title: "Class Sections", value: stats?.total_sections || 0, icon: School, color: "text-amber-600", bg: "bg-amber-50" },
        { title: "Subjects", value: stats?.total_subjects || 0, icon: BookOpen, color: "text-violet-600", bg: "bg-violet-50" },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">System Administration</h1>
                        <p className="text-slate-500 font-medium italic">Global overview and resource management dashboard</p>
                    </div>
                    <div className="flex gap-3">
                        <a href="http://localhost:8000/admin" target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm rounded-2xl h-12 px-6">
                                <ShieldCheck className="mr-2 h-4 w-4" /> Django Admin
                            </Button>
                        </a>
                        <Link to="/dashboard/import-students">
                            <Button variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 shadow-sm rounded-2xl h-12 px-6">
                                <UserPlus className="mr-2 h-4 w-4" /> Import Students
                            </Button>
                        </Link>
                        <Link to="/dashboard/assignments">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 rounded-2xl h-12 px-6">
                                <LayoutGrid className="mr-2 h-4 w-4" /> Manage Assignments
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {loading ? (
                        ["s1", "s2", "s3", "s4"].map((id) => (
                            <div key={id} className="h-32 bg-slate-100 animate-pulse rounded-3xl" />
                        ))
                    ) : (
                        statCards.map((stat) => (
                            <Card key={stat.title} className="border-none shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.title}</p>
                                        <h3 className="text-3xl font-black text-slate-900">{stat.value}</h3>
                                    </div>
                                    <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
                                        <stat.icon className="h-6 w-6" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Documents */}
                    <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-slate-200 rounded-[2rem] overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between p-8">
                            <div>
                                <CardTitle className="text-xl font-bold">Recent System-wide Analysis</CardTitle>
                                <CardDescription>Latest assessment documents across all sections</CardDescription>
                            </div>
                            <Link to="/dashboard/analysis">
                                <Button variant="ghost" className="text-indigo-600 font-black text-xs uppercase tracking-widest">
                                    View Repository
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-50">
                                {loading && (
                                    <div className="p-8 text-center text-slate-400">Loading documents...</div>
                                )}
                                {!loading && recentDocs.length === 0 && (
                                    <div className="p-12 text-center italic text-slate-400 font-medium">No analysis documents found in the system.</div>
                                )}
                                {!loading && recentDocs.length > 0 && recentDocs.map((doc) => (
                                    <Link
                                        key={doc.analysis_document_id}
                                        to={`/dashboard/analysis/${doc.analysis_document_id}`}
                                        className="group flex items-center justify-between p-6 hover:bg-slate-50 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white ring-1 ring-slate-200 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                                                <FileText className="h-6 w-6 text-indigo-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-sm">
                                                    {doc.analysis_doc_title}
                                                </p>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 font-bold">
                                                    <span>{typeof doc.subject === 'object' ? doc.subject.subject_name : "Subject ID: " + doc.subject}</span>
                                                    <span>•</span>
                                                    <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                                                </div>

                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </DashboardLayout>
    );
}
