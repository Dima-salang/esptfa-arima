import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
    getAnalysisDocuments,
    getTestDrafts,
} from "@/lib/api-teacher";
import type {
    AnalysisDocument,
    TestDraft
} from "@/lib/api-teacher";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    FileText,
    ClipboardList,
    Users,
    TrendingUp,
    MoreHorizontal,
    Plus,
    Calendar,
    ArrowUpRight,
    ChevronRight,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TeacherDashboard() {
    const [documents, setDocuments] = useState<AnalysisDocument[]>([]);
    const [drafts, setDrafts] = useState<TestDraft[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const docsData = await getAnalysisDocuments();
                const draftsData = await getTestDrafts();
                setDocuments(docsData);
                setDrafts(draftsData);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const stats = [
        {
            title: "Total Analysis",
            value: documents.length.toString(),
            description: "Uploaded documents",
            icon: FileText,
            color: "text-blue-600",
            bg: "bg-blue-50",
            id: "total-analysis"
        },
        {
            title: "Active Drafts",
            value: drafts.length.toString(),
            description: "Currently in progress",
            icon: ClipboardList,
            color: "text-amber-600",
            bg: "bg-amber-50",
            id: "active-drafts"
        },
        {
            title: "Total Students",
            value: "156", // Mock for now
            description: "Across all sections",
            icon: Users,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            id: "total-students"
        },
        {
            title: "Avg. Performance",
            value: "84%", // Mock for now
            description: "+2.5% from last month",
            icon: TrendingUp,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            id: "avg-performance"
        },
    ];

    const getStatusBadge = (status: boolean) => {
        if (status) {
            return (
                <Badge className="px-3 py-1 rounded-full border-none shadow-none font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    Processed
                </Badge>
            );
        }
        return (
            <Badge className="px-3 py-1 rounded-full border-none shadow-none font-bold bg-blue-100 text-blue-700 hover:bg-blue-100">
                Processing
            </Badge>
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Dashboard Overview
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Welcome back, here's what's happening with your class today.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 rounded-xl h-11 px-6">
                            <Plus className="mr-2 h-4 w-4" /> New Assessment
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <Card key={stat.id} className="border-none shadow-sm ring-1 ring-slate-200 hover:shadow-md transition-shadow rounded-2xl overflow-hidden group">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                                    {stat.title}
                                </CardTitle>
                                <div className={`${stat.bg} ${stat.color} p-2.5 rounded-xl group-hover:scale-110 transition-transform`}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-slate-900">{stat.value}</div>
                                <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
                                    {stat.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-8 lg:grid-cols-7">
                    {/* Recent Documents Table */}
                    <Card className="lg:col-span-4 border-none shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-bold">Recent Analysis</CardTitle>
                                <CardDescription>Your latest uploaded assessment documents</CardDescription>
                            </div>
                            <Button variant="ghost" className="text-indigo-600 hover:bg-indigo-50 font-bold">
                                View all <ArrowUpRight className="ml-1 h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="font-bold text-slate-700">Document Title</TableHead>
                                        <TableHead className="font-bold text-slate-700">Date</TableHead>
                                        <TableHead className="font-bold text-slate-700">Status</TableHead>
                                        <TableHead className="text-right"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        new Array(3).fill(0).map((_, i) => (
                                            <TableRow key={`skeleton-doc-${i}`} className="animate-pulse border-slate-50">
                                                <TableCell><div className="h-4 bg-slate-100 rounded w-48"></div></TableCell>
                                                <TableCell><div className="h-4 bg-slate-100 rounded w-24"></div></TableCell>
                                                <TableCell><div className="h-6 bg-slate-100 rounded-full w-20"></div></TableCell>
                                                <TableCell><div className="h-8 bg-slate-100 rounded-full w-8 ml-auto"></div></TableCell>
                                            </TableRow>
                                        ))
                                    ) : documents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-slate-500 font-medium">
                                                No documents found. Upload your first analysis document to get started.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        documents.slice(0, 5).map((doc) => (
                                            <TableRow key={doc.analysis_document_id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                                <TableCell className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                    {doc.analysis_doc_title}
                                                </TableCell>
                                                <TableCell className="text-slate-500 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {new Date(doc.upload_date).toLocaleDateString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(doc.status)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:shadow-sm">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="rounded-xl border-slate-200">
                                                            <DropdownMenuItem className="font-medium cursor-pointer">View Analysis</DropdownMenuItem>
                                                            <DropdownMenuItem className="font-medium cursor-pointer">Download Report</DropdownMenuItem>
                                                            <DropdownMenuItem className="font-medium cursor-pointer text-red-600">Delete</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Test Drafts Sidebar */}
                    <Card className="lg:col-span-3 border-none shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden self-start">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold">In-Progress Drafts</CardTitle>
                            <CardDescription>Tests you are currently working on</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? (
                                new Array(3).fill(0).map((_, i) => (
                                    <div key={`skeleton-draft-${i}`} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 animate-pulse">
                                        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                                        <div className="space-y-2">
                                            <div className="h-4 bg-slate-200 rounded w-32" />
                                            <div className="h-3 bg-slate-200 rounded w-20" />
                                        </div>
                                    </div>
                                ))
                            ) : drafts.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-sm text-slate-500 font-medium">No active drafts found</p>
                                </div>
                            ) : (
                                drafts.slice(0, 4).map((draft) => (
                                    <div key={draft.test_draft_id} className="group flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all duration-200 border border-transparent hover:border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white ring-1 ring-slate-200 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all group-hover:scale-110">
                                                <ClipboardList className="h-6 w-6 text-indigo-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{draft.title}</p>
                                                <p className="text-xs text-slate-500 font-medium">Updated {new Date(draft.updated_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <Button size="icon" variant="ghost" className="rounded-full bg-slate-50 group-hover:bg-white hover:shadow-sm">
                                            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600" />
                                        </Button>
                                    </div>
                                ))
                            )}
                            <Button variant="outline" className="w-full h-11 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all mt-4">
                                View All Drafts
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
