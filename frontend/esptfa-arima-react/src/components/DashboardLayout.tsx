import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    FileText,
    ClipboardList,
    Users,
    Settings,
    LogOut,
    Menu,
    Bell,
    Search,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    href: string;
    active?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, active }: SidebarItemProps) => (
    <Link to={href}>
        <Button
            variant="ghost"
            className={cn(
                "w-full justify-start gap-3 h-11 px-4 rounded-xl transition-all duration-200 group",
                active
                    ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
        >
            <Icon className={cn(
                "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                active ? "text-indigo-600" : "text-slate-400"
            )} />
            <span className="font-medium">{label}</span>
            {active && <ChevronRight className="ml-auto h-4 w-4" />}
        </Button>
    </Link>
);

export default function DashboardLayout({
    children,
    defaultCollapsed = false
}: {
    children: React.ReactNode,
    defaultCollapsed?: boolean
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(!defaultCollapsed);
    const location = useLocation();

    const menuItems = [
        { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
        { icon: FileText, label: "Analysis Documents", href: "/dashboard/analysis" },
        { icon: ClipboardList, label: "Test Drafts", href: "/dashboard/drafts" },
        { icon: Users, label: "Students", href: "/dashboard/students" },
    ];

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 dark:bg-slate-900 dark:border-slate-800",
                    !isSidebarOpen && "-translate-x-full lg:w-20"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Sidebar Header */}
                    <div className="h-20 flex items-center px-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
                                <FileText className="text-white h-5 w-5" />
                            </div>
                            {isSidebarOpen && (
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                                    ESPTFA-ARIMA
                                </span>
                            )}
                        </div>
                    </div>

                    <Separator className="mx-6 w-auto opacity-50" />

                    {/* Navigation */}
                    <ScrollArea className="flex-1 px-4 py-6">
                        <div className="space-y-2">
                            {menuItems.map((item) => (
                                <SidebarItem
                                    key={item.href}
                                    icon={item.icon}
                                    label={isSidebarOpen ? item.label : ""}
                                    href={item.href}
                                    active={location.pathname === item.href}
                                />
                            ))}
                        </div>

                        <div className="mt-10">
                            {isSidebarOpen && (
                                <p className="px-4 mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Account
                                </p>
                            )}
                            <div className="space-y-2">
                                <SidebarItem icon={Settings} label={isSidebarOpen ? "Settings" : ""} href="/settings" />
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-3 h-11 px-4 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 group"
                                    onClick={() => {
                                        localStorage.clear();
                                        window.location.href = "/login";
                                    }}
                                >
                                    <LogOut className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    {isSidebarOpen && <span className="font-medium">Sign Out</span>}
                                </Button>
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Sidebar Footer */}
                    <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                <AvatarImage src="https://github.com/shadcn.png" />
                                <AvatarFallback>TD</AvatarFallback>
                            </Avatar>
                            {isSidebarOpen && (
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                        John Teacher
                                    </span>
                                    <span className="text-xs text-slate-500 truncate">
                                        Senior Educator
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 dark:bg-slate-900/80 dark:border-slate-800">
                    <div className="flex items-center gap-4 flex-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden lg:flex rounded-xl"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="relative max-w-md w-full hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search everything..."
                                className="pl-10 h-10 bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500/20 transition-all w-full rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="relative text-slate-500 rounded-full hover:bg-slate-100">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                                    <Avatar className="h-10 w-10 ring-2 ring-slate-100">
                                        <AvatarImage src="https://github.com/shadcn.png" />
                                        <AvatarFallback>JD</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">John Doe</p>
                                        <p className="text-xs leading-none text-muted-foreground">john@doe.com</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Profile</DropdownMenuItem>
                                <DropdownMenuItem>Settings</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">Log out</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-8">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
