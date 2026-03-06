import { useEffect, useState, useCallback } from "react";
import { 
    getStudents, 
    getAllSections,
    getAllUsers, 
    updateStudent,
    deleteStudent,
    updateUser,
    type StudentProfile, 
    type Section,
    type User,
} from "@/lib/api-admin";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Search,
    GraduationCap,
    Filter,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    UserCircle,
    MoreHorizontal,
    Mail,
    Hash,
    Users,
    Lock,
    Edit,
    UserCircle2,
    Save,
    Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AllStudentsPage() {
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sectionFilter, setSectionFilter] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Edit State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
    const [editForm, setEditForm] = useState({
        first_name: "",
        middle_name: "",
        last_name: "",
        lrn: "",
        section_id: "",
        user_pk: "",
    });
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Password Reset State
    const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
    const [resettingUser, setResettingUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [isResetting, setIsResetting] = useState(false);

    // Delete State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<StudentProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchSections = useCallback(async () => {
        try {
            const data = await getAllSections();
            setSections(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error("Error fetching sections:", error);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const data = await getAllUsers();
            setAllUsers(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    }, []);

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page: page,
                search: search || undefined,
            };
            if (sectionFilter !== "all") params.section = sectionFilter;

            const response = await getStudents(params);
            if (response.results) {
                setStudents(response.results);
                setTotalPages(Math.ceil(response.count / 10) || 1);
                setTotalCount(response.count);
            } else {
                setStudents(response);
                setTotalPages(1);
                setTotalCount(response.length);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
            toast.error("Failed to load student list");
        } finally {
            setLoading(false);
        }
    }, [page, search, sectionFilter]);

    useEffect(() => {
        fetchSections();
        fetchUsers();
    }, [fetchSections, fetchUsers]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStudents();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchStudents]);

    const handleEditClick = (student: StudentProfile) => {
        setEditingStudent(student);
        setEditForm({
            first_name: student.first_name || "",
            middle_name: student.middle_name || "",
            last_name: student.last_name || "",
            lrn: student.lrn || "",
            section_id: student.section?.section_id?.toString() || "",
            user_pk: student.user_id?.id?.toString() || "",
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingStudent) return;
        
        if (!editForm.first_name || !editForm.last_name || !editForm.lrn || !editForm.section_id) {
            toast.error("Please fill in all required fields");
            return;
        }

        if (editForm.lrn.length !== 12) {
            toast.error("LRN must be exactly 12 characters");
            return;
        }

        setSubmitting(true);
        try {
            const data: any = {
                first_name: editForm.first_name,
                middle_name: editForm.middle_name,
                last_name: editForm.last_name,
                lrn: editForm.lrn,
                section_id: parseInt(editForm.section_id),
            };
            
            if (editForm.user_pk) {
                data.user_pk = parseInt(editForm.user_pk);
            } else {
                data.user_pk = null;
            }

            await updateStudent(editingStudent.lrn, data);
            toast.success(`Successfully updated student record`);
            setIsEditDialogOpen(false);
            fetchStudents();
        } catch (error: any) {
            console.error("Error updating student:", error);
            const errorMsg = error.response?.data?.lrn || error.response?.data?.detail || "Failed to update student";
            toast.error(typeof errorMsg === 'string' ? errorMsg : "Validation error check fields");
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetPasswordClick = (user: User) => {
        setResettingUser(user);
        setNewPassword("");
        setIsResetPasswordDialogOpen(true);
    };

    const handleResetPassword = async () => {
        if (!resettingUser || !newPassword) return;
        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters long");
            return;
        }

        setIsResetting(true);
        try {
            await updateUser(resettingUser.id, { password: newPassword });
            toast.success(`Password reset for @${resettingUser.username}`);
            setIsResetPasswordDialogOpen(false);
            setResettingUser(null);
            setNewPassword("");
        } catch (error: any) {
            console.error("Error resetting password:", error);
            const errorMsg = error.response?.data?.detail || "Failed to reset password";
            toast.error(errorMsg);
        } finally {
            setIsResetting(false);
        }
    };

    const handleDeleteClick = (student: StudentProfile) => {
        setStudentToDelete(student);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteStudent = async () => {
        if (!studentToDelete) return;

        setIsDeleting(true);
        try {
            await deleteStudent(studentToDelete.lrn);
            toast.success(`Student record deleted successfully`);
            setIsDeleteDialogOpen(false);
            setStudentToDelete(null);
            fetchStudents();
        } catch (error: any) {
            console.error("Error deleting student:", error);
            const errorMsg = error.response?.data?.detail || "Failed to delete student";
            toast.error(errorMsg);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-8 pb-10 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <GraduationCap className="h-10 w-10 text-indigo-600" />
                        Students
                        <Badge variant="outline" className="h-6 px-3 rounded-full bg-slate-100/50 text-slate-500 border-slate-200 font-black text-[10px] tracking-widest uppercase ml-2">
                            Classes
                        </Badge>
                    </h1>
                    <p className="text-slate-500 font-bold text-sm mt-2 flex items-center gap-2">
                        View and manage all students registered in the system.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        onClick={() => fetchStudents()} 
                        disabled={loading}
                        className="rounded-xl bg-slate-900 hover:bg-black text-white px-6 h-11 font-bold shadow-premium-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filter Card */}
            <Card className="border-none shadow-premium-sm rounded-[2rem] overflow-hidden bg-white border border-slate-100">
                <CardContent className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-end">
                        <div className="lg:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Search Students</label>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                <Input 
                                    placeholder="Search name, LRN, or email..." 
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 transition-all font-bold text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Section</label>
                            <Select value={sectionFilter} onValueChange={(val) => { setSectionFilter(val); setPage(1); }}>
                                <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:ring-4 focus:ring-indigo-600/10 font-bold">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-slate-400" />
                                        <SelectValue placeholder="All Sections" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-100 shadow-xl overflow-hidden">
                                    <SelectItem value="all" className="font-bold py-3 text-sm">All Sections</SelectItem>
                                    {sections.map(section => (
                                        <SelectItem key={section.section_id} value={section.section_id.toString()} className="font-bold py-3 text-sm">
                                            {section.section_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button 
                            variant="ghost" 
                            onClick={() => { setSearch(""); setSectionFilter("all"); setPage(1); }}
                            className="h-14 px-6 rounded-2xl text-slate-400 hover:text-indigo-600 font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all"
                        >
                            Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Students Table Card */}
            <Card className="border-none shadow-premium-lg rounded-[2.5rem] overflow-hidden bg-white border border-slate-100">
                <CardHeader className="p-10 pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Student Roster</CardTitle>
                            <CardDescription className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest flex items-center gap-2">
                                <Users className="h-3 w-3" /> Showing {totalCount} students
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <TableHead className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Name</TableHead>
                                    <TableHead className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">LRN</TableHead>
                                    <TableHead className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Section</TableHead>
                                    <TableHead className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</TableHead>
                                    <TableHead className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</TableHead>
                                </tr>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence mode="popLayout">
                                    {loading ? (
                                        [1, 2, 3, 4, 5].map((i) => (
                                            <TableRow key={i} className="h-24">
                                                <TableCell colSpan={5}>
                                                    <div className="flex items-center gap-4 px-6">
                                                        <div className="w-12 h-12 bg-slate-50 animate-pulse rounded-2xl"></div>
                                                        <div className="space-y-2">
                                                            <div className="h-4 bg-slate-50 animate-pulse rounded w-48"></div>
                                                            <div className="h-3 bg-slate-50 animate-pulse rounded w-32"></div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : students.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                                                        <Users className="h-10 w-10 text-slate-200" />
                                                    </div>
                                                    <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No matching records found.</p>
                                                    <Button variant="outline" onClick={() => { setSearch(""); setSectionFilter("all"); }} className="rounded-xl font-bold">Clear Filters</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        students.map((student, idx) => (
                                            <motion.tr
                                                key={student.lrn}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className="group hover:bg-indigo-50/30 transition-all border-b border-slate-50 last:border-0"
                                            >
                                                <TableCell className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 overflow-hidden">
                                                            {student.user_id?.username ? (
                                                                <img src={`https://avatar.vercel.sh/${student.user_id.username}`} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                student.first_name?.[0]
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-900 font-black text-sm uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                                                                {student.first_name} {student.last_name}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-1">
                                                                <Mail className="h-2.5 w-2.5" /> {student.user_id?.email || "No email"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8 py-6">
                                                    <div className="flex items-center gap-2 text-slate-600 font-black text-xs tracking-widest bg-slate-50 w-fit px-3 py-1.5 rounded-lg border border-slate-100">
                                                        <Hash className="h-3 w-3 text-slate-400" /> {student.lrn}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8 py-6">
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-none rounded-xl text-[10px] font-black tracking-widest uppercase py-1.5 px-4 shadow-sm shadow-emerald-100/50">
                                                        {student.section?.section_name || "Unassigned"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-8 py-6">
                                                    <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${student.user_id?.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        <div className={`w-2 h-2 rounded-full ${student.user_id?.is_active ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`}></div>
                                                        {student.user_id?.is_active ? 'Active' : 'Disabled'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8 py-6 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100 text-slate-400 transition-all">
                                                                <MoreHorizontal className="h-5 w-5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56 rounded-[1.5rem] border-slate-100 shadow-2xl p-2 bg-white">
                                                            <DropdownMenuItem onClick={() => handleEditClick(student)} className="rounded-xl py-3 px-4 font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-3">
                                                                <Edit className="w-4 h-4 text-slate-400" /> Edit Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="rounded-xl py-3 px-4 font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-3">
                                                                <UserCircle className="w-4 h-4 text-slate-400" /> View Profile
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-slate-50" />
                                                            <DropdownMenuItem onClick={() => handleResetPasswordClick(student.user_id)} className="rounded-xl py-3 px-4 font-bold text-xs text-indigo-600 hover:bg-indigo-50 cursor-pointer flex items-center gap-3">
                                                                <Lock className="w-4 h-4 text-indigo-400" /> Reset Password
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-slate-50" />
                                                            <DropdownMenuItem 
                                                                onClick={() => handleDeleteClick(student)}
                                                                className="rounded-xl py-3 px-4 font-bold text-xs text-rose-600 hover:bg-rose-50 cursor-pointer flex items-center gap-3"
                                                            >
                                                                <Trash2 className="w-4 h-4 text-rose-400" /> Delete Student
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </motion.tr>
                                        ))
                                    )}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="p-8 border-t border-slate-50 flex items-center justify-between bg-slate-50/20">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                           Page {page} of {totalPages} <span className="mx-2 text-slate-200">|</span> {totalCount} total students
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="rounded-xl h-11 px-5 border-slate-200 font-black text-xs text-slate-600 shadow-sm active:scale-95 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="rounded-xl h-11 px-5 border-slate-200 font-black text-xs text-slate-600 shadow-sm active:scale-95 transition-all"
                            >
                                Next <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Student Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-2xl rounded-[2rem] border-slate-200 shadow-2xl p-0 overflow-hidden bg-white max-h-[90vh] flex flex-col">
                    <DialogHeader className="px-10 pt-10 pb-4">
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <Edit className="h-6 w-6 text-indigo-600" />
                            </div>
                            Update Student Information
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-bold mt-2">
                           Modify core details for <span className="text-indigo-600">@{editingStudent?.lrn}</span>. Ensure LRN and identifiers are accurate.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-10 py-6 space-y-8 overflow-y-auto">
                        {/* Name Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</Label>
                                <Input 
                                    className="h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white font-bold transition-all"
                                    value={editForm.first_name}
                                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Middle Name</Label>
                                <Input 
                                    className="h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white font-bold transition-all"
                                    value={editForm.middle_name}
                                    onChange={(e) => setEditForm({ ...editForm, middle_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</Label>
                                <Input 
                                    className="h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white font-bold transition-all"
                                    value={editForm.last_name}
                                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* LRN & Section */}
                            <div className="space-y-6">
                                <div className="space-y-2.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">LRN (12 Digits)</Label>
                                    <div className="relative">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input 
                                            className="h-12 pl-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white font-black tracking-widest transition-all"
                                            value={editForm.lrn}
                                            maxLength={12}
                                            onChange={(e) => setEditForm({ ...editForm, lrn: e.target.value.replace(/\D/g, '') })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned Section</Label>
                                    <Select value={editForm.section_id} onValueChange={(val) => setEditForm({ ...editForm, section_id: val })}>
                                        <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold">
                                            <SelectValue placeholder="Select Section" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl shadow-2xl border-slate-100">
                                            {sections.map(s => (
                                                <SelectItem key={s.section_id} value={s.section_id.toString()} className="font-bold py-3 text-sm">
                                                    {s.section_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* User Account Association */}
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Associated User Account</Label>
                                <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 space-y-4">
                                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                        Linking a student to a user account allows them to log in and view their personal analysis.
                                    </p>
                                    <Select value={editForm.user_pk} onValueChange={(val) => setEditForm({ ...editForm, user_pk: val })}>
                                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white shadow-sm font-bold text-xs">
                                            <div className="flex items-center gap-2">
                                                <UserCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                                                <SelectValue placeholder="No account linked" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl shadow-2xl border-slate-100 max-h-[200px]">
                                            <SelectItem value="none" className="font-bold py-3 text-xs">None (De-associate)</SelectItem>
                                            {allUsers.filter(u => u.acc_type === 'STUDENT' || !u.acc_type).map(u => (
                                                <SelectItem key={u.id} value={u.id.toString()} className="font-bold py-3 text-xs">
                                                    @{u.username} ({u.email || "No Email"})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-10 py-8 bg-slate-50/50 flex items-center justify-between mt-auto">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsEditDialogOpen(false)}
                            className="rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 border-none h-12 px-6"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSaveEdit}
                            disabled={submitting}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Update Student
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Reset Password Dialog */}
            <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] border-slate-200 shadow-2xl p-0 overflow-hidden bg-white">
                    <DialogHeader className="px-10 pt-10 pb-4">
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <Lock className="h-6 w-6 text-indigo-600" />
                            </div>
                            Reset Password
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-bold mt-2">
                           Set a new password for <span className="text-indigo-600">@{resettingUser?.username}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-10 py-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">New Password</Label>
                            <Input 
                                type="password"
                                placeholder="Min. 8 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
                            />
                        </div>
                    </div>

                    <DialogFooter className="px-10 py-8 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsResetPasswordDialogOpen(false)}
                            className="rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 border-none h-12"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleResetPassword}
                            disabled={isResetting || !newPassword}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex-1 h-12 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Update Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] border-slate-200 shadow-2xl p-0 overflow-hidden bg-white">
                    <DialogHeader className="px-10 pt-10 pb-4">
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                                <Trash2 className="h-6 w-6 text-rose-600" />
                            </div>
                            Delete Student?
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-bold mt-2">
                           This action will permanently remove <span className="text-rose-600 font-black">{studentToDelete?.first_name} {studentToDelete?.last_name}</span> (LRN: {studentToDelete?.lrn}) from the records.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="px-10 py-8 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 border-none h-12"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleDeleteStudent}
                            disabled={isDeleting}
                            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex-1 h-12 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-100 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Confirm Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
