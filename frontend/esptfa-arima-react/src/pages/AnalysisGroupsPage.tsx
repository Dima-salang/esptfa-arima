import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAnalysisGroups, createAnalysisGroup } from "@/lib/api-teacher";
import type { AnalysisGroup } from "@/lib/api-teacher";
import { FolderKanban, Plus, Loader2, Calendar, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function AnalysisGroupsPage() {
    const [groups, setGroups] = useState<AnalysisGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [createLoading, setCreateLoading] = useState(false);

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const data = await getAnalysisGroups();
            setGroups(data);
        } catch (error) {
            console.error("Failed to fetch groups", error);
            toast.error("Failed to load analysis groups.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        try {
            setCreateLoading(true);
            await createAnalysisGroup({ group_name: newGroupName.trim() });
            toast.success("Group created successfully!");
            setNewGroupName("");
            setIsCreating(false);
            fetchGroups();
        } catch (error) {
            console.error("Failed to create group", error);
            toast.error("Failed to create group.");
        } finally {
            setCreateLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans selection:bg-indigo-500/30">
            <div className="max-w-6xl mx-auto space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-indigo-50 rounded-xl ring-1 ring-indigo-100 shadow-inner">
                                <FolderKanban className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analysis Groups</h1>
                        </div>
                        <p className="text-slate-500 font-medium">Group your analysis reports to see aggregated statistics and class summaries.</p>
                    </div>
                    <Button
                        onClick={() => setIsCreating(!isCreating)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 px-6 shadow-xl shadow-indigo-200/50 transition-all font-bold tracking-wide"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Create Group
                    </Button>
                </div>

                {/* Create Group Form */}
                <AnimatePresence>
                    {isCreating && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, y: -20 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -20 }}
                            className="bg-white rounded-3xl p-6 md:p-8 shadow-premium-sm border border-slate-100 overflow-hidden"
                        >
                            <form onSubmit={handleCreateGroup} className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 space-y-2 w-full">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                                        Group Name
                                    </label>
                                    <Input
                                        autoFocus
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        placeholder="e.g., Q1 STEM 11 Mathematics"
                                        className="h-14 bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 font-bold text-slate-900 text-base"
                                        disabled={createLoading}
                                    />
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setIsCreating(false)}
                                        className="h-14 px-6 rounded-2xl font-bold text-slate-500 hover:text-slate-900"
                                        disabled={createLoading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={!newGroupName.trim() || createLoading}
                                        className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200/50 w-full md:w-auto"
                                    >
                                        {createLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Group"}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Groups List */}
                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    </div>
                ) : groups.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-premium-sm border border-slate-100 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-rose-50/50 pointer-events-none" />
                        <div className="relative z-10 max-w-sm mx-auto space-y-6">
                            <div className="w-24 h-24 bg-white shadow-xl shadow-indigo-100 rounded-full mx-auto flex items-center justify-center ring-1 ring-slate-100">
                                <FolderKanban className="w-10 h-10 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">No groups yet</h3>
                                <p className="text-slate-500 font-medium mt-2">Create your first group to start combining analysis reports.</p>
                            </div>
                            <Button
                                onClick={() => setIsCreating(true)}
                                variant="outline"
                                className="h-12 rounded-xl px-8 border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-50"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Group
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groups.map((group, index) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={group.group_id}
                            >
                                <Link to={`/dashboard/groups/${group.group_id}`}>
                                    <div className="group bg-white rounded-3xl p-6 shadow-premium-sm border border-slate-100 hover:shadow-premium-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden h-full flex flex-col">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                                        
                                        <div className="flex-1 relative z-10">
                                            <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                                {group.group_name}
                                            </h3>
                                            
                                            <div className="mt-6 space-y-3">
                                                <div className="flex items-center text-sm font-bold text-slate-500">
                                                    <FileText className="w-4 h-4 mr-2.5 text-indigo-400" />
                                                    {group.analysis_documents?.length || 0} Reports Included
                                                </div>
                                                <div className="flex items-center text-sm font-bold text-slate-500">
                                                    <Calendar className="w-4 h-4 mr-2.5 text-rose-400" />
                                                    {new Date(group.created_at).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-indigo-600 font-bold text-sm relative z-10">
                                            <span>View Details</span>
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
