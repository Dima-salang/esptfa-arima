import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
    getTeacherAssignments,
    createTeacherAssignment,
    deleteTeacherAssignment,
    getAllTeachers,
    getAllSubjects,
    getAllSections,
} from "@/lib/api-admin";
import type {
    TeacherAssignment,
    Teacher,
    Subject,
    Section
} from "@/lib/api-admin";
import { toast } from "sonner";
import {

    Card,
    CardContent,
    CardDescription,
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
    Users,
    BookOpen,
    School,
    Plus,
    Trash2,
    Loader2,
} from "lucide-react";

export default function TeacherAssignmentsPage() {
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    const [selectedTeacher, setSelectedTeacher] = useState<string>("");
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedSection, setSelectedSection] = useState<string>("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assignmentsData, teachersData, subjectsData, sectionsData] = await Promise.all([
                getTeacherAssignments(),
                getAllTeachers(),
                getAllSubjects(),
                getAllSections()
            ]);

            setAssignments(Array.isArray(assignmentsData) ? assignmentsData : assignmentsData.results || []);
            setTeachers(Array.isArray(teachersData) ? teachersData : teachersData.results || []);
            setSubjects(Array.isArray(subjectsData) ? subjectsData : subjectsData.results || []);
            setSections(Array.isArray(sectionsData) ? sectionsData : sectionsData.results || []);
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateAssignment = async () => {
        if (!selectedTeacher || !selectedSubject || !selectedSection) {
            toast.error("Please select all fields");
            return;
        }

        setSubmitting(true);
        try {
            await createTeacherAssignment({
                teacher: parseInt(selectedTeacher),
                subject: parseInt(selectedSubject),
                section: parseInt(selectedSection)
            });
            setSelectedTeacher("");
            setSelectedSubject("");
            setSelectedSection("");
            toast.success("Assignment created successfully");
            await fetchData();
        } catch (error) {
            console.error("Error creating assignment:", error);
            toast.error("Failed to create assignment. Ensure it doesn't already exist.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAssignment = async (id: number) => {
        if (!confirm("Are you sure you want to delete this assignment?")) return;

        try {
            await deleteTeacherAssignment(id);
            setAssignments(assignments.filter(a => a.id !== id));
            toast.success("Assignment deleted successfully");
        } catch (error) {
            console.error("Error deleting assignment:", error);
            toast.error("Failed to delete assignment.");
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Teacher Assignments
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Manage which teachers are assigned to specific subjects and sections.
                        </p>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Assignment Form */}
                    <Card className="lg:col-span-1 border-none shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden self-start">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Plus className="h-5 w-5 text-indigo-600" /> New Assignment
                            </CardTitle>
                            <CardDescription>Assign a teacher to a curriculum spot</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Teacher</label>
                                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                    <SelectTrigger className="w-full rounded-xl border-slate-200 focus:ring-indigo-500/20">
                                        <SelectValue placeholder="Select Teacher" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teachers.map(t => (
                                            <SelectItem key={t.id} value={t.user_id.id.toString()}>
                                                {t.user_id.first_name} {t.user_id.last_name} ({t.user_id.username})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Subject</label>
                                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                    <SelectTrigger className="w-full rounded-xl border-slate-200 focus:ring-indigo-500/20">
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(s => (
                                            <SelectItem key={s.subject_id} value={s.subject_id.toString()}>
                                                {s.subject_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Section</label>
                                <Select value={selectedSection} onValueChange={setSelectedSection}>
                                    <SelectTrigger className="w-full rounded-xl border-slate-200 focus:ring-indigo-500/20">
                                        <SelectValue placeholder="Select Section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sections.map(s => (
                                            <SelectItem key={s.section_id} value={s.section_id.toString()}>
                                                {s.section_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={handleCreateAssignment}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="mr-2 h-4 w-4" /> Add Assignment
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Assignments List */}
                    <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold">Existing Assignments</CardTitle>
                            <CardDescription>View and manage all active teacher roles</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-xl border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-slate-100">
                                            <TableHead className="font-bold text-slate-700">Teacher</TableHead>
                                            <TableHead className="font-bold text-slate-700">Subject</TableHead>
                                            <TableHead className="font-bold text-slate-700">Section</TableHead>
                                            <TableHead className="text-right"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            new Array(5).fill(0).map((_, i) => (
                                                <TableRow key={`skeleton-${i}`} className="animate-pulse border-slate-50">
                                                    <TableCell><div className="h-4 bg-slate-100 rounded w-32"></div></TableCell>
                                                    <TableCell><div className="h-4 bg-slate-100 rounded w-24"></div></TableCell>
                                                    <TableCell><div className="h-4 bg-slate-100 rounded w-20"></div></TableCell>
                                                    <TableCell><div className="h-8 bg-slate-100 rounded-full w-8 ml-auto"></div></TableCell>
                                                </TableRow>
                                            ))
                                        ) : assignments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-32 text-center text-slate-500 font-medium italic">
                                                    No assignments found. Add one on the left to get started.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            assignments.map((assignment) => (
                                                <TableRow key={assignment.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                                    <TableCell className="font-bold text-slate-900">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-4 w-4 text-slate-400" />
                                                            {assignment.teacher_details?.name || "Unknown Teacher"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                                                            {assignment.subject_details?.subject_name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <School className="h-3.5 w-3.5 text-slate-400" />
                                                            {assignment.section_details?.section_name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                            onClick={() => handleDeleteAssignment(assignment.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
