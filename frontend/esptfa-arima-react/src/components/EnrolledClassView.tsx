import { useEffect, useState } from "react";
import { getStudents, type Student } from "@/lib/api-teacher";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Search, Users, KeyRound, Copy, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function EnrolledClassView({ sectionId }: { sectionId: number | string }) {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const data = await getStudents(sectionId.toString());
                setStudents(data);
            } catch (error) {
                console.error("Failed to fetch enrolled students:", error);
                toast.error("Could not load enrolled students.");
            } finally {
                setLoading(false);
            }
        };
        if (sectionId) {
            fetchStudents();
        }
    }, [sectionId]);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredStudents = students.filter(student => {
        const full = `${student.first_name} ${student.last_name} ${student.lrn}`.toLowerCase();
        return full.includes(searchTerm.toLowerCase());
    });

    return (
        <Card className="border-none shadow-premium-xl rounded-[2.5rem] overflow-hidden bg-white/70 backdrop-blur-md ring-1 ring-slate-200/50">
            <CardHeader className="p-10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <CardTitle className="text-2xl font-black flex items-center gap-4 text-slate-900">
                        <Users className="h-7 w-7 text-indigo-500" />
                        Class Roster & Credentials
                    </CardTitle>
                    <CardDescription className="font-bold text-slate-500 italic mt-2">
                        Manage your enrolled students and securely share their initial login credentials.
                    </CardDescription>
                </div>
                <div className="relative w-full md:w-80">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <Input
                        type="text"
                        placeholder="Search by name or LRN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-12 bg-white/50 border-slate-200/60 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 font-bold text-slate-900 shadow-sm transition-all text-sm w-full"
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/50 border-y border-slate-100">
                            <TableRow className="h-16 hover:bg-transparent tracking-widest uppercase text-[10px] font-black text-slate-400">
                                <TableHead className="px-10">Student</TableHead>
                                <TableHead>LRN</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead className="px-10">Initial Password</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence>
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i} className="animate-pulse border-slate-50 h-20">
                                            <TableCell className="px-10">
                                                <div className="h-4 bg-slate-100 rounded w-32"></div>
                                            </TableCell>
                                            <TableCell><div className="h-4 bg-slate-100 rounded w-24"></div></TableCell>
                                            <TableCell><div className="h-4 bg-slate-100 rounded w-24"></div></TableCell>
                                            <TableCell className="px-10"><div className="h-8 bg-slate-100 rounded-xl w-32"></div></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredStudents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center bg-slate-50/30">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <ShieldCheck className="h-10 w-10 text-slate-300" />
                                                <p className="text-slate-500 font-bold">No students found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStudents.map((student, i) => (
                                        <motion.tr
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            key={student.lrn}
                                            className="group hover:bg-indigo-50/30 transition-all border-slate-50 h-20 relative"
                                        >
                                            <TableCell className="px-10 font-bold text-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-white ring-1 ring-slate-100 flex items-center justify-center shadow-sm">
                                                        <span className="font-black text-indigo-600 tracking-tighter shrink-0">
                                                            {student.first_name[0]}{student.last_name[0]}
                                                        </span>
                                                    </div>
                                                    <span className="truncate max-w-[200px]">
                                                        {student.first_name} {student.last_name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-500 font-bold tracking-tight">
                                                {student.lrn}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-bold bg-white/50 text-indigo-700 border-indigo-100 py-1.5 px-3 rounded-lg shadow-sm">
                                                    {student.user_id?.username || "N/A"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-10">
                                                {student.initial_password ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative group/copy cursor-pointer" onClick={() => handleCopy(student.initial_password!, student.lrn)}>
                                                            <Badge className="font-black font-mono tracking-widest bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200/50 py-1.5 px-4 rounded-xl shadow-sm transition-all pr-10">
                                                                <KeyRound className="h-3.5 w-3.5 mr-2 inline" />
                                                                {student.initial_password}
                                                            </Badge>
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600/50 group-hover/copy:text-emerald-600 transition-colors">
                                                                {copiedId === student.lrn ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Badge className="font-bold bg-slate-100 text-slate-400 border-none px-4 py-1.5 rounded-xl shadow-inner">
                                                        Password Changed
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                <p>Showing {filteredStudents.length} students</p>
                <p className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-emerald-500" />
                    Students must change their password on first login.
                </p>
            </div>
        </Card>
    );
}
