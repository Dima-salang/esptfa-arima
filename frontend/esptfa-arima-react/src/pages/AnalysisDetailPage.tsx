import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getAnalysisFullDetails } from "@/lib/api-teacher";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
} from "recharts";
import {
    ArrowLeft,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Search,
    BrainCircuit,
    Info,
    LineChart as LucideLineChart,
    Grid3X3,
    BarChart3,
    ArrowUpDown,
    Filter,
    Layers,
    Trophy,
    LifeBuoy,
} from "lucide-react";
import ActualPostTestUploadModal from "@/components/ActualPostTestUploadModal";
import {
    getTruePercentage,
    getLearnerStatus,
    getScoreColorClass,
    getScoreColorHex,
    getInterventionTheme,
    mapIntervention,
    getValidationLabel,
    getValidationLabelStyle,
    normalizeStatus,
    getStatusTextClass,
    getStatusBgClass,
    getStatusSolidBgClass
} from "@/lib/student-utils";

interface AnalysisDocument {
    analysis_document_id: number;
    analysis_doc_title: string;
    subject?: { subject_name: string };
    quarter?: { quarter_name: string };
    section_id?: { section_name: string };
    post_test_max_score?: number;
}

interface AnalysisStatistic {
    mean: number;
    mean_passing_threshold: number;
    total_students: number;
}

interface FormativeAssessment {
    id: string;
    formative_assessment_number: string;
    mean: number;
    passing_threshold: number;
    fa_topic_name?: string;
    fa_topic?: { topic_name: string };
    max_score: number;
    passing_rate: number;
    failing_rate: number;
}

interface TopicPerformance {
    test_number: string;
    topic_name: string;
    max_score: number;
}

interface StudentPerformance {
    lrn: string;
    name: string;
    mean: number;
    passing_rate: number;
    failing_rate: number;
    predicted_score: number | null;
    predicted_status: string;
    prediction_intervention: Record<string, string>;
    actual_intervention: Record<string, string>;
    actual_status: string | null;
    prediction_score_percent: number;
    actual_score: number | null;
    actual_max: number | null;
    sum_scores: number;
    max_possible_score: number;
    scores: Record<string, number>;
}

interface AnalysisDetails {
    document: AnalysisDocument;
    statistics: AnalysisStatistic;
    topics: TopicPerformance[];
    formative_assessments: FormativeAssessment[];
    student_performance: StudentPerformance[];
}


const InfoTooltip = ({ content }: { content: string }) => (
    <TooltipProvider>
        <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
                <div className="inline-flex items-center justify-center p-1 rounded-md hover:bg-slate-100 transition-colors cursor-help">
                    <Info className="h-4 w-4 text-slate-400 hover:text-indigo-600" />
                </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-slate-900 border-none text-white text-[11px] p-3 rounded-xl shadow-2xl max-w-xs animate-in fade-in zoom-in duration-200 font-medium leading-relaxed">
                {content}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);


