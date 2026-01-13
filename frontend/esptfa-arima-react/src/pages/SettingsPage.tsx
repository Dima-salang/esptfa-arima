import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Mail,
    UserCircle,
    UserCheck,
    Fingerprint,
    Lock,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useUserStore } from "@/store/useUserStore";

export default function SettingsPage() {
    const { user, loading } = useUserStore();

    if (loading && !user) {
        return (
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
        );
    }

    const initials = user ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}` : "??";
    const fullName = user ? `${user.first_name} ${user.last_name}` : "System User";


    return (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Your Profile</h1>
                        <p className="text-slate-500 font-medium italic mt-1">Verified teacher information and department records</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-100 font-black text-[10px] uppercase tracking-widest shadow-sm">
                        <UserCheck className="h-3 w-3" />
                        Authenticated
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Simplified Profile Column */}
                    <Card className="lg:col-span-1 border-none shadow-xl ring-1 ring-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-xl h-fit">
                        <CardContent className="p-8 flex flex-col items-center text-center">
                            <div className="mb-6 relative">
                                <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-md opacity-20"></div>
                                <Avatar className="h-32 w-32 border-4 border-white shadow-2xl relative">
                                    <AvatarFallback className="text-3xl font-black bg-slate-900 text-white leading-none">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900">{fullName}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 mb-6">{user?.acc_type}</p>

                            <div className="w-full space-y-3 pt-6 border-t border-slate-100">
                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 border border-slate-100 text-left">
                                    <Mail className="h-4 w-4 text-indigo-500" />
                                    <div className="overflow-hidden">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Official Email</p>
                                        <p className="text-xs font-bold text-slate-600 truncate">{user?.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 border border-slate-100 text-left">
                                    <Fingerprint className="h-4 w-4 text-indigo-500" />
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">System Username</p>
                                        <p className="text-xs font-bold text-slate-600">@{user?.username}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Info Column */}
                    <Card className="lg:col-span-2 border-none shadow-xl ring-1 ring-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-xl">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                                <UserCircle className="h-6 w-6 text-indigo-600" />
                                Registration Details
                            </CardTitle>
                            <CardDescription>View-only access to system records</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">First Name</Label>
                                    <Input value={user?.first_name || ""} readOnly className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 font-bold text-slate-600 focus-visible:ring-0 cursor-default" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Last Name</Label>
                                    <Input value={user?.last_name || ""} readOnly className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 font-bold text-slate-600 focus-visible:ring-0 cursor-default" />
                                </div>
                            </div>

                            <Separator className="opacity-50" />

                            <div className="p-6 rounded-[2rem] bg-amber-50 border border-amber-100 text-amber-900 border-dashed">
                                <p className="text-xs font-black uppercase mb-1 flex items-center gap-2">
                                    <Lock className="h-3 w-3" /> Information Security
                                </p>
                                <p className="text-[11px] font-medium leading-relaxed italic">
                                    Profile information is synchronized directly from official school records. If any details are incorrect, please contact the IT administration office for data verification.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
    );
}
