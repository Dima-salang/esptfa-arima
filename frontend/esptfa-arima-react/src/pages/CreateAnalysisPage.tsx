import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    getSubjects,
    getQuarters,
    getSections,
    createTestDraft,
    updateTestDraft,
    getStudents,
    type Subject,
    type Quarter,
    type Section,
    type TestDraft,
    type Student,
    type Topic,
} from "@/lib/api-teacher";
import {
    FileText,
    Settings,
    Plus,
    Trash2,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


export default function CreateAnalysisPage() {
    const navigate = useNavigate();

    // UI State
    const [currentTab, setCurrentTab] = useState("details");
    const [isLoading, setIsLoading] = useState(false);
    const [idempotencyKey] = useState(() => crypto.randomUUID());

    // Form Data State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [quarters, setQuarters] = useState<Quarter[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    const [details, setDetails] = useState({
        title: "",
        subject: "",
        quarter: "",
        section: "",
    });

    const [topics, setTopics] = useState<Topic[]>([
        { id: crypto.randomUUID(), name: "", max_score: 10 }
    ]);

    const [students, setStudents] = useState<Student[]>([]);
    const [createdDraft, setCreatedDraft] = useState<TestDraft | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [s, q, sec] = await Promise.all([
                    getSubjects(),
                    getQuarters(),
                    getSections(),
                ]);

                setSubjects(Array.isArray(s) ? s : s.results || []);
                setQuarters(Array.isArray(q) ? q : q.results || []);
                setSections(Array.isArray(sec) ? sec : sec.results || []);
            } catch (error) {
                console.error("Failed to fetch metadata", error);
            }
        };
        fetchMetadata();
    }, []);

    // Fetch students when section changes
    useEffect(() => {
        const fetchStudentsData = async () => {
            if (details.section) {
                try {
                    const data = await getStudents(details.section);
                    setStudents(Array.isArray(data) ? data : data.results || []);
                } catch (error) {
                    console.error("Failed to fetch students", error);
                }
            }
        };
        fetchStudentsData();
    }, [details.section]);

    // Handlers
    const handleAddTopic = () => {
        setTopics([...topics, { id: crypto.randomUUID(), name: "", max_score: 10 }]);
    };

    const handleRemoveTopic = (id: string) => {
        if (topics.length > 1) {
            setTopics(topics.filter(t => t.id !== id));
        }
    };

    const updateTopic = (id: string, field: keyof Topic, value: string | number) => {
        setTopics(topics.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleDetailsSubmit = async () => {
        if (!details.title || !details.subject || !details.quarter || !details.section) return;

        setIsLoading(true);
        try {
            const draftData: Partial<TestDraft> = {
                title: details.title,
                subject: Number(details.subject),
                quarter: Number(details.quarter),
                section_id: Number(details.section),
                test_content: { topics: [] }, // Initial empty topics
                status: "draft"
            };

            const draft = await createTestDraft(draftData, idempotencyKey);
            setCreatedDraft(draft);
            toast.success("Draft created! Setting up topics...");
            setCurrentTab("topics");
        } catch (error) {
            console.error("Error creating draft", error);
            toast.error("Failed to create draft. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (!createdDraft) return;

        setIsLoading(true);
        try {
            const filteredTopics = topics.filter(t => t.name.trim() !== "");

            // Prepare student list for the JSON - ensures backend has student info
            const studentsMetadata = students.map(s => ({
                student_id: s.lrn,
                first_name: s.user_id?.first_name || "",
                last_name: s.user_id?.last_name || "",
                section: sections.find(sec => sec.section_id.toString() === details.section)?.section_name || ""
            }));

            // Initialize scores structure for each student and topic
            const initialScores: Record<string, Record<string, any>> = {};
            students.forEach(student => {
                initialScores[student.lrn] = {};
                filteredTopics.forEach(topic => {
                    initialScores[student.lrn][topic.id] = {
                        score: 0,
                        student_id: student.lrn,
                        max_score: topic.max_score
                    };
                });
            });

            const draftData: Partial<TestDraft> = {
                title: details.title,
                subject: Number(details.subject),
                quarter: Number(details.quarter),
                section_id: Number(details.section),
                test_content: {
                    topics: filteredTopics,
                    students: studentsMetadata,
                    scores: initialScores
                },
                status: "draft"
            };

            await updateTestDraft(createdDraft.test_draft_id, draftData);
            toast.success("Assessment initialized! Redirecting to editor...");
            // Redirect to editor placeholder
            navigate(`/dashboard/editor/${createdDraft.test_draft_id}`);
        } catch (error) {
            console.error("Error updating draft", error);
            toast.error("Failed to initialize assessment.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Section */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Create New Assessment
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Follow the steps below to set up your analysis document and test draft.
                    </p>
                </div>

                {/* Progress Stepper (Visual Only) */}
                <div className="flex items-center gap-4 px-2">
                    <StepIndicator
                        number={1}
                        label="Basic Details"
                        active={currentTab === "details"}
                        completed={!!createdDraft}
                    />
                    <div className="flex-1 h-px bg-slate-200" />
                    <StepIndicator
                        number={2}
                        label="Topics & Scores"
                        active={currentTab === "topics"}
                        completed={false}
                    />
                </div>

                <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                    <TabsList className="hidden">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="topics">Topics</TabsTrigger>
                    </TabsList>

                    {/* Step 1: Details */}
                    <TabsContent value="details">
                        <Card className="border-none shadow-xl ring-1 ring-slate-200 hover:ring-indigo-200 transition-all rounded-3xl overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl font-bold">General Information</CardTitle>
                                        <CardDescription className="text-base">Provide the context for this analysis document.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="text-sm font-bold text-slate-700">Assessment Title</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g., First Quarter Formative Assessment 1"
                                        className="h-12 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all text-base"
                                        value={details.title}
                                        onChange={(e) => setDetails({ ...details, title: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">Subject</Label>
                                        <Select
                                            value={details.subject}
                                            onValueChange={(val) => setDetails({ ...details, subject: val })}
                                        >
                                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200">
                                                <SelectValue placeholder="Select Subject" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {subjects.map(s => (
                                                    <SelectItem key={s.subject_id} value={s.subject_id.toString()}>
                                                        {s.subject_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">Quarter</Label>
                                        <Select
                                            value={details.quarter}
                                            onValueChange={(val) => setDetails({ ...details, quarter: val })}
                                        >
                                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200">
                                                <SelectValue placeholder="Select Quarter" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {quarters.map(q => (
                                                    <SelectItem key={q.quarter_id} value={q.quarter_id.toString()}>
                                                        {q.quarter_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="text-sm font-bold text-slate-700">Target Section</Label>
                                        <Select
                                            value={details.section}
                                            onValueChange={(val) => setDetails({ ...details, section: val })}
                                        >
                                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200">
                                                <SelectValue placeholder="Select Section" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {sections.map(sec => (
                                                    <SelectItem key={sec.section_id} value={sec.section_id.toString()}>
                                                        {sec.section_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50/50 p-8 flex justify-end gap-4 border-t border-slate-100">
                                <Button
                                    variant="ghost"
                                    className="rounded-xl h-12 px-6 font-bold"
                                    onClick={() => navigate(-1)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-indigo-600/20"
                                    disabled={!details.title || !details.subject || !details.quarter || !details.section || isLoading}
                                    onClick={handleDetailsSubmit}
                                >
                                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                                    Next: Define Topics <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    {/* Step 2: Topics */}
                    <TabsContent value="topics">
                        <Card className="border-none shadow-xl ring-1 ring-slate-200 hover:ring-indigo-200 transition-all rounded-3xl overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                                        <Settings className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl font-bold">Topics & Max Scores</CardTitle>
                                        <CardDescription className="text-base">List the topics covered in this assessment and their possible points.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-4">
                                <div className="space-y-4">
                                    {topics.map((topic, index) => (
                                        <div key={topic.id} className="flex gap-4 items-end animate-in fade-in slide-in-from-left-2 duration-300">
                                            <div className="flex-1 space-y-2">
                                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    Topic {index + 1}
                                                </Label>
                                                <Input
                                                    placeholder="e.g., Quadratic Equations"
                                                    value={topic.name}
                                                    onChange={(e) => updateTopic(topic.id, "name", e.target.value)}
                                                    className="h-12 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200"
                                                />
                                            </div>
                                            <div className="w-32 space-y-2">
                                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    Max Score
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={topic.max_score}
                                                    onChange={(e) => updateTopic(topic.id, "max_score", parseInt(e.target.value))}
                                                    className="h-12 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200"
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-12 w-12 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleRemoveTopic(topic.id)}
                                                disabled={topics.length === 1}
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full h-14 border-dashed border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-2xl font-bold transition-all mt-4"
                                    onClick={handleAddTopic}
                                >
                                    <Plus className="mr-2 h-5 w-5" /> Add Another Topic
                                </Button>
                            </CardContent>
                            <CardFooter className="bg-slate-50/50 p-8 flex justify-between gap-4 border-t border-slate-100">
                                <Button
                                    variant="ghost"
                                    className="rounded-xl h-12 px-6 font-bold"
                                    onClick={() => setCurrentTab("details")}
                                >
                                    <ArrowLeft className="mr-2 h-5 w-5" /> Back
                                </Button>
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-10 font-bold shadow-lg shadow-indigo-600/20"
                                    onClick={handleFinalize}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                                    Go to Editor <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Info Card */}
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="border-none bg-indigo-50/50 p-6 rounded-3xl">
                        <div className="flex gap-4">
                            <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-sm">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900 leading-tight">Pro Tip</h3>
                                <p className="text-sm text-indigo-700 mt-1 font-medium italic">
                                    You can skip the topics for now and add them later in the assessment editor. Just click "Go to Editor" when you're ready.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}

function StepIndicator({ number, label, active, completed }: { number: number, label: string, active: boolean, completed: boolean }) {
    return (
        <div className={cn(
            "flex items-center gap-3 py-2 transition-all duration-300",
            active ? "opacity-100 scale-105" : "opacity-50"
        )}>
            <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg transition-colors shadow-sm",
                completed ? "bg-emerald-500 text-white" : active ? "bg-indigo-600 text-white shadow-indigo-200" : "bg-white text-slate-400"
            )}>
                {completed ? <CheckCircle2 className="h-6 w-6" /> : number}
            </div>
            <span className={cn(
                "font-bold text-sm tracking-tight",
                active ? "text-slate-900" : "text-slate-500"
            )}>
                {label}
            </span>
        </div>
    );
}
