import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { getStudentAnalysisDetail } from "@/lib/api-teacher";
import { useUserStore } from "@/store/useUserStore";
import { toast } from "sonner";
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
} from "recharts";
import {
    ArrowLeft,
    HelpCircle,
    Target,
    CheckCircle2,
    AlertCircle,
    Info,
} from "lucide-react";

interface StudentDetailData {
    student: {
        lrn: string;
        name: string;
    };
    student_stats: {
        mean: number;
        passing_rate: number;
        failing_rate: number;
    } | null;
    prediction: {
        score: number;
        predicted_status: string;
        max_score: number;
    } | null;
    intervention: Record<string, string>;
    prediction_score_percent: number;
    actual_post_test: {
        score: number;
        max_score: number;
    } | null;
    scores: Array<{
        formative_assessment_number: string;
        score: number;
        passing_threshold: number;
        max_score: number;
        topic_name: string;
    }>;
    class_averages: Array<{
        formative_assessment_number: string;
        mean: number;
        fa_topic_name: string;
    }>;
    document: {
        analysis_doc_title: string;
        subject: { subject_name: string };
        quarter: { quarter_name: string };
        section: { section_name: string };
        post_test_max_score?: number;
    };
}

const getStatusBadge = (score: number, max: number) => {
    const percent = max > 0 ? (score / max) * 100 : 0;
    if (percent >= 90) return <Badge className="bg-emerald-500 text-white border-none font-black shadow-sm px-3">MASTERY</Badge>;
    if (percent >= 75) return <Badge className="bg-amber-400 text-white border-none font-black shadow-sm px-3">PASSING</Badge>;
    return <Badge className="bg-red-500 text-white border-none font-black shadow-sm px-3">AT RISK</Badge>;
};

const getScoreColor = (percent: number) => {
    if (percent >= 90) return "text-emerald-600";
    if (percent >= 75) return "text-amber-500";
    return "text-red-600";
};

