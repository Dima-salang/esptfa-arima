import { useEffect, useState, useCallback, useMemo } from "react";
import {
    getAllUsers,
    updateUser,
    deleteUser,
} from "@/lib/api-admin";
import type { User } from "@/lib/api-admin";
import { toast } from "sonner";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Search,
    Edit2,
    Trash2,
    Loader2,
    Shield,
    CheckCircle2,
    XCircle,
    ArrowUpDown,
    Users,
    UserCheck,
    UserX,
    ShieldAlert,
    RefreshCw,
    MoreHorizontal,
    Mail,
    Calendar,
    UserCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterActive, setFilterActive] = useState<string>("all");
    const [ordering, setOrdering] = useState<string>("-date_joined");

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                search: search || undefined,
                ordering: ordering,
                page: page,
            };

            if (filterActive !== "all") params.is_active = filterActive;

            const response = await getAllUsers(params);
            if (response.results) {
                setUsers(response.results);
                setTotalCount(response.count);
            } else {
                setUsers(response);
                setTotalCount(response.length);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    }, [search, filterActive, ordering, page]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 500); 
        return () => clearTimeout(timer);
    }, [fetchUsers]);

    const stats = useMemo(() => {
        return {
            total: totalCount,
            active: users.filter(u => u.is_active).length,
            admins: users.filter(u => u.is_superuser).length,
            teachers: users.filter(u => u.acc_type === 'TEACHER').length,
        };
    }, [users, totalCount]);

    const handleSort = (field: string) => {
        if (ordering === field) {
            setOrdering(`-${field}`);
        } else {
            setOrdering(field);
        }
    };

    const handleEditClick = (user: User) => {
        setEditingUser({ ...user });
        setIsEditDialogOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        setSubmitting(true);
        try {
            const data: any = {
                username: editingUser.username,
                email: editingUser.email,
                first_name: editingUser.first_name,
                last_name: editingUser.last_name,
                is_active: editingUser.is_active,
                is_superuser: editingUser.is_superuser,
            };

            await updateUser(editingUser.id, data);
            toast.success("User updated successfully");
            setIsEditDialogOpen(false);
            fetchUsers();
        } catch (error: any) {
            console.error("Error updating user:", error);
            const errorMsg = error.response?.data?.detail || "Failed to update user";
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setDeleting(true);
        try {
            await deleteUser(userToDelete.id);
            toast.success("User deleted successfully");
            setIsDeleteDialogOpen(false);
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("Failed to delete user");
        } finally {
            setDeleting(false);
            setUserToDelete(null);
        }
    };

    const getBadgeStyles = (accType: string) => {
        switch (accType) {
            case 'ADMIN': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'TEACHER': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            default: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        }
    };

    const getInitials = (user: User) => {
        if (user.first_name && user.last_name) {
            return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
        }
        return user.username.substring(0, 2).toUpperCase();
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 pb-10"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        User Management
                        <Badge variant="outline" className="h-5 px-2.5 rounded-full bg-slate-100/50 text-slate-500 border-slate-200 font-semibold text-[10px] tracking-wide uppercase">
                            Administrator
                        </Badge>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">
                        Manage user accounts, roles, and system permissions.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        onClick={() => fetchUsers()} 
                        variant="outline" 
                        size="sm"
                        className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600 gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Users", value: stats.total, icon: Users, color: "indigo" },
                    { label: "Active Users", value: stats.active, icon: UserCheck, color: "emerald" },
                    { label: "Admins", value: stats.admins, icon: ShieldAlert, color: "amber" },
                    { label: "Teachers", value: stats.teachers, icon: UserCircle2, color: "violet" },
                ].map((stat, i) => (
                    <Card key={i} className="border-slate-200 shadow-sm overflow-hidden">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
                                <p className="text-xl font-bold text-slate-900">{loading ? "..." : stat.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters and Search */}
            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row gap-4 items-end">
                        <div className="w-full lg:flex-1 space-y-1.5">
                            <Label className="text-[11px] font-bold uppercase text-slate-500 ml-0.5">Search Users</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search by name, email, or username..."
                                    className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="w-full lg:w-48 space-y-1.5">
                            <Label className="text-[11px] font-bold uppercase text-slate-500 ml-0.5">Status</Label>
                            <Select value={filterActive} onValueChange={setFilterActive}>
                                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500/10 font-medium">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="true">Active Only</SelectItem>
                                    <SelectItem value="false">Inactive Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            variant="ghost"
                            onClick={() => { setSearch(""); setFilterActive("all"); }}
                            className="h-10 px-4 rounded-xl text-slate-500 hover:text-slate-900 font-semibold"
                        >
                            Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white">
                <CardHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900">User List</CardTitle>
                            <CardDescription className="text-slate-500 text-xs">A total of {totalCount} registered users</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                                    <TableHead onClick={() => handleSort('username')} className="h-12 cursor-pointer font-bold text-[11px] uppercase tracking-wider text-slate-500">
                                        <div className="flex items-center gap-1.5 px-2">
                                            Username <ArrowUpDown className="h-3 w-3" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="h-12 font-bold text-[11px] uppercase tracking-wider text-slate-500">Full Name</TableHead>
                                    <TableHead className="h-12 font-bold text-[11px] uppercase tracking-wider text-slate-500">Role</TableHead>
                                    <TableHead className="h-12 font-bold text-[11px] uppercase tracking-wider text-slate-500 text-center">Status</TableHead>
                                    <TableHead onClick={() => handleSort('date_joined')} className="h-12 cursor-pointer font-bold text-[11px] uppercase tracking-wider text-slate-500">
                                        <div className="flex items-center gap-1.5 px-2">
                                            Joined <ArrowUpDown className="h-3 w-3" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="h-12 text-right pr-6 font-bold text-[11px] uppercase tracking-wider text-slate-500">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence mode="popLayout">
                                    {loading ? (
                                        ['s1', 's2', 's3', 's4', 's5'].map((key) => (
                                            <TableRow key={key} className="h-16">
                                                <TableCell colSpan={6}><div className="h-10 bg-slate-50 animate-pulse rounded-lg w-full"></div></TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        users.map((user) => (
                                            <TableRow
                                                key={user.id}
                                                className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                            >
                                                <TableCell className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9 rounded-full border border-slate-200">
                                                            <AvatarImage src={`https://avatar.vercel.sh/${user.username}`} />
                                                            <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xs">
                                                                {getInitials(user)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                                                                {user.username}
                                                                {user.is_superuser && <Shield className="h-3 w-3 text-amber-500" />}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-slate-400">ID: {user.id}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-700 font-semibold text-sm">
                                                            {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}` : "—"}
                                                        </span>
                                                        <span className="text-slate-400 text-xs">
                                                            {user.email}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`h-5 rounded-md px-2 font-bold text-[10px] uppercase border tracking-tight ${getBadgeStyles(user.acc_type)}`}>
                                                        {user.acc_type.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex justify-center">
                                                        {user.is_active ? (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                                                                <span className="text-[10px] font-bold uppercase tracking-wide">Active</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300"></div>
                                                                <span className="text-[10px] font-bold uppercase tracking-wide">Inactive</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-slate-600 font-medium text-xs">
                                                        {new Date(user.date_joined).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 border-transparent hover:border-slate-200">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40 rounded-xl border-slate-200 shadow-xl p-1">
                                                            <DropdownMenuItem onClick={() => handleEditClick(user)} className="rounded-lg px-2.5 py-2 cursor-pointer focus:bg-slate-50">
                                                                <Edit2 className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                                                <span className="font-semibold text-slate-700 text-sm">Edit User</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-slate-100 mx-1 my-1" />
                                                            <DropdownMenuItem onClick={() => handleDeleteClick(user)} className="rounded-lg px-2.5 py-2 cursor-pointer focus:bg-red-50 text-red-600">
                                                                <Trash2 className="h-3.5 w-3.5 mr-2 text-red-400" />
                                                                <span className="font-semibold text-sm">Delete User</span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                
                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-tight">
                         Page {page} of {Math.ceil(totalCount / 10) || 1}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="rounded-lg h-9 px-3 border-slate-200 font-semibold text-xs text-slate-600"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={users.length < 10}
                            onClick={() => setPage(p => p + 1)}
                            className="rounded-lg h-9 px-3 border-slate-200 font-semibold text-xs text-slate-600"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 shadow-2xl p-0 overflow-hidden bg-white">
                    <DialogHeader className="px-6 pt-6 pb-2">
                        <DialogTitle className="text-xl font-bold text-slate-900">Edit User</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium text-sm">
                            Modify account details and permissions for <b>{editingUser?.username}</b>.
                        </DialogDescription>
                    </DialogHeader>

                    {editingUser && (
                        <div className="px-6 py-4 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="first_name" className="text-xs font-bold text-slate-500 uppercase ml-0.5">First Name</Label>
                                    <Input
                                        id="first_name"
                                        value={editingUser.first_name}
                                        onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                                        className="h-10 rounded-xl border-slate-200 font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="last_name" className="text-xs font-bold text-slate-500 uppercase ml-0.5">Last Name</Label>
                                    <Input
                                        id="last_name"
                                        value={editingUser.last_name}
                                        onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                                        className="h-10 rounded-xl border-slate-200 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase ml-0.5">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                    className="h-10 rounded-xl border-slate-200 font-medium"
                                />
                            </div>

                            <div className="pt-2 space-y-4">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">System Permissions</h4>

                                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-semibold text-slate-800">Account Status</Label>
                                        <p className="text-[11px] text-slate-400 font-medium">Toggle login access</p>
                                    </div>
                                    <Select
                                        value={editingUser.is_active.toString()}
                                        onValueChange={(val) => setEditingUser({ ...editingUser, is_active: val === 'true' })}
                                    >
                                        <SelectTrigger className="w-28 h-9 rounded-lg border-slate-200 bg-white font-semibold text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-lg shadow-xl">
                                            <SelectItem value="true" className="text-xs font-semibold">Active</SelectItem>
                                            <SelectItem value="false" className="text-xs font-semibold">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between p-3.5 rounded-xl border border-indigo-50 bg-indigo-50/30">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-semibold text-indigo-900">Administrator</Label>
                                        <p className="text-[11px] text-indigo-600/60 font-medium">Grant superuser privileges</p>
                                    </div>
                                    <Select
                                        value={editingUser.is_superuser.toString()}
                                        onValueChange={(val) => setEditingUser({ ...editingUser, is_superuser: val === 'true' })}
                                    >
                                        <SelectTrigger className="w-28 h-9 rounded-lg border-indigo-100 bg-white font-semibold text-xs text-indigo-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-lg shadow-xl">
                                            <SelectItem value="true" className="text-xs font-semibold text-indigo-700">Enabled</SelectItem>
                                            <SelectItem value="false" className="text-xs font-semibold text-slate-500">Disabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
                        <Button
                            variant="ghost"
                            onClick={() => setIsEditDialogOpen(false)}
                            className="h-10 px-4 rounded-xl font-semibold text-sm text-slate-500 hover:bg-slate-100"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateUser}
                            disabled={submitting}
                            className="bg-slate-900 hover:bg-black text-white px-6 h-10 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center gap-2"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl border-slate-200 shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="p-6 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                            <Trash2 className="h-6 w-6 text-red-500" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-slate-900 mb-2">Delete User Account</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium text-sm">
                            Are you sure you want to delete <b>{userToDelete?.username}</b>? This action is permanent and cannot be undone.
                        </DialogDescription>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="flex-1 h-10 rounded-xl font-semibold text-sm text-slate-500 border-slate-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmDelete}
                            disabled={deleting}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white h-10 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Confirm Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
