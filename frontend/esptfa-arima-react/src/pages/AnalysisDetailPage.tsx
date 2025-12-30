import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
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
    Users,
    AlertCircle,
    CheckCircle2,
    Search,
    BrainCircuit,
    Info,
    HelpCircle,
    LineChart as LucideLineChart,
    Grid3X3,
    BarChart3,
} from "lucide-react";

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
    intervention: string;
    scores: Record<string, number>;
}

interface AnalysisDetails {
    document: AnalysisDocument;
    statistics: AnalysisStatistic;
    topics: TopicPerformance[];
    formative_assessments: FormativeAssessment[];
    student_performance: StudentPerformance[];
}

export default function AnalysisDetailPage() {
    const { docId } = useParams<{ docId: string }>();
    const [data, setData] = useState<AnalysisDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [matrixSearch, setMatrixSearch] = useState("");
    const [processing, setProcessing] = useState(false);

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

    const filteredStudents = data?.student_performance.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.lrn.includes(searchTerm)
    ) || [];

    const validPredictions = data?.student_performance.filter(s => s.predicted_score !== null) || [];
    const avgPredictedPoints = validPredictions.length > 0
        ? validPredictions.reduce((acc, s) => acc + (s.predicted_score || 0), 0) / validPredictions.length
        : 0;
    const maxPossiblePoints = data?.document.post_test_max_score || 60;
    const predictedMeanPercentage = (avgPredictedPoints / maxPossiblePoints) * 100;

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[80vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium">Loading analysis dashboard...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (processing) {
        return (
            <DashboardLayout>
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
            </DashboardLayout>
        );
    }

    if (!data) {
        return (
            <DashboardLayout>
                <div className="text-center py-20">
                    <h2 className="text-xl font-bold">Analysis not found</h2>
                    <Link to="/dashboard" className="text-indigo-600">Go back</Link>
                </div>
            </DashboardLayout>
        );
    }

    // Prepare data for the trend chart
    const trendData = [...data.formative_assessments].map(fa => ({
        name: fa.fa_topic_name || `FA${fa.formative_assessment_number}`,
        mean: Number(fa.mean.toFixed(2)),
        threshold: Number(fa.passing_threshold.toFixed(2)),
        topic: fa.fa_topic_name || `Test ${fa.formative_assessment_number}`
    }));

    // Prepare data for the topic performance chart
    const topicData = [...data.formative_assessments].map(fa => ({
        topic: fa.fa_topic_name || `FA${fa.formative_assessment_number}`,
        passing_rate: (fa.passing_rate || 0).toFixed(1),
        failing_rate: (fa.failing_rate || 0).toFixed(1),
    }));

    const getInterventionColor = (score: number | null, max: number = 60) => {
        if (!score) return "bg-slate-100 text-slate-700 border-slate-200";
        const percent = (score / max) * 100;
        if (percent < 75) return "bg-red-50 text-red-700 border-red-100";
        if (percent < 90) return "bg-amber-50 text-amber-700 border-amber-100";
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
    };

    const getScoreColor = (score: number, maxScore: number) => {
        const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
        if (percent >= 90) return "bg-emerald-500";
        if (percent >= 75) return "bg-amber-400";
        return "bg-red-500";
    };

    const InfoTooltip = ({ content }: { content: string }) => (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px] p-3 rounded-xl bg-slate-900 text-white border-none shadow-xl">
                    <p className="text-xs leading-relaxed">{content}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    return (
        <DashboardLayout>
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
                                <Badge className="bg-emerald-100 text-emerald-700 border-none px-3 py-1 font-bold">Processed</Badge>
                            </h1>
                            <p className="text-slate-500 font-medium">
                                {data.document.subject?.subject_name} • {data.document.quarter?.quarter_name} • {data.document.section_id?.section_name}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="bg-slate-100/50 p-1 rounded-xl h-12 mb-6 w-full md:w-auto overflow-x-auto overflow-y-hidden">
                        <TabsTrigger value="overview" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Dashboard Overview</TabsTrigger>
                        <TabsTrigger value="students" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Student Performance</TabsTrigger>
                        <TabsTrigger value="topics" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Topic Analysis</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { title: "Avg Class Score", value: data.statistics?.mean.toFixed(2), icon: TrendingUp, color: "blue", desc: "Global average across assessments", help: "The combined mean score of all students across all formative assessments recorded in this document." },
                                { title: "Target Threshold", value: data.statistics?.mean_passing_threshold.toFixed(2), icon: AlertCircle, color: "amber", desc: "Class passing target (75%)", help: "Calculated as 75% of the average maximum points across all tests. Students below this may need intervention." },
                                { title: "Predicted Mean", value: avgPredictedPoints.toFixed(1), icon: BrainCircuit, color: "indigo", desc: `Estimated Avg for Post-Test (${predictedMeanPercentage.toFixed(0)}%)`, help: "The average score our ARIMA model predicts the entire class will achieve in the upcoming Post-Test based on historical data." },
                                { title: "Class Success %", value: `${data.student_performance.length > 0 ? (data.student_performance.filter(s => (s.passing_rate || 0) >= 75).length / data.student_performance.length * 100).toFixed(0) : 0}%`, icon: CheckCircle2, color: "emerald", desc: "Students above passing rate", help: "Percentage of students who maintain a passing rate of 75% or higher across their assessments." },
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
                        {data.student_performance.filter(s => s.predicted_status === 'Fail').length > 0 && (
                            <Card className="border-none shadow-md ring-2 ring-red-500/10 rounded-3xl overflow-hidden bg-red-50/10 backdrop-blur-sm border-l-8 border-l-red-500">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xl font-black text-red-700 flex items-center gap-3">
                                            <AlertCircle className="h-6 w-6" />
                                            Immediate Intervention Priority
                                            <Badge className="bg-red-500 text-white border-none px-2 py-0.5 text-[10px] animate-pulse">ACTION REQUIRED</Badge>
                                        </CardTitle>
                                        <InfoTooltip content="These students are predicted to fail the upcoming post-test based on their current formative assessment performance." />
                                    </div>
                                    <CardDescription className="text-red-600/70 font-medium italic">
                                        {data.student_performance.filter(s => s.predicted_status === 'Fail').length} students are currently at high risk
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {data.student_performance.filter(s => s.predicted_status === 'Fail').slice(0, 8).map((student) => (
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
                                                        <p className="text-[9px] italic leading-tight">{student.intervention.split('.')[0]}.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ))}
                                        {data.student_performance.filter(s => s.predicted_status === 'Fail').length > 8 && (
                                            <Badge variant="outline" className="bg-red-100 border-red-200 text-red-700 font-black px-3 py-1.5 rounded-xl">
                                                +{data.student_performance.filter(s => s.predicted_status === 'Fail').length - 8} more
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Visualization Sub-Tabs */}
                        <Card className="border-none shadow-md ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm">
                            <Tabs defaultValue="distribution" className="w-full">
                                <div className="px-6 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-xl font-black flex items-center gap-2">
                                            Class Analytics Hub
                                            <InfoTooltip content="Navigate between different visualization modes to get a deep understanding of your class performance and trends." />
                                        </CardTitle>
                                        <CardDescription>Deep dive into patterns and individual progress</CardDescription>
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

                                    <TabsContent value="heatmap" className="mt-0 animate-in fade-in duration-500 overflow-visible">
                                        <div className="mb-6 flex items-center justify-between gap-4">
                                            <div className="relative w-72">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                                <Input
                                                    placeholder="Find student in matrix..."
                                                    value={matrixSearch}
                                                    onChange={(e) => setMatrixSearch(e.target.value)}
                                                    className="pl-9 h-9 rounded-xl border-slate-200 text-sm focus-visible:ring-indigo-600"
                                                />
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Mastery (≥90%)
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                                                    <div className="w-2 h-2 rounded-full bg-amber-400" /> Passing (≥75%)
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                                                    <div className="w-2 h-2 rounded-full bg-red-500" /> At Risk ({"<"}75%)
                                                </div>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm max-h-[500px]">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-50/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-20">
                                                    <tr>
                                                        <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-tighter w-48 bg-slate-50 border-r border-slate-100 sticky left-0 z-30">Student Name</th>
                                                        {data.formative_assessments.map(fa => (
                                                            <th key={fa.formative_assessment_number} className="px-2 py-4 font-bold text-slate-700 text-center uppercase tracking-tighter border-r border-slate-100/50">
                                                                {fa.fa_topic_name || `FA${fa.formative_assessment_number}`}
                                                            </th>
                                                        ))}
                                                        <th className="px-6 py-4 font-black text-indigo-700 text-center uppercase tracking-tighter bg-indigo-50/50">Predicted</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {data.student_performance
                                                        .filter(s => s.name.toLowerCase().includes(matrixSearch.toLowerCase()) || s.lrn.includes(matrixSearch))
                                                        .map((student) => (
                                                            <tr key={student.lrn} className="group hover:bg-slate-50/80 transition-colors">
                                                                <td className="px-6 py-3 font-bold text-slate-800 bg-white group-hover:bg-slate-50/80 border-r border-slate-100 sticky left-0 z-10 transition-colors">
                                                                    <Link to={`/dashboard/analysis/${data.document.analysis_document_id}/student/${student.lrn}`} className="hover:text-indigo-600 transition-colors">
                                                                        {student.name}
                                                                    </Link>
                                                                </td>
                                                                {data.formative_assessments.map(fa => {
                                                                    const score = student.scores?.[fa.formative_assessment_number];
                                                                    return (
                                                                        <td key={fa.formative_assessment_number} className="p-1 text-center border-r border-slate-50">
                                                                            {score !== undefined ? (
                                                                                <TooltipProvider>
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <div
                                                                                                className={`w-9 h-9 rounded-xl mx-auto flex items-center justify-center font-black text-white transition-all hover:scale-110 shadow-sm ${getScoreColor(score, fa.max_score)}`}
                                                                                            >
                                                                                                {Math.round(score)}
                                                                                            </div>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent side="top" className="bg-slate-900 text-white rounded-xl border-none p-3 shadow-2xl">
                                                                                            <div className="space-y-1">
                                                                                                <p className="text-xs font-black">{fa.fa_topic_name || `Assessment ${fa.formative_assessment_number}`}</p>
                                                                                                <div className="h-px bg-slate-700 my-1" />
                                                                                                <p className="text-xs">Score: <span className="font-bold">{score} / {fa.max_score}</span></p>
                                                                                                <p className="text-[10px] text-slate-400">Status: <span className={score >= fa.passing_threshold ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{score >= fa.passing_threshold ? "PASSING" : "AT RISK"}</span></p>
                                                                                            </div>
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                </TooltipProvider>
                                                                            ) : (
                                                                                <div className="w-9 h-9 rounded-xl mx-auto bg-slate-50 border-2 border-dashed border-slate-100" />
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="px-6 py-3 bg-indigo-50/20 text-center">
                                                                    <Badge className={`font-black rounded-lg px-3 py-1 shadow-sm ${student.predicted_status === 'Pass' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                                                        {student.predicted_score?.toFixed(1) || "N/A"}
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="distribution" className="mt-0 animate-in fade-in duration-500">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Donut Chart for Class Standing */}
                                            <Card className="border-none bg-slate-50/50 rounded-2xl p-6">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Class Standing</h4>
                                                    <InfoTooltip content="Distribution of student performance based on their mean scores compared to the passing target." />
                                                </div>
                                                <div className="h-[250px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={[
                                                                    { name: 'Mastery', value: data.student_performance.filter(s => s.mean >= 90).length, color: '#10b981' },
                                                                    { name: 'Passing', value: data.student_performance.filter(s => s.mean >= 75 && s.mean < 90).length, color: '#fbbf24' },
                                                                    { name: 'At Risk', value: data.student_performance.filter(s => s.mean < 75).length, color: '#ef4444' }
                                                                ].filter(d => d.value > 0)}
                                                                innerRadius={60}
                                                                outerRadius={80}
                                                                paddingAngle={5}
                                                                dataKey="value"
                                                            >
                                                                {([
                                                                    { name: 'Mastery', color: '#10b981' },
                                                                    { name: 'Proficient', color: '#6366f1' },
                                                                    { name: 'Developing', color: '#f59e0b' },
                                                                    { name: 'Remedial', color: '#ef4444' }
                                                                ]).map((entry, index) => (
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
                                                <h4 className="font-black text-slate-800 flex items-center gap-2">
                                                    Highest Performers
                                                    <Badge className="bg-emerald-500 text-white border-none">TOP 5</Badge>
                                                </h4>
                                                {[...data.student_performance].sort((a, b) => b.mean - a.mean).slice(0, 3).map((s, i) => (
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

                                                <h4 className="font-black text-slate-800 flex items-center gap-2 pt-2">
                                                    Requires Support
                                                    <Badge className="bg-orange-400 text-white border-none">REMEDIAL</Badge>
                                                </h4>
                                                {[...data.student_performance].sort((a, b) => a.mean - b.mean).slice(0, 2).map((s, i) => (
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
                                                            <span className="text-lg font-black text-orange-600 font-mono">{s.mean.toFixed(1)}</span>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>
                                </CardContent>
                            </Tabs>
                        </Card>
                    </TabsContent>

                    <TabsContent value="students" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-none shadow-md ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm">
                            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-8 gap-4 px-8 pt-8">
                                <div>
                                    <CardTitle className="text-2xl font-black flex items-center gap-3">
                                        Student Performance Registry
                                        <InfoTooltip content="Comprehensive view of all students, their historical averages, and ARIMA model predictions for the upcoming post-test." />
                                    </CardTitle>
                                    <CardDescription>Advanced predictions and pedagogical intervention guide</CardDescription>
                                </div>
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search by learner name or LRN..."
                                        className="pl-12 pr-4 rounded-2xl h-12 border-none ring-1 ring-slate-200 bg-white/80 focus-visible:ring-indigo-600 shadow-sm"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow className="hover:bg-transparent border-slate-100 h-14">
                                            <TableHead className="w-[300px] font-black text-slate-700 pl-8 uppercase text-[11px] tracking-widest">Student Information</TableHead>
                                            <TableHead className="font-black text-slate-700 text-center uppercase text-[11px] tracking-widest">Avg. Historical</TableHead>
                                            <TableHead className="font-black text-slate-700 text-center uppercase text-[11px] tracking-widest">
                                                <div className="flex items-center justify-center gap-2">
                                                    ARIMA Prediction
                                                    <InfoTooltip content="Score predicted by the ARIMA-XGBoost hybrid model for the upcoming evaluation." />
                                                </div>
                                            </TableHead>
                                            <TableHead className="font-black text-slate-700 uppercase text-[11px] tracking-widest text-center">Status</TableHead>
                                            <TableHead className="font-black text-slate-700 w-[400px] uppercase text-[11px] tracking-widest pr-8">Intervention Strategy</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStudents.length > 0 ? (
                                            filteredStudents.map((student) => (
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
                                                    <TableCell className="text-center">
                                                        <span className="px-3 py-1.5 rounded-lg bg-slate-50 font-bold text-slate-700 text-sm">
                                                            {student.mean.toFixed(1)}%
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-black text-indigo-600 text-xl tracking-tighter">
                                                                {student.predicted_score?.toFixed(1) || "N/A"}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">PREDICTED Score</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge className={`px-4 py-1 rounded-full border shadow-none font-black text-[10px] uppercase tracking-widest ${student.predicted_status === 'Pass'
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            : 'bg-red-50 text-red-600 border-red-100'
                                                            }`}>
                                                            {student.predicted_status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="pr-8">
                                                        <div className={`p-4 rounded-2xl border text-xs font-semibold leading-relaxed shadow-sm flex items-start gap-3 ${getInterventionColor(student.predicted_score)}`}>
                                                            <div className="mt-0.5">
                                                                <Info className="h-3.5 w-3.5 opacity-60" />
                                                            </div>
                                                            {student.intervention}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-40 text-center text-slate-400 font-medium">
                                                    No student records found matching "{searchTerm}"
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="topics" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-none shadow-md ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm">
                                <Tabs defaultValue="bar" className="w-full">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <div>
                                            <CardTitle className="text-2xl font-black">Topic Analysis</CardTitle>
                                            <CardDescription>Performance distribution and competency map</CardDescription>
                                        </div>
                                        <TabsList className="bg-slate-100/80 p-1 h-9 rounded-xl">
                                            <TabsTrigger value="bar" className="rounded-lg text-xs font-bold px-3">Success Rate</TabsTrigger>
                                            <TabsTrigger value="radar" className="rounded-lg text-xs font-bold px-3">Competency Map</TabsTrigger>
                                        </TabsList>
                                    </CardHeader>

                                    <CardContent className="h-[430px] pt-4">
                                        <TabsContent value="bar" className="h-full mt-0 animate-in fade-in duration-500">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={topicData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                    <XAxis type="number" hide />
                                                    <YAxis
                                                        dataKey="topic"
                                                        type="category"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        width={120}
                                                        tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }}
                                                    />
                                                    <RechartsTooltip
                                                        cursor={{ fill: '#f8fafc' }}
                                                        contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                                                    />
                                                    <Legend verticalAlign="top" align="right" height={40} iconType="circle" wrapperStyle={{ fontWeight: "bold", fontSize: "12px" }} />
                                                    <Bar dataKey="passing_rate" name="Pass Rate %" stackId="a" fill="#10b981" barSize={32} radius={[0, 0, 0, 0]} />
                                                    <Bar dataKey="failing_rate" name="Fail Rate %" stackId="a" fill="#ef4444" barSize={32} radius={[0, 8, 8, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </TabsContent>

                                        <TabsContent value="radar" className="h-full mt-0 animate-in fade-in duration-500">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={topicData.map(t => ({
                                                    subject: t.topic,
                                                    A: parseFloat(t.passing_rate),
                                                    fullMark: 100
                                                }))}>
                                                    <PolarGrid stroke="#e2e8f0" />
                                                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }} />
                                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                                                    <Radar
                                                        name="Mastery Level"
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

                            <div className="space-y-6">
                                <Card className="border-none shadow-md ring-1 ring-slate-200 rounded-3xl bg-red-50/20 backdrop-blur-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-3">
                                            <div className="bg-red-500 rounded-lg p-1.5">
                                                <AlertCircle className="h-5 w-5 text-white" />
                                            </div>
                                            Toughest Topics
                                            <InfoTooltip content="These topics have the highest failure rates and require immediate review or remedial sessions." />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {[...data.formative_assessments]
                                            .sort((a, b) => a.passing_rate - b.passing_rate)
                                            .slice(0, 2)
                                            .map((fa, i) => (
                                                <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-white/80 border border-red-100 shadow-sm transition-all hover:shadow-md">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center font-black text-red-600 text-xl">
                                                            !
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-800 text-lg leading-tight">{fa.fa_topic_name || `Assessment ${fa.formative_assessment_number}`}</p>
                                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-tight mt-1">Class Avg: {fa.mean.toFixed(1)} / {fa.max_score}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-3xl font-black text-red-600 leading-none">{(100 - fa.passing_rate).toFixed(0)}%</p>
                                                        <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mt-1">FAIL RATE</p>
                                                    </div>
                                                </div>
                                            ))}
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-md ring-1 ring-slate-200 rounded-3xl bg-emerald-50/20 backdrop-blur-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-3">
                                            <div className="bg-emerald-500 rounded-lg p-1.5">
                                                <CheckCircle2 className="h-5 w-5 text-white" />
                                            </div>
                                            Strongest Topics
                                            <InfoTooltip content="These topics show a high level of mastery across the class. Consider moving forward to more advanced modules." />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {[...data.formative_assessments]
                                            .sort((a, b) => b.passing_rate - a.passing_rate)
                                            .slice(0, 2)
                                            .map((fa, i) => (
                                                <div key={fa.id} className="flex items-center justify-between p-5 rounded-2xl bg-white/80 border border-emerald-100 shadow-sm transition-all hover:shadow-md">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center font-black text-emerald-600 text-xl">
                                                            ★
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-800 text-lg leading-tight">{fa.fa_topic_name || `Assessment ${fa.formative_assessment_number}`}</p>
                                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-tight mt-1">Class Avg: {fa.mean.toFixed(1)} / {fa.max_score}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-3xl font-black text-emerald-600 leading-none">{fa.passing_rate.toFixed(0)}%</p>
                                                        <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-1">PASS RATE</p>
                                                    </div>
                                                </div>
                                            ))}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
