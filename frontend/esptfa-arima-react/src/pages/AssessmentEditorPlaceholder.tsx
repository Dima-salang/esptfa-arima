import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Construction,
    ArrowLeft,
    LayoutDashboard,
    Wrench
} from "lucide-react";

export default function AssessmentEditorPlaceholder() {
    const { draftId } = useParams();
    const navigate = useNavigate();

    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="absolute -inset-4 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
                    <div className="relative w-24 h-24 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3">
                        <Construction className="text-white h-12 w-12" />
                    </div>
                </div>

                <Card className="max-w-xl w-full border-none shadow-2xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="text-center pt-10 px-10">
                        <div className="flex justify-center mb-4">
                            <span className="bg-indigo-50 text-indigo-600 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                                Work in Progress
                            </span>
                        </div>
                        <CardTitle className="text-3xl font-black text-slate-900">Assessment Editor</CardTitle>
                        <CardDescription className="text-base text-slate-500 mt-2 font-medium">
                            The advanced assessment editor for draft <br />
                            <code className="bg-slate-100 px-2 py-0.5 rounded text-indigo-600 font-mono text-xs">{draftId}</code> <br />
                            is currently under heavy development.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-10 text-center space-y-6">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <Wrench className="h-5 w-5 text-indigo-500" />
                                <span className="text-sm font-semibold text-slate-700">Topic Mapping Tools</span>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <Wrench className="h-5 w-5 text-indigo-500" />
                                <span className="text-sm font-semibold text-slate-700">Dynamic Score Configuration</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Button
                                variant="outline"
                                className="flex-1 h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50"
                                onClick={() => navigate(-1)}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                            </Button>
                            <Button
                                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow-lg shadow-indigo-600/20"
                                onClick={() => navigate("/dashboard")}
                            >
                                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-slate-400 text-sm font-medium">
                    ESPTFA-ARIMA • Advanced Agentic Coding
                </p>
            </div>
        </DashboardLayout>
    );
}
