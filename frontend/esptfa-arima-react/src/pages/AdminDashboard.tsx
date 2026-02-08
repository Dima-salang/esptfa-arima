import { useEffect, useState } from "react";
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
    Database,
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
        { title: "Total Students", value: stats?.total_students || 0, icon: Users, color: "text-primary", bg: "bg-primary/10" },
        { title: "Active Teachers", value: stats?.total_teachers || 0, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
        { title: "Class Sections", value: stats?.total_sections || 0, icon: School, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/30" },
        { title: "Subjects", value: stats?.total_subjects || 0, icon: BookOpen, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/30" },
    ];

    return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-500">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">System Administration</h1>
                        <p className="text-muted-foreground font-medium italic">Global overview and resource management dashboard</p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <a href="http://localhost:8000/admin" target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="border-border text-muted-foreground hover:bg-accent shadow-premium-sm hover:shadow-premium-md rounded-2xl h-12 px-6 transition-all hover:scale-105">
                                <ShieldCheck className="mr-2 h-4 w-4" /> Django Admin
                            </Button>
                        </a>
                        <Link to="/dashboard/users">
                            <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 shadow-premium-sm hover:shadow-premium-md rounded-2xl h-12 px-6 transition-all hover:scale-105">
                                <Users className="mr-2 h-4 w-4" /> Manage Users
                            </Button>
                        </Link>
                        <Link to="/dashboard/import-students">
                            <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 shadow-premium-sm hover:shadow-premium-md rounded-2xl h-12 px-6 transition-all hover:scale-105">
                                <UserPlus className="mr-2 h-4 w-4" /> Import Students
                            </Button>
                        </Link>
                        <Link to="/dashboard/assignments">
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-premium-xl glow-indigo-strong rounded-2xl h-12 px-6 transition-all hover:scale-105 active:scale-[0.98]">
                                <LayoutGrid className="mr-2 h-4 w-4" /> Manage Assignments
                            </Button>
                        </Link>
                        <Link to="/dashboard/data-management">
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-premium-xl glow-emerald-strong rounded-2xl h-12 px-6 transition-all hover:scale-105 active:scale-[0.98]">
                                <Database className="mr-2 h-4 w-4" /> Manage School Data
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {loading ? (
                        ["s1", "s2", "s3", "s4"].map((id) => (
                            <div key={id} className="h-32 bg-muted/50 animate-shimmer rounded-2xl" />
                        ))
                    ) : (
                        statCards.map((stat) => (
                            <Card key={stat.title} className="border-none shadow-premium-sm hover:shadow-premium-lg border border-border rounded-2xl overflow-hidden transition-all hover:scale-105 group">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{stat.title}</p>
                                        <h3 className="text-3xl font-black text-foreground group-hover:text-primary transition-colors">{stat.value}</h3>
                                    </div>
                                    <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <stat.icon className="h-6 w-6" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                    <Card className="lg:col-span-2 border-none shadow-premium-sm border border-border rounded-[2rem] overflow-hidden hover:shadow-premium-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between p-8">
                            <div>
                                <CardTitle className="text-xl font-bold">Recent System-wide Analysis</CardTitle>
                                <CardDescription>Latest assessment documents across all sections</CardDescription>
                            </div>
                            <Link to="/dashboard/analysis">
                                <Button variant="ghost" className="text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/10 transition-colors">
                                    View Repository
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/50">
                                {loading && (
                                    <div className="p-8 text-center text-muted-foreground animate-shimmer rounded-lg">Loading documents...</div>
                                )}
                                {!loading && recentDocs.length === 0 && (
                                    <div className="p-12 text-center italic text-muted-foreground font-medium">No analysis documents found in the system.</div>
                                )}
                                {!loading && recentDocs.length > 0 && recentDocs.map((doc) => (
                                    <Link
                                        key={doc.analysis_document_id}
                                        to={`/dashboard/analysis/${doc.analysis_document_id}`}
                                        className="group flex items-center justify-between p-6 hover:bg-accent/50 transition-all border-b border-border/50 last:border-0"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-background border border-border rounded-2xl flex items-center justify-center shadow-premium-sm group-hover:shadow-premium-md group-hover:scale-110 group-hover:border-primary/30 transition-all">
                                                <FileText className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight text-sm">
                                                    {doc.analysis_doc_title}
                                                </p>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground font-bold">
                                                    <span>{typeof doc.subject === 'object' ? doc.subject.subject_name : "Subject ID: " + doc.subject}</span>
                                                    <span>•</span>
                                                    <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                                                </div>

                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center group-hover:bg-primary group-hover:text-background transition-all">
                                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-background" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
    );
}