export default function AnalysisDetailPage() {
    const { docId } = useParams<{ docId: string }>();
    const [data, setData] = useState<AnalysisDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [matrixSearch, setMatrixSearch] = useState("");
    const [matrixStatusFilter, setMatrixStatusFilter] = useState("all");
    const [interventionFilter, setInterventionFilter] = useState("all");
    const [matrixInterventionFilter, _setMatrixInterventionFilter] = useState("all");
    const [actualStatusFilter, setActualStatusFilter] = useState("all");
    const [matrixActualStatusFilter, setMatrixActualStatusFilter] = useState("all");
    const [actualInterventionFilter, setActualInterventionFilter] = useState("all");
    const [matrixActualInterventionFilter, setMatrixActualInterventionFilter] = useState("all");
    const [processing, setProcessing] = useState(false);
    const [sortField, setSortField] = useState<keyof StudentPerformance>("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [topicSortDirection, setTopicSortDirection] = useState<"asc" | "desc" | "none">("none");

    const interventionLabels = Array.from(new Set(
        (data?.student_performance || []).flatMap(s => Object.keys(s.prediction_intervention))
    )).sort((a, b) => a.localeCompare(b));

    const actualInterventionLabels = Array.from(new Set(
        (data?.student_performance || []).flatMap(s => Object.keys(s.actual_intervention || {}))
    )).sort((a, b) => a.localeCompare(b));

    useEffect(() => {
        const fetchDetails = async () => {
            if (!docId) return;
            try {
                const result = await getAnalysisFullDetails(docId);
                if (result.message === "Document is still being processed") {
                    setProcessing(true);
                } else {
                    setData(result);
                    setProcessing(false);
                }
            } catch (error) {
                console.error("Error fetching analysis details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [docId]);

    const handleSort = (field: keyof StudentPerformance) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const sortStudents = (students: StudentPerformance[]) => {
        return [...students].sort((a, b) => {
            let aVal: any = a[sortField];
            let bVal: any = b[sortField];
            if (sortField === "mean") {
                aVal = getTruePercentage(a);
                bVal = getTruePercentage(b);
            }
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            if (typeof aVal === 'string') {
                const comp = aVal.localeCompare(bVal);
                return sortDirection === "asc" ? comp : -comp;
            }
            return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        });
    };

    const filteredStudents = sortStudents(
        (data?.student_performance || []).filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.lrn.includes(searchTerm);
            const matchesStatus = statusFilter === "all" || normalizeStatus(s.predicted_status) === statusFilter;
            const matchesActualStatus = actualStatusFilter === "all" || (s.actual_status && normalizeStatus(s.actual_status) === actualStatusFilter);
            const matchesIntervention = interventionFilter === "all" || Object.keys(s.prediction_intervention).includes(interventionFilter);
            const matchesActualIntervention = actualInterventionFilter === "all" || (s.actual_intervention && Object.keys(s.actual_intervention).includes(actualInterventionFilter));
            return matchesSearch && matchesStatus && matchesActualStatus && matchesIntervention && matchesActualIntervention;
        })
    );
    const matrixFilteredStudents = sortStudents(
        (data?.student_performance || []).filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(matrixSearch.toLowerCase()) || s.lrn.includes(matrixSearch);
            const matchesStatus = matrixStatusFilter === "all" || normalizeStatus(s.predicted_status) === matrixStatusFilter;
            const matchesActualStatus = matrixActualStatusFilter === "all" || (s.actual_status && normalizeStatus(s.actual_status) === matrixActualStatusFilter);
            const matchesIntervention = matrixInterventionFilter === "all" || Object.keys(s.prediction_intervention).includes(matrixInterventionFilter);
            const matchesActualIntervention = matrixActualInterventionFilter === "all" || (s.actual_intervention && Object.keys(s.actual_intervention).includes(matrixActualInterventionFilter));
            return matchesSearch && matchesStatus && matchesActualStatus && matchesIntervention && matchesActualIntervention;
        })
    );


    if (loading) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading analysis dashboard...</p>
                </div>
            </div>
        );
    }

    if (processing) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center animate-pulse">
                    <BrainCircuit className="w-12 h-12 text-indigo-600" />
                </div>
                <div className="space-y-2 max-w-md">
                    <h2 className="text-2xl font-bold text-slate-900">Analysis In Progress</h2>
                    <p className="text-slate-500">
                        Our ARIMA model is currently processing your data to generate predictions and insights.
                        This usually takes a few minutes.
                    </p>
                </div>
                <Button onClick={() => globalThis.location.reload()} className="bg-indigo-600 hover:bg-indigo-700">
                    Refresh Status
                </Button>
                <Link to="/dashboard">
                    <Button variant="ghost">Back to Dashboard</Button>
                </Link>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl font-bold">Analysis not found</h2>
                <Link to="/dashboard" className="text-indigo-600">Go back</Link>
            </div>
        );
    }



    // Prepare data for the trend chart
    const trendData = [...data.formative_assessments].map(fa => ({
        name: fa.fa_topic_name || `FA${fa.formative_assessment_number}`,
        mean: Number(fa.mean.toFixed(2)),
        threshold: Number(fa.passing_threshold.toFixed(2)),
        topic: fa.fa_topic_name || `Test ${fa.formative_assessment_number}`
    }));

    // Prepare data for the topic performance chart using Mastery, Monitoring, Priority Support breakdowns
    let topicData = [...data.formative_assessments].map(fa => {
        const totalStudents = data.student_performance.length;
        const assessNum = fa.formative_assessment_number;

        let masteryCount = 0;
        let monitoringCount = 0;
        let priorityCount = 0;

        data.student_performance.forEach(s => {
            const score = s.scores?.[assessNum];
            if (score !== undefined) {
                const percent = (score / fa.max_score) * 100;
                if (percent >= 81) masteryCount++;
                else if (percent >= 70) monitoringCount++;
                else priorityCount++;
            } else {
                // fallback to priority support if no score
                priorityCount++;
            }
        });

        const masteryPercent = totalStudents > 0 ? (masteryCount / totalStudents) * 100 : 0;
        const monitoringPercent = totalStudents > 0 ? (monitoringCount / totalStudents) * 100 : 0;
        const priorityPercent = totalStudents > 0 ? (priorityCount / totalStudents) * 100 : 0;

        return {
            topic: fa.fa_topic_name || `FA${fa.formative_assessment_number}`,
            mastery_rate: Number(masteryPercent.toFixed(1)),
            monitoring_rate: Number(monitoringPercent.toFixed(1)),
            priority_rate: Number(priorityPercent.toFixed(1)),
            mean: Number(fa.mean.toFixed(1)),
            mean_percentage: Number(((fa.mean / fa.max_score) * 100).toFixed(1)),
            max_score: fa.max_score,
            formative_assessment_number: fa.formative_assessment_number
        };
    });

    if (topicSortDirection === "asc") {
        topicData.sort((a, b) => a.mastery_rate - b.mastery_rate);
    } else if (topicSortDirection === "desc") {
        topicData.sort((a, b) => b.mastery_rate - a.mastery_rate);
    }

    const validPredictions = data.student_performance.filter(s => s.predicted_score !== null);
    const avgPredictedPoints = validPredictions.length > 0
        ? validPredictions.reduce((acc, s) => acc + (s.predicted_score || 0), 0) / validPredictions.length
        : 0;
    const maxPossiblePoints = data.document.post_test_max_score || 60;
    const sortedStudentsByPrediction = [...data.student_performance].sort((a, b) => (b.predicted_score || 0) - (a.predicted_score || 0));
    const overallTopStudents = sortedStudentsByPrediction.filter(s => s.predicted_score !== null).slice(0, 3);
    const overallBottomStudents = sortedStudentsByPrediction.filter(s => s.predicted_score !== null).reverse().slice(0, 3);

    const scoreRanges = [
        { label: '0-20%', min: 0, max: 20, count: 0, color: '#ef4444' }, // red (Critical)
        { label: '21-40%', min: 21, max: 40, count: 0, color: '#f97316' }, // orange (Low)
        { label: '41-60%', min: 41, max: 60, count: 0, color: '#f59e0b' }, // amber (Below Average)
        { label: '61-75%', min: 61, max: 75, count: 0, color: '#8b5cf6' }, // violet (Borderline)
        { label: '76-90%', min: 76, max: 90, count: 0, color: '#6366f1' }, // indigo (Developing/Proficient)
        { label: '91-100%', min: 91, max: 100, count: 0, color: '#10b981' }, // emerald (Excellent)
    ];

    if (data?.student_performance) {
        data.student_performance.forEach(s => {
            const perc = getTruePercentage(s);
            const range = scoreRanges.find(r => perc >= r.min && perc <= r.max);
            if (range) range.count++;
        });
    }

    const TopicPerformanceTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            const assessNum = d.formative_assessment_number;
            const topicName = d.topic;

            const studentsWithScores = data.student_performance
                .filter(s => s.scores && typeof s.scores[assessNum] === 'number')
                .map(s => ({
                    id: s.lrn,
                    name: s.name,
                    score: s.scores[assessNum]
                }))
                .sort((a, b) => b.score - a.score);

            const topStudents = studentsWithScores.slice(0, 3);
            const bottomStudents = studentsWithScores.slice(-3).reverse();

            return (
                <div className="bg-slate-900/95 backdrop-blur-xl text-white p-5 rounded-[2rem] shadow-2xl border border-white/10 w-85 animate-in fade-in zoom-in-95 duration-200">
                    <div className="mb-4 pb-4 border-b border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1 leading-tight">{topicName}</p>
                        <div className="flex flex-col gap-2 mt-2">
                            <span className="text-2xl font-black leading-none text-white">Class Mean Score: <span className="text-indigo-300">{d.mean.toFixed(1)}</span> out of {d.max_score}</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                <span className="text-[9px] font-black px-2.5 py-1 bg-emerald-500/20 rounded-md text-emerald-300">
                                    {d.mastery_rate}% Mastery Level
                                </span>
                                <span className="text-[9px] font-black px-2.5 py-1 bg-amber-500/20 rounded-md text-amber-300">
                                    {d.monitoring_rate}% Monitoring
                                </span>
                                <span className="text-[9px] font-black px-2.5 py-1 bg-rose-500/20 rounded-md text-rose-300">
                                    {d.priority_rate}% Priority Support
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {topStudents.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span> Top Performers
                                </p>
                                <div className="space-y-2">
                                    {topStudents.map((s, i) => (
                                        <div key={`top-${s.id}`} className="flex items-center justify-between bg-white/5 rounded-2xl p-2.5 hover:bg-white/10 transition-colors border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-black shadow-inner">
                                                    {i + 1}
                                                </div>
                                                <span className="text-xs font-bold truncate max-w-[130px] text-slate-200">{s.name}</span>
                                            </div>
                                            <span className="text-sm font-black text-emerald-300 pr-1">{s.score}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {bottomStudents.length > 0 && bottomStudents[0].id !== topStudents[topStudents.length - 1]?.id && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]"></span> Needs Support
                                </p>
                                <div className="space-y-2">
                                    {bottomStudents.map((s) => {
                                        if (topStudents.find(ts => ts.id === s.id)) return null;
                                        return (
                                            <div key={`bot-${s.id}`} className="flex items-center justify-between bg-white/5 rounded-2xl p-2.5 hover:bg-white/10 transition-colors border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-[12px] font-black shadow-inner">
                                                        !
                                                    </div>
                                                    <span className="text-xs font-bold truncate max-w-[130px] text-slate-200">{s.name}</span>
                                                </div>
                                                <span className="text-sm font-black text-rose-300 pr-1">{s.score}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard">
                            <Button variant="outline" size="icon" className="rounded-xl border-slate-200">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                {data.document.analysis_doc_title}
                                <Badge className="bg-emerald-600 text-white border-none px-3 py-1 font-bold">Analysis Completed</Badge>
                            </h1>
                            <p className="text-slate-500 font-medium">
                                {data.document.subject?.subject_name} • {data.document.quarter?.quarter_name} • {data.document.section_id?.section_name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <ActualPostTestUploadModal
                            analysisDocumentId={Number(docId)}
                            students={data.student_performance}
                            maxScore={data.document.post_test_max_score || 60}
                            onSuccess={() => globalThis.location.reload()}
                        />
                    </div>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="bg-slate-100/50 p-1 rounded-xl h-12 mb-6 w-full md:w-auto overflow-x-auto overflow-y-hidden">
                        <TabsTrigger value="overview" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Dashboard Overview</TabsTrigger>
                        <TabsTrigger value="students" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Learner Performance Registry</TabsTrigger>
                        <TabsTrigger value="topics" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Competency Performance Analysis</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { title: "Average Class Raw Score", value: data.statistics?.mean.toFixed(2), icon: TrendingUp, color: "blue", desc: "Mean raw score of learners based on the formative assessment", help: "The combined mean score of all students across all formative assessments recorded in this document." },
                                { title: "Target Score Threshold", value: (data.statistics?.mean_passing_threshold ? (data.statistics.mean_passing_threshold * 70 / 75) : 0).toFixed(2), icon: AlertCircle, color: "amber", desc: "Minimum score equivalent to the 70% target level", help: "Minimum score equivalent to the 70% target level" },
                                { title: "Predicted Post-Test Performance", value: avgPredictedPoints.toFixed(1), icon: BrainCircuit, color: "indigo", desc: "Estimated learner performance after instructional intervention", help: "The average score our ARIMA model predicts the entire class will achieve in the upcoming Post-Test based on historical data." },
                                { title: "Learners Reaching Target", value: `${data.student_performance.length > 0 ? (data.student_performance.filter(s => (s.passing_rate || 0) >= 70).length / data.student_performance.length * 100).toFixed(0) : 0}%`, icon: CheckCircle2, color: "emerald", desc: "Percentage of learners who met or exceeded the 70% target threshold", help: "Percentage of students who maintain a passing rate of 70% or higher across their assessments." },
                            ].map((stat, idx) => (
                                <Card key={idx} className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl">
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`bg-${stat.color}-50 p-2 rounded-xl`}>
                                                <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                                            </div>
                                            <InfoTooltip content={stat.help} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{stat.title}</p>
                                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                                            <p className="text-[10px] text-slate-400 mt-2 font-medium">{stat.desc}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Priority Intervention Alert (at the very top if any students are failing) */}
                        {data.student_performance.filter(s => normalizeStatus(s.predicted_status) === 'Priority Support Learners').length > 0 && (
                            <Card className="border-none shadow-md ring-2 ring-red-500/10 rounded-3xl overflow-hidden bg-red-50/10 backdrop-blur-sm border-l-8 border-l-red-500">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xl font-black text-red-700 flex items-center gap-3">
                                            <AlertCircle className="h-6 w-6" />
                                            Priority Support Learners for Intervention
                                            <Badge className="bg-red-500 text-white border-none px-2 py-0.5 text-[10px] animate-pulse">ACTION REQUIRED</Badge>
                                        </CardTitle>
                                        <InfoTooltip content="These students are predicted to fail the upcoming post-test based on their current formative assessment performance." />
                                    </div>
                                    <CardDescription className="text-red-600/70 font-medium italic">
                                        {data.student_performance.filter(s => normalizeStatus(s.predicted_status) === 'Priority Support Learners').length} learners scored below the 70% target threshold and are recommended for immediate instructional support.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {data.student_performance.filter(s => normalizeStatus(s.predicted_status) === 'Priority Support Learners').slice(0, 8).map((student) => (
                                            <TooltipProvider key={student.lrn}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link to={`/dashboard/analysis/${data.document.analysis_document_id}/student/${student.lrn}`}>
                                                            <Badge variant="outline" className="bg-white/80 hover:bg-white border-red-200 text-red-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all shadow-sm hover:scale-105">
                                                                {student.name}
                                                            </Badge>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-slate-900 text-white rounded-xl border-none p-3 shadow-xl">
                                                        <p className="text-xs font-black mb-1">{student.name}</p>
                                                        <p className="text-[10px] opacity-70 mb-2">LRN: {student.lrn}</p>
                                                        <div className="h-px bg-white/10 my-2" />
                                                        <p className="text-[10px] text-red-400 font-bold mb-1">PREDICTION: {student.predicted_score?.toFixed(1)}</p>
                                                        <p className="text-[9px] italic leading-tight">{Object.values(student.prediction_intervention)[0]?.split('.')[0]}.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ))}
                                        {data.student_performance.filter(s => normalizeStatus(s.predicted_status) === 'Priority Support Learners').length > 8 && (
                                            <Sheet>
                                                <SheetTrigger asChild>
                                                    <Badge variant="outline" className="bg-red-100 border-red-200 text-red-700 font-black px-3 py-1.5 rounded-xl cursor-pointer hover:bg-red-200 transition-all shadow-sm">
                                                        View {data.student_performance.filter(s => normalizeStatus(s.predicted_status) === 'Priority Support Learners').length - 8} more learners
                                                    </Badge>
                                                </SheetTrigger>
                                                <SheetContent className="w-[450px] sm:w-[540px] max-w-full flex flex-col h-full bg-white border-l shadow-2xl p-6">
                                                    <SheetHeader className="pb-4 border-b">
                                                        <SheetTitle className="text-xl font-black text-red-700 flex items-center gap-2">
                                                            <AlertCircle className="h-5 w-5" />
                                                            Immediate Intervention List
                                                        </SheetTitle>
                                                        <SheetDescription className="text-slate-500 font-medium">
                                                            All {data.student_performance.filter(s => normalizeStatus(s.predicted_status) === 'Priority Support Learners').length} students at high risk requiring action.
                                                        </SheetDescription>
                                                    </SheetHeader>
                                                    <ScrollArea className="flex-1 mt-4 -mr-2 pr-4">
                                                        <div className="space-y-4 pb-6">
                                                            {data.student_performance.filter(s => normalizeStatus(s.predicted_status) === 'Priority Support Learners').map((student) => (
                                                                <div key={student.lrn} className="flex flex-col p-4 rounded-2xl bg-red-50/20 border border-red-100/50 hover:bg-red-50/40 transition-all">
                                                                    <div className="flex items-center justify-between gap-4 mb-2">
                                                                        <div>
                                                                            <Link to={`/dashboard/analysis/${data.document.analysis_document_id}/student/${student.lrn}`} className="font-bold text-slate-800 hover:text-indigo-600 transition-colors text-sm">
                                                                                {student.name}
                                                                            </Link>
                                                                            <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-0.5">LRN: {student.lrn}</p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-sm font-black text-red-600">Score: {student.predicted_score?.toFixed(1)}</p>
                                                                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Predicted Fail</p>
                                                                        </div>
                                                                    </div>
                                                                    {Object.values(student.prediction_intervention).length > 0 && (
                                                                        <div className="text-[11px] text-slate-600 bg-white/60 p-2.5 rounded-xl border border-slate-100/80 mt-1">
                                                                            <p className="font-semibold text-slate-700 mb-0.5 text-[10px] uppercase tracking-wider text-red-600/80">Recommended Intervention:</p>
                                                                            {Object.values(student.prediction_intervention)[0]}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </ScrollArea>
                                                </SheetContent>
                                            </Sheet>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Insights Panels */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                                            <Trophy className="h-5 w-5 text-emerald-500" />
                                            Predicted Mastery Learners:
                                        </CardTitle>
                                        <CardDescription>Top Predicted Learners who will demonstrate the highest assessment performance</CardDescription>
                                    </div>
                                    <Badge className="bg-emerald-500 text-white border-none font-bold">Top {overallTopStudents.length}</Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {overallTopStudents.map((student, i) => (
                                            <div key={student.lrn} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-xs shadow-sm shadow-emerald-500/10">
                                                        #{i + 1}
                                                    </div>
                                                    <div>
                                                        <Link to={`/dashboard/analysis/${data.document.analysis_document_id}/student/${student.lrn}`} className="font-bold text-slate-800 text-sm hover:text-indigo-600 transition-colors">
                                                            {student.name}
                                                        </Link>
                                                        <p className="text-[10px] text-slate-400 font-bold tracking-widest leading-none mt-0.5">{student.lrn}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-emerald-600 leading-none">{student.predicted_score?.toFixed(1)}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">{student.prediction_score_percent.toFixed(0)}%</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                                            <LifeBuoy className="h-5 w-5 text-rose-500" />
                                            Predicted Priority Support Learners
                                        </CardTitle>
                                        <CardDescription>Predicted learners who will require focused instructional support</CardDescription>
                                    </div>
                                    <Badge className="bg-rose-500 text-white border-none font-bold">Lowest {overallBottomStudents.length} Scores for Intervention</Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {overallBottomStudents.map((student) => (
                                            <div key={student.lrn} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-black text-xs shadow-sm shadow-rose-500/10">
                                                        !
                                                    </div>
                                                    <div>
                                                        <Link to={`/dashboard/analysis/${data.document.analysis_document_id}/student/${student.lrn}`} className="font-bold text-slate-800 text-sm hover:text-indigo-600 transition-colors">
                                                            {student.name}
                                                        </Link>
                                                        <p className="text-[10px] text-slate-400 font-bold tracking-widest leading-none mt-0.5">{student.lrn}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end flex-wrap gap-1">
                                                    <p className="text-lg font-black text-rose-600 leading-none">{student.predicted_score?.toFixed(1)}</p>
                                                    <Badge variant="outline" className="text-[9px] font-bold border-rose-200 text-rose-600 px-1.5 py-0 uppercase tracking-wider">
                                                        {student.predicted_status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>


                        {/* Visualization Sub-Tabs */}
                        <Card className="border-none shadow-md ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm">
                            <Tabs defaultValue="distribution" className="w-full">
                                <div className="px-6 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-xl font-black flex items-center gap-2">
                                            Class Performance Analytics
                                            <InfoTooltip content="Navigate between different visualization modes to get a deep understanding of your class performance and trends." />
                                        </CardTitle>
                                        <CardDescription>Summary of learner performance patterns, mastery levels, and support needs</CardDescription>
                                    </div>
                                    <TabsList className="bg-slate-100/80 p-1 h-10 rounded-xl">
                                        <TabsTrigger value="distribution" className="rounded-lg text-xs font-bold gap-2">
                                            <BarChart3 className="h-3.5 w-3.5" /> Risk Overview
                                        </TabsTrigger>
                                        <TabsTrigger value="trend" className="rounded-lg text-xs font-bold gap-2">
                                            <LucideLineChart className="h-3.5 w-3.5" /> Class Trend
                                        </TabsTrigger>
                                        <TabsTrigger value="heatmap" className="rounded-lg text-xs font-bold gap-2">
                                            <Grid3X3 className="h-3.5 w-3.5" /> Grade Matrix
                                        </TabsTrigger>
                                        <TabsTrigger value="histogram" className="rounded-lg text-xs font-bold gap-2">
                                            <BarChart3 className="h-3.5 w-3.5" /> Score Distribution
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <CardContent className="p-6">
                                    <TabsContent value="trend" className="h-[400px] mt-0 animate-in fade-in duration-500">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trendData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                                                />
                                                <RechartsTooltip
                                                    contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
                                                    labelStyle={{ fontWeight: "900", color: "#1e293b", marginBottom: "4px" }}
                                                />
                                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: "30px", fontSize: "12px", fontWeight: "bold" }} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="mean"
                                                    name="Class Average"
                                                    stroke="#6366f1"
                                                    strokeWidth={4}
                                                    dot={{ r: 6, fill: "#6366f1", strokeWidth: 3, stroke: "#fff" }}
                                                    activeDot={{ r: 9, strokeWidth: 2 }}
                                                />
                                                <Line
                                                    type="stepAfter"
                                                    dataKey="threshold"
                                                    name="Passing Target"
                                                    stroke="#f59e0b"
                                                    strokeWidth={2}
                                                    strokeDasharray="8 4"
                                                    dot={false}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </TabsContent>

                                    <TabsContent value="heatmap" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-visible">
                                        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                                            <div className="space-y-4">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div className="relative group">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                                        <Input
                                                            placeholder="Search student LRN or name..."
                                                            value={matrixSearch}
                                                            onChange={(e) => setMatrixSearch(e.target.value)}
                                                            className="pl-10 h-11 w-72 rounded-2xl border-slate-200 bg-white shadow-sm transition-all focus:shadow-md focus:ring-indigo-500/20 text-sm font-medium"
                                                        />
                                                    </div>
                                                    <Select value={matrixStatusFilter} onValueChange={setMatrixStatusFilter}>
                                                        <SelectTrigger className="w-64 h-11 rounded-2xl border-slate-200 bg-white shadow-sm font-bold text-xs text-slate-700 hover:border-indigo-300 transition-all">
                                                            <div className="flex items-center gap-2 min-w-0 text-left">
                                                                <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                <div className="truncate pr-2">
                                                                    <SelectValue placeholder="All Performance Levels" />
                                                                </div>
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-1">
                                                            <SelectItem value="all" className="rounded-xl font-bold text-xs py-2">All Performance Levels</SelectItem>
                                                            <SelectItem value="Mastery Learners" className="rounded-xl font-bold text-xs py-2 text-emerald-600">Mastery Learners</SelectItem>
                                                            <SelectItem value="Monitoring Learners" className="rounded-xl font-bold text-xs py-2 text-amber-500">Monitoring Learners</SelectItem>
                                                            <SelectItem value="Priority Support Learners" className="rounded-xl font-bold text-xs py-2 text-red-600">Priority Support Learners</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Select value={matrixActualStatusFilter} onValueChange={setMatrixActualStatusFilter}>
                                                        <SelectTrigger className="w-52 h-11 rounded-2xl border-slate-200 bg-white shadow-sm font-bold text-xs text-slate-700 hover:border-emerald-300 transition-all">
                                                            <div className="flex items-center gap-2 min-w-0 text-left">
                                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                                <div className="truncate pr-2">
                                                                    <SelectValue placeholder="Actual performance Level" />
                                                                </div>
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-1">
                                                            <SelectItem value="all" className="rounded-xl font-bold text-xs py-2">All Actual Statuses</SelectItem>
                                                            <SelectItem value="Mastery Learners" className="rounded-xl font-bold text-xs py-2 text-emerald-600">Actual Mastery Learners</SelectItem>
                                                            <SelectItem value="Monitoring Learners" className="rounded-xl font-bold text-xs py-2 text-amber-500">Actual Monitoring Learners</SelectItem>
                                                            <SelectItem value="Priority Support Learners" className="rounded-xl font-bold text-xs py-2 text-rose-600">Actual Priority Support Learners</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Select value={matrixActualInterventionFilter} onValueChange={setMatrixActualInterventionFilter}>
                                                        <SelectTrigger className="w-64 h-11 rounded-2xl border-slate-200 bg-white shadow-sm font-bold text-xs text-slate-700 hover:border-emerald-300 transition-all">
                                                            <div className="flex items-center gap-2 min-w-0 text-left">
                                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                                <div className="truncate pr-2">
                                                                    <SelectValue placeholder="Actual Strategy" />
                                                                </div>
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-1 max-h-[300px]">
                                                            <SelectItem value="all" className="rounded-xl font-bold text-xs py-2">All Actual Interventions</SelectItem>
                                                            {actualInterventionLabels.map(label => (
                                                                <SelectItem key={label} value={label} className="rounded-xl font-bold text-xs py-2">
                                                                    {label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50/80 backdrop-blur-sm p-4 rounded-3xl border border-slate-200/60 flex items-center gap-6 shadow-sm">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Legend</p>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-white/50 px-3 py-1.5 rounded-full border border-slate-200/50">
                                                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" /> Mastery Learners (≥90%)
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-white/50 px-3 py-1.5 rounded-full border border-slate-200/50">
                                                            <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400/40" /> Monitoring Learners (70% - 89%)
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-white/50 px-3 py-1.5 rounded-full border border-slate-200/50">
                                                            <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/40" /> Priority Support Learners ({"<"}70%)
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative group/matrix">
                                            <div className="overflow-x-auto rounded-[2rem] border border-slate-200/60 shadow-xl bg-white max-h-[600px] custom-scrollbar scroll-smooth">
                                                <table className="w-full text-xs text-left border-collapse">
                                                    <thead className="sticky top-0 z-40">
                                                        <tr>
                                                            <th
                                                                className="px-8 py-6 font-black text-slate-800 uppercase tracking-widest w-64 bg-slate-50/95 backdrop-blur-xl border-r border-slate-200/60 border-b-2 border-slate-200 sticky left-0 z-50 cursor-pointer hover:bg-slate-100 transition-all group/header shadow-[2px_0_10px_-2px_rgba(0,0,0,0.05)]"
                                                                onClick={() => handleSort("name")}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span>Student Directory</span>
                                                                    <div className={`p-1.5 rounded-lg border transition-all ${sortField === 'name' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white border-slate-200 text-slate-400 opacity-40 group-hover/header:opacity-100'}`}>
                                                                        <ArrowUpDown className="h-3 w-3" />
                                                                    </div>
                                                                </div>
                                                            </th>
                                                            {data.formative_assessments.map(fa => (
                                                                <th
                                                                    key={fa.formative_assessment_number}
                                                                    className="px-3 py-6 font-black text-slate-500 text-center uppercase tracking-[0.2em] bg-slate-50/95 backdrop-blur-xl border-r border-slate-200/40 border-b-2 border-slate-200 min-w-[100px] transition-all"
                                                                >
                                                                    <div className="relative inline-block group/topic">
                                                                        <span className="relative z-10 transition-colors group-hover/topic:text-indigo-600">
                                                                            {fa.fa_topic_name || `FA${fa.formative_assessment_number}`}
                                                                        </span>
                                                                        <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-500 transition-all duration-300 group-hover/topic:w-full" />
                                                                    </div>
                                                                </th>
                                                            ))}
                                                            <th className="px-8 py-6 font-black text-indigo-700 text-center uppercase tracking-[0.2em] bg-indigo-50/90 backdrop-blur-xl border-b-2 border-indigo-200 sticky right-0 z-30 shadow-[-2px_0_10px_-2px_rgba(79,70,229,0.1)]">
                                                                Prediction
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100/50">
                                                        {matrixFilteredStudents.map((student) => (
                                                            <tr key={student.lrn} className="group hover:bg-indigo-50/30 transition-all duration-300">
                                                                <td className="px-8 py-4 font-bold text-slate-800 bg-white group-hover:bg-slate-50/95 border-r border-slate-200/60 sticky left-0 z-20 transition-all shadow-[2px_0_10px_-2px_rgba(0,0,0,0.03)] group-hover:shadow-[4px_0_15px_-4px_rgba(0,0,0,0.05)]">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black tracking-tighter shadow-sm transition-transform group-hover:scale-110 ${getStatusBgClass(student.predicted_status)}`}>
                                                                            {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <Link
                                                                                to={`/dashboard/analysis/${data.document.analysis_document_id}/student/${student.lrn}`}
                                                                                className="text-sm font-black text-slate-900 hover:text-indigo-600 transition-colors truncate"
                                                                            >
                                                                                {student.name}
                                                                            </Link>
                                                                            <span className="text-[10px] font-bold text-slate-400/80 tracking-widest">{student.lrn}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                {data.formative_assessments.map(fa => {
                                                                    const score = student.scores?.[fa.formative_assessment_number];
                                                                    const percent = score !== undefined ? (score / fa.max_score) * 100 : null;
                                                                    return (
                                                                        <td key={fa.formative_assessment_number} className="p-2 text-center border-r border-slate-100/30 group-hover:border-indigo-100/50 transition-colors">
                                                                            {score !== undefined ? (
                                                                                <TooltipProvider>
                                                                                    <Tooltip delayDuration={200}>
                                                                                        <TooltipTrigger asChild>
                                                                                            <div className="relative flex items-center justify-center">
                                                                                                <div
                                                                                                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black transition-all cursor-default relative overflow-hidden group/cell hover:-translate-y-1 hover:shadow-lg ${percent! >= 90 ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                                                                                                        percent! >= 75 ? 'bg-amber-400 text-white shadow-amber-400/20' :
                                                                                                            'bg-rose-500 text-white shadow-rose-500/20'
                                                                                                        }`}
                                                                                                >
                                                                                                    <span className="relative z-10 text-xs">{Math.round(score)}</span>
                                                                                                    <div className="absolute inset-0 bg-black/15 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                                                                                </div>
                                                                                            </div>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent
                                                                                            side="top"
                                                                                            className="bg-slate-900 text-white rounded-[1.25rem] border-none p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                                                                                        >
                                                                                            <div className="px-4 py-3 bg-white/5 backdrop-blur-md">
                                                                                                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">{fa.fa_topic_name || `Topic ${fa.formative_assessment_number}`}</p>
                                                                                                <div className="flex items-baseline gap-2">
                                                                                                    <span className="text-xl font-black text-white">{score}</span>
                                                                                                    <span className="text-[10px] font-bold text-white/40">OF {fa.max_score} POINTS</span>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="bg-slate-800/50 px-4 py-3 border-t border-white/5">
                                                                                                <div className="flex items-center justify-between gap-4">
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <div className={`w-2 h-2 rounded-full ${percent! >= 75 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse'}`} />
                                                                                                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                                                                                            {(() => {
                                                                                                                if (percent! >= 90) return "Mastery Learners";
                                                                                                                if (percent! >= 75) return "Monitoring Learners";
                                                                                                                return "Priority Support Learners";
                                                                                                            })()}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <span className="text-[10px] font-black font-mono text-white/60">{(percent || 0).toFixed(1)}%</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                </TooltipProvider>
                                                                            ) : (
                                                                                <div className="w-11 h-11 rounded-2xl mx-auto bg-slate-50/50 border-2 border-dashed border-slate-200/50 flex items-center justify-center group-hover:border-indigo-200/50 transition-colors">
                                                                                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="px-8 py-4 bg-indigo-50/40 group-hover:bg-indigo-100/40 text-center sticky right-0 z-20 transition-all border-l border-indigo-100/30 shadow-[-2px_0_10px_-2px_rgba(79,70,229,0.05)]">
                                                                    <div className="flex flex-col items-center gap-1 group/badge p-1">
                                                                        <div className={`px-4 py-1.5 rounded-xl font-black text-[11px] shadow-sm flex items-center gap-2 transition-all group-hover/badge:scale-105 group-hover/badge:shadow-md ${getStatusSolidBgClass(student.predicted_status)}`}>
                                                                            {student.predicted_score?.toFixed(1) || "N/A"}
                                                                            <span className="text-[8px] font-bold opacity-60 bg-black/10 px-1.5 py-0.5 rounded-md">
                                                                                {student.prediction_score_percent.toFixed(0)}%
                                                                            </span>
                                                                        </div>
                                                                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${getStatusTextClass(student.predicted_status)}`}>
                                                                            {normalizeStatus(student.predicted_status)}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="distribution" className="mt-0 animate-in fade-in duration-500">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Donut Chart for Class Standing */}
                                            <Card className="border-none bg-slate-50/50 rounded-2xl p-6">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Learner Performance Classification</h4>
                                                    <InfoTooltip content="Distribution of student performance based on their mean scores compared to the passing target." />
                                                </div>
                                                <div className="h-[250px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={[
                                                                    { name: 'Mastery Learners', color: '#10b981', value: data.student_performance.filter(s => getLearnerStatus(getTruePercentage(s)) === 'Mastery Learners').length },
                                                                    { name: 'Monitoring Learners', color: '#6c6ec1ff', value: data.student_performance.filter(s => getLearnerStatus(getTruePercentage(s)) === 'Monitoring Learners').length },
                                                                    { name: 'Priority Support Learners', color: '#ef4444', value: data.student_performance.filter(s => getLearnerStatus(getTruePercentage(s)) === 'Priority Support Learners').length }
                                                                ].filter(d => d.value > 0)}
                                                                innerRadius={45}
                                                                outerRadius={85}
                                                                paddingAngle={5}
                                                                dataKey="value"
                                                            >
                                                                {[
                                                                    { name: 'Mastery Learners', color: '#10b981', value: data.student_performance.filter(s => getLearnerStatus(getTruePercentage(s)) === 'Mastery Learners').length },
                                                                    { name: 'Monitoring Learners', color: '#6c6ec1ff', value: data.student_performance.filter(s => getLearnerStatus(getTruePercentage(s)) === 'Monitoring Learners').length },
                                                                    { name: 'Priority Support Learners', color: '#ef4444', value: data.student_performance.filter(s => getLearnerStatus(getTruePercentage(s)) === 'Priority Support Learners').length }
                                                                ].filter(d => d.value > 0).map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                                ))}
                                                            </Pie>
                                                            <RechartsTooltip
                                                                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                                            />
                                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </Card>

                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="font-black text-slate-800 flex items-center gap-2">
                                                        Highest Performing Learners
                                                        <Badge className="bg-emerald-500 text-white border-none">Top 3  Learners</Badge>
                                                    </h4>
                                                    <p className="text-xs text-slate-500 font-medium mt-1">Learners with the highest scores in the formative assessment</p>
                                                </div>
                                                {[...data.student_performance].sort((a, b) => getTruePercentage(b) - getTruePercentage(a)).slice(0, 3).map((s, i) => (
                                                    <Link
                                                        key={`top-${s.lrn}`}
                                                        to={`/dashboard/analysis/${data.document.analysis_document_id}/student/${s.lrn}`}
                                                        className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100/50 hover:bg-emerald-50 hover:scale-[1.02] transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                                                                {i + 1}
                                                            </div>
                                                            <span className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{s.name}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-lg font-black text-emerald-600 font-mono">{s.mean.toFixed(1)}</span>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</p>
                                                        </div>
                                                    </Link>
                                                ))}

                                                <div className="pt-2">
                                                    <h4 className="font-black text-slate-800 flex items-center gap-2">
                                                        Priority Support Learners
                                                        <Badge className="bg-orange-400 text-white border-none">Lowest 3 Scores for Intervention</Badge>
                                                    </h4>
                                                    <p className="text-xs text-slate-500 font-medium mt-1">Learners who require focused instructional support</p>
                                                </div>
                                                {[...data.student_performance].sort((a, b) => getTruePercentage(a) - getTruePercentage(b)).slice(0, 3).map((s, i) => (
                                                    <Link
                                                        key={`risk-${s.lrn}`}
                                                        to={`/dashboard/analysis/${data.document.analysis_document_id}/student/${s.lrn}`}
                                                        className="flex items-center justify-between p-4 rounded-2xl bg-orange-50/30 border border-orange-100/50 hover:bg-orange-50 hover:scale-[1.02] transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform">
                                                                {i + 1}
                                                            </div>
                                                            <span className="font-bold text-slate-800 group-hover:text-orange-700 transition-colors">{s.name}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`text-lg font-black font-mono ${getScoreColorClass(getTruePercentage(s))}`}>{s.mean.toFixed(1)}</span>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="histogram" className="mt-0 animate-in fade-in duration-500">
                                        <div className="flex flex-col h-full">
                                            <div className="mb-6 flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-black text-slate-800 text-lg">Class Score Distribution</h4>
                                                    <p className="text-sm text-slate-500 font-medium mt-1">Number of students falling into each grade bracket.</p>
                                                </div>
                                            </div>
                                            <div className="h-[350px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={scoreRanges} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} dy={10} />
                                                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} />
                                                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                                                        <Bar dataKey="count" name="Students" radius={[8, 8, 0, 0]} maxBarSize={60}>
                                                            {scoreRanges.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </CardContent>
                            </Tabs>
                        </Card>
                    </TabsContent>

                    <TabsContent value="students" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-none shadow-md ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm">
                            <CardHeader className="flex flex-col gap-6 pb-6 px-8 pt-8 border-b border-slate-100">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-2xl font-black flex items-center gap-3">
                                            Learner Performance and Intervention Registry
                                            <InfoTooltip content="Comprehensive view of all students, their historical averages, and ARIMA model predictions for the upcoming post-test." />
                                        </CardTitle>
                                        <CardDescription>A record of learners’ formative assessment results, predicted performance, actual post-test outcomes, and recommended instructional support</CardDescription>
                                    </div>
                                    <div className="relative w-full lg:w-80">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Search by learner name or LRN..."
                                            className="pl-12 pr-4 rounded-2xl h-12 border-none ring-1 ring-slate-200 bg-white/80 focus-visible:ring-indigo-600 shadow-sm w-full"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Predicted Performance</label>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 bg-white shadow-sm font-bold text-xs text-slate-700">
                                                <SelectValue placeholder="All Performance Levels" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 shadow-xl p-2">
                                                <SelectItem value="all" className="font-bold rounded-lg h-9">All Performance Levels</SelectItem>
                                                <SelectItem value="Mastery Learners" className="font-bold rounded-lg h-9 text-emerald-600">Mastery Learners</SelectItem>
                                                <SelectItem value="Monitoring Learners" className="font-bold rounded-lg h-9 text-amber-500">Monitoring Learners</SelectItem>
                                                <SelectItem value="Priority Support Learners" className="font-bold rounded-lg h-9 text-red-600">Priority Support Learners</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pre Predicted Strategy</label>
                                        <Select value={interventionFilter} onValueChange={setInterventionFilter}>
                                            <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 bg-white shadow-sm font-bold text-xs text-slate-700">
                                                <div className="flex items-center gap-2 truncate">
                                                    <BrainCircuit className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                                    <SelectValue placeholder="Pre Predicted Interventions" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 shadow-xl p-2 max-h-[300px]">
                                                <SelectItem value="all" className="font-bold rounded-lg h-9">Pre Predicted Interventions</SelectItem>
                                                {interventionLabels.map(label => (
                                                    <SelectItem key={label} value={label} className="font-bold rounded-lg h-9">
                                                        {mapIntervention(label).label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Actual Outcome</label>
                                        <Select value={actualStatusFilter} onValueChange={setActualStatusFilter}>
                                            <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 bg-white shadow-sm font-bold text-xs text-slate-700">
                                                <div className="flex items-center gap-2 truncate">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                    <SelectValue placeholder="Actual performance Level" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 shadow-xl p-2">
                                                <SelectItem value="all" className="font-bold rounded-lg h-9">All Actual Statuses</SelectItem>
                                                <SelectItem value="Mastery Learners" className="font-bold rounded-lg h-9 text-emerald-600">Actual Mastery Learners</SelectItem>
                                                <SelectItem value="Monitoring Learners" className="font-bold rounded-lg h-9 text-amber-500">Actual Monitoring Learners</SelectItem>
                                                <SelectItem value="Priority Support Learners" className="font-bold rounded-lg h-9 text-rose-600">Actual Priority Support Learners</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Recommended Post Strategy</label>
                                        <Select value={actualInterventionFilter} onValueChange={setActualInterventionFilter}>
                                            <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 bg-white shadow-sm font-bold text-xs text-slate-700">
                                                <div className="flex items-center gap-2 truncate">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                    <SelectValue placeholder="Recommended Post Interventions" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 shadow-xl p-2 max-h-[300px]">
                                                <SelectItem value="all" className="font-bold rounded-lg h-9">All Actual Interventions</SelectItem>
                                                {actualInterventionLabels.map(label => (
                                                    <SelectItem key={label} value={label} className="font-bold rounded-lg h-9">
                                                        {mapIntervention(label).label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="w-full overflow-x-auto custom-scrollbar">
                                    <Table className="min-w-[1950px] w-full border-collapse">
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow className="hover:bg-transparent border-slate-100 h-14">
                                                <TableHead
                                                    className="w-[300px] font-black text-slate-700 pl-8 uppercase text-[11px] tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                                                    onClick={() => handleSort("name")}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        Learner Information
                                                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                    </div>
                                                </TableHead>
                                                <TableHead className="font-black text-slate-700 text-center uppercase text-[11px] tracking-widest w-[120px]">
                                                    Performance Trend
                                                </TableHead>
                                                <TableHead
                                                    className="font-black text-slate-700 text-center uppercase text-[11px] tracking-widest cursor-pointer hover:text-indigo-600 transition-colors w-[150px]"
                                                    onClick={() => handleSort("mean")}
                                                >
                                                <div className="flex items-center justify-center gap-2">
                                                    Average Formative Score
                                                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="font-black text-slate-700 text-center uppercase text-[11px] tracking-widest cursor-pointer hover:text-indigo-600 transition-colors bg-indigo-50/30 w-[180px]"
                                                onClick={() => handleSort("predicted_score")}
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    Predicted Post-Test Score
                                                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="font-black text-slate-700 uppercase text-[11px] tracking-widest text-center cursor-pointer hover:text-indigo-600 transition-colors bg-indigo-50/30 w-[220px]"
                                                onClick={() => handleSort("predicted_status")}
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    Predicted Performance Level
                                                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="font-black text-slate-700 w-[320px] uppercase text-[11px] tracking-widest text-center bg-indigo-50/30">Recommended Pre-Intervention Plan</TableHead>

                                            <TableHead
                                                className="font-black text-slate-700 text-center uppercase text-[11px] tracking-widest cursor-pointer hover:text-indigo-600 transition-colors bg-emerald-50/30 w-[180px]"
                                                onClick={() => handleSort("actual_score")}
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    Actual Post-Test Score
                                                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="font-black text-slate-700 uppercase text-[11px] tracking-widest text-center cursor-pointer hover:text-indigo-600 transition-colors bg-emerald-50/30 w-[220px]"
                                                onClick={() => handleSort("actual_status")}
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    Actual Performance Level
                                                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="font-black text-slate-700 w-[320px] uppercase text-[11px] tracking-widest text-center bg-emerald-50/30">Recommended Post-Test Intervention</TableHead>
                                            <TableHead className="font-black text-slate-700 w-[250px] uppercase text-[11px] tracking-widest text-center pr-8 bg-indigo-50/20">Validation Label</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStudents.length > 0 ? (
                                            filteredStudents.map((student) => {
                                                const predPercent = student.prediction_score_percent;
                                                const actualPercent = student.actual_score !== null ? (student.actual_score / (student.actual_max || 1)) * 100 : null;
                                                const validationLabel = getValidationLabel(predPercent, actualPercent);

                                                return (
                                                    <TableRow key={student.lrn} className="group hover:bg-slate-100/30 transition-all border-slate-50 h-20">
                                                        <TableCell className="pl-8 py-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                                    {student.name.charAt(0)}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <Link to={`/dashboard/analysis/${data.document.analysis_document_id}/student/${student.lrn}`} className="font-bold text-slate-900 leading-tight hover:text-indigo-600 transition-colors">
                                                                        {student.name}
                                                                    </Link>
                                                                    <span className="text-[10px] text-slate-400 font-mono tracking-wider">{student.lrn}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center w-[120px] px-2">
                                                            <div className="h-8 w-full">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <LineChart data={data.formative_assessments.map(fa => ({
                                                                        score: student.scores?.[fa.formative_assessment_number] !== undefined ? student.scores[fa.formative_assessment_number] : null,
                                                                        max: fa.max_score
                                                                    }))}>
                                                                        <Line
                                                                            type="monotone"
                                                                            dataKey={(d) => d.score !== null ? (d.score / d.max) * 100 : null}
                                                                            stroke={getScoreColorHex(getTruePercentage(student))}
                                                                            strokeWidth={2}
                                                                            dot={{ r: 2, fill: getScoreColorHex(getTruePercentage(student)), strokeWidth: 0 }}
                                                                            isAnimationActive={false}
                                                                            connectNulls
                                                                        />
                                                                        <YAxis domain={[0, 100]} hide />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className={`px-3 py-1.5 rounded-lg bg-slate-50 font-bold text-sm ${getScoreColorClass(getTruePercentage(student))}`}>
                                                                {student.mean.toFixed(1)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center bg-indigo-50/10">
                                                            <div className="flex flex-col items-center">
                                                                <span className="font-black text-indigo-600 text-xl tracking-tighter">
                                                                    {student.predicted_score?.toFixed(1) || "N/A"}
                                                                </span>
                                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">PREDICTED Score</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center bg-indigo-50/10">
                                                            {(() => {
                                                                const status = getLearnerStatus(predPercent);
                                                                const isPriority = status === 'Priority Support Learners';
                                                                const isMastery = status === 'Mastery Learners';
                                                                return (
                                                                    <Badge className={`px-4 py-1 rounded-full border shadow-none font-black text-[10px] uppercase tracking-widest ${isMastery ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                            isPriority ? 'bg-red-50 text-red-600 border-red-100' :
                                                                                'bg-amber-50 text-amber-600 border-amber-100'
                                                                        }`}>
                                                                        {status}
                                                                    </Badge>
                                                                );
                                                            })()}
                                                        </TableCell>
                                                        <TableCell className="bg-indigo-50/10">
                                                            <div className={`p-3 rounded-2xl border text-[11px] font-semibold leading-relaxed shadow-sm flex items-start gap-2 ${getInterventionTheme(student.prediction_score_percent).bgClass}`}>
                                                                <BrainCircuit className="h-3.5 w-3.5 opacity-60 mt-0.5 shrink-0" />
                                                                <div className="flex flex-col gap-1">
                                                                    {Object.entries(student.prediction_intervention).map(([label, action]) => {
                                                                        const mapped = mapIntervention(label);
                                                                        return (
                                                                            <div key={label}>
                                                                                <span className="font-black uppercase text-[9px] tracking-widest block opacity-70">{mapped.label}</span>
                                                                                <span className="block italic">"{action}"</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        <TableCell className="text-center bg-emerald-50/10">
                                                            {student.actual_score !== null ? (
                                                                <div className="flex flex-col items-center">
                                                                    <span className="font-black text-emerald-600 text-xl tracking-tighter">
                                                                        {student.actual_score}
                                                                    </span>
                                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Post Test Score / {student.actual_max}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300 font-medium italic text-xs">Awaiting...</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center bg-emerald-50/10">
                                                            {student.actual_score !== null ? (
                                                                (() => {
                                                                    const status = getLearnerStatus((student.actual_score / (student.actual_max || 1)) * 100);
                                                                    const isPriority = status === 'Priority Support Learners';
                                                                    const isMastery = status === 'Mastery Learners';
                                                                    return (
                                                                        <Badge className={`px-4 py-1 rounded-full border shadow-none font-black text-[10px] uppercase tracking-widest ${isMastery ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                                                isPriority ? 'bg-rose-100 text-rose-700 border-rose-200' :
                                                                                    'bg-amber-100 text-amber-700 border-amber-200'
                                                                            }`}>
                                                                            {status}
                                                                        </Badge>
                                                                    );
                                                                })()
                                                            ) : (
                                                                <span className="text-slate-300 font-medium italic text-xs">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="bg-emerald-50/10">
                                                            {student.actual_score !== null ? (
                                                                <div className={`p-3 rounded-2xl border text-[11px] font-semibold leading-relaxed shadow-sm flex items-start gap-2 ${getInterventionTheme((student.actual_score / (student.actual_max || 1)) * 100).bgClass}`}>
                                                                    <CheckCircle2 className="h-3.5 w-3.5 opacity-60 mt-0.5 shrink-0" />
                                                                    <div className="flex flex-col gap-1 text-left">
                                                                        {Object.entries(student.actual_intervention).map(([label, action]) => {
                                                                            const mapped = mapIntervention(label);
                                                                            return (
                                                                                <div key={label}>
                                                                                    <span className="font-black uppercase text-[9px] tracking-widest block opacity-70">{mapped.label}</span>
                                                                                    <span className="block italic">"{action}"</span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300 font-medium italic text-xs">Awaiting evaluation...</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="pr-8 bg-indigo-50/10 text-center">
                                                            <Badge className={`px-3 py-1.5 rounded-full border shadow-none font-bold text-[10px] leading-tight ${getValidationLabelStyle(validationLabel)}`}>
                                                                {validationLabel}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={10} className="h-40 text-center text-slate-400 font-medium">
                                                    No student records found matching "{searchTerm}"
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="topics" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="w-full">
                            <Card className="border-none shadow-md ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm">
                                <Tabs defaultValue="bar" className="w-full">
                                    <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4 px-8 pt-8">
                                        <div>
                                            <CardTitle className="text-2xl font-black flex items-center gap-3">
                                                Competency Performance Analysis
                                                <InfoTooltip content="Distribution of learner performance across assessed topics and competencies." />
                                            </CardTitle>
                                            <CardDescription>Distribution of learner performance across assessed topics and competencies</CardDescription>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sort by Mastery:</span>
                                                <Select
                                                    value={topicSortDirection}
                                                    onValueChange={(val: any) => setTopicSortDirection(val)}
                                                >
                                                    <SelectTrigger className="w-40 h-10 rounded-xl border-slate-200 bg-white shadow-sm font-bold text-xs text-slate-700">
                                                        <SelectValue placeholder="Default" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 shadow-2xl p-1">
                                                        <SelectItem value="none" className="rounded-lg font-bold text-xs">Default Order</SelectItem>
                                                        <SelectItem value="desc" className="rounded-lg font-bold text-xs text-emerald-600">Highest Mastery First</SelectItem>
                                                        <SelectItem value="asc" className="rounded-lg font-bold text-xs text-rose-600">Lowest Mastery First</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <TabsList className="bg-slate-100/80 p-1 h-10 rounded-xl">
                                                <TabsTrigger value="bar" className="rounded-lg text-xs font-bold px-4 h-8">Target Attainment</TabsTrigger>
                                                <TabsTrigger value="ave" className="rounded-lg text-xs font-bold px-4 h-8">Mean Topic Score</TabsTrigger>
                                                <TabsTrigger value="radar" className="rounded-lg text-xs font-bold px-4 h-8">Competency Performance Map</TabsTrigger>
                                            </TabsList>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="h-[500px] px-8 pb-8">
                                        <TabsContent value="bar" className="h-full mt-0 animate-in fade-in duration-500">
                                            <div className="flex justify-start gap-6 mb-4 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                                                    <div className="w-3.5 h-3.5 rounded-md bg-[#10b981]" /> Mastery Level Topic (≥81%)
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                                                    <div className="w-3.5 h-3.5 rounded-md bg-[#f59e0b]" /> Monitoring Level Topic (70% - 80.99%)
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                                                    <div className="w-3.5 h-3.5 rounded-md bg-[#ef4444]" /> Priority Support Topic ({"<"}70%)
                                                </div>
                                            </div>
                                            <ResponsiveContainer width="100%" height="90%">
                                                <BarChart data={topicData} layout="vertical" margin={{ left: 30, right: 30, top: 10, bottom: 10 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                    <XAxis type="number" domain={[0, 100]} tickFormatter={(val) => `${val}%`} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} />
                                                    <YAxis
                                                        dataKey="topic"
                                                        type="category"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        width={180}
                                                        tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }}
                                                    />
                                                    <RechartsTooltip
                                                        cursor={{ fill: '#f8fafc' }}
                                                        contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                                        labelStyle={{ fontWeight: "900", color: "#1e293b", marginBottom: "4px" }}
                                                    />
                                                    <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ fontWeight: "bold", fontSize: "11px" }} />
                                                    <Bar dataKey="mastery_rate" name="Mastery Level Topic %" stackId="a" fill="#10b981" barSize={24} />
                                                    <Bar dataKey="monitoring_rate" name="Monitoring Level Topic %" stackId="a" fill="#f59e0b" barSize={24} />
                                                    <Bar dataKey="priority_rate" name="Priority Support Topic %" stackId="a" fill="#ef4444" barSize={24} radius={[0, 6, 6, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </TabsContent>

                                        <TabsContent value="ave" className="h-full mt-0 animate-in fade-in duration-500">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={topicData} margin={{ top: 20, right: 30, left: 30, bottom: 50 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis
                                                        dataKey="topic"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: "#475569", fontSize: 10, fontWeight: 700 }}
                                                        angle={-45}
                                                        textAnchor="end"
                                                        interval={0}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
                                                        domain={[0, 100]}
                                                        unit="%"
                                                    />
                                                    <RechartsTooltip
                                                        cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                                                        contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                                    />
                                                    <Bar
                                                        dataKey="mean_percentage"
                                                        name="Mean Topic Score %"
                                                        radius={[8, 8, 0, 0]}
                                                        barSize={40}
                                                    >
                                                        {topicData.map((entry, index) => {
                                                            let barColor = '#ef4444';
                                                            if (entry.mean_percentage >= 81) barColor = '#10b981';
                                                            else if (entry.mean_percentage >= 70) barColor = '#f59e0b';

                                                            return <Cell key={`cell-${index}`} fill={barColor} />;
                                                        })}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </TabsContent>

                                        <TabsContent value="radar" className="h-full mt-0 animate-in fade-in duration-500">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={topicData.map(t => ({
                                                    subject: t.topic,
                                                    A: t.mastery_rate,
                                                    fullMark: 100
                                                }))}>
                                                    <PolarGrid stroke="#e2e8f0" />
                                                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }} />
                                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                                                    <Radar
                                                        name="Target Attainment Rate (Mastery %)"
                                                        dataKey="A"
                                                        stroke="#6366f1"
                                                        fill="#6366f1"
                                                        fillOpacity={0.5}
                                                    />
                                                    <RechartsTooltip />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </TabsContent>
                                    </CardContent>
                                </Tabs>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
