import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    FileUp,
    Download,
    Plus,
    Trash2,
    Save,
    AlertCircle,
    CheckCircle2,
    Loader2,
    UserPlus,
    ShieldCheck
} from "lucide-react";
import { adviserBulkImportCSV, adviserManualImportStudents } from "@/lib/api-teacher";
import { useUserStore } from "@/store/useUserStore";
import { toast } from "sonner";

interface ManualStudentEntry {
    temp_id: string;
    lrn: string;
    first_name: string;
    middle_name: string;
    last_name: string;
}

export default function AdvisoryClassManager() {
    const { user } = useUserStore();
    const advisingSection = user?.advising_section;
    
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [manualStudents, setManualStudents] = useState<ManualStudentEntry[]>([
        { temp_id: crypto.randomUUID(), lrn: "", first_name: "", middle_name: "", last_name: "" }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!advisingSection) {
        return (
            <Card className="border-none shadow-premium-lg rounded-[2.5rem] bg-white/80 backdrop-blur-md ring-1 ring-slate-200 overflow-hidden">
                <CardContent className="p-16 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                        <ShieldCheck className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">No Advisory Class Assigned</CardTitle>
                        <CardDescription className="text-lg font-medium text-slate-500 max-w-md mx-auto">
                            You are not currently assigned as an adviser for any section. Please contact your system administrator for assistance.
                        </CardDescription>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // CSV Import Logic
    const handleCsvUpload = async () => {
        if (!csvFile) return;
        setIsLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        try {
            const res = await adviserBulkImportCSV(csvFile);
            setSuccessMessage(res.detail || "CSV import successful!");
            toast.success("Advisory class updated via CSV successfully");
            setCsvFile(null);
            const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (error: any) {
            const msg = error.response?.data?.detail || error.response?.data?.['Validation Error'] || "Failed to import CSV. Ensure LRNs are unique and 11 digits.";
            setErrorMessage(msg);
            toast.error("CSV import failed");
        } finally {
            setIsLoading(false);
        }
    };

    const downloadTemplate = () => {
        const headers = "lrn,first_name,middle_name,last_name,section";
        const sample = `12345678901,Juan,Dela,Cruz,${advisingSection.name}`;
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + sample;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `enrollment_template_${advisingSection.name}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    // Manual Import Logic
    const addRow = () => {
        setManualStudents([...manualStudents, {
            temp_id: crypto.randomUUID(), lrn: "", first_name: "", middle_name: "", last_name: ""
        }]);
    };

    const removeRow = (id: string) => {
        if (manualStudents.length > 1) {
            setManualStudents(manualStudents.filter(s => s.temp_id !== id));
        }
    };

    const updateManualEntry = (id: string, field: keyof ManualStudentEntry, value: string) => {
        setManualStudents(manualStudents.map(s => s.temp_id === id ? { ...s, [field]: value } : s));
    };

    const handleManualSubmit = async () => {
        const studentsToSend = manualStudents.map(({ temp_id, ...rest }) => ({
            ...rest
        }));

        if (studentsToSend.some(s => !s.lrn || !s.first_name || !s.last_name)) {
            setErrorMessage("Please fill in all required fields (LRN, First Name, Last Name) for each student.");
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        try {
            const res = await adviserManualImportStudents(studentsToSend);
            setSuccessMessage(res.detail || "Manual enrollment successful!");
            toast.success("Students enrolled successfully");
            setManualStudents([{ temp_id: crypto.randomUUID(), lrn: "", first_name: "", middle_name: "", last_name: "" }]);
        } catch (error: any) {
             const msg = error.response?.data?.detail || error.response?.data?.['Validation Error'] || "Failed to enroll students. Verify LRNs are 11 digits and unique.";
            setErrorMessage(msg);
            toast.error("Enrollment failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-10 animate-show-up">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-xs uppercase tracking-widest">
                        <ShieldCheck className="h-4 w-4" />
                        Official Advisory Section
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                        {advisingSection.name}
                    </h2>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-2xl">
                        Enroll your students into your advisory class. You can either upload a CSV file or add them manually one by one.
                    </p>
                </div>
            </div>

            {successMessage && (
                <div className="flex items-center gap-4 p-6 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-3xl animate-in zoom-in-95 duration-500 shadow-sm shadow-emerald-100/50">
                    <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-black text-sm uppercase tracking-wider">Enrollment Success</p>
                        <p className="font-medium text-base text-emerald-700/80">{successMessage}</p>
                    </div>
                </div>
            )}

            {errorMessage && (
                <div className="flex items-center gap-4 p-6 bg-rose-50 border border-rose-100 text-rose-800 rounded-3xl animate-in shake duration-500 shadow-sm shadow-rose-100/50">
                    <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center text-white">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-black text-sm uppercase tracking-wider">Enrollment Error</p>
                        <p className="font-medium text-base text-rose-700/80">{errorMessage}</p>
                    </div>
                </div>
            )}

            <Tabs defaultValue="csv" className="w-full">
                <TabsList className="bg-slate-100/50 p-1.5 rounded-[2rem] grid grid-cols-2 max-w-sm h-14 gap-2 mb-8 ring-1 ring-slate-200/50 backdrop-blur-sm">
                    <TabsTrigger value="csv" className="rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-indigo-600 data-[state=active]:ring-1 data-[state=active]:ring-indigo-50/50">
                        CSV Batch
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-indigo-600 data-[state=active]:ring-1 data-[state=active]:ring-indigo-50/50">
                        Manual Entry
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="csv" className="mt-0 focus-visible:outline-none">
                    <Card className="border-none shadow-premium-xl rounded-[2.5rem] overflow-hidden bg-white/70 backdrop-blur-md ring-1 ring-slate-200/50">
                        <CardHeader className="p-10 pb-0">
                            <CardTitle className="text-2xl font-black flex items-center gap-4">
                                <FileUp className="h-7 w-7 text-indigo-500" />
                                CSV Enrollment
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 space-y-10">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                                <div className="space-y-6">
                                    <div
                                        className={`border-3 border-dashed rounded-[3rem] p-16 flex flex-col items-center justify-center gap-6 transition-all hover:bg-white hover:border-indigo-400 group relative ${csvFile ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 bg-slate-50/30'}`}
                                    >
                                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 group-hover:rotate-12 ${csvFile ? 'bg-indigo-600 text-white shadow-xl rotate-0 scale-110' : 'bg-white text-slate-300 shadow-sm'}`}>
                                            <FileUp className="h-10 w-10" />
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="font-black text-xl text-slate-900">{csvFile ? csvFile.name : "Choose CSV File"}</p>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">
                                                {csvFile ? "Ready to process" : "Drag and drop or click to browse"}
                                            </p>
                                        </div>
                                        <input
                                            id="csv-upload"
                                            type="file"
                                            accept=".csv"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full rounded-[1.5rem] h-14 font-black text-xs uppercase tracking-[0.15em] border-slate-200 hover:bg-white hover:shadow-lg transition-all"
                                        onClick={downloadTemplate}
                                    >
                                        <Download className="mr-3 h-5 w-5" />
                                        Template File
                                    </Button>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-indigo-50/30 rounded-[2.5rem] p-8 border border-indigo-100/50 space-y-6">
                                        <h4 className="font-black text-indigo-600 text-sm uppercase tracking-widest flex items-center gap-3">
                                            <AlertCircle className="h-5 w-5" />
                                            Data Requirements
                                        </h4>
                                        <ul className="space-y-4">
                                        {[
                                                "LRN must be exactly 11 digits.",
                                                `Students will be assigned to ${advisingSection.name}.`,
                                                "Column headers are case-sensitive."
                                            ].map((text) => (
                                                <li key={text} className="flex gap-4 group">
                                                    <div className="h-6 w-6 rounded-full bg-white border border-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-400 shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                        •
                                                    </div>
                                                    <span className="text-sm text-slate-600 font-bold leading-relaxed">{text}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 rounded-[1.5rem] h-16 px-12 font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                                disabled={!csvFile || isLoading}
                                onClick={handleCsvUpload}
                            >
                                {isLoading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-5 w-5" />}
                                Begin Import Process
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="manual" className="mt-0 focus-visible:outline-none">
                    <Card className="border-none shadow-premium-xl rounded-[2.5rem] overflow-hidden bg-white/70 backdrop-blur-md ring-1 ring-slate-200/50">
                        <CardHeader className="p-10 pb-6 flex flex-row items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-2xl font-black flex items-center gap-4">
                                    <UserPlus className="h-7 w-7 text-indigo-500" />
                                    Manual Enrollment
                                </CardTitle>
                                <CardDescription className="font-bold text-slate-400 italic">
                                    Quickly enroll individual students into your class
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={addRow}
                                className="rounded-2xl font-black text-xs uppercase tracking-widest h-12 px-6 border-indigo-200 text-indigo-600 hover:bg-white hover:shadow-md transition-all"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add Row
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow className="border-slate-100 h-16">
                                            <TableHead className="px-10 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] w-[20%]">LRN (11 Digits)</TableHead>
                                            <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] w-[25%]">First Name</TableHead>
                                            <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] w-[20%]">Middle (Opt)</TableHead>
                                            <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] w-[25%]">Last Name</TableHead>
                                            <TableHead className="w-[10%]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {manualStudents.map((entry) => (
                                            <TableRow key={entry.temp_id} className="border-slate-50 hover:bg-white transition-all group">
                                                <TableCell className="px-10 py-6">
                                                    <Input
                                                        placeholder="12345678901"
                                                        maxLength={11}
                                                        value={entry.lrn}
                                                        onChange={(e) => updateManualEntry(entry.temp_id, "lrn", e.target.value)}
                                                        className="h-12 bg-slate-50/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 shadow-sm"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-6">
                                                    <Input
                                                        placeholder="John"
                                                        value={entry.first_name}
                                                        onChange={(e) => updateManualEntry(entry.temp_id, "first_name", e.target.value)}
                                                        className="h-12 bg-slate-50/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 shadow-sm"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-6">
                                                    <Input
                                                        placeholder="S."
                                                        value={entry.middle_name}
                                                        onChange={(e) => updateManualEntry(entry.temp_id, "middle_name", e.target.value)}
                                                        className="h-12 bg-slate-50/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 shadow-sm"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-6">
                                                    <Input
                                                        placeholder="Doe"
                                                        value={entry.last_name}
                                                        onChange={(e) => updateManualEntry(entry.temp_id, "last_name", e.target.value)}
                                                        className="h-12 bg-slate-50/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 shadow-sm"
                                                    />
                                                </TableCell>
                                                <TableCell className="px-10 py-6">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeRow(entry.temp_id)}
                                                        disabled={manualStudents.length === 1}
                                                        className="h-12 w-12 rounded-2xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        <CardFooter className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-indigo-600">
                                    {manualStudents.length}
                                </div>
                                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">
                                    Students to enroll
                                </p>
                            </div>
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 rounded-[1.5rem] h-16 px-12 font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                                disabled={isLoading || manualStudents.length === 0}
                                onClick={handleManualSubmit}
                            >
                                {isLoading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-5 w-5" />}
                                Batch Enrollment
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