const getInterventionTheme = (percent: number | null) => {
    if (percent === null || percent === undefined) return {
        badge: "bg-slate-100 text-slate-700 border-slate-200",
        container: "bg-slate-50/50 border-slate-100/50 text-slate-900"
    };
    if (percent < 75) return {
        badge: "bg-rose-100 text-rose-700 border-rose-200/50",
        container: "bg-rose-50/50 border-rose-100/40 text-rose-900"
    };
    if (percent < 80) return {
        badge: "bg-orange-100 text-orange-700 border-orange-200/50",
        container: "bg-orange-50/50 border-orange-100/40 text-orange-900"
    };
    if (percent < 90) return {
        badge: "bg-indigo-100 text-indigo-700 border-indigo-200/50",
        container: "bg-indigo-50/50 border-indigo-100/40 text-indigo-900"
    };
    return {
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200/50",
        container: "bg-emerald-50/50 border-emerald-100/40 text-emerald-900"
    };
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

const StudentInterpretationsCard = ({ data }: { data: StudentDetailData }) => {
    const interpretations: { title: string, content: string, type: 'info' | 'success' | 'warning' | 'error' }[] = [];

    // 1. Trend Analysis
    const studentScores = data.scores.map(s => s.score / s.max_score);
    if (studentScores.length >= 2) {
        let totalChange = 0;
        let changeCount = 0;
        for (let i = 1; i < studentScores.length; i++) {
            if (studentScores[i - 1] > 0) {
                totalChange += (studentScores[i] - studentScores[i - 1]) / studentScores[i - 1];
                changeCount++;
            }
        }
        const avgChange = (totalChange / (changeCount || 1)) * 100;

        if (Math.abs(avgChange) < 2) {
            interpretations.push({
                title: "Consistent Performance",
                content: `${data.student.name.split(' ')[0]} is maintaining a stable performance level across assessments.`,
                type: 'info'
            });
        } else if (avgChange > 5) {
            interpretations.push({
                title: "Significant Improvement",
                content: `Great progress! ${data.student.name.split(' ')[0]}'s scores are showing a strong upward trend.`,
                type: 'success'
            });
        } else if (avgChange > 0) {
            interpretations.push({
                title: "Gradual Progress",
                content: "The student is showing steady improvement in their recent work.",
                type: 'success'
            });
        } else if (avgChange < -10) {
            interpretations.push({
                title: "Sharp Decline",
                content: `Warning: ${data.student.name.split(' ')[0]}'s performance has dropped significantly. A check-in is recommended.`,
                type: 'error'
            });
        } else {
            interpretations.push({
                title: "Performance Dip",
                content: "There's a slight downward trend in recent scores.",
                type: 'warning'
            });
        }
    }

    // 2. Comparison with Class
    const aboveAvgCount = data.scores.filter(s => {
        const classAvg = data.class_averages.find(ca => ca.formative_assessment_number === s.formative_assessment_number);
        return classAvg ? s.score > classAvg.mean : false;
    }).length;

    if (aboveAvgCount === data.scores.length && data.scores.length > 0) {
        interpretations.push({
            title: "Class Leader",
            content: "Consistent top performer. This student has scored above the class average in every assessment.",
            type: 'success'
        });
    } else if (aboveAvgCount > data.scores.length / 2) {
        interpretations.push({
            title: "Strong Class Standing",
            content: `Performing well. The student is scoring above average in ${aboveAvgCount} out of ${data.scores.length} assessments.`,
            type: 'success'
        });
    } else if (aboveAvgCount < data.scores.length / 4 && data.scores.length > 2) {
        interpretations.push({
            title: "Below Class Average",
            content: "The student is frequently scoring below the class average. Additional focus on core concepts may be needed.",
            type: 'warning'
        });
    }

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'success': return "bg-emerald-50 border-emerald-100 text-emerald-800";
            case 'warning': return "bg-amber-50 border-amber-100 text-amber-800";
            case 'error': return "bg-red-50 border-red-100 text-red-800";
            default: return "bg-blue-50 border-blue-100 text-blue-800";
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
            case 'warning': return <AlertCircle className="h-4 w-4 text-amber-600" />;
            case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
            default: return <Info className="h-4 w-4 text-blue-600" />;
        }
    };

    return (
        <Card className="border-none shadow-md ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl font-black flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                    Insights
                </CardTitle>
                <CardDescription>Synthesized insights from {data.student.name.split(' ')[0]}'s assessment history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {interpretations.map((item, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300 delay-${idx * 100} ${getTypeStyles(item.type)}`}>
                        <div className="mt-0.5 shrink-0">
                            {getTypeIcon(item.type)}
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-black text-[10px] uppercase tracking-wider">{item.title}</h4>
                            <p className="text-xs font-medium leading-relaxed opacity-90">{item.content}</p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

export default function StudentAnalysisPage() {
    const { docId, lrn } = useParams<{ docId: string; lrn: string }>();
    const [data, setData] = useState<StudentDetailData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!docId || !lrn) return;

            // Security check: Students can only view their own LRN
            const user = useUserStore.getState().user;
            if (user?.acc_type === "STUDENT" && user.lrn !== lrn) {
                toast.error("Access denied. You can only view your own performance data.");
                return;
            }

            try {
                const result = await getStudentAnalysisDetail(docId, lrn);
                setData(result);
            } catch (error) {
                console.error("Error fetching student details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [docId, lrn]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[80vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium">Loading student statistics...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!data) {
        return (
            <DashboardLayout>
                <div className="text-center py-20">
                    <h2 className="text-xl font-bold">Student data not found</h2>
                    <Link to={`/dashboard/analysis/${docId}`} className="text-indigo-600">Go back</Link>
                </div>
            </DashboardLayout>
        );
    }

    // Comparison Chart Data
    const comparisonData = data.class_averages.map(avg => {
        const studentScore = data.scores.find(s => s.formative_assessment_number === avg.formative_assessment_number);
        return {
            name: avg.fa_topic_name || `FA${avg.formative_assessment_number}`,
            student: studentScore ? studentScore.score : null,
            class: Number(avg.mean.toFixed(2))
        };
    });

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to={`/dashboard/analysis/${docId}`}>
                            <Button variant="outline" size="icon" className="rounded-xl border-slate-200">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black text-slate-900">{data.student.name}</h1>
                                <Badge variant="outline" className="border-indigo-100 bg-indigo-50 text-indigo-700 font-bold px-3">
                                    LRN: {data.student.lrn}
                                </Badge>
                            </div>
                            <p className="text-slate-500 font-medium">
                                Individual Performance Profile • {data.document.analysis_doc_title}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Key Stats Sidebar */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white">
                            <CardHeader className="bg-slate-50/50 pb-4">
                                <CardTitle className="text-lg font-black flex items-center gap-2">
                                    <Target className="h-5 w-5 text-indigo-600" />
                                    Performance Metrics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    <div className="p-6">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">AVERAGE SCORE</p>
                                        <div className="flex items-end gap-2">
                                            {(() => {
                                                const totalMax = data.scores.reduce((acc, s) => acc + s.max_score, 0);
                                                const totalScore = data.scores.reduce((acc, s) => acc + s.score, 0);
                                                const historyPercent = totalMax > 0 ? (totalScore / totalMax) * 100 : (data.student_stats?.mean || 0);
                                                return (
                                                    <h3 className={`text-3xl font-black tracking-tight ${getScoreColor(historyPercent)}`}>
                                                        {data.student_stats?.mean.toFixed(1)}
                                                    </h3>
                                                );
                                            })()}
                                            <p className="text-sm font-bold text-slate-400 mb-1">in {data.document.subject?.subject_name}</p>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ARIMA PREDICTION</p>
                                            <InfoTooltip content="Predicted score for the upcoming Post-Test based on historical data patterns." />
                                        </div>
                                        <div className="bg-indigo-50 p-4 rounded-2xl ring-1 ring-indigo-100">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-2xl font-black text-indigo-700 tracking-tighter">
                                                    {data.prediction?.score.toFixed(1) || "N/A"}
                                                    {data.prediction && (
                                                        <span className="text-xs font-bold text-indigo-400 ml-1">
                                                            ({data.prediction_score_percent.toFixed(1)}%)
                                                        </span>
                                                    )}
                                                </span>
                                                {data.prediction && (
                                                    <Badge className={data.prediction.predicted_status === 'Pass' ? 'bg-emerald-500' : 'bg-red-500'}>
                                                        {data.prediction.predicted_status}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-tight">Predicted Post-Test Points</p>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">INTERVENTION STRATEGY</p>
                                        </div>
                                        <div className="space-y-3">
                                            {Object.entries(data.intervention).map(([label, action]) => {
                                                const theme = getInterventionTheme(data.prediction_score_percent);
                                                return (
                                                    <div key={label} className="space-y-2">
                                                        <Badge className={`${theme.badge} border font-bold`}>
                                                            {label}
                                                        </Badge>
                                                        <div className={`p-4 rounded-2xl border text-xs font-semibold leading-relaxed italic ${theme.container}`}>
                                                            "{action}"
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <StudentInterpretationsCard data={data} />
                    </div>

                    {/* Main Analysis Sections */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-none shadow-md ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xl font-black">Performance Trend vs Class Average</CardTitle>
                                <CardDescription>Tracking growth and comparing with class-wide mastery levels</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={comparisonData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                                            dy={10}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                                            labelStyle={{ fontWeight: "900", color: "#1e293b", marginBottom: "4px" }}
                                        />
                                        <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ paddingBottom: "20px", fontSize: "12px", fontWeight: "bold" }} />
                                        <Line
                                            type="monotone"
                                            dataKey="student"
                                            name={`${data.student.name.split(' ')[0]}'s Score`}
                                            stroke="#6366f1"
                                            strokeWidth={4}
                                            dot={{ r: 6, fill: "#6366f1", strokeWidth: 3, stroke: "#fff" }}
                                            activeDot={{ r: 9, strokeWidth: 2 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="class"
                                            name="Class Average"
                                            stroke="#94a3b8"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            dot={{ r: 4, fill: "#94a3b8", strokeWidth: 2, stroke: "#fff" }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-md ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white">
                            <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between pb-6">
                                <div>
                                    <CardTitle className="text-xl font-black">Assessment Breakdown</CardTitle>
                                    <CardDescription>Detailed results for each formative assessment</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow className="hover:bg-transparent border-slate-100 h-14">
                                            <TableHead className="font-black text-slate-700 px-8 uppercase text-[10px] tracking-widest w-48">Topic</TableHead>
                                            <TableHead className="font-black text-slate-700 text-center uppercase text-[10px] tracking-widest">Score</TableHead>
                                            <TableHead className="font-black text-slate-700 text-center uppercase text-[10px] tracking-widest">Percentage</TableHead>
                                            <TableHead className="font-black text-slate-700 pr-8 uppercase text-[10px] tracking-widest text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.scores.map((score, index) => {
                                            const percent = score.max_score > 0 ? (score.score / score.max_score) * 100 : 0;
                                            return (
                                                <TableRow key={`${score.formative_assessment_number}-${index}`} className="group hover:bg-slate-50/50 transition-all border-slate-50 h-16">
                                                    <TableCell className="px-8 font-bold text-slate-900 leading-tight">
                                                        {score.topic_name}
                                                    </TableCell>
                                                    <TableCell className="text-center font-black text-slate-600">
                                                        {score.score} / {score.max_score}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`font-black text-sm ${getScoreColor(percent)}`}>
                                                                {percent.toFixed(1)}%
                                                            </span>
                                                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all duration-500 ${percent >= 90 ? 'bg-emerald-500' :
                                                                        percent >= 75 ? 'bg-amber-400' : 'bg-red-500'
                                                                        }`}
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="pr-8 text-right">
                                                        {getStatusBadge(score.score, score.max_score)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
