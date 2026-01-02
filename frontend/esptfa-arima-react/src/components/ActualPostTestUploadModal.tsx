import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Upload, Loader2, Save } from "lucide-react";
import { bulkUploadActualScores } from "@/lib/api-teacher";
import { toast } from "sonner";

interface StudentScore {
    lrn: string;
    name: string;
    score: string;
    actual_score?: number | null;
}

interface ActualPostTestUploadModalProps {
    readonly analysisDocumentId: number;
    readonly students: readonly { lrn: string; name: string; actual_score?: number | null; actual_max?: number | null }[];
    readonly onSuccess: () => void;
    readonly maxScore: number;
}

export default function ActualPostTestUploadModal({ analysisDocumentId, students, onSuccess, maxScore }: ActualPostTestUploadModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [scores, setScores] = useState<StudentScore[]>([]);

    useEffect(() => {
        if (open) {
            setScores(students.map(s => ({
                lrn: s.lrn,
                name: s.name,
                score: s.actual_score !== undefined && s.actual_score !== null ? s.actual_score.toString() : ""
            })));
        }
    }, [open, students]);

    const handleScoreChange = (lrn: string, value: string) => {
        // Enforce strictly decimal numeric input (numbers and potentially one dot)
        if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;

        setScores(prev => prev.map(s => s.lrn === lrn ? { ...s, score: value } : s));
    };


    const handleSave = async () => {
        const payload = scores
            .filter(s => s.score !== "")
            .map(s => ({
                lrn: s.lrn,
                score: Number.parseFloat(s.score),
                max_score: maxScore
            }));

        if (payload.length === 0) {
            toast.error("Please enter at least one score to upload.");
            return;
        }

        setLoading(true);
        try {
            await bulkUploadActualScores(analysisDocumentId, payload);
            toast.success(`Successfully uploaded ${payload.length} scores.`);
            setOpen(false);
            onSuccess();
        } catch (error: any) {
            console.error("Upload error:", error);
            const errMsg = error.response?.data?.error || "An error occurred while uploading scores.";
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 rounded-xl shadow-lg shadow-indigo-200">
                    <Upload className="h-4 w-4" />
                    Upload Actual Scores
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none rounded-[2rem] shadow-2xl">
                <DialogHeader className="p-8 pb-4 bg-slate-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                Record Post-Test Results
                            </DialogTitle>
                            <DialogDescription className="font-medium text-slate-500 mt-1">
                                Enter the actual scores achieved by students in their post-test.
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl ring-1 ring-slate-200 shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Score</span>
                            <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                                {maxScore}
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-8 py-4">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-slate-100 uppercase text-[10px] font-black tracking-widest text-slate-400">
                                <TableHead className="w-[350px]">Student Name</TableHead>
                                <TableHead>LRN</TableHead>
                                <TableHead className="text-right">Actual Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scores.map((student) => (
                                <TableRow key={student.lrn} className="hover:bg-slate-50/50 border-slate-50 h-16 group">
                                    <TableCell className="font-bold text-slate-800">{student.name}</TableCell>
                                    <TableCell className="font-mono text-[10px] text-slate-400">{student.lrn}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Input
                                                value={student.score}
                                                onChange={(e) => handleScoreChange(student.lrn, e.target.value)}
                                                placeholder="0.0"
                                                inputMode="decimal"
                                                className="w-24 h-10 text-right font-black border-slate-200 rounded-xl focus:ring-indigo-600"
                                            />
                                            <span className="text-slate-300 font-bold">/</span>
                                            <span className="text-slate-400 font-bold text-sm min-w-[2rem] text-left">{maxScore}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter className="p-8 pt-4 bg-slate-50 border-t border-slate-100 gap-3">
                    <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 rounded-xl shadow-lg shadow-indigo-100 min-w-[160px]"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Scores
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
