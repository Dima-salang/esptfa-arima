import { useState, useEffect } from "react";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    FileUp,
    Download,
    Plus,
    Trash2,
    Save,
    AlertCircle,
    CheckCircle2,
    Loader2,
    UserPlus
} from "lucide-react";
import { bulkImportCSV, manualImportStudents, getAllSections } from "@/lib/api-admin";
import type { Section } from "@/lib/api-admin";

interface ManualStudentEntry {
    temp_id: string;
    lrn: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    section: string; // section_id as string
}

export default function StudentImportPage() {
    const [sections, setSections] = useState<Section[]>([]);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [manualStudents, setManualStudents] = useState<ManualStudentEntry[]>([
        { temp_id: crypto.randomUUID(), lrn: "", first_name: "", middle_name: "", last_name: "", section: "" }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const data = await getAllSections();
                setSections(Array.isArray(data) ? data : (data.results || []));
            } catch (error) {
                console.error("Error fetching sections:", error);
            }
        };
        fetchSections();
    }, []);

    // CSV Import Logic
    const handleCsvUpload = async () => {
        if (!csvFile) return;
        setIsLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        try {
            await bulkImportCSV(csvFile);
            setSuccessMessage("CSV import successful! All students have been added to the system.");
            setCsvFile(null);
            // reset file input
            const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (error: any) {
            setErrorMessage(error.response?.data?.error || error.response?.data?.['Validation Error: '] || "Failed to import CSV. Please check the file format.");
        } finally {
            setIsLoading(false);
        }
    };

    const downloadTemplate = () => {
        const headers = "lrn,first_name,middle_name,last_name,section";
        const sample = "12345678901,John,Doe,Smith,Diamond";
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + sample;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "student_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Manual Import Logic
    const addRow = () => {
        setManualStudents([...manualStudents, {
            temp_id: crypto.randomUUID(), lrn: "", first_name: "", middle_name: "", last_name: "", section: ""
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
            ...rest,
            section: parseInt(rest.section)
        }));

        if (studentsToSend.some(s => !s.lrn || !s.first_name || !s.last_name || !s.section)) {
            setErrorMessage("Please fill in all required fields (LRN, First Name, Last Name, and Section) for each student.");
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        try {
            await manualImportStudents(studentsToSend);
            setSuccessMessage("Manual import successful! All students have been added.");
            setManualStudents([{ temp_id: crypto.randomUUID(), lrn: "", first_name: "", middle_name: "", last_name: "", section: "" }]);
        } catch (error: any) {
            setErrorMessage(error.response?.data?.error || error.response?.data?.['Validation Error: '] || "Failed to import students. Please check the data.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Student Enrollment</h1>
                        <p className="text-slate-500 font-medium italic">Bulk import or manually register multiple students into sections</p>
                    </div>
                </div>

                {successMessage && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl animate-in zoom-in-95 duration-300 shadow-sm shadow-emerald-100/50">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                        <span className="font-semibold text-sm">{successMessage}</span>
                    </div>
                )}

                {errorMessage && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl animate-in shake duration-500 shadow-sm shadow-red-100/50">
                        <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                        <span className="font-semibold text-sm">{errorMessage}</span>
                    </div>
                )}

                <Tabs defaultValue="csv" className="w-full">
                    <TabsList className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl grid grid-cols-2 max-w-md h-auto gap-1">
                        <TabsTrigger value="csv" className="rounded-xl py-2.5 font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-indigo-600">
                            CSV Import
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="rounded-xl py-2.5 font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-indigo-600">
                            Manual Entry
                        </TabsTrigger>
                    </TabsList>

                    {/* CSV Content */}
                    <TabsContent value="csv" className="mt-6">
                        <Card className="border-none shadow-xl ring-1 ring-slate-200 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900">
                            <CardHeader className="p-8 pb-0">
                                <CardTitle className="text-2xl font-black flex items-center gap-3">
                                    <FileUp className="h-6 w-6 text-indigo-600" />
                                    Import from CSV
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-medium italic">
                                    Upload a structured CSV file to enroll multiple students at once.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    <div className="space-y-4">
                                        <div
                                            className={`border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center gap-4 transition-all hover:bg-slate-50 relative group ${csvFile ? 'border-indigo-600 bg-indigo-50/20' : 'border-slate-200'}`}
                                        >
                                            <div className={`p-4 rounded-full transition-transform group-hover:scale-110 ${csvFile ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                <FileUp className="h-8 w-8" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-slate-900">{csvFile ? csvFile.name : "Select a CSV file"}</p>
                                                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">
                                                    {csvFile ? "File selected" : "Click to browse or drag and drop"}
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
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                                            <h4 className="font-bold text-indigo-600 text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" />
                                                CSV Format Requirements
                                            </h4>
                                            <ul className="space-y-2 text-sm text-slate-600 font-medium">
                                                <li className="flex gap-2"><span>•</span> Required headers: <code className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded">lrn, first_name, middle_name, last_name, section</code></li>
                                                <li className="flex gap-2"><span>•</span> LRN must be exactly 11 digits.</li>
                                                <li className="flex gap-2"><span>•</span> Section names must match exactly as defined in the system.</li>
                                            </ul>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full rounded-2xl h-12 font-bold text-xs uppercase tracking-widest border-slate-200 hover:bg-slate-50"
                                            onClick={downloadTemplate}
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Download Data Template
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 rounded-2xl h-12 px-8 font-extrabold uppercase tracking-widest text-xs"
                                    disabled={!csvFile || isLoading}
                                    onClick={handleCsvUpload}
                                >
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <Save className="mr-2 h-4 w-4" />}
                                    Process CSV Import
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    {/* Manual Content */}
                    <TabsContent value="manual" className="mt-6">
                        <Card className="border-none shadow-xl ring-1 ring-slate-200 rounded-[2rem] overflow-hidden bg-white">
                            <CardHeader className="p-8 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-black flex items-center gap-3">
                                            <UserPlus className="h-6 w-6 text-indigo-600" />
                                            Direct Student Entry
                                        </CardTitle>
                                        <CardDescription className="text-slate-400 font-medium italic">
                                            Add multiple students manually by filling out the table below.
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addRow}
                                        className="rounded-xl font-bold h-10 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                    >
                                        <Plus className="mr-2 h-4 w-4" /> Add Row
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50/80 hover:bg-slate-50/80">
                                        <TableRow className="border-slate-100">
                                            <TableHead className="px-8 font-black text-slate-400 text-[10px] uppercase tracking-widest w-[180px]">LRN (11 Digits)</TableHead>
                                            <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest w-[160px]">First Name</TableHead>
                                            <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest w-[140px]">Middle Name (Opt)</TableHead>
                                            <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest w-[160px]">Last Name</TableHead>
                                            <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest min-w-[160px]">Class Section</TableHead>
                                            <TableHead className="w-[80px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {manualStudents.map((entry) => (
                                            <TableRow key={entry.temp_id} className="border-slate-50 group hover:bg-slate-50/30 transition-colors">
                                                <TableCell className="px-8">
                                                    <Input
                                                        placeholder="12345678901"
                                                        maxLength={11}
                                                        value={entry.lrn}
                                                        onChange={(e) => updateManualEntry(entry.temp_id, "lrn", e.target.value)}
                                                        className="h-10 bg-transparent border-slate-200 rounded-xl focus:ring-indigo-600 text-sm font-medium"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        placeholder="John"
                                                        value={entry.first_name}
                                                        onChange={(e) => updateManualEntry(entry.temp_id, "first_name", e.target.value)}
                                                        className="h-10 bg-transparent border-slate-200 rounded-xl focus:ring-indigo-600 text-sm font-medium"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        placeholder="Quincy"
                                                        value={entry.middle_name}
                                                        onChange={(e) => updateManualEntry(entry.temp_id, "middle_name", e.target.value)}
                                                        className="h-10 bg-transparent border-slate-200 rounded-xl focus:ring-indigo-600 text-sm font-medium"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        placeholder="Doe"
                                                        value={entry.last_name}
                                                        onChange={(e) => updateManualEntry(entry.temp_id, "last_name", e.target.value)}
                                                        className="h-10 bg-transparent border-slate-200 rounded-xl focus:ring-indigo-600 text-sm font-medium"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={entry.section}
                                                        onValueChange={(val) => updateManualEntry(entry.temp_id, "section", val)}
                                                    >
                                                        <SelectTrigger className="h-10 bg-transparent border-slate-200 rounded-xl focus:ring-indigo-600 text-sm font-medium">
                                                            <SelectValue placeholder="Select section" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                                                            {sections.map(s => (
                                                                <SelectItem key={s.section_id} value={s.section_id.toString()} className="rounded-xl px-4 py-2">
                                                                    {s.section_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeRow(entry.temp_id)}
                                                        disabled={manualStudents.length === 1}
                                                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {manualStudents.length === 0 && (
                                    <div className="p-12 text-center text-slate-400 italic">No students added yet. Click "Add Row" to start.</div>
                                )}
                            </CardContent>
                            <CardFooter className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                    Total Students to Import: {manualStudents.length}
                                </p>
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 rounded-2xl h-12 px-8 font-extrabold uppercase tracking-widest text-xs"
                                    disabled={isLoading || manualStudents.length === 0}
                                    onClick={handleManualSubmit}
                                >
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <Save className="mr-2 h-4 w-4" />}
                                    Confirm Batch Enrollment
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
