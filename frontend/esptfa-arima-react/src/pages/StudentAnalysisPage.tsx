import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
    AlertCircle,
    Sparkles,
    TrendingUp,
    TrendingDown,
    Brain,
    Rocket,
    BookOpen,
    Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
};

const MasteryGauge = ({ percent }: { percent: number }) => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    const color = percent >= 90 ? "#10b981" : percent >= 75 ? "#f59e0b" : "#ef4444";

    return (
        <div className="relative flex items-center justify-center">
            <svg className="w-48 h-48 transform -rotate-90">
                <circle
                    cx="96"
                    cy="96"
                    r={radius}
                    stroke="#f1f5f9"
                    strokeWidth="12"
                    fill="transparent"
                />
                <motion.circle
                    cx="96"
                    cy="96"
                    r={radius}
                    stroke={color}
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <motion.span 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-4xl font-black tracking-tighter"
                    style={{ color }}
                >
                    {percent.toFixed(0)}%
                </motion.span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Mastery</span>
            </div>
        </div>
    );
};

const PersonalizedStudyGuide = ({ scores }: { scores: StudentDetailData['scores'] }) => {
    const weakTopics = [...scores]
        .filter(s => (s.score / s.max_score) < 0.75)
        .sort((a, b) => (a.score / a.max_score) - (b.score / b.max_score));

    if (weakTopics.length === 0) return (
        <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-2xl">
                <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
                <h4 className="font-black text-emerald-900 leading-tight">Elite Performance!</h4>
                <p className="text-sm text-emerald-700 font-medium">You've mastered all current topics. Keep maintaining this excellence.</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Rocket className="h-4 w-4 text-indigo-500" />
                Your Focus Plan
            </h4>
            <div className="grid gap-3">
                {weakTopics.slice(0, 3).map((topic) => (
                    <motion.div 
                        key={topic.topic_name}
                        variants={itemVariants}
                        className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3 group hover:border-indigo-200 transition-all"
                    >
                        <div className="mt-1 h-2 w-2 rounded-full bg-rose-500 shrink-0 group-hover:scale-125 transition-transform" />
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-900 leading-tight">{topic.topic_name}</p>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Strategy: Review the foundational concepts for this topic. You're at {(topic.score/topic.max_score*100).toFixed(0)}% mastery.
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

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
    prediction_intervention: Record<string, string> | string;
    actual_intervention: Record<string, string> | string;
    prediction_score_percent: number;
    actual_post_test: {
        score: number;
        max_score: number;
        status: string;
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
                <div className="flex items-center justify-center h-[80vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium">Loading student statistics...</p>
                    </div>
                </div>
        );
    }

    if (!data) {
        return (
                <div className="text-center py-20">
                    <h2 className="text-xl font-bold">Student data not found</h2>
                    <Link to={`/dashboard/analysis/${docId}`} className="text-indigo-600">Go back</Link>
                </div>
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
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to={`/dashboard/analysis/${docId}`}>
                        <Button variant="outline" size="icon" className="rounded-xl border-slate-200 hover:bg-slate-50">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{data.student.name}</h1>
                            <Badge variant="outline" className="border-indigo-200 bg-indigo-50/50 text-indigo-700 font-black px-3 rounded-lg">
                                LRN: {data.student.lrn}
                            </Badge>
                        </div>
                        <p className="text-slate-500 font-bold flex items-center gap-2 mt-1">
                            <Sparkles className="h-4 w-4 text-amber-400" />
                            {data.document.analysis_doc_title} • {data.document.subject?.subject_name}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Key Stats Sidebar */}
                <div className="space-y-6">
                    <Card className="border-none shadow-xl shadow-indigo-500/5 ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden bg-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Brain className="h-32 w-32" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-black flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-500" />
                                Your Mastery Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8 pt-4">
                            {(() => {
                                const totalMax = data.scores.reduce((acc, s) => acc + s.max_score, 0);
                                const totalScore = data.scores.reduce((acc, s) => acc + s.score, 0);
                                const masteryPercent = totalMax > 0 ? (totalScore / totalMax) * 100 : (data.student_stats?.mean || 0);
                                return (
                                    <div className="flex flex-col items-center">
                                        <MasteryGauge percent={masteryPercent} />
                                        
                                        <div className="grid grid-cols-2 w-full gap-4 mt-8 px-2">
                                            <div className="p-4 bg-slate-50 rounded-2xl text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pass Rate</p>
                                                <h4 className="text-xl font-black text-slate-800">{(data.student_stats?.passing_rate || 0).toFixed(0)}%</h4>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-2xl text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assessments</p>
                                                <h4 className="text-xl font-black text-slate-800">{data.scores.length}</h4>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="space-y-6 border-t border-slate-50 pt-6">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                        ARIMA PREDICTION
                                        <InfoTooltip content="AI prediction for your next big exam based on your current trajectory." />
                                    </p>
                                    <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg shadow-indigo-200 text-white relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-4xl font-black tracking-tighter">
                                                    {data.prediction?.score.toFixed(1) || "N/A"}
                                                </span>
                                                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                                    {data.prediction?.predicted_status === 'Pass' ? 'Projected: PASS' : 'Projected: AT RISK'}
                                                </div>
                                            </div>
                                            <p className="text-xs font-bold text-indigo-100 opacity-80">Predicted Post-Test Achievement</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PERSONAL ADVISORY</p>
                                    <div className="space-y-3">
                                        {typeof data.prediction_intervention === 'object' ? 
                                            Object.entries(data.prediction_intervention).map(([label, action]) => {
                                                const theme = getInterventionTheme(data.prediction_score_percent);
                                                return (
                                                    <div key={label} className="space-y-2">
                                                        <Badge className={`${theme.badge} border-none font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-lg`}>
                                                            {label}
                                                        </Badge>
                                                        <div className={`p-5 rounded-2xl border-none shadow-inner text-sm font-bold leading-relaxed italic ${theme.container}`}>
                                                            "{action}"
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <p className="text-sm text-slate-500 italic font-medium">{data.prediction_intervention}</p>
                                            )
                                        }
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl shadow-slate-200/50 ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden bg-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-black flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-indigo-600" />
                                Your Growth Guide
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PersonalizedStudyGuide scores={data.scores} />
                        </CardContent>
                    </Card>
                </div>

                {/* Main Analysis Sections */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Summary Cards */}
                        <motion.div variants={itemVariants} className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2rem] text-white shadow-lg shadow-emerald-200 relative overflow-hidden group">
                            <div className="relative z-10">
                                <TrendingUp className="h-8 w-8 mb-4 opacity-50" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Highest Mastery</h4>
                                {(() => {
                                    const best = [...data.scores].sort((a, b) => (b.score / b.max_score) - (a.score / a.max_score))[0];
                                    return (
                                        <>
                                            <p className="text-xl font-black leading-tight mb-2 truncate">{best?.topic_name || "N/A"}</p>
                                            <div className="inline-block px-3 py-1 bg-white/20 rounded-full font-black text-xs">
                                                {(best ? (best.score / best.max_score * 100) : 0).toFixed(0)}% Match
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                            <Trophy className="absolute -bottom-6 -right-6 h-32 w-32 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                        </motion.div>

                        <motion.div variants={itemVariants} className="p-6 bg-gradient-to-br from-rose-500 to-rose-600 rounded-[2rem] text-white shadow-lg shadow-rose-200 relative overflow-hidden group">
                            <div className="relative z-10">
                                <TrendingDown className="h-8 w-8 mb-4 opacity-50" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Priority Support</h4>
                                {(() => {
                                    const worst = [...data.scores].sort((a, b) => (a.score / a.max_score) - (b.score / b.max_score))[0];
                                    return (
                                        <>
                                            <p className="text-xl font-black leading-tight mb-2 truncate">{worst?.topic_name || "N/A"}</p>
                                            <div className="inline-block px-3 py-1 bg-white/20 rounded-full font-black text-xs">
                                                {(worst ? (worst.score / worst.max_score * 100) : 0).toFixed(0)}% mastery
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                            <AlertCircle className="absolute -bottom-6 -right-6 h-32 w-32 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                        </motion.div>
                    </div>

                    <Card className="border-none shadow-xl shadow-slate-200/50 ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-indigo-600" />
                                Performance Trajectory
                            </CardTitle>
                            <CardDescription className="font-bold">Visualizing your growth against class standards</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={comparisonData}>
                                    <defs>
                                        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }}
                                        dy={10}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }} />
                                    <RechartsTooltip
                                        contentStyle={{ 
                                            borderRadius: "24px", 
                                            border: "none", 
                                            boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.15)",
                                            padding: "16px",
                                            fontWeight: "900"
                                        }}
                                        labelStyle={{ color: "#0f172a", marginBottom: "8px" }}
                                    />
                                    <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ paddingBottom: "20px", fontSize: "11px", fontWeight: "900" }} />
                                    <Line
                                        type="monotone"
                                        dataKey="student"
                                        name="Your Score"
                                        stroke="#6366f1"
                                        strokeWidth={6}
                                        dot={{ r: 6, fill: "#6366f1", strokeWidth: 3, stroke: "#fff" }}
                                        activeDot={{ r: 10, strokeWidth: 2 }}
                                        animationDuration={1500}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="class"
                                        name="Class Standing"
                                        stroke="#cbd5e1"
                                        strokeWidth={3}
                                        strokeDasharray="8 8"
                                        dot={{ r: 4, fill: "#cbd5e1", strokeWidth: 2, stroke: "#fff" }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl shadow-slate-200/50 ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden bg-white">
                        <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between py-6 px-8">
                            <div>
                                <CardTitle className="text-xl font-black">Curriculum Outcomes</CardTitle>
                                <CardDescription className="font-bold">Breaking down your mastery per topic</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="hover:bg-transparent border-slate-100 h-14">
                                        <TableHead className="font-black text-slate-700 px-8 uppercase text-[10px] tracking-widest w-64">Outcome Area</TableHead>
                                        <TableHead className="font-black text-slate-700 text-center uppercase text-[10px] tracking-widest">Points</TableHead>
                                        <TableHead className="font-black text-slate-700 text-center uppercase text-[10px] tracking-widest">Mastery Level</TableHead>
                                        <TableHead className="font-black text-slate-700 pr-8 uppercase text-[10px] tracking-widest text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {data.scores.map((score, index) => {
                                            const percent = score.max_score > 0 ? (score.score / score.max_score) * 100 : 0;
                                            return (
                                                <TableRow 
                                                    key={`${score.formative_assessment_number}-${index}`} 
                                                    className="group hover:bg-slate-50/80 transition-all border-slate-50 h-20"
                                                >
                                                    <TableCell className="px-8 font-black text-slate-900 leading-tight">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Assessed Topic</span>
                                                            <span className="text-sm">{score.topic_name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-black text-slate-600 text-sm">
                                                        {score.score} <span className="text-slate-300 mx-1">/</span> {score.max_score}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span className={`font-black text-sm tracking-tighter ${getScoreColor(percent)}`}>
                                                                {percent.toFixed(1)}%
                                                            </span>
                                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 ring-1 ring-slate-200/50">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${percent}%` }}
                                                                    transition={{ duration: 1, delay: 0.5 }}
                                                                    className={`h-full rounded-full ${percent >= 90 ? 'bg-emerald-500' :
                                                                        percent >= 75 ? 'bg-amber-400' : 'bg-rose-500'
                                                                        }`}
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
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </motion.div>
    );
}
