import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    getAllSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    getAllSections,
    createSection,
    updateSection,
    deleteSection,
    getAllQuarters,
    createQuarter,
    updateQuarter,
    deleteQuarter,
    getAllTopics,
    createTopic,
    updateTopic,
    deleteTopic,
} from "@/lib/api-admin";
import type { Subject, Section, Quarter, Topic } from "@/lib/api-admin";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function AdminDataManagement() {
    const [activeTab, setActiveTab] = useState("subjects");

    return (
        <div className="space-y-8 animate-in fade-in duration-500 container mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Data Management</h1>
                    <p className="text-muted-foreground font-medium italic">Manage system-wide metadata and resources</p>
                </div>
            </div>

            <Tabs defaultValue="subjects" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-background border border-border/50 p-1 h-12 rounded-xl shadow-sm">
                    <TabsTrigger value="subjects" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Subjects</TabsTrigger>
                    <TabsTrigger value="quarters" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Quarters</TabsTrigger>
                    <TabsTrigger value="sections" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Sections</TabsTrigger>
                    <TabsTrigger value="topics" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Topics</TabsTrigger>
                </TabsList>

                <TabsContent value="subjects" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                    <SubjectManager />
                </TabsContent>
                <TabsContent value="quarters" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                    <QuarterManager />
                </TabsContent>
                <TabsContent value="sections" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                    <SectionManager />
                </TabsContent>
                <TabsContent value="topics" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                    <TopicManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// --- Specific Managers ---

function SubjectManager() {
    const [data, setData] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Subject | null>(null);
    const [formData, setFormData] = useState({ subject_name: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await getAllSubjects();
            setData(Array.isArray(result) ? result : result.results || []);
        } catch (error) {
            console.error("Error fetching subjects:", error);
            toast.error("Failed to fetch subjects");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredData = data.filter(item => 
        item.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async () => {
        if (!formData.subject_name.trim()) return;
        
        try {
            if (editingItem) {
                await updateSubject(editingItem.subject_id, formData);
                toast.success("Subject updated successfully");
            } else {
                await createSubject(formData);
                toast.success("Subject created successfully");
            }
            setIsDialogOpen(false);
            setEditingItem(null);
            setFormData({ subject_name: "" });
            fetchData();
        } catch (error) {
            console.error("Error saving subject:", error);
            toast.error("Failed to save subject");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this subject?")) return;
        try {
            await deleteSubject(id);
            toast.success("Subject deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Error deleting subject:", error);
            toast.error("Failed to delete subject");
        }
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setFormData({ subject_name: "" });
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: Subject) => {
        setEditingItem(item);
        setFormData({ subject_name: item.subject_name });
        setIsDialogOpen(true);
    };

    return (
        <Card className="border-none shadow-premium-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Manage Subjects</CardTitle>
                    <CardDescription>Define the subjects available in the curriculum</CardDescription>
                </div>
                <Button onClick={openCreateDialog} className="shadow-premium-sm hover:shadow-premium-md transition-all hover:scale-105 rounded-xl">
                    <Plus className="mr-2 h-4 w-4" /> Add Subject
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex items-center mb-4">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search subjects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 rounded-xl border-border/60 focus:border-primary"
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Subject Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No subjects found.</TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((item) => (
                                    <TableRow key={item.subject_id} className="hover:bg-muted/20">
                                        <TableCell className="font-mono text-xs text-muted-foreground">#{item.subject_id}</TableCell>
                                        <TableCell className="font-medium">{item.subject_name}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.subject_id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
                        <DialogDescription>
                            {editingItem ? 'Update the subject details below.' : 'Enter the name of the new subject.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Subject Name</Label>
                            <Input
                                id="name"
                                value={formData.subject_name}
                                onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                                placeholder="e.g. Mathematics"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingItem ? 'Save Changes' : 'Create Subject'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function SectionManager() {
    const [data, setData] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Section | null>(null);
    const [formData, setFormData] = useState({ section_name: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await getAllSections();
            setData(Array.isArray(result) ? result : result.results || []);
        } catch (error) {
            console.error("Error fetching sections:", error);
            toast.error("Failed to fetch sections");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredData = data.filter(item => 
        item.section_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async () => {
        if (!formData.section_name.trim()) return;
        
        try {
            if (editingItem) {
                await updateSection(editingItem.section_id, formData);
                toast.success("Section updated successfully");
            } else {
                await createSection(formData);
                toast.success("Section created successfully");
            }
            setIsDialogOpen(false);
            setEditingItem(null);
            setFormData({ section_name: "" });
            fetchData();
        } catch (error) {
            console.error("Error saving section:", error);
            toast.error("Failed to save section");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this section?")) return;
        try {
            await deleteSection(id);
            toast.success("Section deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Error deleting section:", error);
            toast.error("Failed to delete section");
        }
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setFormData({ section_name: "" });
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: Section) => {
        setEditingItem(item);
        setFormData({ section_name: item.section_name });
        setIsDialogOpen(true);
    };

    return (
        <Card className="border-none shadow-premium-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Manage Sections</CardTitle>
                    <CardDescription>Define the sections (classes) in the school</CardDescription>
                </div>
                <Button onClick={openCreateDialog} className="shadow-premium-sm hover:shadow-premium-md transition-all hover:scale-105 rounded-xl">
                    <Plus className="mr-2 h-4 w-4" /> Add Section
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex items-center mb-4">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search sections..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 rounded-xl border-border/60 focus:border-primary"
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Section Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No sections found.</TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((item) => (
                                    <TableRow key={item.section_id} className="hover:bg-muted/20">
                                        <TableCell className="font-mono text-xs text-muted-foreground">#{item.section_id}</TableCell>
                                        <TableCell className="font-medium">{item.section_name}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.section_id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Section' : 'Add New Section'}</DialogTitle>
                        <DialogDescription>
                            {editingItem ? 'Update the section details below.' : 'Enter the name of the new section.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Section Name</Label>
                            <Input
                                id="name"
                                value={formData.section_name}
                                onChange={(e) => setFormData({ ...formData, section_name: e.target.value })}
                                placeholder="e.g. Grade 10 - Emerald"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingItem ? 'Save Changes' : 'Create Section'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function QuarterManager() {
    const [data, setData] = useState<Quarter[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Quarter | null>(null);
    const [formData, setFormData] = useState({ quarter_name: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await getAllQuarters();
            setData(Array.isArray(result) ? result : result.results || []);
        } catch (error) {
            console.error("Error fetching quarters:", error);
            toast.error("Failed to fetch quarters");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredData = data.filter(item => 
        item.quarter_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async () => {
        if (!formData.quarter_name.trim()) return;
        
        try {
            if (editingItem) {
                await updateQuarter(editingItem.quarter_id, formData);
                toast.success("Quarter updated successfully");
            } else {
                await createQuarter(formData);
                toast.success("Quarter created successfully");
            }
            setIsDialogOpen(false);
            setEditingItem(null);
            setFormData({ quarter_name: "" });
            fetchData();
        } catch (error) {
            console.error("Error saving quarter:", error);
            toast.error("Failed to save quarter");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this quarter?")) return;
        try {
            await deleteQuarter(id);
            toast.success("Quarter deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Error deleting quarter:", error);
            toast.error("Failed to delete quarter");
        }
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setFormData({ quarter_name: "" });
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: Quarter) => {
        setEditingItem(item);
        setFormData({ quarter_name: item.quarter_name });
        setIsDialogOpen(true);
    };

    return (
        <Card className="border-none shadow-premium-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Manage Quarters</CardTitle>
                    <CardDescription>Define the academic quarters</CardDescription>
                </div>
                <Button onClick={openCreateDialog} className="shadow-premium-sm hover:shadow-premium-md transition-all hover:scale-105 rounded-xl">
                    <Plus className="mr-2 h-4 w-4" /> Add Quarter
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex items-center mb-4">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search quarters..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 rounded-xl border-border/60 focus:border-primary"
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Quarter Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No quarters found.</TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((item) => (
                                    <TableRow key={item.quarter_id} className="hover:bg-muted/20">
                                        <TableCell className="font-mono text-xs text-muted-foreground">#{item.quarter_id}</TableCell>
                                        <TableCell className="font-medium">{item.quarter_name}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.quarter_id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Quarter' : 'Add New Quarter'}</DialogTitle>
                        <DialogDescription>
                            {editingItem ? 'Update the quarter name below.' : 'Enter the name of the new quarter.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Quarter Name</Label>
                            <Input
                                id="name"
                                value={formData.quarter_name}
                                onChange={(e) => setFormData({ ...formData, quarter_name: e.target.value })}
                                placeholder="e.g. First Quarter"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingItem ? 'Save Changes' : 'Create Quarter'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function TopicManager() {
    const [data, setData] = useState<Topic[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Topic | null>(null);
    const [formData, setFormData] = useState<Partial<Topic>>({ topic_name: "", subject: undefined, max_score: 0, test_number: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [topicsRes, subjectsRes] = await Promise.all([
                getAllTopics(),
                getAllSubjects()
            ]);
            setData(Array.isArray(topicsRes) ? topicsRes : topicsRes.results || []);
            setSubjects(Array.isArray(subjectsRes) ? subjectsRes : subjectsRes.results || []);
        } catch (error) {
            console.error("Error fetching topics:", error);
            toast.error("Failed to fetch topics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredData = data.filter(item => 
        item.topic_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async () => {
        if (!formData.topic_name?.trim()) return;
        
        try {
            if (editingItem) {
                await updateTopic(editingItem.topic_id, formData);
                toast.success("Topic updated successfully");
            } else {
                await createTopic(formData);
                toast.success("Topic created successfully");
            }
            setIsDialogOpen(false);
            setEditingItem(null);
            setFormData({ topic_name: "", subject: undefined, max_score: 0, test_number: "" });
            fetchData();
        } catch (error) {
            console.error("Error saving topic:", error);
            toast.error("Failed to save topic");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this topic?")) return;
        try {
            await deleteTopic(id);
            toast.success("Topic deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Error deleting topic:", error);
            toast.error("Failed to delete topic");
        }
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setFormData({ topic_name: "", subject: undefined, max_score: 0, test_number: "" });
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: Topic) => {
        setEditingItem(item);
        setFormData({ 
            topic_name: item.topic_name, 
            subject: item.subject || undefined,
            max_score: item.max_score,
            test_number: item.test_number
        });
        setIsDialogOpen(true);
    };

    const getSubjectName = (id?: number) => {
        if (!id) return "-";
        return subjects.find(s => s.subject_id === id)?.subject_name || id;
    };

    return (
        <Card className="border-none shadow-premium-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Manage Topics</CardTitle>
                    <CardDescription>Define the topics and their attributes</CardDescription>
                </div>
                <Button onClick={openCreateDialog} className="shadow-premium-sm hover:shadow-premium-md transition-all hover:scale-105 rounded-xl">
                    <Plus className="mr-2 h-4 w-4" /> Add Topic
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex items-center mb-4">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search topics..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 rounded-xl border-border/60 focus:border-primary"
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Topic Name</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Max Score</TableHead>
                                <TableHead>Test Number</TableHead> 
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No topics found.</TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((item) => (
                                    <TableRow key={item.topic_id} className="hover:bg-muted/20">
                                        <TableCell className="font-mono text-xs text-muted-foreground">#{item.topic_id}</TableCell>
                                        <TableCell className="font-medium">{item.topic_name}</TableCell>
                                        <TableCell>{getSubjectName(item.subject)}</TableCell>
                                        <TableCell>{item.max_score || "-"}</TableCell>
                                        <TableCell>{item.test_number || "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.topic_id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Topic' : 'Add New Topic'}</DialogTitle>
                        <DialogDescription>
                            {editingItem ? 'Update the topic details below.' : 'Enter the details of the new topic.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Topic Name</Label>
                            <Input
                                id="name"
                                value={formData.topic_name}
                                onChange={(e) => setFormData({ ...formData, topic_name: e.target.value })}
                                placeholder="e.g. Algebra Basics"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Select 
                                value={formData.subject ? String(formData.subject) : undefined} 
                                onValueChange={(value) => setFormData({ ...formData, subject: Number(value) })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((subject) => (
                                        <SelectItem key={subject.subject_id} value={String(subject.subject_id)}>
                                            {subject.subject_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="max_score">Max Score</Label>
                                <Input
                                    id="max_score"
                                    type="number"
                                    value={formData.max_score}
                                    onChange={(e) => setFormData({ ...formData, max_score: Number(e.target.value) })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="test_number">Test Number</Label>
                                <Input
                                    id="test_number"
                                    value={formData.test_number}
                                    onChange={(e) => setFormData({ ...formData, test_number: e.target.value })}
                                    placeholder="e.g. 1"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingItem ? 'Save Changes' : 'Create Topic'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
