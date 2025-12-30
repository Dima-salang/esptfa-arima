import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import {
    getTestDrafts,
    getSubjects,
    getQuarters,
    getSections,
} from "@/lib/api-teacher";
import type {
    Subject,
    Quarter,
    Section,
    TestDraft
} from "@/lib/api-teacher";
import {
    Card,
    CardContent,
    CardHeader,
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
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Search,
    Calendar,
    MoreHorizontal,
    Plus,
    Filter,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    Edit3,
    History,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AllDraftsPage() {
    const [drafts, setDrafts] = useState<TestDraft[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [quarters, setQuarters] = useState<Quarter[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);

    const [filters, setFilters] = useState({
        search: "",
        subject: "all",
        quarter: "all",
        section: "all",
        status: "all"
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [subs, qtrs, sects] = await Promise.all([
                    getSubjects(),
                    getQuarters(),
                    getSections()
                ]);
                setSubjects(Array.isArray(subs) ? subs : subs.results || []);
                setQuarters(Array.isArray(qtrs) ? qtrs : qtrs.results || []);
                setSections(Array.isArray(sects) ? sects : sects.results || []);
            } catch (error) {
                console.error("Error fetching filter data:", error);
            }
        };
        fetchInitialData();
    }, []);

    const fetchDrafts = async () => {
        setLoading(true);
        try {
            const apiFilters: any = {};
            if (filters.search) apiFilters.search = filters.search;
            if (filters.subject !== "all") apiFilters.subject = filters.subject;
            if (filters.quarter !== "all") apiFilters.quarter = filters.quarter;
            if (filters.section !== "all") apiFilters.section_id = filters.section;
            if (filters.status !== "all") apiFilters.status = filters.status;
            apiFilters.page = currentPage;

            const data = await getTestDrafts(apiFilters);
            setDrafts(Array.isArray(data) ? data : data.results || []);
            setTotalCount(Array.isArray(data) ? data.length : data.count || 0);
        } catch (error) {
            console.error("Error fetching drafts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchDrafts();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [filters, currentPage]);

    const resetFilters = () => {
        setFilters({
            search: "",
            subject: "all",
            quarter: "all",
            section: "all",
            status: "all"
        });
        setCurrentPage(1);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'draft': 'bg-slate-100 text-slate-600 border-slate-200',
            'pending': 'bg-amber-50 text-amber-600 border-amber-100',
            'completed': 'bg-emerald-50 text-emerald-600 border-emerald-100'
        };

        return (
            <Badge variant="outline" className={`${styles[status] || styles.draft} px-3 py-1 rounded-full font-bold shadow-none whitespace-nowrap capitalize`}>
                {status}
            </Badge>
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Assessment Drafts</h1>
                        <p className="text-slate-500 font-medium italic">Manage and Refine Your In-Progress Test Content</p>
                    </div>
                    <Link to="/dashboard/create-analysis">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-12 font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2">
                            <Plus className="h-5 w-5" /> Create Draft
                        </Button>
                    </Link>
                </div>

                <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm">
                    <CardHeader className="border-b border-slate-50 pb-6">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="relative flex-1 min-w-[280px]">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search by draft title..."
                                    className="pl-12 h-12 rounded-2xl border-none ring-1 ring-slate-200 focus-visible:ring-indigo-600 bg-white shadow-inner"
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                />
                            </div>

                            <Select value={filters.subject} onValueChange={(val) => setFilters({ ...filters, subject: val })}>
                                <SelectTrigger className="w-[180px] h-12 rounded-2xl border-none ring-1 ring-slate-200 bg-white font-medium">
                                    <SelectValue placeholder="Subject" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    <SelectItem value="all">All Subjects</SelectItem>
                                    {subjects.map(s => (
                                        <SelectItem key={s.subject_id} value={s.subject_id.toString()}>{s.subject_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filters.quarter} onValueChange={(val) => setFilters({ ...filters, quarter: val })}>
                                <SelectTrigger className="w-[150px] h-12 rounded-2xl border-none ring-1 ring-slate-200 bg-white font-medium">
                                    <SelectValue placeholder="Quarter" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    <SelectItem value="all">All Quarters</SelectItem>
                                    {quarters.map(q => (
                                        <SelectItem key={q.quarter_id} value={q.quarter_id.toString()}>{q.quarter_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filters.section} onValueChange={(val) => setFilters({ ...filters, section: val })}>
                                <SelectTrigger className="w-[180px] h-12 rounded-2xl border-none ring-1 ring-slate-200 bg-white font-medium">
                                    <SelectValue placeholder="Section" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    <SelectItem value="all">All Sections</SelectItem>
                                    {sections.map(s => (
                                        <SelectItem key={s.section_id} value={s.section_id.toString()}>{s.section_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-12 w-12 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                onClick={resetFilters}
                            >
                                <RotateCcw className="h-5 w-5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent border-slate-100 h-14">
                                    <TableHead className="font-black text-slate-700 px-8 uppercase text-[11px] tracking-widest min-w-[300px]">Draft Title</TableHead>
                                    <TableHead className="font-black text-slate-700 uppercase text-[11px] tracking-widest min-w-[150px]">Subject & Quarter</TableHead>
                                    <TableHead className="font-black text-slate-700 uppercase text-[11px] tracking-widest min-w-[120px]">Section</TableHead>
                                    <TableHead className="font-black text-slate-700 uppercase text-[11px] tracking-widest min-w-[150px]">Last Updated</TableHead>
                                    <TableHead className="font-black text-slate-700 uppercase text-[11px] tracking-widest min-w-[120px]">Status</TableHead>
                                    <TableHead className="w-[80px] pr-8"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={`skeleton-draft-${i}`} className="animate-pulse border-slate-50 h-20">
                                            <TableCell className="px-8"><div className="h-4 bg-slate-100 rounded w-48" /></TableCell>
                                            <TableCell><div className="h-4 bg-slate-100 rounded w-32" /></TableCell>
                                            <TableCell><div className="h-4 bg-slate-100 rounded w-24" /></TableCell>
                                            <TableCell><div className="h-4 bg-slate-100 rounded w-24" /></TableCell>
                                            <TableCell><div className="h-6 bg-slate-100 rounded-full w-20" /></TableCell>
                                            <TableCell className="pr-8"><div className="h-8 w-8 bg-slate-100 rounded-full ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : drafts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-60 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                                    <History className="h-10 w-10 text-slate-200" />
                                                </div>
                                                <p className="text-slate-400 font-medium italic text-lg">No assessment drafts found</p>
                                                <Link to="/dashboard/create-analysis">
                                                    <Button variant="link" className="text-indigo-600 font-black">START A NEW ASSESSMENT</Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    drafts.map((draft) => (
                                        <TableRow key={draft.test_draft_id} className="group hover:bg-slate-50/50 transition-all border-slate-50 h-20">
                                            <TableCell className="px-8">
                                                <Link
                                                    to={`/dashboard/editor/${draft.test_draft_id}`}
                                                    className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight block truncate max-w-[400px]"
                                                >
                                                    {draft.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">{(draft.subject as Subject).subject_name}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{(draft.quarter as Quarter).quarter_name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-lg">
                                                    {(draft.section_id as Section).section_name}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-500 text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-3.5 w-3.5 opacity-50 text-indigo-500" />
                                                    {new Date(draft.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(draft.status)}
                                            </TableCell>
                                            <TableCell className="pr-8 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white hover:shadow-sm">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl border-slate-200 min-w-[180px] p-2 shadow-xl">
                                                        <Link to={`/dashboard/editor/${draft.test_draft_id}`}>
                                                            <DropdownMenuItem className="font-bold cursor-pointer rounded-lg flex items-center gap-2">
                                                                <Edit3 className="h-4 w-4" /> Edit Draft
                                                            </DropdownMenuItem>
                                                        </Link>
                                                        <DropdownMenuItem className="font-bold cursor-pointer rounded-lg">Duplicate</DropdownMenuItem>
                                                        <div className="h-px bg-slate-100 my-1" />
                                                        <DropdownMenuItem
                                                            className="font-bold cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg"
                                                        >
                                                            Delete Draft
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination Footer */}
                        {totalCount > 0 && (
                            <div className="px-8 py-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Showing <span className="text-slate-900">{Math.min((currentPage - 1) * pageSize + 1, totalCount)}</span> to <span className="text-slate-900">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="text-slate-900">{totalCount}</span> results
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold h-9 px-4 border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-all"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1 || loading}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.ceil(totalCount / pageSize) }).map((_, i) => {
                                            const pageNum = i + 1;
                                            if (pageNum === 1 || pageNum === Math.ceil(totalCount / pageSize) || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                                                return (
                                                    <Button
                                                        key={`page-draft-${pageNum}`}
                                                        variant={currentPage === pageNum ? "default" : "outline"}
                                                        size="sm"
                                                        className={`w-9 h-9 p-0 rounded-xl font-black text-xs transition-all ${currentPage === pageNum ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'border-slate-200 hover:bg-white'}`}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        disabled={loading}
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                                return <span key={`ellipsis-draft-${pageNum}`} className="text-slate-300 font-bold px-1">...</span>;
                                            }
                                            return null;
                                        })}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold h-9 px-4 border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-all"
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        disabled={currentPage >= Math.ceil(totalCount / pageSize) || loading}
                                    >
                                        Next <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
