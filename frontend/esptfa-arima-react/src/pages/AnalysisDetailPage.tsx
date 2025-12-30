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
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
} from "recharts";
import {
    ArrowLeft,
    TrendingUp,
    Users,
    AlertCircle,
    CheckCircle2,
    Search,
    Download,
    BrainCircuit,
    Info,
} from "lucide-react";

interface TopicPerformance {
    test_number: string;
    topic_name: string;
    max_score: number;
    mean?: number;
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
}

interface AnalysisDetails {
    document: any;
    statistics: any;
    topics: TopicPerformance[];
    formative_assessments: any[];
    student_performance: StudentPerformance[];
    insights: any;
}

export default function AnalysisDetailPage() {
    const { docId } = useParams<{ docId: string }>();
    const [data, setData] = useState<AnalysisDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
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
    const trendData = data.formative_assessments.map(fa => ({
        name: `FA${fa.formative_assessment_number}`,
        mean: Number(fa.mean.toFixed(2)),
        threshold: Number(fa.passing_threshold.toFixed(2)),
        topic: fa.fa_topic_name || `Test ${fa.formative_assessment_number}`
    }));

    // Prepare data for the topic performance chart
    const topicData = data.formative_assessments.map(fa => ({
        topic: fa.fa_topic?.topic_name || `FA${fa.formative_assessment_number}`,
        passing_rate: fa.passing_rate,
        failing_rate: fa.failing_rate,
    }));

    const getInterventionColor = (score: number | null, max: number = 50) => {
        if (!score) return "bg-slate-100 text-slate-700";
        const percent = (score / max) * 100;
        if (percent < 50) return "bg-red-100 text-red-700 border-red-200";
        if (percent < 75) return "bg-amber-100 text-amber-700 border-amber-200";
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    };

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
                            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                {data.document.analysis_doc_title}
                                <Badge className="bg-emerald-100 text-emerald-700 border-none">Processed</Badge>
                            </h1>
                            <p className="text-slate-500 font-medium">
                                {data.document.subject?.subject_name} • {data.document.quarter?.quarter_name} • {data.document.section_id?.section_name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="rounded-xl border-slate-200 h-10">
                            <Download className="mr-2 h-4 w-4" /> Export Report
                        </Button>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl">
                        <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Class Mean</span>
                            <div className="bg-blue-50 p-1.5 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <div className="text-2xl font-black">{data.statistics?.mean.toFixed(2)}</div>
                            <p className="text-[10px] text-slate-500 mt-1 font-medium">Global average across all assessments</p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl">
                        <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Passing Threshold</span>
                            <div className="bg-amber-50 p-1.5 rounded-lg">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <div className="text-2xl font-black">{data.statistics?.mean_passing_threshold.toFixed(2)}</div>
                            <p className="text-[10px] text-slate-500 mt-1 font-medium">75% of the average max score</p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl">
                        <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</span>
                            <div className="bg-indigo-50 p-1.5 rounded-lg">
                                <Users className="h-4 w-4 text-indigo-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <div className="text-2xl font-black">{data.statistics?.total_students}</div>
                            <p className="text-[10px] text-slate-500 mt-1 font-medium">Enrolled in {data.document.section_id?.section_name}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl">
                        <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Success Rate</span>
                            <div className="bg-emerald-50 p-1.5 rounded-lg">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <div className="text-2xl font-black">
                                {data.student_performance.length > 0
                                    ? (data.student_performance.filter(s => s.passing_rate >= 75).length / data.student_performance.length * 100).toFixed(0)
                                    : 0}%
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 font-medium">Students above 75% passing rate</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="bg-slate-100 p-1 rounded-xl h-12 mb-6">
                        <TabsTrigger value="overview" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Dashboard Overview</TabsTrigger>
                        <TabsTrigger value="students" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Student Performance</TabsTrigger>
                        <TabsTrigger value="topics" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Topic Analysis</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6 mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Performance Trend Chart */}
                            <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
                                <CardHeader>
                                    <CardTitle>Performance Trend</CardTitle>
                                    <CardDescription>Class average vs passing threshold across assessments</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4 h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                                labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
                                            />
                                            <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                                            <Line
                                                type="monotone"
                                                dataKey="mean"
                                                name="Class Average"
                                                stroke="#4f46e5"
                                                strokeWidth={3}
                                                dot={{ r: 6, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
                                                activeDot={{ r: 8, strokeWidth: 2 }}
                                            />
                                            <Line
                                                type="stepAfter"
                                                dataKey="threshold"
                                                name="Passing Threshold"
                                                stroke="#f59e0b"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* AI Insights Sidebar */}
                            <Card className="border-none shadow-sm ring-1 ring-orange-200 bg-orange-50/30 rounded-2xl">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2 text-orange-700">
                                        <BrainCircuit className="h-5 w-5" />
                                        <CardTitle className="text-lg">AI General Insights</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {data.insights?.ai_insights ? (
                                        <div className="space-y-4">
                                            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-orange-100 shadow-sm transition-all hover:shadow-md">
                                                <p className="text-sm text-slate-700 leading-relaxed italic font-medium">
                                                    "{typeof data.insights.ai_insights === 'string'
                                                        ? data.insights.ai_insights
                                                        : "The class shows consistent performance with a slight upward trend in recent assessments. Algebra topics remain a challenge for 15% of the students."}"
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Recommendations</h4>
                                                <ul className="space-y-2">
                                                    <li className="flex gap-2 text-xs text-slate-600 bg-white/60 p-2 rounded-lg border border-orange-50">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-orange-400 mt-1 flex-shrink-0" />
                                                        Focus on reinforcing foundational concepts before moving to the next module.
                                                    </li>
                                                    <li className="flex gap-2 text-xs text-slate-600 bg-white/60 p-2 rounded-lg border border-orange-50">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-orange-400 mt-1 flex-shrink-0" />
                                                        Increase the frequency of low-stakes quizzes for self-assessment.
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
                                            <Info className="h-10 w-10 mb-2 opacity-20" />
                                            <p className="text-sm">Insights are being generated...</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="students" className="mt-0">
                        <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between pb-6">
                                <div>
                                    <CardTitle>Detailed Student Analysis</CardTitle>
                                    <CardDescription>Predicted performance and recommended interventions</CardDescription>
                                </div>
                                <div className="relative w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search by name or LRN..."
                                        className="pl-10 rounded-xl h-10 border-slate-200 bg-slate-50 focus-visible:ring-indigo-600"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow className="hover:bg-transparent border-slate-100">
                                            <TableHead className="w-[250px] font-bold text-slate-700 pl-6">Student ID & Name</TableHead>
                                            <TableHead className="font-bold text-slate-700 text-center">Avg. Score</TableHead>
                                            <TableHead className="font-bold text-slate-700 text-center">Predicted Post-Test</TableHead>
                                            <TableHead className="font-bold text-slate-700">Status</TableHead>
                                            <TableHead className="font-bold text-slate-700 w-[350px]">Recommended Intervention</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStudents.length > 0 ? (
                                            filteredStudents.map((student) => (
                                                <TableRow key={student.lrn} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                                    <TableCell className="pl-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{student.name}</span>
                                                            <span className="text-[10px] text-slate-500 font-mono">{student.lrn}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium">{student.mean.toFixed(1)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-black text-slate-900 text-lg">
                                                                {student.predicted_score?.toFixed(1) || "N/A"}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-medium">Out of 50</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`px-2 py-0.5 rounded-full border shadow-none font-bold text-[10px] ${student.predicted_status === 'PASS'
                                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                            : 'bg-red-100 text-red-700 border-red-200'
                                                            }`}>
                                                            {student.predicted_status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="pr-6">
                                                        <div className={`p-3 rounded-xl border text-xs font-medium leading-relaxed ${getInterventionColor(student.predicted_score)}`}>
                                                            {student.intervention}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                                    No students match your search criteria.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="topics" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
                                <CardHeader>
                                    <CardTitle>Topic Success Rate</CardTitle>
                                    <CardDescription>Passing vs Failing rates per topic area</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[400px] pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topicData} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="topic"
                                                type="category"
                                                axisLine={false}
                                                tickLine={false}
                                                width={100}
                                                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                                            />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                            />
                                            <Legend verticalAlign="top" height={36} />
                                            <Bar dataKey="passing_rate" name="Passing Rate %" stackId="a" fill="#10b981" barSize={30} radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="failing_rate" name="Failing Rate %" stackId="a" fill="#ef4444" barSize={30} radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <div className="space-y-6">
                                <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">Toughest Topics</CardTitle>
                                        <CardDescription>Topics where students struggled the most</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {[...data.formative_assessments]
                                            .sort((a, b) => a.passing_rate - b.passing_rate)
                                            .slice(0, 2)
                                            .map((fa, i) => (
                                                <div key={`toughest-${fa.formative_assessment_number}`} className="flex items-center justify-between p-4 rounded-xl bg-red-50/50 border border-red-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center font-bold text-red-600">
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900">{fa.fa_topic?.topic_name || `FA${fa.formative_assessment_number}`}</p>
                                                            <p className="text-xs text-slate-500">Class Avg: {fa.mean.toFixed(1)} / {fa.max_score}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xl font-black text-red-600">{(100 - fa.passing_rate).toFixed(0)}%</p>
                                                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">Failure Rate</p>
                                                    </div>
                                                </div>
                                            ))}
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">Strongest Topics</CardTitle>
                                        <CardDescription>Topics where the class performed best</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {[...data.formative_assessments]
                                            .sort((a, b) => b.passing_rate - a.passing_rate)
                                            .slice(0, 2)
                                            .map((fa, i) => (
                                                <div key={`strongest-${fa.formative_assessment_number}`} className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center font-bold text-emerald-600">
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900">{fa.fa_topic?.topic_name || `FA${fa.formative_assessment_number}`}</p>
                                                            <p className="text-xs text-slate-500">Class Avg: {fa.mean.toFixed(1)} / {fa.max_score}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xl font-black text-emerald-600">{fa.passing_rate.toFixed(0)}%</p>
                                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-tight">Success Rate</p>
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
