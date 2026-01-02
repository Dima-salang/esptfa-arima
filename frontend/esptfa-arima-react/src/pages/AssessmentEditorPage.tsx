import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Card,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    getTestDraft,
    updateTestDraft,
    createAnalysisDocument,
    getStudents,
    getSubjects,
    getQuarters,
    getSections,
    type TestDraft,
    type Student,
    type Subject,
    type Quarter,
    type Section,
    type Topic
} from "@/lib/api-teacher";
import {
    Save,
    Plus,
    Trash2,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    AlertCircle,
    User,
    BookOpen,
    Trophy,
    Settings2,
    Check,
    Edit3,
    X,
    Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@radix-ui/react-label";
import { toast } from "sonner";


interface ScoreData {
    [studentLrn: string]: {
        [topicId: string]: {
            score: number;
            student_id: string;
            max_score: number;
        };
    };
}

export default function AssessmentEditorPage() {
    const { draftId } = useParams<{ draftId: string }>();
    const navigate = useNavigate();

    // State
    const [draft, setDraft] = useState<TestDraft | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [scores, setScores] = useState<ScoreData>({});
    const [postTestMaxScore, setPostTestMaxScore] = useState<number>(60);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Header Editing State
    const [isEditingHeader, setIsEditingHeader] = useState(false);
    const [headerFields, setHeaderFields] = useState({
        title: "",
        subject: "",
        quarter: "",
        section_id: ""
    });
    const [options, setOptions] = useState<{
        subjects: Subject[];
        quarters: Quarter[];
        sections: Section[];
    }>({
        subjects: [],
        quarters: [],
        sections: []
    });

    // Refs for debouncing
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // cleanup
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            if (!draftId) return;
            try {
                setIsLoading(true);
                const draftData = await getTestDraft(draftId);
                setDraft(draftData);

                // Initialize header fields
                const sId = typeof draftData.section_id === 'object' ? draftData.section_id.section_id.toString() : draftData.section_id.toString();
                const subjId = typeof draftData.subject === 'object' ? draftData.subject.subject_id.toString() : draftData.subject.toString();
                const qId = typeof draftData.quarter === 'object' ? draftData.quarter.quarter_id.toString() : draftData.quarter.toString();

                setHeaderFields({
                    title: draftData.title,
                    subject: subjId,
                    quarter: qId,
                    section_id: sId
                });

                // Initialize topics and scores from test_content
                const content = draftData.test_content || {};
                const initialTopics = content.topics || [
                    { id: crypto.randomUUID(), name: "General Topic", max_score: 50 }
                ];
                const initialScores = content.scores || {};

                setTopics(initialTopics);
                setScores(initialScores);
                setPostTestMaxScore(content.post_test_max_score || 50);

                // Load students for the current section
                const studentList = await getStudents(sId);
                setStudents(studentList.results || studentList);

                // Load options for editing
                const [subs, quarts, secs] = await Promise.all([
                    getSubjects(),
                    getQuarters(),
                    getSections()
                ]);
                setOptions({
                    subjects: subs.results || subs,
                    quarters: quarts.results || quarts,
                    sections: secs.results || secs
                });

            } catch (err) {
                console.error("Failed to load draft data", err);
                setError("Failed to load draft. Please ensure you are authorized.");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [draftId]);

    // Save Logic
    const saveDraft = useCallback(async (currentTopics: Topic[], currentScores: ScoreData, currentMaxScore: number) => {
        if (!draftId) return;
        setIsSaving(true);
        try {
            const studentsMetadata = students.map(s => ({
                student_id: s.lrn,
                first_name: s.first_name || "",
                last_name: s.last_name || "",
                section: typeof draft?.section_id === 'object' ? draft.section_id.section_name : ""
            }));

            const topicsWithSequence = currentTopics.map((t, index) => ({
                ...t,
                test_number: index + 1
            }));

            await updateTestDraft(draftId, {
                test_content: {
                    topics: topicsWithSequence,
                    students: studentsMetadata,
                    scores: currentScores,
                    post_test_max_score: currentMaxScore
                }
            });
            setLastSaved(new Date());
        } catch (err) {
            console.error("Failed to auto-save", err);
            toast.error("Auto-save failed. Check your connection.");
        } finally {
            setIsSaving(false);
        }
    }, [draftId, students, draft?.section_id]);

    // Handle score change
    const handleScoreChange = (lrn: string, topicId: string, value: string) => {
        const numValue = value === "" ? 0 : Number.parseInt(value);
        if (Number.isNaN(numValue)) return;

        const topic = topics.find(t => t.id === topicId);
        if (topic && numValue > topic.max_score) return; // Basic validation

        setScores(prev => {
            const next = {
                ...prev,
                [lrn]: {
                    ...prev[lrn],
                    [topicId]: {
                        score: numValue,
                        student_id: lrn,
                        max_score: topic?.max_score || 0,
                        test_number: topic?.test_number || 0
                    }
                }
            };

            // Debounce save
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                saveDraft(topics, next, postTestMaxScore);
            }, 2000);

            return next;
        });
    };

    // Handle topic changes
    const addTopic = () => {
        const newTopic: Topic = {
            id: crypto.randomUUID(),
            name: `Topic ${topics.length + 1}`,
            max_score: 50,
            test_number: topics.length + 1
        };
        const nextTopics = [...topics, newTopic];
        setTopics(nextTopics);
        saveDraft(nextTopics, scores, postTestMaxScore);
    };

    const removeTopic = (id: string) => {
        if (topics.length <= 1) return;
        const nextTopics = topics.filter(t => t.id !== id);
        setTopics(nextTopics);

        // Clean up scores for this topic
        const nextScores = { ...scores };
        Object.keys(nextScores).forEach(lrn => {
            const studentScores = { ...nextScores[lrn] };
            delete studentScores[id];
            nextScores[lrn] = studentScores;
        });
        setScores(nextScores);
        saveDraft(nextTopics, nextScores, postTestMaxScore);
    };

    const updateTopicName = (id: string, name: string) => {
        const nextTopics = topics.map(t => t.id === id ? { ...t, name } : t);
        setTopics(nextTopics);

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            saveDraft(nextTopics, scores, postTestMaxScore);
        }, 2000);
    };

    const updateTopicMaxScore = (id: string, maxScore: number) => {
        const nextTopics = topics.map(t => t.id === id ? { ...t, max_score: maxScore } : t);
        setTopics(nextTopics);
        saveDraft(nextTopics, scores, postTestMaxScore);
    };

    const handlePostTestMaxScoreChange = (val: string) => {
        const num = Number.parseInt(val) || 0;
        setPostTestMaxScore(num);

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            saveDraft(topics, scores, num);
        }, 1000);
    };

    // Header Actions
    const saveHeaderDetails = async () => {
        if (!draftId) return;
        setIsSaving(true);
        try {
            const updatedDraft = await updateTestDraft(draftId, {
                title: headerFields.title,
                subject: Number.parseInt(headerFields.subject),
                quarter: Number.parseInt(headerFields.quarter),
                section_id: Number.parseInt(headerFields.section_id)
            });
            setDraft(updatedDraft);
            setIsEditingHeader(false);
            setLastSaved(new Date());

            // If section changed, re-fetch students
            const studentList = await getStudents(headerFields.section_id);
            setStudents(studentList.results || studentList);
            toast.success("Assessment details updated.");
        } catch (err) {
            console.error("Failed to update header", err);
            toast.error("Failed to update assessment details.");
            setError("Failed to update assessment details.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinalize = () => {
        setIsFinalizeDialogOpen(true);
    };

    const confirmFinalize = async () => {
        if (!draftId) return;
        setIsFinalizing(true);
        try {
            const studentsMetadata = students.map(s => ({
                student_id: s.lrn,
                first_name: s.first_name || "",
                last_name: s.last_name || "",
                section: typeof draft?.section_id === 'object' ? draft.section_id.section_name : ""
            }));

            const topicsWithSequence = topics.map((t, index) => ({
                ...t,
                test_number: index + 1
            }));

            await updateTestDraft(draftId, {
                status: "finalized",
                test_content: {
                    topics: topicsWithSequence,
                    students: studentsMetadata,
                    scores,
                    post_test_max_score: postTestMaxScore
                }
            });

            // Create Analysis Document from Draft
            await createAnalysisDocument(draftId);

            setIsFinalizeDialogOpen(false);
            toast.success("Assessment finalized and analysis generated!");
            navigate("/dashboard");
        } catch (err) {
            console.error("Failed to finalize", err);
            toast.error("Failed to finalize assessment. Please try again.");
            setError("Failed to finalize assessment. Please try again.");
        } finally {
            setIsFinalizing(false);
        }
    };

    const filteredStudents = students.filter(student => {
        // Search Filter
        const matchesSearch =
            student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.lrn.includes(searchTerm);

        if (!matchesSearch) return false;

        // Status Filter
        if (statusFilter === "all") return true;

        const studentScores = scores[student.lrn] || {};
        const scoredCount = Object.keys(studentScores).length;
        const totalTopics = topics.length;

        if (statusFilter === "complete") return scoredCount === totalTopics;
        if (statusFilter === "incomplete") return scoredCount < totalTopics;

        if (statusFilter === "at-risk") {
            if (scoredCount === 0) return false;
            let totalPossible = 0;
            let totalObtained = 0;
            topics.forEach(t => {
                if (studentScores[t.id]) {
                    totalObtained += studentScores[t.id].score;
                    totalPossible += t.max_score;
                }
            });
            const percent = (totalObtained / totalPossible) * 100;
            return percent < 75;
        }

        return true;
    });

    if (isLoading) {
        return (
            <DashboardLayout defaultCollapsed={true}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse">Loading assessment draft...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !draft) {
        return (
            <DashboardLayout defaultCollapsed={true}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
                    <div className="p-4 bg-red-100 text-red-600 rounded-full">
                        <AlertCircle className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-900">Oops! Something went wrong</h2>
                        <p className="text-slate-500 max-w-md">{error || "Draft not found."}</p>
                    </div>
                    <Button onClick={() => navigate("/dashboard")} className="bg-indigo-600">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const sectionName = typeof draft.section_id === 'object'
        ? draft.section_id.section_name
        : "Unknown Section";

    const subjectName = typeof draft.subject === 'object'
        ? draft.subject.subject_name
        : "Unknown Subject";

    const quarterName = typeof draft.quarter === 'object'
        ? draft.quarter.quarter_name
        : "Quarter";

    return (
        <DashboardLayout defaultCollapsed={true}>
            <div className="space-y-8 animate-in fade-in duration-500 pb-32">
                {/* Editor Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 px-4">
                    <div className="space-y-4 flex-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/dashboard")}
                            className="text-slate-500 -ml-2 h-8 hover:bg-slate-100/50"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                        </Button>

                        {isEditingHeader ? (
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4 w-full animate-in zoom-in-95">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Assessment Title</Label>
                                    <Input
                                        value={headerFields.title}
                                        onChange={(e) => setHeaderFields(f => ({ ...f, title: e.target.value }))}
                                        className="h-11 rounded-xl text-lg font-bold border-slate-200 focus:ring-indigo-500"
                                        placeholder="Enter Assessment Title"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Subject</Label>
                                        <Select value={headerFields.subject} onValueChange={(val) => setHeaderFields(f => ({ ...f, subject: val }))}>
                                            <SelectTrigger className="h-11 rounded-xl font-semibold">
                                                <SelectValue placeholder="Select Subject" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.subjects.map(s => <SelectItem key={s.subject_id} value={s.subject_id.toString()}>{s.subject_name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Section</Label>
                                        <Select value={headerFields.section_id} onValueChange={(val) => setHeaderFields(f => ({ ...f, section_id: val }))}>
                                            <SelectTrigger className="h-11 rounded-xl font-semibold">
                                                <SelectValue placeholder="Select Section" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.sections.map(s => <SelectItem key={s.section_id} value={s.section_id.toString()}>{s.section_name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Quarter</Label>
                                        <Select value={headerFields.quarter} onValueChange={(val) => setHeaderFields(f => ({ ...f, quarter: val }))}>
                                            <SelectTrigger className="h-11 rounded-xl font-semibold">
                                                <SelectValue placeholder="Select Quarter" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.quarters.map(q => <SelectItem key={q.quarter_id} value={q.quarter_id.toString()}>{q.quarter_name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Post-Test Max Pts</Label>
                                        <Input
                                            type="number"
                                            value={postTestMaxScore}
                                            onChange={(e) => handlePostTestMaxScoreChange(e.target.value)}
                                            className="h-11 rounded-xl font-bold border-slate-200 focus:ring-indigo-500"
                                            placeholder="Max Score"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsEditingHeader(false)}>
                                        <X className="mr-2 h-4 w-4" /> Cancel
                                    </Button>
                                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-8" onClick={saveHeaderDetails}>
                                        <Check className="mr-2 h-4 w-4" /> Update Details
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                                        <Settings2 className="h-8 w-8 text-indigo-600" />
                                        {draft.title}
                                    </h1>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl border-slate-200 text-slate-500 font-bold hover:bg-white hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                        onClick={() => setIsEditingHeader(true)}
                                    >
                                        <Edit3 className="mr-2 h-4 w-4" /> Edit Details
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-700 text-[11px] font-black tracking-wider uppercase border border-indigo-100 shadow-sm">
                                        <BookOpen className="h-4 w-4" /> {subjectName}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-50 text-slate-700 text-[11px] font-black tracking-wider uppercase border border-slate-100 shadow-sm">
                                        <User className="h-4 w-4" /> {sectionName}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 text-[11px] font-black tracking-wider uppercase border border-emerald-100 shadow-sm">
                                        <Trophy className="h-4 w-4" /> {quarterName}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-[11px] font-black tracking-wider uppercase border border-indigo-500 shadow-sm">
                                        <Check className="h-4 w-4" /> Post-Test Max: {postTestMaxScore}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex flex-col items-end mr-4">
                            {isSaving && (
                                <div className="flex items-center gap-2 text-indigo-600 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Auto-saving
                                </div>
                            )}
                            {!isSaving && lastSaved && (
                                <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Synchronized
                                </div>
                            )}
                        </div>
                        <Button
                            onClick={() => saveDraft(topics, scores, postTestMaxScore)}
                            disabled={isSaving}
                            className="bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 rounded-2xl px-6 h-12 font-bold shadow-sm transition-all active:scale-95"
                        >
                            <Save className="mr-2 h-4 w-4" /> Save Work
                        </Button>
                    </div>
                </div>

                {/* Editor Header Info & Filters */}
                <div className="flex flex-col md:flex-row items-end justify-between gap-4 px-6 mb-2">
                    <div className="flex flex-col gap-1">
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search students..."
                                className="pl-12 pr-4 rounded-2xl h-12 border-slate-200 bg-white/50 focus-visible:ring-indigo-600 shadow-sm transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-44 h-12 rounded-2xl border-slate-200 bg-white/50 font-bold text-sm text-slate-700 shadow-sm px-4">
                                <SelectValue placeholder="All Students" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-2">
                                <SelectItem value="all" className="font-bold rounded-xl h-10">All Students</SelectItem>
                                <SelectItem value="complete" className="font-bold rounded-xl h-10 text-emerald-600">Fully Scored</SelectItem>
                                <SelectItem value="incomplete" className="font-bold rounded-xl h-10 text-amber-600">Missing Scores</SelectItem>
                                <SelectItem value="at-risk" className="font-bold rounded-xl h-10 text-red-600">At Risk ({"<"}75%)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Main Spreadsheet Grid */}
                <div className="px-4">
                    <Card className="border-none shadow-2xl ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden bg-white">
                        <div className="overflow-x-auto">
                            <Table className="border-collapse">
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 border-b border-slate-100 hover:bg-slate-50/80">
                                        <TableHead className="w-[280px] font-black text-slate-900 uppercase tracking-widest text-[10px] px-8 h-24 sticky left-0 bg-slate-50 z-30 shadow-[4px_0_12px_rgba(0,0,0,0.05)] border-r border-slate-100">
                                            <div className="flex flex-col justify-center h-full">
                                                <span>Student Masterlist</span>
                                                <span className="text-[9px] text-slate-400 font-bold mt-1 tracking-normal italic">Alphabetical by Last Name</span>
                                            </div>
                                        </TableHead>

                                        {topics.map((topic, index) => (
                                            <TableHead key={topic.id} className="min-w-[180px] px-4 py-4 h-24 relative group border-r border-slate-100/50 last:border-r-0">
                                                <div className="flex flex-col gap-2 h-full">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[9px] font-black text-slate-300 tracking-[0.2em] uppercase">Topic {index + 1}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeTopic(topic.id)}
                                                            className="h-6 w-6 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            disabled={topics.length <= 1}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-1.5 px-1">
                                                        <Input
                                                            value={topic.name}
                                                            onChange={(e) => updateTopicName(topic.id, e.target.value)}
                                                            className="h-7 text-xs font-black border-transparent bg-transparent hover:bg-white hover:border-slate-200 focus:bg-white focus:border-indigo-500 transition-all p-0 uppercase"
                                                            placeholder="Topic Name"
                                                        />
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Max Pts:</span>
                                                            <Input
                                                                type="number"
                                                                value={topic.max_score}
                                                                onChange={(e) => updateTopicMaxScore(topic.id, Number.parseInt(e.target.value) || 0)}
                                                                className="h-5 w-12 text-[10px] font-black text-indigo-600 border-transparent bg-transparent hover:bg-white hover:border-slate-200 focus:bg-white focus:border-indigo-500 transition-all p-0 text-right"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableHead>
                                        ))}

                                        {/* Add Column Button Head */}
                                        <TableHead className="w-16 p-0 text-center bg-slate-50/30">
                                            <Button
                                                variant="ghost"
                                                onClick={addTopic}
                                                className="w-full h-full rounded-none hover:bg-indigo-50 text-indigo-600 flex flex-col items-center justify-center gap-1 group"
                                            >
                                                <Plus className="h-6 w-6 group-hover:scale-125 transition-transform" />
                                                <span className="text-[8px] font-black tracking-widest uppercase">New</span>
                                            </Button>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.map((student, sIdx) => (
                                        <TableRow key={student.lrn} className={cn(
                                            "group border-b border-slate-50 transition-colors",
                                            sIdx % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                                        )}>
                                            <TableCell className="sticky left-0 bg-white z-20 shadow-[4px_0_12px_rgba(0,0,0,0.02)] group-hover:bg-indigo-50/50 transition-colors px-8 h-12 border-r border-slate-50 font-medium">
                                                <div className="flex flex-col py-1">
                                                    <span className="font-bold text-slate-900 text-sm leading-none group-hover:text-indigo-800 transition-colors">
                                                        {student.last_name || 'Unknown'}, {student.first_name || 'Student'}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 mt-1.5 font-mono tracking-wider">
                                                        {student.lrn}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            {topics.map(topic => {
                                                const scoreEntry = scores[student.lrn]?.[topic.id];
                                                const score = typeof scoreEntry === 'object' ? scoreEntry.score : (scoreEntry || 0);
                                                const percentage = topic.max_score > 0 ? (score / topic.max_score) * 100 : 0;

                                                // Premium Dynamic Styling
                                                let bgClass = "bg-white";
                                                let textClass = "text-slate-900";
                                                if (percentage >= 90) {
                                                    bgClass = "bg-emerald-50/30 group-hover:bg-emerald-50/50";
                                                    textClass = "text-emerald-700";
                                                } else if (percentage >= 75) {
                                                    bgClass = "bg-blue-50/30 group-hover:bg-blue-50/50";
                                                    textClass = "text-blue-700";
                                                } else if (percentage < 50 && score > 0) {
                                                    bgClass = "bg-rose-50/30 group-hover:bg-rose-50/50";
                                                    textClass = "text-rose-700";
                                                }

                                                return (
                                                    <TableCell key={topic.id} className={cn("p-1.5 text-center transition-all border-r border-slate-50/30 last:border-r-0", bgClass)}>
                                                        <div className="flex items-center justify-center">
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={topic.max_score}
                                                                value={score === 0 && scores[student.lrn]?.[topic.id] === undefined ? "" : score}
                                                                onChange={(e) => handleScoreChange(student.lrn, topic.id, e.target.value)}
                                                                className={cn(
                                                                    "w-24 h-9 text-center font-black text-sm rounded-xl border-none ring-1 ring-slate-200/50 focus:ring-2 focus:ring-indigo-500 bg-white/80 shadow-sm transition-all",
                                                                    textClass
                                                                )}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                );
                                            })}
                                            {/* Spacer for Add Column */}
                                            <TableCell className="bg-slate-50/10" />
                                        </TableRow>
                                    ))}
                                    {filteredStudents.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={topics.length + 2} className="h-64 text-center">
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <User className="h-10 w-10 opacity-20" />
                                                    <p className="italic font-bold">No students found in this section.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>

                {/* Refined Footer Actions */}
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-5xl px-6 z-50">
                    <Card className="bg-slate-900/90 backdrop-blur-2xl text-white border-none rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.4)] p-6 flex items-center justify-between ring-1 ring-white/20">
                        <div className="flex items-center gap-10 pl-6">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Masterlist</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black">{students.length}</span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Students</span>
                                </div>
                            </div>
                            <div className="h-12 w-px bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Components</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black">{topics.length}</span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Topics</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button
                                variant="ghost"
                                className="text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl font-bold px-8 h-14 transition-all"
                                onClick={() => navigate("/dashboard")}
                            >
                                Close Editor
                            </Button>
                            <Button
                                onClick={handleFinalize}
                                disabled={isFinalizing}
                                className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-[1.5rem] font-black px-12 h-14 shadow-2xl shadow-indigo-500/30 active:scale-95 transition-all flex items-center gap-3 border-t border-white/20"
                            >
                                {isFinalizing ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" /> Processing
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-5 w-6 stroke-[3px]" /> Finalize & Submit
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Finalize Confirmation Dialog */}
                <Dialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
                    <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                        <DialogHeader className="p-8 pb-0">
                            <div className="p-3 bg-indigo-50 w-fit rounded-2xl mb-4">
                                <Trophy className="h-8 w-8 text-indigo-600" />
                            </div>
                            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Finalize Assessment</DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium pt-2">
                                Please confirm the Post-Test maximum score before submitting. This will lock the record and generate the analysis document.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="p-8 space-y-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Post-Test Max Score (Points)</Label>
                                <div className="relative group">
                                    <Input
                                        type="number"
                                        value={postTestMaxScore}
                                        onChange={(e) => handlePostTestMaxScoreChange(e.target.value)}
                                        className="h-14 rounded-2xl text-xl font-black border-slate-200 focus:ring-4 focus:ring-indigo-500/10 transition-all pl-12"
                                        placeholder="Enter total points"
                                    />
                                    <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Analysis Components</span>
                                    <span className="text-lg font-bold text-slate-900">{topics.length} Selected Topics</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Student Count</span>
                                    <span className="text-lg font-bold text-slate-900">{students.length} Records</span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="p-8 pt-0 flex gap-3 sm:justify-end">
                            <Button
                                variant="ghost"
                                onClick={() => setIsFinalizeDialogOpen(false)}
                                className="rounded-2xl font-bold h-12 px-6"
                                disabled={isFinalizing}
                            >
                                Not yet
                            </Button>
                            <Button
                                onClick={confirmFinalize}
                                disabled={isFinalizing || postTestMaxScore <= 0}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black px-8 h-12 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
                            >
                                {isFinalizing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Confirm & Finalize"
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
