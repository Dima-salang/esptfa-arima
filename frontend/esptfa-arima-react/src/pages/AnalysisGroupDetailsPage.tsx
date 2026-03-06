import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { getAnalysisGroupDetails, updateAnalysisGroup, getAnalysisDocuments, type AnalysisGroupDetail, type AnalysisDocument } from "@/lib/api-teacher";
import { FolderKanban, Plus, Loader2, Calendar, FileText, ChevronLeft, BarChart3, AlertCircle, CheckCircle2, Search, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AnalysisGroupDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const [group, setGroup] = useState<AnalysisGroupDetail | null>(null);
    const [allDocs, setAllDocs] = useState<AnalysisDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchDetails = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await getAnalysisGroupDetails(id);
            setGroup(data);
            
            // Also fetch all available documents to add
            const docs = await getAnalysisDocuments();
            setAllDocs(docs);
        } catch (error) {
            console.error("Failed to fetch group details", error);
            toast.error("Failed to load analysis group details.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const aggregateStats = useMemo(() => {
        if (!group || group.analysis_documents.length === 0) return null;
        
        const validDocs = group.analysis_documents.filter(d => d.statistics);
        if (validDocs.length === 0) return null;

        const totalSuccess = validDocs.reduce((acc, d) => acc + (d.statistics?.success_rate || 0), 0) / validDocs.length;

        return {
            success_rate: totalSuccess.toFixed(1)
        };
    }, [group]);

    const filteredAvailableDocs = useMemo(() => {
        return allDocs
            .filter(doc => !group?.analysis_documents?.some(gd => gd.analysis_document_id === doc.analysis_document_id))
            .filter(doc => {
                const searchLower = searchTerm.toLowerCase();
                const titleMatch = doc.analysis_doc_title.toLowerCase().includes(searchLower);
                const subjectName = typeof doc.subject === 'object' ? doc.subject?.subject_name : '';
                const subjectMatch = subjectName?.toLowerCase().includes(searchLower);
                return titleMatch || subjectMatch;
            })
            .sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());
    }, [allDocs, group?.analysis_documents, searchTerm]);

    const handleAddReport = async (docId: number) => {
        if (!group || !id) return;
        
        try {
            setUpdateLoading(true);
            const currentDocIds = group.analysis_documents.map(d => d.analysis_document_id);
            if (currentDocIds.includes(docId)) {
                toast.info("Report is already in this group.");
                return;
            }
            
            const newDocIds = [...currentDocIds, docId];
            await updateAnalysisGroup(id, { analysis_documents: newDocIds });
            toast.success("Report added to group.");
            fetchDetails(); // Refresh
        } catch (error) {
            console.error("Failed to add report", error);
            toast.error("Failed to add report to group.");
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleRemoveReport = async (docId: number) => {
        if (!group || !id) return;
        
        try {
            setUpdateLoading(true);
            const newDocIds = group.analysis_documents
                .map(d => d.analysis_document_id)
                .filter(id => id !== docId);
                
            await updateAnalysisGroup(id, { analysis_documents: newDocIds });
            toast.success("Report removed from group.");
            fetchDetails(); // Refresh
        } catch (error) {
            console.error("Failed to remove report", error);
            toast.error("Failed to remove report from group.");
        } finally {
            setUpdateLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!group) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <AlertCircle className="w-12 h-12 text-rose-500" />
                <h2 className="text-2xl font-black text-slate-900">Group Not Found</h2>
                <Link to="/dashboard/groups">
                    <Button variant="outline" className="font-bold">Back to Groups</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans selection:bg-indigo-500/30">
            <div className="max-w-6xl mx-auto space-y-10">
                {/* Header Navigation */}
                <Link to="/dashboard/groups" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Groups
                </Link>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-indigo-50 rounded-xl ring-1 ring-indigo-100 shadow-inner">
                                <FolderKanban className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{group.group_name}</h1>
                        </div>
                        <p className="text-slate-500 font-medium">Manage analysis reports added to this group.</p>
                    </div>
                </div>

                {/* Statistics Overview */}
                {aggregateStats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="md:col-start-2"
                        >
                            <Card className="border-none shadow-premium-sm bg-gradient-to-br from-emerald-500/5 to-transparent backdrop-blur-sm overflow-hidden relative group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                    <CheckCircle2 className="w-16 h-16 text-emerald-600" />
                                </div>
                                <CardContent className="p-8 text-center">
                                    <p className="text-xs font-black text-emerald-600/60 uppercase tracking-widest mb-2">Group Success Rate</p>
                                    <div className="flex flex-col items-center justify-center gap-1">
                                        <h3 className="text-5xl font-black text-slate-900 leading-none">{aggregateStats.success_rate}%</h3>
                                        <span className="text-sm font-bold text-slate-400 mt-2">Overall Mastery</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Group Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Included Reports</h2>
                            <div className="px-3 py-1 bg-indigo-50 text-indigo-600 font-black text-xs rounded-full">
                                {group.analysis_documents.length} Reports
                            </div>
                        </div>

                        {group.analysis_documents.length === 0 ? (
                            <div className="bg-white rounded-[2.5rem] p-12 text-center shadow-premium-sm border border-slate-100">
                                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-black text-slate-900">No reports added</h3>
                                <p className="text-slate-500 font-medium mt-1">Add reports from the available list to include them in this group.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {group.analysis_documents.map((doc, index) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        key={doc.analysis_document_id}
                                        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between group/card hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500">
                                                <BarChart3 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 line-clamp-1">{doc.analysis_doc_title}</h4>
                                                <div className="flex flex-wrap items-center text-xs font-bold text-slate-400 mt-1 gap-x-4 gap-y-1">
                                                    <span className="flex items-center">
                                                        <Calendar className="w-3 h-3 mr-1" />
                                                        {new Date(doc.upload_date).toLocaleDateString()}
                                                    </span>
                                                    {doc.statistics && (
                                                        <>
                                                            <span className="text-indigo-600">Avg: {doc.statistics.avg_class_score.toFixed(1)}</span>
                                                            <span className="text-violet-600">Pred: {doc.statistics.predicted_mean.toFixed(1)}</span>
                                                            <span className="text-emerald-600">Success: {doc.statistics.success_rate.toFixed(1)}%</span>
                                                        </>
                                                    )}
                                                    <span className={doc.status ? "text-emerald-500" : "text-amber-500"}>
                                                        {doc.status ? "Processed" : "Processing"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Link to={`/dashboard/analysis/${doc.analysis_document_id}`}>
                                                <Button size="sm" variant="ghost" className="text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold">
                                                    View Report
                                                </Button>
                                            </Link>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="text-rose-600 hover:bg-rose-50 border-rose-100 hover:border-rose-200 rounded-lg"
                                                onClick={() => handleRemoveReport(doc.analysis_document_id)}
                                                disabled={updateLoading}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Add Reports */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Available Reports</h2>
                            
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold p-1 px-2 rounded-lg gap-1.5 transition-all">
                                        <Maximize2 className="w-3.5 h-3.5" />
                                        Expand
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[2rem] border-none shadow-premium bg-slate-50">
                                    <DialogHeader className="p-8 pb-4 bg-white border-b border-slate-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                                                <BarChart3 className="w-6 h-6 text-indigo-600" />
                                                Add Historical Analysis
                                            </DialogTitle>
                                        </div>
                                        <p className="text-slate-500 font-medium mb-6">Search and select previous analysis reports to include in this group.</p>
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                            <Input 
                                                placeholder="Search by report title or subject..." 
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-12 h-14 text-lg rounded-2xl border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                            />
                                        </div>
                                    </DialogHeader>
                                    <ScrollArea className="flex-1 p-8 pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {filteredAvailableDocs.length === 0 ? (
                                                <div className="col-span-full py-20 text-center">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <Search className="w-8 h-8 text-slate-300" />
                                                    </div>
                                                    <h3 className="text-xl font-black text-slate-900">No results found</h3>
                                                    <p className="text-slate-500 font-medium mt-1">Try adjusting your search terms or filters.</p>
                                                </div>
                                            ) : (
                                                filteredAvailableDocs.map((doc) => (
                                                    <motion.div 
                                                        key={doc.analysis_document_id}
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group/item flex flex-col justify-between"
                                                    >
                                                        <div className="mb-4">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                                    {typeof doc.subject === 'object' ? doc.subject.subject_name : 'N/A'}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                    {new Date(doc.upload_date).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <h4 className="font-bold text-slate-900 line-clamp-2 leading-snug group-hover/item:text-indigo-600 transition-colors">{doc.analysis_doc_title}</h4>
                                                        </div>
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => handleAddReport(doc.analysis_document_id)}
                                                            disabled={updateLoading}
                                                            className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold tracking-wide rounded-2xl h-11 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                            Add to Group
                                                        </Button>
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </DialogContent>
                            </Dialog>
                        </div>
                        
                        <div className="bg-white rounded-3xl p-6 shadow-premium-sm border border-slate-100 space-y-4">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                <Input 
                                    placeholder="Search reports..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 h-11 rounded-2xl border-slate-100 bg-slate-50/50 transition-all focus:bg-white focus:ring-indigo-500/20"
                                />
                            </div>

                            {filteredAvailableDocs.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-slate-500 font-medium text-sm">
                                        {searchTerm ? "No reports match your search." : "No other reports available to add."}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {filteredAvailableDocs.slice(0, 5).map((doc) => (
                                        <div key={doc.analysis_document_id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3 hover:border-indigo-100 transition-colors group/item">
                                            <div>
                                                <h4 className="font-bold text-sm text-slate-900 line-clamp-2 group-hover/item:text-indigo-600 transition-colors">{doc.analysis_doc_title}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    <p className="text-[10px] font-black uppercase tracking-tight text-slate-400">
                                                        {new Date(doc.upload_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleAddReport(doc.analysis_document_id)}
                                                disabled={updateLoading}
                                                className="w-full bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold tracking-wide rounded-xl transition-colors"
                                            >
                                                <Plus className="w-4 h-4 mr-1.5" />
                                                Add to Group
                                            </Button>
                                        </div>
                                    ))}
                                    {filteredAvailableDocs.length > 5 && (
                                        <p className="text-center text-[10px] font-bold text-slate-400 pt-2 italic">
                                            + {filteredAvailableDocs.length - 5} more. Use Expand or Search.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
