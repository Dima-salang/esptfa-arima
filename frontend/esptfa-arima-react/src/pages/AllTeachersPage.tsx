import { useEffect, useState, useCallback } from "react";
import { 
    getAllTeachers,
    getAllUsers, 
    updateTeacher,
    deleteTeacher,
    updateUser,
    type Teacher, 
    type User,
} from "@/lib/api-admin";
import {
    Card,
    CardContent,
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
    Search,
    RefreshCw,
    UserCircle,
    MoreHorizontal,
    Mail,
    Users,
    Lock,
    Edit,
    UserCircle2,
    Save,
    Presentation,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AllTeachersPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [totalCount, setTotalCount] = useState(0);

    // Edit State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [editForm, setEditForm] = useState({
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
    const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchUsers = useCallback(async () => {
        try {
            const data = await getAllUsers();
            setAllUsers(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    }, []);

    const fetchTeachers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getAllTeachers();
            const data = Array.isArray(response) ? response : response.results || [];
            
            // Basic search filtering
            const filtered = data.filter((t: Teacher) => {
                const fullName = `${t.user_id?.first_name} ${t.user_id?.last_name}`.toLowerCase();
                const username = t.user_id?.username?.toLowerCase() || "";
                const email = t.user_id?.email?.toLowerCase() || "";
                const query = search.toLowerCase();
                return fullName.includes(query) || username.includes(query) || email.includes(query);
            });

            setTeachers(filtered);
            setTotalCount(filtered.length);
        } catch (error) {
            console.error("Error fetching teachers:", error);
            toast.error("Failed to load teacher list");
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTeachers();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchTeachers]);

    const handleEditClick = (teacher: Teacher) => {
        setEditingTeacher(teacher);
        setEditForm({
            user_pk: teacher.user_id?.id?.toString() || "",
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingTeacher) return;
        
        if (!editForm.user_pk) {
            toast.error("Please select a user account");
            return;
        }

        setSubmitting(true);
        try {
            const data: any = {
                user_pk: parseInt(editForm.user_pk),
            };
            
            await updateTeacher(editingTeacher.id, data);
            toast.success(`Successfully updated teacher profile`);
            setIsEditDialogOpen(false);
            fetchTeachers();
        } catch (error: any) {
            console.error("Error updating teacher:", error);
            const errorMsg = error.response?.data?.detail || "Failed to update teacher";
            toast.error(errorMsg);
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

    const handleDeleteClick = (teacher: Teacher) => {
        setTeacherToDelete(teacher);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteTeacher = async () => {
        if (!teacherToDelete) return;

        setIsDeleting(true);
        try {
            await deleteTeacher(teacherToDelete.id);
            toast.success(`Teacher record deleted successfully`);
            setIsDeleteDialogOpen(false);
            setTeacherToDelete(null);
            fetchTeachers();
        } catch (error: any) {
            console.error("Error deleting teacher:", error);
            const errorMsg = error.response?.data?.detail || "Failed to delete teacher";
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
                        <Presentation className="h-10 w-10 text-indigo-600" />
                        Teachers
                        <Badge variant="outline" className="h-6 px-3 rounded-full bg-slate-100/50 text-slate-500 border-slate-200 font-black text-[10px] tracking-widest uppercase ml-2">
                            Registry
                        </Badge>
                    </h1>
                    <p className="text-slate-500 font-bold text-sm mt-2 flex items-center gap-2">
                        View and manage all registered educators in the system.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        onClick={() => fetchTeachers()} 
                        disabled={loading}
                        className="rounded-xl bg-slate-900 hover:bg-black text-white px-6 h-11 font-bold shadow-premium-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className="border-none shadow-premium-sm rounded-3xl bg-white border border-slate-100">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <Users className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Teachers</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{totalCount}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <Input 
                        placeholder="Search by name, email or username..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-14 pl-12 rounded-2xl border-transparent bg-white shadow-premium-sm focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-sm"
                    />
                </div>
            </div>

            {/* List Section */}
            <Card className="border-none shadow-premium-sm rounded-[2.5rem] overflow-hidden bg-white border border-slate-50">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <TableHead className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Name</TableHead>
                                    <TableHead className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Username</TableHead>
                                    <TableHead className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Email</TableHead>
                                    <TableHead className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</TableHead>
                                </tr>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence mode="popLayout">
                                    {loading ? (
                                        [1, 2, 3, 4, 5].map((i) => (
                                            <TableRow key={i} className="h-24">
                                                <TableCell colSpan={4}>
                                                    <div className="flex items-center gap-4 px-6">
                                                        <div className="w-12 h-12 bg-slate-50 animate-pulse rounded-2xl"></div>
                                                        <div className="space-y-2">
                                                            <div className="h-4 w-32 bg-slate-50 animate-pulse rounded-full"></div>
                                                            <div className="h-3 w-48 bg-slate-50 animate-pulse rounded-full"></div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : teachers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center py-10">
                                                    <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                                                        <Users className="h-8 w-8 text-slate-200" />
                                                    </div>
                                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">No teachers found</h3>
                                                    <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-widest text-[10px]">Try adjusting your search criteria</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        teachers.map((teacher, index) => (
                                            <motion.tr 
                                                key={teacher.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                                className="group hover:bg-indigo-50/20 transition-all border-b border-slate-50 last:border-0"
                                            >
                                                <TableCell className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-indigo-600 text-lg border border-slate-100 group-hover:scale-110 transition-transform shadow-inner">
                                                            {teacher.user_id?.first_name?.[0]}{teacher.user_id?.last_name?.[0]}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">
                                                                {teacher.user_id?.first_name} {teacher.user_id?.last_name}
                                                            </div>
                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Teacher Profile #{teacher.id}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <UserCircle className="w-3.5 h-3.5 text-slate-300" />
                                                        <span className="text-sm font-bold text-slate-600">@{teacher.user_id?.username}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-3.5 h-3.5 text-slate-300" />
                                                        <span className="text-sm font-bold text-slate-600">{teacher.user_id?.email || "No email listed"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8 py-6 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100 transition-all">
                                                                <MoreHorizontal className="h-5 w-5 text-slate-400" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56 rounded-[1.5rem] border-slate-100 shadow-2xl p-2 bg-white">
                                                            <DropdownMenuItem onClick={() => handleEditClick(teacher)} className="rounded-xl py-3 px-4 font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-3">
                                                                <Edit className="w-4 h-4 text-slate-400" /> Edit Profile
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-slate-50" />
                                                            <DropdownMenuItem 
                                                                onClick={() => teacher.user_id && handleResetPasswordClick(teacher.user_id)} 
                                                                className="rounded-xl py-3 px-4 font-bold text-xs text-indigo-600 hover:bg-indigo-50 cursor-pointer flex items-center gap-3"
                                                            >
                                                                <Lock className="w-4 h-4 text-indigo-400" /> Reset Password
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-slate-50" />
                                                            <DropdownMenuItem 
                                                                onClick={() => handleDeleteClick(teacher)}
                                                                className="rounded-xl py-3 px-4 font-bold text-xs text-rose-600 hover:bg-rose-50 cursor-pointer flex items-center gap-3"
                                                            >
                                                                <Trash2 className="w-4 h-4 text-rose-400" /> Delete Teacher
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
                </CardContent>
            </Card>

            {/* Edit Teacher Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] border-slate-200 shadow-2xl p-0 overflow-hidden bg-white">
                    <DialogHeader className="px-10 pt-10 pb-4">
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <Edit className="h-6 w-6 text-indigo-600" />
                            </div>
                            Update Teacher Profile
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-bold mt-2">
                           Re-associate profile for <span className="text-indigo-600">ID #{editingTeacher?.id}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-10 py-6 space-y-6">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Associated User Account</Label>
                            <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 space-y-4">
                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                    Linking a teacher to a user account allows them to access the educator dashboard and manage class records.
                                </p>
                                <Select value={editForm.user_pk} onValueChange={(val) => setEditForm({ ...editForm, user_pk: val })}>
                                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white shadow-sm font-bold text-sm">
                                        <div className="flex items-center gap-2">
                                            <UserCircle2 className="h-4 w-4 text-indigo-500" />
                                            <SelectValue placeholder="Select account" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl shadow-2xl border-slate-100 max-h-[250px]">
                                        {allUsers.filter(u => u.acc_type === 'TEACHER' || !u.acc_type).map(u => (
                                            <SelectItem key={u.id} value={u.id.toString()} className="font-bold py-3 text-sm">
                                                @{u.username} ({u.first_name} {u.last_name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-10 py-8 bg-slate-50/50 flex items-center justify-between">
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
                            Update Profile
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
                            Delete Teacher?
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-bold mt-2">
                           This action will permanently remove <span className="text-rose-600 font-black">{teacherToDelete?.user_id?.first_name} {teacherToDelete?.user_id?.last_name}</span> from the registry. This action cannot be undone.
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
                            onClick={handleDeleteTeacher}
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
