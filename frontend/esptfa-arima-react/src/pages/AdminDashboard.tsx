import { useEffect, useState } from "react";
import { getSystemStats, getAllUsers, type User } from "@/lib/api-admin";
import { getAnalysisDocuments } from "@/lib/api-teacher";
import type { AnalysisDocument } from "@/lib/api-teacher";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Users,
    School,
    BookOpen,
    FileText,
    TrendingUp,
    ChevronRight,
    Database,
    Search,
    GraduationCap,
    Presentation,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";

interface SystemStats {
    total_students: number;
    total_teachers: number;
    total_sections: number;
    total_subjects: number;
    total_documents: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [recentDocs, setRecentDocs] = useState<AnalysisDocument[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                setLoading(true);
                const [statsData, docsData, usersData] = await Promise.all([
                    getSystemStats(),
                    getAnalysisDocuments(),
                    getAllUsers({ page_size: 100 }) // Fetch a good chunk for the dashboard
                ]);
                
                setStats(statsData);
                setRecentDocs(Array.isArray(docsData) ? docsData.slice(0, 10) : (docsData.results?.slice(0, 10) || []));
                
                const allUsers = Array.isArray(usersData) ? usersData : (usersData.results || []);
                setTeachers(allUsers.filter((u: User) => u.acc_type === 'TEACHER'));
                setStudents(allUsers.filter((u: User) => u.acc_type === 'STUDENT'));
            } catch (error) {
                console.error("Error fetching admin dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, []);

    const statCards = [
        { title: "Total Students", value: stats?.total_students || 0, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
        { title: "Active Teachers", value: stats?.total_teachers || 0, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
        { title: "Class Sections", value: stats?.total_sections || 0, icon: School, color: "text-amber-600", bg: "bg-amber-50" },
        { title: "Subjects", value: stats?.total_subjects || 0, icon: BookOpen, color: "text-violet-600", bg: "bg-violet-50" },
    ];

    const filteredStudents = students.filter(s => 
        s.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.student_lrn?.includes(searchQuery)
    );

    const filteredTeachers = teachers.filter(t => 
        t.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-10 pb-20 font-sans selection:bg-indigo-500/30">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                         <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">System Administration</h1>
                         <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                             <p className="text-slate-500 font-bold text-sm uppercase tracking-widest italic">Live Global Resource Management</p>
                         </div>
                    </motion.div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    <Link to="/dashboard/users">
                        <Button variant="outline" className="rounded-2xl border-slate-200 h-11 px-5 font-bold hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-sm">
                            <Users className="mr-2 h-4 w-4" /> User Base
                        </Button>
                    </Link>
                    <Link to="/dashboard/data-management">
                        <Button className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-5 font-bold transition-all hover:scale-105 active:scale-95 shadow-indigo-200 shadow-xl">
                            <Database className="mr-2 h-4 w-4" /> School Data
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card className="border-none shadow-premium-sm rounded-[1.5rem] overflow-hidden group hover:shadow-premium-md transition-all duration-500 bg-white">
                            <CardContent className="p-7 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.title}</p>
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter group-hover:text-indigo-600 transition-colors">
                                        {loading ? "..." : stat.value}
                                    </h3>
                                </div>
                                <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner`}>
                                    <stat.icon className="h-7 w-7" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Main Tabs Section */}
            <Tabs defaultValue="analysis" className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 p-2 rounded-[2rem] border border-slate-100 backdrop-blur-sm sticky top-4 z-10 shadow-sm">
                    <TabsList className="bg-transparent h-14 p-1 gap-2">
                        <TabsTrigger value="analysis" className="rounded-2xl h-12 px-6 font-black text-xs uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                            <FileText className="w-4 h-4 mr-2" /> Analysis
                        </TabsTrigger>
                        <TabsTrigger value="teachers" className="rounded-2xl h-12 px-6 font-black text-xs uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                            <Presentation className="w-4 h-4 mr-2" /> Teachers
                        </TabsTrigger>
                        <TabsTrigger value="students" className="rounded-2xl h-12 px-6 font-black text-xs uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                            <GraduationCap className="w-4 h-4 mr-2" /> Students
                        </TabsTrigger>
                    </TabsList>

                    <div className="relative group min-w-[300px] px-2">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Quick search across records..." 
                            className="pl-12 h-14 rounded-2xl border-transparent bg-white shadow-sm focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-sm"
                        />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {/* Analysis Tab */}
                    <TabsContent value="analysis">
                        <Card className="border-none shadow-premium-sm rounded-[2.5rem] overflow-hidden bg-white">
                            <CardHeader className="p-10 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">System-wide Analysis Repository</CardTitle>
                                        <CardDescription className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest">Showing latest 10 assessment documents</CardDescription>
                                    </div>
                                    <Link to="/dashboard/analysis">
                                        <Button variant="ghost" className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-50 px-4 h-9 rounded-xl">
                                            Open Full Library
                                        </Button>
                                    </Link>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="grid grid-cols-1 divide-y divide-slate-50">
                                    {loading ? (
                                        [1,2,3,4,5].map(i => <div key={i} className="h-24 bg-slate-50/50 animate-pulse" />)
                                    ) : recentDocs.length === 0 ? (
                                        <div className="p-20 text-center">
                                            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-400 font-bold">No records found.</p>
                                        </div>
                                    ) : (
                                        recentDocs.map((doc) => (
                                            <Link 
                                                key={doc.analysis_document_id} 
                                                to={`/dashboard/analysis/${doc.analysis_document_id}`}
                                                className="group p-6 hover:bg-indigo-50/30 transition-all flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 border border-slate-100">
                                                        <FileText className="h-6 w-6 text-indigo-500" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{doc.analysis_doc_title}</h4>
                                                        <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1.5">
                                                            <span className="text-indigo-500/70">{typeof doc.subject === 'object' ? doc.subject.subject_name : "General"}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                                            <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                            </Link>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="teachers">
                        <div className="mb-6 flex justify-end">
                            <Link to="/dashboard/teachers">
                                <Button className="rounded-2xl bg-slate-900 hover:bg-black text-white px-6 font-bold shadow-premium-sm transition-all active:scale-95 flex items-center gap-2">
                                    <Presentation className="h-4 w-4" /> View Full Faculty
                                </Button>
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTeachers.map((teacher, i) => (
                                <motion.div
                                    key={teacher.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Card className="border-none shadow-premium-sm rounded-[2rem] overflow-hidden bg-white hover:shadow-premium-md transition-all group">
                                        <CardContent className="p-8">
                                            <div className="flex flex-col items-center text-center">
                                                <Avatar className="h-20 w-20 rounded-[1.5rem] border-4 border-slate-50 shadow-inner mb-4 group-hover:scale-110 transition-transform duration-500">
                                                    <AvatarImage src={`https://avatar.vercel.sh/${teacher.username}`} />
                                                    <AvatarFallback className="bg-indigo-50 text-indigo-600 font-black text-xl">
                                                        {teacher.first_name?.[0]}{teacher.last_name?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <h4 className="text-xl font-black text-slate-900 leading-tight">
                                                    {teacher.first_name} {teacher.last_name}
                                                </h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{teacher.email || teacher.username}</p>
                                                
                                                <div className="w-full h-px bg-slate-50 my-6"></div>
                                                
                                                <div className="w-full space-y-3 text-left">
                                                    <div className="flex items-center justify-between px-4 py-2 bg-indigo-50/50 rounded-xl">
                                                        <span className="text-[10px] font-black text-indigo-600/70 uppercase tracking-tight">Advising</span>
                                                        <span className="text-xs font-black text-slate-900">
                                                            {teacher.advising_section?.name || "None"}
                                                        </span>
                                                    </div>
                                                    <Link to={`/dashboard/users`} className="block">
                                                        <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:bg-slate-50">
                                                            View Full Profile
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Students Tab */}
                    <TabsContent value="students">
                        <div className="bg-white rounded-[2.5rem] shadow-premium-sm border border-slate-50 overflow-hidden">
                            <div className="p-10 pb-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">System-wide Student Directory</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Cross-section enrollment overview</p>
                                </div>
                                <Link to="/dashboard/students">
                                    <Button variant="ghost" className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-50 px-4 h-9 rounded-xl">
                                        View Full Directory
                                    </Button>
                                </Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Student Name</th>
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">LRN</th>
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Section Assignment</th>
                                            <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 font-bold">
                                        {filteredStudents.map((student) => (
                                            <tr key={student.id} className="group hover:bg-indigo-50/10 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-500 overflow-hidden">
                                                            {student.first_name?.[0]}{student.last_name?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-900 text-sm">{student.first_name} {student.last_name}</p>
                                                            <p className="text-[10px] text-slate-400 lowercase">{student.username}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-xs text-slate-600 tracking-wider">
                                                    {student.student_lrn || "—"}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-none rounded-lg text-[10px] font-black tracking-widest uppercase py-1 px-3 shadow-sm shadow-emerald-100/50">
                                                        {student.section_details?.name || "Unassigned"}
                                                    </Badge>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${student.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${student.is_active ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`}></div>
                                                        {student.is_active ? 'Active' : 'Locked'}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </TabsContent>
                </AnimatePresence>
            </Tabs>
        </div>
    );
}
