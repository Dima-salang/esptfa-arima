import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
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
    UserCircle,
    CheckCircle2,
    XCircle,
    ArrowUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterActive, setFilterActive] = useState<string>("all");
    const [filterStaff, setFilterStaff] = useState<string>("all");
    const [ordering, setOrdering] = useState<string>("-date_joined");

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                search: search || undefined,
                ordering: ordering,
                page: page,
            };

            if (filterActive !== "all") params.is_active = filterActive;
            if (filterStaff !== "all") params.is_staff = filterStaff;

            const response = await getAllUsers(params);
            // DRF might return { results: [], count: 0 } or just [] if pagination is off
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
    }, [search, filterActive, filterStaff, ordering, page]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 500); // Debounce search
        return () => clearTimeout(timer);
    }, [fetchUsers]);

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
                is_staff: editingUser.is_staff,
                is_superuser: editingUser.is_superuser,
            };

            // Only add password if it was typed (we'd need a separate field for this in a real UI)
            // For now let's assume password editing is optional

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

    const handleDeleteUser = async (user: User) => {
        if (!confirm(`Are you sure you want to delete user ${user.username}? This action is irreversible.`)) return;

        try {
            await deleteUser(user.id);
            toast.success("User deleted successfully");
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("Failed to delete user");
        }
    };

    const getBadgeColor = (accType: string) => {
        switch (accType) {
            case 'ADMIN': return 'bg-amber-50 text-amber-600 border-amber-200';
            case 'TEACHER': return 'bg-indigo-50 text-indigo-600 border-indigo-200';
            default: return 'bg-emerald-50 text-emerald-600 border-emerald-200';
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                            User Management
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Manage system users, permissions, and account status.
                        </p>
                    </div>
                </div>

                {/* Filters and Search */}
                <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row gap-4 items-end">
                            <div className="w-full lg:max-w-sm space-y-2">
                                <Label className="text-sm font-bold text-slate-700">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search by name, email, or username..."
                                        className="pl-10 rounded-xl border-slate-200 focus:ring-indigo-500/20"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="w-full lg:w-40 space-y-2">
                                <Label className="text-sm font-bold text-slate-700">Status</Label>
                                <Select value={filterActive} onValueChange={setFilterActive}>
                                    <SelectTrigger className="rounded-xl border-slate-200">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="true">Active Only</SelectItem>
                                        <SelectItem value="false">Inactive Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-full lg:w-40 space-y-2">
                                <Label className="text-sm font-bold text-slate-700">Role</Label>
                                <Select value={filterStaff} onValueChange={setFilterStaff}>
                                    <SelectTrigger className="rounded-xl border-slate-200">
                                        <SelectValue placeholder="All Roles" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        <SelectItem value="true">Staff Only</SelectItem>
                                        <SelectItem value="false">Regular Users</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => { setSearch(""); setFilterActive("all"); setFilterStaff("all"); }}
                                className="rounded-xl border-slate-200"
                            >
                                Reset Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Users Table */}
                <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
                    <CardHeader className="p-6 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold">System Users ({totalCount})</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-slate-100">
                                        <TableHead onClick={() => handleSort('username')} className="cursor-pointer font-bold text-slate-700">
                                            <div className="flex items-center gap-1">
                                                Username <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead onClick={() => handleSort('email')} className="cursor-pointer font-bold text-slate-700">
                                            <div className="flex items-center gap-1">
                                                Email <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-bold text-slate-700">Full Name</TableHead>
                                        <TableHead className="font-bold text-slate-700">Type</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-center">Active</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-center">Staff</TableHead>
                                        <TableHead onClick={() => handleSort('date_joined')} className="cursor-pointer font-bold text-slate-700">
                                            <div className="flex items-center gap-1">
                                                Joined <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        ['s1', 's2', 's3', 's4', 's5'].map((key) => (
                                            <TableRow key={key} className="animate-pulse border-slate-50">
                                                {['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'].map((ckey) => (
                                                    <TableCell key={ckey}><div className="h-4 bg-slate-100 rounded w-full"></div></TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        users.map((user) => (
                                            <TableRow key={user.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                                <TableCell className="font-bold text-slate-900">
                                                    <div className="flex items-center gap-2">
                                                        <UserCircle className="h-4 w-4 text-slate-400" />
                                                        {user.username}
                                                        {user.is_superuser && <Shield className="h-3 w-3 text-amber-500" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-600 truncate max-w-[150px]">{user.email}</TableCell>
                                                <TableCell className="text-slate-600 font-medium">
                                                    {user.first_name} {user.last_name}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`rounded-lg font-bold text-[10px] uppercase ${getBadgeColor(user.acc_type)}`}>
                                                        {user.acc_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {user.is_active ? (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-slate-300 mx-auto" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {user.is_staff ? (
                                                        <CheckCircle2 className="h-4 w-4 text-indigo-500 mx-auto" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-slate-300 mx-auto" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-slate-400 text-xs">
                                                    {new Date(user.date_joined).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                            onClick={() => handleEditClick(user)}
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                            onClick={() => handleDeleteUser(user)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {!loading && users.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center text-slate-500 font-medium italic">
                                                No users found matching your search.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    {totalCount > 10 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs text-slate-500 font-medium">Showing page {page}</p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="rounded-lg h-8 text-xs"
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={users.length < 10}
                                    onClick={() => setPage(p => p + 1)}
                                    className="rounded-lg h-8 text-xs"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Edit User Details</DialogTitle>
                        <DialogDescription>
                            Update profile information and system permissions for <b>{editingUser?.username}</b>.
                        </DialogDescription>
                    </DialogHeader>

                    {editingUser && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">First Name</Label>
                                    <Input
                                        id="first_name"
                                        value={editingUser.first_name}
                                        onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">Last Name</Label>
                                    <Input
                                        id="last_name"
                                        value={editingUser.last_name}
                                        onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>

                            <Separator className="my-4" />

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-900">System Permissions</h4>

                                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/30">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Active Account</Label>
                                        <p className="text-xs text-slate-500">Allow user to log in</p>
                                    </div>
                                    <Select
                                        value={editingUser.is_active.toString()}
                                        onValueChange={(val) => setEditingUser({ ...editingUser, is_active: val === 'true' })}
                                    >
                                        <SelectTrigger className="w-24 rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Yes</SelectItem>
                                            <SelectItem value="false">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/30">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Staff Status</Label>
                                        <p className="text-xs text-slate-500">Management interface access</p>
                                    </div>
                                    <Select
                                        value={editingUser.is_staff.toString()}
                                        onValueChange={(val) => setEditingUser({ ...editingUser, is_staff: val === 'true' })}
                                    >
                                        <SelectTrigger className="w-24 rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Yes</SelectItem>
                                            <SelectItem value="false">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-100 bg-indigo-50/30">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold text-indigo-900">Superuser Access</Label>
                                        <p className="text-xs text-indigo-600/70">Full system override</p>
                                    </div>
                                    <Select
                                        value={editingUser.is_superuser.toString()}
                                        onValueChange={(val) => setEditingUser({ ...editingUser, is_superuser: val === 'true' })}
                                    >
                                        <SelectTrigger className="w-24 rounded-lg bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Yes</SelectItem>
                                            <SelectItem value="false">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setIsEditDialogOpen(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateUser}
                            disabled={submitting}
                            className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-6"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
