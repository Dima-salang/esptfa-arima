import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import {
    getAnalysisDocuments,
    getTestDrafts,
    deleteAnalysisDocument,
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
    ClipboardList,
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertCircle, Trash2, Loader2 } from "lucide-react";

export default function TeacherDashboard() {
    const [documents, setDocuments] = useState<AnalysisDocument[]>([]);
    const [drafts, setDrafts] = useState<TestDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const docsData = await getAnalysisDocuments();
            const draftsData = await getTestDrafts();

            setDocuments(Array.isArray(docsData) ? docsData : docsData.results || []);
            setDrafts(Array.isArray(draftsData) ? draftsData : draftsData.results || []);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await deleteAnalysisDocument(deleteId);
            toast.success("Analysis document deleted successfully");
            setDeleteId(null);
            fetchDashboardData();
        } catch (error) {
            console.error("Error deleting document:", error);
            toast.error("Failed to delete the document. Please try again.");
        } finally {
            setDeleting(false);
        }
    };
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
                        <Link to="/dashboard/create-analysis">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 rounded-xl h-11 px-6">
                                <Plus className="mr-2 h-4 w-4" /> New Assessment
                            </Button>
                        </Link>
                    </div>
                </div>



                <div className="grid gap-8 lg:grid-cols-7">
                    {/* Recent Documents Table */}
                    <Card className="lg:col-span-4 border-none shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-bold">Recent Analysis</CardTitle>
                                <CardDescription>Your latest uploaded assessment documents</CardDescription>
                            </div>
                            <Link to="/dashboard/analysis">
                                <Button variant="ghost" className="text-indigo-600 hover:bg-indigo-50 font-bold">
                                    View all <ArrowUpRight className="ml-1 h-4 w-4" />
                                </Button>
                            </Link>
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
                                        documents.slice(0, 7).map((doc) => (
                                            <TableRow key={doc.analysis_document_id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                                <TableCell className="p-0">
                                                    <Link
                                                        to={`/dashboard/analysis/${doc.analysis_document_id}`}
                                                        className="block px-4 py-4 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors"
                                                    >
                                                        {doc.analysis_doc_title}
                                                    </Link>
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
                                                            <Link to={`/dashboard/analysis/${doc.analysis_document_id}`}>
                                                                <DropdownMenuItem className="font-medium cursor-pointer">View Analysis</DropdownMenuItem>
                                                            </Link>
                                                            <DropdownMenuItem className="font-medium cursor-pointer">Download Report</DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="font-medium cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                onClick={() => setDeleteId(doc.analysis_document_id)}
                                                            >
                                                                Delete Document
                                                            </DropdownMenuItem>
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
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-bold">In-Progress Drafts</CardTitle>
                                <CardDescription>Tests you are currently working on</CardDescription>
                            </div>
                            <Link to="/dashboard/drafts">
                                <Button variant="ghost" className="text-indigo-600 hover:bg-indigo-50 font-bold">
                                    View all <ArrowUpRight className="ml-1 h-4 w-4" />
                                </Button>
                            </Link>
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
                                    <Link
                                        key={draft.test_draft_id}
                                        to={`/dashboard/editor/${draft.test_draft_id}`}
                                        className="group flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all duration-200 border border-transparent hover:border-slate-100"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white ring-1 ring-slate-200 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all group-hover:scale-110">
                                                <ClipboardList className="h-6 w-6 text-indigo-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{draft.title}</p>
                                                <p className="text-xs text-slate-500 font-medium">Updated {new Date(draft.updated_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-white flex items-center justify-center transition-all hover:shadow-sm">
                                            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600" />
                                        </div>
                                    </Link>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-8 pb-4 bg-slate-50">
                        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-900">Delete Analysis?</DialogTitle>
                        <DialogDescription className="font-medium text-slate-500 mt-2">
                            This action is permanent and cannot be undone. All associated statistics, predictions, and student records for this assessment will be removed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="p-8 pt-4 bg-slate-50 border-t border-slate-100 gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setDeleteId(null)}
                            disabled={deleting}
                            className="rounded-xl font-bold h-12 px-6"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="rounded-xl font-black h-12 px-8 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-100"
                        >
                            {deleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Document
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
