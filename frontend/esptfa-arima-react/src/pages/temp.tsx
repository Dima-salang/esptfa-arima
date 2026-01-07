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
    ComposedChart,
    Area,
    Scatter,
    ScatterChart,
    ZAxis,
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
    Download,
    Filter,
    Users,
    Target,
    Award,
    Clock,
    BookOpen,
    TrendingDown,
    FileText,
    PieChart as LucidePieChart,
    Activity,
    Layers,
    Eye,
    EyeOff,
} from "lucide-react";
import ActualPostTestUploadModal from "@/components/ActualPostTestUploadModal";

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
    intervention: Record<string, string>;
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

const getTruePercentage = (s: StudentPerformance) => {
    if (s.max_possible_score && s.max_possible_score > 0) {
        const sum = s.sum_scores || 0;
        return (sum / s.max_possible_score) * 100;
    }
    return s.mean || 0;
};

const getScoreColor = (score: number, maxScore: number) => {
    const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
    if (percent >= 90) return "bg-emerald-500";
    if (percent >= 75) return "bg-blue-500";
    if (percent >= 60) return "bg-amber-500";
    return "bg-red-500";
};

const getPerformanceTier = (percent: number) => {
    if (percent >= 90) return { label: "Outstanding", color: "emerald", icon: Award };
    if (percent >= 85) return { label: "Excellent", color: "blue", icon: TrendingUp };
    if (percent >= 75) return { label: "Proficient", color: "indigo", icon: CheckCircle2 };
    if (percent >= 60) return { label: "Developing", color: "amber", icon: Clock };
    return { label: "Needs Support", color: "red", icon: AlertCircle };
};

const getInterventionColor = (score: number | null, max: number = 60) => {
    if (!score) return "bg-slate-50 text-slate-700 border-slate-200";
    const percent = (score / max) * 100;
    if (percent < 60) return "bg-red-50 text-red-700 border-red-200";
    if (percent < 75) return "bg-amber-50 text-amber-700 border-amber-200";
    if (percent < 90) return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
};

