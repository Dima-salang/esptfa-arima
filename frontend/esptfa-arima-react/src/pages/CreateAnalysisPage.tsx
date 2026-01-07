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
import {
    getSubjects,
    getQuarters,
    getSections,
    createTestDraft,
    type Subject,
    type Quarter,
    type Section,
    type TestDraft,
} from "@/lib/api-teacher";
import {
    FileText,
    ArrowRight,
    CheckCircle2,
    Loader2
} from "lucide-react";
import { toast } from "sonner";


export default function CreateAnalysisPage() {
    const navigate = useNavigate();

    // UI State
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

    // Handlers
    const handleDetailsSubmit = async () => {
        if (!details.title || !details.subject || !details.quarter || !details.section) return;

        setIsLoading(true);
        try {
            const draftData: Partial<TestDraft> = {
                title: details.title,
                subject: Number(details.subject),
                quarter: Number(details.quarter),
                section_id: Number(details.section),
                test_content: {
                    topics: [
                        { id: crypto.randomUUID(), name: "General Topic", max_score: 50, test_number: 1 }
                    ],
                    students: [],
                    scores: {},
                    post_test_max_score: 50
                },
                status: "draft"
            };

            const draft = await createTestDraft(draftData, idempotencyKey);
            toast.success("Assessment created! Opening editor...");
            navigate(`/dashboard/editor/${draft.test_draft_id}`);
        } catch (error) {
            console.error("Error creating draft", error);
            toast.error("Failed to create assessment. Please try again.");
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
                        Provide the basic information for your analysis document and start editing.
                    </p>
                </div>

                <div className="w-full">
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
                                Create & Open Editor <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Info Card */}
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="border-none bg-indigo-50/50 p-6 rounded-3xl">
                        <div className="flex gap-4">
                            <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-sm">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900 leading-tight">Fast Setup</h3>
                                <p className="text-sm text-indigo-700 mt-1 font-medium italic">
                                    Your assessment will be initialized with a default topic. You can add more topics and enter scores directly in the editor.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