const InfoTooltip = ({ content }: { content: string }) => (
    <TooltipProvider>
        <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
                <button className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-help">
                    <Info className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs bg-slate-900 text-white text-xs p-3 rounded-xl shadow-2xl border-none">
                {content}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const InterpretationsCard = ({ data }: { data: AnalysisDetails }) => {
    const interpretations: {
        title: string;
        content: string;
        type: 'info' | 'success' | 'warning' | 'error';
        icon: any;
        recommendation?: string;
    }[] = [];

    const assessments = data.formative_assessments || [];

    if (assessments.length >= 2) {
        const firstHalf = assessments.slice(0, Math.ceil(assessments.length / 2));
        const secondHalf = assessments.slice(Math.ceil(assessments.length / 2));
        const firstAvg = firstHalf.reduce((acc, curr) => acc + (curr.mean / curr.max_score), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((acc, curr) => acc + (curr.mean / curr.max_score), 0) / secondHalf.length;
        const trend = secondAvg - firstAvg;

        if (trend > 0.1) {
            interpretations.push({
                title: "Positive Learning Trajectory",
                content: `Class average improved by ${(trend * 100).toFixed(1)}% across recent assessments.`,
                type: 'success',
                icon: TrendingUp,
                recommendation: "Continue current teaching strategies and consider peer tutoring for lower performers."
            });
        } else if (trend < -0.1) {
            interpretations.push({
                title: "Performance Decline Detected",
                content: `Average scores dropped ${Math.abs(trend * 100).toFixed(1)}%. Recent topics may be challenging.`,
                type: 'error',
                icon: TrendingDown,
                recommendation: "Schedule review sessions and consider breaking down complex topics into smaller units."
            });
        }
    }

    const passingCount = data.student_performance.filter(s => (s.passing_rate || 0) >= 75).length;
    const passingPercent = (passingCount / data.student_performance.length) * 100;

    if (passingPercent < 50) {
        interpretations.push({
            title: "Class-Wide Intervention Required",
            content: `Only ${passingPercent.toFixed(0)}% are meeting targets. Systemic review needed.`,
            type: 'error',
            icon: AlertCircle,
            recommendation: "Conduct diagnostic assessment to identify knowledge gaps and restructure lesson plans."
        });
    } else if (passingPercent > 85) {
        interpretations.push({
            title: "Exceptional Class Performance",
            content: `${passingPercent.toFixed(0)}% of students exceed expectations.`,
            type: 'success',
            icon: Award,
            recommendation: "Consider enrichment activities and advanced content for high achievers."
        });
    }

    if (assessments.length > 0) {
        const toughest = [...assessments].sort((a, b) => (a.mean / a.max_score) - (b.mean / b.max_score))[0];
        if (toughest && (toughest.mean / toughest.max_score) < 0.75) {
            interpretations.push({
                title: "Critical Topic Identified",
                content: `${toughest.fa_topic_name || `Assessment ${toughest.formative_assessment_number}`} shows lowest mastery (${((toughest.mean / toughest.max_score) * 100).toFixed(0)}%).`,
                type: 'warning',
                icon: BookOpen,
                recommendation: "Allocate extra class time for this topic and provide supplementary materials."
            });
        }
    }

    const avgPredicted = data.student_performance.reduce((acc, s) => acc + (s.predicted_score || 0), 0) / data.student_performance.length;
    const postMax = data.document.post_test_max_score || 60;
    const predictedPercent = (avgPredicted / postMax) * 100;

    if (predictedPercent < 75) {
        interpretations.push({
            title: "Post-Test Risk Alert",
            content: `Predicted class average: ${predictedPercent.toFixed(0)}% - below target.`,
            type: 'warning',
            icon: Target,
            recommendation: "Implement intensive review sessions and targeted remediation before post-test."
        });
    } else if (predictedPercent >= 85) {
        interpretations.push({
            title: "Strong Post-Test Readiness",
            content: `Class projected to achieve ${predictedPercent.toFixed(0)}% average.`,
            type: 'success',
            icon: CheckCircle2,
            recommendation: "Maintain current pace and consider challenge questions for advanced students."
        });
    }

    if (interpretations.length === 0) return null;

    return (
        <Card className="border-none shadow-lg ring-1 ring-slate-200/50 rounded-2xl overflow-hidden bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="pb-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <BrainCircuit className="h-5 w-5 text-indigo-600" />
                            </div>
                            AI-Powered Insights & Recommendations
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 mt-1">
                            Automated analysis with actionable teaching strategies
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="space-y-4">
                    {interpretations.map((item, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${item.type === 'success' ? 'bg-emerald-50/70 border-emerald-500' :
                            item.type === 'warning' ? 'bg-amber-50/70 border-amber-500' :
                                item.type === 'error' ? 'bg-red-50/70 border-red-500' :
                                    'bg-blue-50/70 border-blue-500'
                            }`}>
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg shrink-0 ${item.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                    item.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                                        item.type === 'error' ? 'bg-red-100 text-red-600' :
                                            'bg-blue-100 text-blue-600'
                                    }`}>
                                    <item.icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-slate-900 mb-1">{item.title}</h4>
                                    <p className="text-xs text-slate-600 leading-relaxed mb-2">{item.content}</p>
                                    {item.recommendation && (
                                        <div className="mt-2 pt-2 border-t border-slate-200/50">
                                            <p className="text-xs font-medium text-slate-700">
                                                <span className="font-bold">Recommended Action:</span> {item.recommendation}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

const ComparativeAnalysisCard = ({ data }: { data: AnalysisDetails }) => {
    const avgPredicted = data.student_performance.reduce((acc, s) => acc + (s.predicted_score || 0), 0) / data.student_performance.length;
    const avgActual = data.student_performance.filter(s => s.actual_score !== null).length > 0
        ? data.student_performance.filter(s => s.actual_score !== null).reduce((acc, s) => acc + (s.actual_score || 0), 0) / data.student_performance.filter(s => s.actual_score !== null).length
        : null;

    const hasActualScores = avgActual !== null;
    const accuracy = hasActualScores ? 100 - Math.abs(((avgActual - avgPredicted) / avgActual) * 100) : null;

    return (
        <Card className="border-none shadow-lg ring-1 ring-slate-200/50 rounded-2xl overflow-hidden bg-gradient-to-br from-white to-indigo-50/30">
            <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Activity className="h-4 w-4 text-indigo-600" />
                    </div>
                    Prediction vs Reality Analysis
                    <InfoTooltip content="Compare AI predictions with actual post-test results to evaluate model accuracy and student performance." />
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                {hasActualScores ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 rounded-xl bg-indigo-50">
                                <p className="text-xs font-semibold text-indigo-600 mb-1">PREDICTED</p>
                                <p className="text-2xl font-bold text-indigo-700">{avgPredicted.toFixed(1)}</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-emerald-50">
                                <p className="text-xs font-semibold text-emerald-600 mb-1">ACTUAL</p>
                                <p className="text-2xl font-bold text-emerald-700">{avgActual!.toFixed(1)}</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-blue-50">
                                <p className="text-xs font-semibold text-blue-600 mb-1">ACCURACY</p>
                                <p className="text-2xl font-bold text-blue-700">{accuracy!.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-slate-200">
                            <p className="text-xs text-slate-600">
                                {avgActual! > avgPredicted ? (
                                    <span className="text-emerald-600 font-semibold">
                                        ✓ Students exceeded predictions by {(avgActual! - avgPredicted).toFixed(1)} points
                                    </span>
                                ) : avgActual! < avgPredicted ? (
                                    <span className="text-amber-600 font-semibold">
                                        ⚠ Students scored {(avgPredicted - avgActual!).toFixed(1)} points below predictions
                                    </span>
                                ) : (
                                    <span className="text-blue-600 font-semibold">
                                        ✓ Perfect prediction - actual matches predicted scores
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500 font-medium">No actual post-test scores uploaded yet</p>
                        <p className="text-xs text-slate-400 mt-1">Upload results to see comparative analysis</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default function AnalysisDetailPageTemp() {
    const { docId } = useParams<{ docId: string }>();
    const [data, setData] = useState<AnalysisDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [performanceFilter, setPerformanceFilter] = useState("all");
    const [matrixSearch, setMatrixSearch] = useState("");
    const [matrixStatusFilter, setMatrixStatusFilter] = useState("all");
    const [processing, setProcessing] = useState(false);
    const [sortField, setSortField] = useState<keyof StudentPerformance>("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [showAllInterventions, setShowAllInterventions] = useState(false);

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
            const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.lrn.includes(searchTerm);
            const matchesStatus = statusFilter === "all" || s.predicted_status.toLowerCase() === statusFilter.toLowerCase();

            let matchesPerformance = true;
            if (performanceFilter !== "all") {
                const percent = getTruePercentage(s);
                if (performanceFilter === "outstanding") matchesPerformance = percent >= 90;
                else if (performanceFilter === "excellent") matchesPerformance = percent >= 85 && percent < 90;
                else if (performanceFilter === "proficient") matchesPerformance = percent >= 75 && percent < 85;
                else if (performanceFilter === "developing") matchesPerformance = percent >= 60 && percent < 75;
                else if (performanceFilter === "support") matchesPerformance = percent < 60;
            }

            return matchesSearch && matchesStatus && matchesPerformance;
        })
    );

    const matrixFilteredStudents = sortStudents(
        (data?.student_performance || []).filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(matrixSearch.toLowerCase()) || s.lrn.includes(matrixSearch);
            const matchesStatus = matrixStatusFilter === "all" || s.predicted_status.toLowerCase() === matrixStatusFilter.toLowerCase();
            return matchesSearch && matchesStatus;
        })
    );

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[80vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-600 font-semibold text-lg">Loading comprehensive analysis...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (processing) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6 px-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center animate-pulse">
                        <BrainCircuit className="w-12 h-12 text-indigo-600" />
                    </div>
                    <div className="space-y-3 max-w-lg">
                        <h2 className="text-3xl font-bold text-slate-900">AI Analysis in Progress</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Our advanced ARIMA model is processing student data to generate accurate predictions and personalized intervention strategies. This typically takes 2-3 minutes.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={() => globalThis.location.reload()} className="bg-indigo-600 hover:bg-indigo-700">
                            Check Status
                        </Button>
                        <Link to="/dashboard">
                            <Button variant="outline">Return to Dashboard</Button>
                        </Link>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!data) {
        return (
            <DashboardLayout>
                <div className="text-center py-20">
                    <AlertCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Analysis Not Found</h2>
                    <p className="text-slate-500 mb-6">The requested analysis document could not be located.</p>
                    <Link to="/dashboard">
                        <Button variant="default">Back to Dashboard</Button>
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    const trendData = [...data.formative_assessments].map(fa => ({
        name: fa.fa_topic_name || `FA${fa.formative_assessment_number}`,
        mean: Number(fa.mean.toFixed(2)),
        threshold: Number(fa.passing_threshold.toFixed(2)),
        passing_rate: fa.passing_rate,
        topic: fa.fa_topic_name || `Test ${fa.formative_assessment_number}`
    }));

    const topicData = [...data.formative_assessments].map(fa => ({
        topic: fa.fa_topic_name || `FA${fa.formative_assessment_number}`,
        passing_rate: (fa.passing_rate || 0).toFixed(1),
        failing_rate: (fa.failing_rate || 0).toFixed(1),
        mean: Number(fa.mean.toFixed(1)),
        mean_percentage: Number(((fa.mean / fa.max_score) * 100).toFixed(1)),
        max_score: fa.max_score
    }));

    const validPredictions = data.student_performance.filter(s => s.predicted_score !== null);
    const avgPredictedPoints = validPredictions.length > 0
        ? validPredictions.reduce((acc, s) => acc + (s.predicted_score || 0), 0) / validPredictions.length
        : 0;
    const maxPossiblePoints = data.document.post_test_max_score || 60;
    const predictedMeanPercentage = (avgPredictedPoints / maxPossiblePoints) * 100;

    // Performance distribution
    const performanceDistribution = {
        outstanding: data.student_performance.filter(s => getTruePercentage(s) >= 90).length,
        excellent: data.student_performance.filter(s => { const p = getTruePercentage(s); return p >= 85 && p < 90; }).length,
        proficient: data.student_performance.filter(s => { const p = getTruePercentage(s); return p >= 75 && p < 85; }).length,
        developing: data.student_performance.filter(s => { const p = getTruePercentage(s); return p >= 60 && p < 75; }).length,
        support: data.student_performance.filter(s => getTruePercentage(s) < 60).length,
    };

    const failingStudents = data.student_performance.filter(s => s.predicted_status === 'Fail');

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-8">
                {/* Enhanced Header with Quick Actions */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 -mx-6 -mt-6 px-6 pt-6 pb-8 mb-6 rounded-b-3xl shadow-xl">
                    <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="flex items-start gap-4">
                            <Link to="/dashboard">
                                <Button variant="secondary" size="icon" className="rounded-xl shadow-lg hover:shadow-xl transition-all bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div className="text-white">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-bold">{data.document.analysis_doc_title}</h1>
                                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1 font-semibold">
                                        Analyzed
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-indigo-100">
                                    <span className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        {data.document.subject?.subject_name}
                                    </span>
                                    <span>•</span>
                                    <span>{data.document.quarter?.quarter_name}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        {data.document.section_id?.section_name}
                                    </span>
                                    <span>•</span>
                                    <span>{data.student_performance.length} Students</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm rounded-xl shadow-lg gap-2">
                                <Download className="h-4 w-4" />
                                Export Report
                            </Button>
                            <ActualPostTestUploadModal
                                analysisDocumentId={Number(docId)}
                                students={data.student_performance}
                                maxScore={data.document.post_test_max_score || 60}
                                onSuccess={() => globalThis.location.reload()}
                            />
                        </div>
                    </div>

                    {/* Quick Stats Banner */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            {
                                label: "Class Average",
                                value: `${data.statistics?.mean.toFixed(1)}%`,
                                icon: TrendingUp,
                                color: "bg-white/10",
                                trend: data.formative_assessments.length >= 2 ? (
                                    data.formative_assessments[data.formative_assessments.length - 1].mean >
                                        data.formative_assessments[0].mean ? "+ve" : "-ve"
                                ) : null
                            },
                            {
                                label: "Passing Rate",
                                value: `${((data.student_performance.filter(s => (s.passing_rate || 0) >= 75).length / data.student_performance.length) * 100).toFixed(0)}%`,
                                icon: Target,
                                color: "bg-white/10"
                            },
                            {
                                label: "At Risk",
                                value: failingStudents.length.toString(),
                                icon: AlertCircle,
                                color: "bg-red-500/20",
                                alert: failingStudents.length > 0
                            },
                            {
                                label: "Top Performers",
                                value: performanceDistribution.outstanding.toString(),
                                icon: Award,
                                color: "bg-emerald-500/20"
                            },
                            {
                                label: "Predicted Avg",
                                value: `${avgPredictedPoints.toFixed(1)}`,
                                icon: BrainCircuit,
                                color: "bg-purple-500/20",
                                subtitle: `${predictedMeanPercentage.toFixed(0)}%`
                            },
                        ].map((stat, idx) => (
                            <div key={idx} className={`${stat.color} backdrop-blur-sm rounded-xl p-4 border border-white/20`}>
                                <div className="flex items-center justify-between mb-2">
                                    <stat.icon className={`h-5 w-5 ${stat.alert ? 'text-red-200' : 'text-white/80'}`} />
                                    {stat.trend && (
                                        <Badge className={`text-[9px] px-2 py-0 ${stat.trend === '+ve' ? 'bg-emerald-500/30 text-emerald-100' : 'bg-red-500/30 text-red-100'
                                            } border-none`}>
                                            {stat.trend === '+ve' ? '↑' : '↓'}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                                <p className="text-xs text-white/70 font-medium">{stat.label}</p>
                                {stat.subtitle && (
                                    <p className="text-[10px] text-white/50 mt-1">{stat.subtitle}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Critical Alerts Section */}
                {failingStudents.length > 0 && (
                    <Card className="border-l-4 border-l-red-500 shadow-lg bg-red-50/50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <AlertCircle className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-bold text-red-900">
                                            Priority Intervention Required
                                        </CardTitle>
                                        <CardDescription className="text-red-700">
                                            {failingStudents.length} student{failingStudents.length > 1 ? 's' : ''} predicted to fail post-test
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge className="bg-red-600 text-white animate-pulse">URGENT</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {failingStudents.slice(0, showAllInterventions ? undefined : 8).map((student) => (
                                        <TooltipProvider key={student.lrn}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Link to={`/dashboard/analysis/${data.document.analysis_document_id}/student/${student.lrn}`}>
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-white hover:bg-red-50 border-red-300 text-red-800 font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                                                        >
                                                            {student.name}
                                                            <span className="ml-2 text-red-600 font-bold">
                                                                {student.predicted_score?.toFixed(0)}
                                                            </span>
                                                        </Badge>
                                                    </Link>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs bg-slate-900 text-white rounded-xl p-4">
                                                    <p className="font-bold mb-1">{student.name}</p>
                                                    <p className="text-xs text-slate-400 mb-2">LRN: {student.lrn}</p>
                                                    <div className="border-t border-slate-700 pt-2 mt-2">
                                                        <p className="text-xs text-red-400 font-semibold mb-1">
                                                            Predicted: {student.predicted_score?.toFixed(1)} ({student.prediction_score_percent.toFixed(0)}%)
                                                        </p>
                                                        <p className="text-xs leading-relaxed">
                                                            {Object.values(student.intervention)[0]?.substring(0, 100)}...
                                                        </p>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ))}
                                    {failingStudents.length > 8 && !showAllInterventions && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowAllInterventions(true)}
                                            className="border-red-300 text-red-700 hover:bg-red-50"
                                        >
                                            +{failingStudents.length - 8} more
                                        </Button>
                                    )}
                                    {showAllInterventions && failingStudents.length > 8 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowAllInterventions(false)}
                                            className="border-red-300 text-red-700 hover:bg-red-50"
                                        >
                                            Show less
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* AI Insights & Comparative Analysis Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <InterpretationsCard data={data} />
                    </div>
                    <ComparativeAnalysisCard data={data} />
                </div>

                {/* Main Tabbed Interface */}
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="bg-slate-100 p-1.5 rounded-xl h-auto mb-6 w-full md:w-auto flex flex-wrap gap-1">
                        <TabsTrigger value="overview" className="rounded-lg px-4 py-2.5 font-semibold text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                            <LucideLineChart className="h-4 w-4" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="students" className="rounded-lg px-4 py-2.5 font-semibold text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Students
                        </TabsTrigger>
                        <TabsTrigger value="topics" className="rounded-lg px-4 py-2.5 font-semibold text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Topics
                        </TabsTrigger>
                        <TabsTrigger value="heatmap" className="rounded-lg px-4 py-2.5 font-semibold text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                            <Grid3X3 className="h-4 w-4" />
                            Grade Matrix
                        </TabsTrigger>
                        <TabsTrigger value="distribution" className="rounded-lg px-4 py-2.5 font-semibold text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                            <LucidePieChart className="h-4 w-4" />
                            Distribution
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab Content */}
                    <TabsContent value="overview" className="space-y-6 mt-0">
                        {/* Class Performance Trend Card */}
                        <Card className="border-none shadow-lg ring-1 ring-slate-200/50 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm transition-all hover:shadow-xl">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                                            <LucideLineChart className="h-5 w-5 text-indigo-600" />
                                            Class Performance Trend
                                            <InfoTooltip content="Track how class average evolves across assessments. The Indigo line shows actual performance progression, while the Dashed Amber line indicates the passing threshold standard." />
                                        </CardTitle>
                                        <CardDescription>Longitudinal analysis of learning progression and mastery growth</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                                            domain={[0, 100]}
                                            unit="%"
                                        />
                                        <RechartsTooltip
                                            contentStyle={{
                                                borderRadius: "16px",
                                                border: "none",
                                                boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.15)",
                                                padding: "16px",
                                                backgroundColor: "rgba(255, 255, 255, 0.95)",
                                                backdropFilter: "blur(8px)"
                                            }}
                                            labelStyle={{ fontWeight: "900", color: "#1e293b", marginBottom: "8px", textTransform: "uppercase", fontSize: "10px", letterSpacing: "1px" }}
                                        />
                                        <Legend
                                            verticalAlign="top"
                                            align="right"
                                            iconType="circle"
                                            wrapperStyle={{ paddingBottom: "20px", fontWeight: "700", fontSize: "12px", color: "#475569" }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="passing_rate"
                                            name="Pass Rate %"
                                            fill="#10b981"
                                            fillOpacity={0.08}
                                            stroke="none"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="mean"
                                            name="Class Average"
                                            stroke="#6366f1"
                                            strokeWidth={4}
                                            dot={{ r: 6, fill: "#6366f1", strokeWidth: 3, stroke: "#fff" }}
                                            activeDot={{ r: 8, strokeWidth: 2 }}
                                        />
                                        <Line
                                            type="stepAfter"
                                            dataKey="threshold"
                                            name="Passing Threshold"
                                            stroke="#f59e0b"
                                            strokeWidth={2}
                                            strokeDasharray="6 6"
                                            dot={false}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Topic Mastery Comparison Bar Chart */}
                            <Card className="border-none shadow-lg ring-1 ring-slate-200/50 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm transition-all hover:shadow-xl">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                                            <BarChart3 className="h-5 w-5 text-indigo-600" />
                                            Topic Mastery Comparison
                                            <InfoTooltip content="Normalized comparison of mastery levels across all assessments. Color indicates performance tier." />
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topicData} margin={{ bottom: 60, top: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="topic"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: "#475569", fontSize: 10, fontWeight: 600 }}
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
                                                cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                                                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                            />
                                            <Bar
                                                dataKey="mean_percentage"
                                                name="Mastery %"
                                                radius={[6, 6, 0, 0]}
                                                barSize={32}
                                            >
                                                {topicData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={
                                                            entry.mean_percentage >= 90 ? '#10b981' :
                                                                entry.mean_percentage >= 75 ? '#6366f1' :
                                                                    entry.mean_percentage >= 60 ? '#f59e0b' : '#ef4444'
                                                        }
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Performance Spread Scatter Chart */}
                            <Card className="border-none shadow-lg ring-1 ring-slate-200/50 rounded-2xl bg-white/50 backdrop-blur-sm transition-all hover:shadow-xl">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-indigo-600" />
                                        Performance Spread
                                        <InfoTooltip content="Visual mapping of individual student performance consistency. Dense clusters indicate class-wide mastery or common struggles." />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                            <XAxis
                                                type="number"
                                                dataKey="index"
                                                name="Student Index"
                                                hide
                                            />
                                            <YAxis
                                                type="number"
                                                dataKey="percentage"
                                                name="Score"
                                                unit="%"
                                                domain={[0, 100]}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
                                            />
                                            <ZAxis range={[100, 101]} />
                                            <RechartsTooltip
                                                cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }}
                                                contentStyle={{
                                                    borderRadius: "12px",
                                                    border: "none",
                                                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                                    padding: "12px"
                                                }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const d = payload[0].payload;
                                                        const t = getPerformanceTier(d.percentage);
                                                        return (
                                                            <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100 min-w-[170px]">
                                                                <p className="font-bold text-xs text-slate-900 mb-1">{d.name}</p>
                                                                <div className="flex items-center justify-between gap-4 mt-2">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</span>
                                                                    <span className={`text-sm font-black text-${t.color}-600`}>{d.percentage.toFixed(1)}%</span>
                                                                </div>
                                                                <div className="mt-1">
                                                                    <Badge className={`bg-${t.color}-100 text-${t.color}-700 border-none text-[9px] font-black px-1.5 py-0`}>
                                                                        {t.label}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Scatter
                                                name="Students"
                                                data={data.student_performance.map((s, idx) => ({
                                                    index: idx + 1,
                                                    percentage: getTruePercentage(s),
                                                    name: s.name,
                                                    status: s.predicted_status
                                                }))}
                                            >
                                                {data.student_performance.map((s, idx) => {
                                                    const perf = getTruePercentage(s);
                                                    const color = perf >= 90 ? '#10b981' :
                                                        perf >= 75 ? '#6366f1' :
                                                            perf >= 60 ? '#f59e0b' : '#ef4444';
                                                    return <Cell key={idx} fill={color} strokeWidth={2} stroke="#fff" />;
                                                })}
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Students Tab Content */}
                    <TabsContent value="students" className="mt-0">
                        <Card className="border-none shadow-lg ring-1 ring-slate-200/50 rounded-2xl overflow-hidden transition-all hover:shadow-xl">
                            <CardHeader className="pb-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                            <Users className="h-6 w-6 text-indigo-600" />
                                            Student Performance Registry
                                            <InfoTooltip content="Comprehensive student-level analytics with AI predictions and intervention strategies. Use filters and search to find specific student cohorts." />
                                        </CardTitle>
                                        <CardDescription className="mt-1">Individual analysis with predictive insights and personalized recommendations</CardDescription>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                placeholder="Search name or LRN..."
                                                className="pl-10 w-full sm:w-64 h-11 rounded-xl border-slate-200 focus-visible:ring-indigo-600 transition-all focus:shadow-md"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-full sm:w-40 h-11 rounded-xl border-slate-200 font-semibold transition-all hover:bg-slate-50">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="all" className="font-semibold">All Status</SelectItem>
                                                <SelectItem value="pass" className="font-semibold text-emerald-600">Predicted Pass</SelectItem>
                                                <SelectItem value="fail" className="font-semibold text-red-600">Predicted Fail</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
                                            <SelectTrigger className="w-full sm:w-44 h-11 rounded-xl border-slate-200 font-semibold transition-all hover:bg-slate-50">
                                                <SelectValue placeholder="Performance" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="all" className="font-semibold">All Levels</SelectItem>
                                                <SelectItem value="outstanding" className="font-semibold text-emerald-600">Outstanding (≥90%)</SelectItem>
                                                <SelectItem value="excellent" className="font-semibold text-blue-600">Excellent (85-89%)</SelectItem>
                                                <SelectItem value="proficient" className="font-semibold text-indigo-600">Proficient (75-84%)</SelectItem>
                                                <SelectItem value="developing" className="font-semibold text-amber-600">Developing (60-74%)</SelectItem>
                                                <SelectItem value="support" className="font-semibold text-red-600">Needs Support (&lt;60%)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-200">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead
                                                    className="w-[280px] font-bold text-slate-700 pl-6 cursor-pointer hover:text-indigo-600 transition-colors"
                                                    onClick={() => handleSort("name")}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        Student
                                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                                    </div>
                                                </TableHead>
                                                <TableHead
                                                    className="font-bold text-slate-700 text-center cursor-pointer hover:text-indigo-600 transition-colors"
                                                    onClick={() => handleSort("mean")}
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        Performance
                                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                                    </div>
                                                </TableHead>
                                                <TableHead
                                                    className="font-bold text-slate-700 text-center cursor-pointer hover:text-indigo-600 transition-colors"
                                                    onClick={() => handleSort("predicted_score")}
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        AI Prediction
                                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                                        <InfoTooltip content="Predicted post-test score based on ARIMA model analysis of longitudinal formative data." />
                                                    </div>
                                                </TableHead>
                                                <TableHead
                                                    className="font-bold text-slate-700 text-center cursor-pointer hover:text-indigo-600 transition-colors"
                                                    onClick={() => handleSort("actual_score")}
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        Actual Score
                                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                                    </div>
                                                </TableHead>
                                                <TableHead className="font-bold text-slate-700 text-center">
                                                    Status
                                                </TableHead>
                                                <TableHead className="font-bold text-slate-700 w-[380px] pr-6">
                                                    Intervention Strategy
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="bg-white">
                                            {filteredStudents.length > 0 ? (
                                                filteredStudents.map((student) => {
                                                    const tier = getPerformanceTier(getTruePercentage(student));
                                                    return (
                                                        <TableRow
                                                            key={student.lrn}
                                                            className="group hover:bg-slate-50/50 transition-all border-slate-100"
                                                        >
                                                            <TableCell className="pl-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br from-${tier.color}-100 to-${tier.color}-200 flex items-center justify-center text-${tier.color}-700 font-bold text-lg group-hover:scale-110 transition-transform shadow-sm`}>
                                                                        {student.name.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <Link
                                                                            to={`/dashboard/analysis/${data.document.analysis_document_id}/student/${student.lrn}`}
                                                                            className="font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                                                                        >
                                                                            {student.name}
                                                                        </Link>
                                                                        <p className="text-xs text-slate-500 font-mono">{student.lrn}</p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span className="text-2xl font-bold text-slate-900 leading-none">
                                                                        {getTruePercentage(student).toFixed(1)}%
                                                                    </span>
                                                                    <Badge
                                                                        className={`bg-${tier.color}-100 text-${tier.color}-700 border-none text-[10px] font-bold px-2 py-0.5 hover:bg-${tier.color}-200`}
                                                                    >
                                                                        {tier.label}
                                                                    </Badge>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-xl font-bold text-indigo-600 leading-none">
                                                                        {student.predicted_score?.toFixed(1) || "N/A"}
                                                                    </span>
                                                                    {student.predicted_score && (
                                                                        <span className="text-[10px] text-slate-500 font-semibold mt-1">
                                                                            {student.prediction_score_percent.toFixed(0)}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {student.actual_score !== null ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="text-xl font-bold text-emerald-600 leading-none">
                                                                            {student.actual_score}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-500 font-semibold mt-1">
                                                                            / {student.actual_max}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300 text-sm italic">Pending</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge
                                                                    className={`px-3 py-1 rounded-full font-bold text-xs ${student.predicted_status === 'Pass'
                                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                        : 'bg-red-100 text-red-700 border-red-200'
                                                                        } border transition-all hover:scale-105`}
                                                                >
                                                                    {student.predicted_status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="pr-6">
                                                                <div className={`p-3 rounded-xl border text-xs leading-relaxed transition-all group-hover:shadow-md ${getInterventionColor(student.predicted_score)}`}>
                                                                    {Object.entries(student.intervention).map(([label, action], idx) => (
                                                                        <div key={idx} className="mb-2 last:mb-0">
                                                                            <span className="font-bold text-[10px] uppercase tracking-wide block mb-1 opacity-70">
                                                                                {label}:
                                                                            </span>
                                                                            <span className="block font-medium">{action}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-48 text-center pt-10">
                                                        <div className="flex flex-col items-center gap-4">
                                                            <div className="p-4 bg-slate-50 rounded-full">
                                                                <Search className="h-10 w-10 text-slate-300" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-slate-900 font-bold text-lg">No students found</p>
                                                                <p className="text-slate-500 text-sm">Try adjusting your filters or search keywords</p>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => { setSearchTerm(""); setStatusFilter("all"); setPerformanceFilter("all"); }}
                                                                className="mt-2"
                                                            >
                                                                Reset all filters
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Topics Tab */}
                    <TabsContent value="topics" className="mt-0 space-y-6" >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Weakest Topics */}
                            <Card className="border-l-4 border-l-red-500 shadow-lg bg-gradient-to-br from-red-50/50 to-white">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-red-900">
                                        <AlertCircle className="h-5 w-5" />
                                        Topics Requiring Immediate Attention
                                    </CardTitle>
                                    <CardDescription>Lowest performing assessments</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {[...data!.formative_assessments]
                                        .sort((a, b) => (a.mean / a.max_score) - (b.mean / b.max_score))
                                        .slice(0, 3)
                                        .map((fa, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white border border-red-100 hover:shadow-md transition-all">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center font-black text-red-600 shrink-0">
                                                        {i + 1}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-slate-900 text-sm truncate">
                                                            {fa.fa_topic_name || `Assessment ${fa.formative_assessment_number}`}
                                                        </p>
                                                        <p className="text-xs text-slate-500 font-medium">
                                                            Avg: {fa.mean.toFixed(1)}/{fa.max_score} • {((fa.mean / fa.max_score) * 100).toFixed(0)}% mastery
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0 ml-3">
                                                    <p className="text-2xl font-black text-red-600">{(100 - fa.passing_rate).toFixed(0)}%</p>
                                                    <p className="text-[9px] text-red-500 font-bold uppercase tracking-wide">Fail Rate</p>
                                                </div>
                                            </div>
                                        ))}
                                </CardContent>
                            </Card>

                            {/* Strongest Topics */}
                            <Card className="border-l-4 border-l-emerald-500 shadow-lg bg-gradient-to-br from-emerald-50/50 to-white">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-900">
                                        <CheckCircle2 className="h-5 w-5" />
                                        Strongest Performing Topics
                                    </CardTitle>
                                    <CardDescription>Highest mastery assessments</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {[...data.formative_assessments]
                                        .sort((a, b) => (b.mean / b.max_score) - (a.mean / a.max_score))
                                        .slice(0, 3)
                                        .map((fa, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white border border-emerald-100 hover:shadow-md transition-all">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center font-black text-emerald-600 shrink-0">
                                                        {i + 1}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-slate-900 text-sm truncate">
                                                            {fa.fa_topic_name || `Assessment ${fa.formative_assessment_number}`}
                                                        </p>
                                                        <p className="text-xs text-slate-500 font-medium">
                                                            Avg: {fa.mean.toFixed(1)}/{fa.max_score} • {((fa.mean / fa.max_score) * 100).toFixed(0)}% mastery
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0 ml-3">
                                                    <p className="text-2xl font-black text-emerald-600">{fa.passing_rate.toFixed(0)}%</p>
                                                    <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-wide">Pass Rate</p>
                                                </div>
                                            </div>
                                        ))}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detailed Topic Breakdown */}
                        <Card className="border-none shadow-lg ring-1 ring-slate-200/50 rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-indigo-600" />
                                    Comprehensive Topic Breakdown
                                    <InfoTooltip content="Detailed performance metrics for each assessment including pass/fail distribution" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead className="font-bold text-slate-700">Topic/Assessment</TableHead>
                                                <TableHead className="font-bold text-slate-700 text-center">Class Average</TableHead>
                                                <TableHead className="font-bold text-slate-700 text-center">Mastery Level</TableHead>
                                                <TableHead className="font-bold text-slate-700 text-center">Pass Rate</TableHead>
                                                <TableHead className="font-bold text-slate-700 text-center">Fail Rate</TableHead>
                                                <TableHead className="font-bold text-slate-700 text-center">Max Score</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.formative_assessments.map((fa, idx) => {
                                                const masteryPercent = (fa.mean / fa.max_score) * 100;
                                                const masteryTier = masteryPercent >= 90 ? 'Outstanding' :
                                                    masteryPercent >= 75 ? 'Proficient' :
                                                        masteryPercent >= 60 ? 'Developing' : 'Needs Support';
                                                const tierColor = masteryPercent >= 90 ? 'emerald' :
                                                    masteryPercent >= 75 ? 'blue' :
                                                        masteryPercent >= 60 ? 'amber' : 'red';

                                                return (
                                                    <TableRow key={idx} className="hover:bg-slate-50/50">
                                                        <TableCell className="font-semibold text-slate-900">
                                                            {fa.fa_topic_name || `Assessment ${fa.formative_assessment_number}`}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="font-bold text-slate-900 text-lg">
                                                                {fa.mean.toFixed(1)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className={`text-lg font-bold text-${tierColor}-600`}>
                                                                    {masteryPercent.toFixed(0)}%
                                                                </span>
                                                                <Badge className={`bg-${tierColor}-100 text-${tierColor}-700 border-none text-[10px] px-2 py-0`}>
                                                                    {masteryTier}
                                                                </Badge>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-emerald-600 font-bold text-lg">
                                                                {fa.passing_rate.toFixed(0)}%
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-red-600 font-bold text-lg">
                                                                {fa.failing_rate.toFixed(0)}%
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-slate-600 font-semibold">
                                                                {fa.max_score}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Radar Chart for Topic Comparison */}
                        <Card className="border-none shadow-lg ring-1 ring-slate-200/50 rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-indigo-600" />
                                    Competency Radar Map
                                    <InfoTooltip content="Visual representation of class competency across all topics" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={topicData.map(t => ({
                                        subject: t.topic,
                                        mastery: parseFloat(t.passing_rate),
                                        fullMark: 100
                                    }))}>
                                        <PolarGrid stroke="#e2e8f0" strokeWidth={1.5} />
                                        <PolarAngleAxis
                                            dataKey="subject"
                                            tick={{ fill: "#64748b", fontSize: 11, fontWeight: "600" }}
                                        />
                                        <PolarRadiusAxis
                                            angle={90}
                                            domain={[0, 100]}
                                            tick={{ fontSize: 10, fill: "#94a3b8" }}
                                        />
                                        <Radar
                                            name="Pass Rate"
                                            dataKey="mastery"
                                            stroke="#6366f1"
                                            fill="#6366f1"
                                            fillOpacity={0.6}
                                            strokeWidth={2}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{
                                                borderRadius: "12px",
                                                border: "none",
                                                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
                                            }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Grade Matrix/Heatmap Tab */}
                    <TabsContent value="heatmap" className="mt-0">
                        <Card className="border-none shadow-lg ring-1 ring-slate-200/50 rounded-2xl overflow-hidden">
                            <CardHeader className="pb-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                            <Grid3X3 className="h-6 w-6 text-indigo-600" />
                                            Interactive Grade Matrix
                                            <InfoTooltip content="Color-coded performance matrix showing each student's score on every assessment" />
                                        </CardTitle>
                                        <CardDescription className="mt-1">Visual representation of individual performance patterns</CardDescription>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                placeholder="Find student..."
                                                value={matrixSearch}
                                                onChange={(e) => setMatrixSearch(e.target.value)}
                                                className="pl-10 w-full sm:w-64 h-11 rounded-xl border-slate-200"
                                            />
                                        </div>
                                        <Select value={matrixStatusFilter} onValueChange={setMatrixStatusFilter}>
                                            <SelectTrigger className="w-full sm:w-40 h-11 rounded-xl border-slate-200 font-semibold">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="all" className="font-semibold">All Status</SelectItem>
                                                <SelectItem value="pass" className="font-semibold text-emerald-600">Pass</SelectItem>
                                                <SelectItem value="fail" className="font-semibold text-red-600">Fail</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-200">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                        <div className="w-3 h-3 rounded bg-emerald-500" />
                                        Outstanding (≥90%)
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                        <div className="w-3 h-3 rounded bg-blue-500" />
                                        Proficient (75-89%)
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                        <div className="w-3 h-3 rounded bg-amber-500" />
                                        Developing (60-74%)
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                        <div className="w-3 h-3 rounded bg-red-500" />
                                        At Risk (&lt;60%)
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <div className="inline-block min-w-full align-middle">
                                        <table className="min-w-full">
                                            <thead className="bg-slate-50 sticky top-0 z-20 border-b-2 border-slate-200">
                                                <tr>
                                                    <th className="px-6 py-4 text-left font-bold text-slate-700 text-xs uppercase tracking-wider w-56 bg-slate-50 sticky left-0 z-30 border-r border-slate-200">
                                                        Student Name
                                                    </th>
                                                    {data!.formative_assessments.map(fa => (
                                                        <th
                                                            key={fa.formative_assessment_number}
                                                            className="px-3 py-4 text-center font-bold text-slate-700 text-xs uppercase tracking-tight border-r border-slate-100"
                                                        >
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="truncate max-w-[120px]">
                                                                    {fa.fa_topic_name || `FA${fa.formative_assessment_number}`}
                                                                </span>
                                                                <span className="text-[10px] text-slate-500 font-medium">
                                                                    (max: {fa.max_score})
                                                                </span>
                                                            </div>
                                                        </th>
                                                    ))}
                                                    <th className="px-6 py-4 text-center font-bold text-indigo-700 text-xs uppercase tracking-wider bg-indigo-50/50 sticky right-0 z-30">
                                                        Predicted Score
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-100">
                                                {matrixFilteredStudents.map((student) => (
                                                    <tr key={student.lrn} className="group hover:bg-slate-50/70 transition-colors">
                                                        <td className="px-6 py-3 font-semibold text-slate-900 bg-white group-hover:bg-slate-50/70 border-r border-slate-200 sticky left-0 z-10">
                                                            <Link
                                                                to={`/dashboard/analysis/${data.document.analysis_document_id}/student/${student.lrn}`}
                                                                className="hover:text-indigo-600 transition-colors flex items-center gap-2"
                                                            >
                                                                {student.name}
                                                                <Eye className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                                            </Link>
                                                        </td>
                                                        {data!.formative_assessments.map(fa => {
                                                            const score = student.scores?.[fa.formative_assessment_number];
                                                            return (
                                                                <td key={fa.formative_assessment_number} className="p-2 text-center border-r border-slate-50">
                                                                    {score !== undefined ? (
                                                                        <TooltipProvider>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <div
                                                                                        className={`w-11 h-11 rounded-lg mx-auto flex items-center justify-center font-bold text-white transition-all hover:scale-110 shadow-sm cursor-pointer ${getScoreColor(score, fa.max_score)}`}
                                                                                    >
                                                                                        {Math.round(score)}
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top" className="bg-slate-900 text-white rounded-xl border-none p-3 shadow-2xl">
                                                                                    <div className="space-y-1">
                                                                                        <p className="text-xs font-bold">{fa.fa_topic_name || `Assessment ${fa.formative_assessment_number}`}</p>
                                                                                        <div className="h-px bg-slate-700 my-2" />
                                                                                        <p className="text-xs">Score: <span className="font-bold">{score} / {fa.max_score}</span></p>
                                                                                        <p className="text-xs">
                                                                                            Percentage: <span className="font-bold">{((score / fa.max_score) * 100).toFixed(1)}%</span>
                                                                                        </p>
                                                                                        <p className="text-[10px] text-slate-400">
                                                                                            Status: <span className={score >= fa.passing_threshold ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                                                                                {score >= fa.passing_threshold ? "PASSING" : "AT RISK"}
                                                                                            </span>
                                                                                        </p>
                                                                                    </div>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    ) : (
                                                                        <div className="w-11 h-11 rounded-lg mx-auto bg-slate-100 border-2 border-dashed border-slate-200" />
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-6 py-3 bg-indigo-50/30 text-center sticky right-0 z-10 border-l-2 border-indigo-100">
                                                            <Badge className={`font-bold rounded-lg px-3 py-1.5 shadow-sm ${student.predicted_status === 'Pass'
                                                                ? 'bg-emerald-500 text-white'
                                                                : 'bg-red-500 text-white'
                                                                }`}>
                                                                {student.predicted_score?.toFixed(1) || "N/A"}
                                                                {student.predicted_score !== null && (
                                                                    <span className="text-[9px] opacity-80 ml-1">
                                                                        ({student.prediction_score_percent.toFixed(0)}%)
                                                                    </span>
                                                                )}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Distribution Tab */}
                    <TabsContent value="distribution" className="mt-0 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Performance Distribution Pie Chart */}
                            <Card className="border-none shadow-lg ring-1 ring-slate-200/50 rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                                        <LucidePieChart className="h-5 w-5 text-indigo-600" />
                                        Performance Distribution
                                        <InfoTooltip content="Class distribution across performance tiers based on overall averages" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Outstanding (≥90%)', value: performanceDistribution.outstanding, color: '#10b981' },
                                                    { name: 'Excellent (85-89%)', value: performanceDistribution.excellent, color: '#3b82f6' },
                                                    { name: 'Proficient (75-84%)', value: performanceDistribution.proficient, color: '#6366f1' },
                                                    { name: 'Developing (60-74%)', value: performanceDistribution.developing, color: '#f59e0b' },
                                                    { name: 'Needs Support (<60%)', value: performanceDistribution.support, color: '#ef4444' }
                                                ].filter(d => d.value > 0)}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                                                outerRadius={120}
                                                innerRadius={60}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {[
                                                    { name: 'Outstanding (≥90%)', value: performanceDistribution.outstanding, color: '#10b981' },
                                                    { name: 'Excellent (85-89%)', value: performanceDistribution.excellent, color: '#3b82f6' },
                                                    { name: 'Proficient (75-84%)', value: performanceDistribution.proficient, color: '#6366f1' },
                                                    { name: 'Developing (60-74%)', value: performanceDistribution.developing, color: '#f59e0b' },
                                                    { name: 'Needs Support (<60%)', value: performanceDistribution.support, color: '#ef4444' }
                                                ].filter(d => d.value > 0).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Top & Bottom Performers */}
                            <div className="space-y-6">
                                {/* Top Performers */}
                                <Card className="border-none shadow-lg ring-1 ring-emerald-200/50 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-white">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-900">
                                            <Award className="h-5 w-5 text-emerald-600" />
                                            Top 5 Performers
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {[...data.student_performance]
                                            .sort((a, b) => getTruePercentage(b) - getTruePercentage(a))
                                            .slice(0, 5)
                                            .map((s, i) => (
                                                <Link
                                                    key={s.lrn}
                                                    to={`/dashboard/analysis/${data.document.analysis_document_id}/student/${s.lrn}`}
                                                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-emerald-100 hover:bg-emerald-50 hover:shadow-md transition-all group cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                                                            {i + 1}
                                                        </div>
                                                        <span className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                                            {s.name}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xl font-bold text-emerald-600">
                                                            {getTruePercentage(s).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </Link>
                                            ))}
                                    </CardContent>
                                </Card>

                                {/* Students Needing Support */}
                                <Card className="border-none shadow-lg ring-1 ring-red-200/50 rounded-2xl bg-gradient-to-br from-red-50/50 to-white">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-red-900">
                                            <AlertCircle className="h-5 w-5 text-red-600" />
                                            Students Needing Support
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {[...data!.student_performance]
                                            .sort((a, b) => getTruePercentage(a) - getTruePercentage(b))
                                            .slice(0, 5)
                                            .map((s, i) => (
                                                <Link
                                                    key={s.lrn}
                                                    to={`/dashboard/analysis/${data!.document.analysis_document_id}/student/${s.lrn}`}
                                                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-red-100 hover:bg-red-50 hover:shadow-md transition-all group cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                                                            !
                                                        </div>
                                                        <span className="font-semibold text-slate-900 group-hover:text-red-700 transition-colors">
                                                            {s.name}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xl font-bold text-red-600">
                                                            {getTruePercentage(s).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </Link>
                                            ))}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Pass/Fail Distribution by Topic */}
                        <Card className="border-none shadow-lg ring-1 ring-slate-200/50 rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                                    Pass/Fail Distribution by Topic
                                    <InfoTooltip content="Visual breakdown of passing and failing rates for each assessment" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topicData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
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
                                            contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.15)" }}
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/50">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-700 pb-2">{label}</p>
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between gap-8">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                                        <span className="text-[10px] font-bold text-slate-300">PASS RATE</span>
                                                                    </div>
                                                                    <span className="text-sm font-black text-emerald-400">{payload[0].value}%</span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-8">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full bg-red-400" />
                                                                        <span className="text-[10px] font-bold text-slate-300">FAIL RATE</span>
                                                                    </div>
                                                                    <span className="text-sm font-black text-red-400">{payload[1].value}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="top"
                                            align="right"
                                            height={40}
                                            iconType="circle"
                                            wrapperStyle={{ fontWeight: "800", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}
                                        />
                                        <Bar dataKey="passing_rate" name="Pass Rate %" stackId="a" fill="#10b981" barSize={32} radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="failing_rate" name="Fail Rate %" stackId="a" fill="#ef4444" barSize={32} radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}