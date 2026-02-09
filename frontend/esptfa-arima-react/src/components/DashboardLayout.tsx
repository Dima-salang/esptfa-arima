import React, { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    FileText,
    ClipboardList,
    Users,
    Settings,
    LogOut,
    Menu,
    ChevronRight,
    UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/useUserStore";
import { logoutUser } from "@/lib/api-teacher";

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    href: string;
    active?: boolean;
    collapsed?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, active, collapsed }: SidebarItemProps) => (
    <Link to={href} className="block w-full">
        <div className="relative px-3 py-2">
            {active && (
                <motion.div
                    layoutId="activeSidebarItem"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}
            <div
                className={cn(
                    "relative flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
            >
                <Icon className={cn(
                    "h-5 w-5 transition-all duration-200",
                    active ? "text-primary scale-110" : "text-muted-foreground"
                )} />
                <AnimatePresence mode="wait">
                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="font-medium whitespace-nowrap overflow-hidden"
                        >
                            {label}
                        </motion.span>
                    )}
                </AnimatePresence>
                {active && !collapsed && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ml-auto"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </motion.div>
                )}
            </div>
        </div>
    </Link>
);

export default function DashboardLayout({
    children,
    defaultCollapsed = false
}: {
    children?: React.ReactNode,
    defaultCollapsed?: boolean
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        const saved = localStorage.getItem("sidebar-collapsed");
        return saved === null ? !defaultCollapsed : saved === "false";
    });

    const toggleSidebar = () => {
        setIsSidebarOpen((prev) => {
            const newState = !prev;
            localStorage.setItem("sidebar-collapsed", (!newState).toString());
            return newState;
        });
    };

    const { user, loading } = useUserStore();
    const location = useLocation();

    const accType = user?.acc_type || "Educator";
    const isSuperuser = accType === "ADMIN";
    const isStudent = accType === "STUDENT";

    const menuItems = [
        { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
        { 
            icon: FileText, 
            label: isStudent ? "Analysis Archive" : isSuperuser ? "Repository" : "Analysis Documents", 
            href: "/dashboard/analysis" 
        },
    ];

    if (!isStudent) {
        menuItems.push(
            { icon: ClipboardList, label: "Test Drafts", href: "/dashboard/drafts" }
        );
    }
    
    if (isSuperuser) {
        menuItems.push(
            { icon: Users, label: "User Management", href: "/dashboard/users" },
            { icon: Users, label: "Teacher Assignments", href: "/dashboard/assignments" },
            { icon: UserPlus, label: "Student Import", href: "/dashboard/import-students" },
            { icon: Settings, label: "Data Management", href: "/dashboard/data-management" }
        );
    }

    const fullName = user ? `${user.first_name} ${user.last_name}` : "System User";
    const initials = user ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}` : "??";

    return (
        <div className="flex h-screen bg-background overflow-hidden font-sans">
            <motion.aside
                initial={false}
                animate={{
                    width: isSidebarOpen ? 280 : 80,
                    x: 0
                }}
                className="hidden lg:flex flex-col z-50 h-full bg-background/60 backdrop-blur-xl border-r border-border/50 shadow-xl transition-all duration-300"
            >
                <div className="h-full flex flex-col overflow-hidden">
                    <div className="h-20 flex items-center px-5 border-b border-border/50">
                        <div className="flex items-center gap-3">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-10 h-10 bg-gradient-to-tr from-primary to-indigo-500 rounded-xl flex items-center justify-center shadow-lg cursor-pointer shrink-0"
                            >
                                <FileText className="text-white h-5 w-5" />
                            </motion.div>
                            <AnimatePresence>
                                {isSidebarOpen && (
                                    <motion.span
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: "auto" }}
                                        exit={{ opacity: 0, width: 0 }}
                                        className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground whitespace-nowrap overflow-hidden"
                                    >
                                        ESPTFA
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 px-3 py-6">
                        <div className="space-y-1">
                            {menuItems.map((item) => (
                                <SidebarItem
                                    key={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    href={item.href}
                                    active={location.pathname === item.href}
                                    collapsed={!isSidebarOpen}
                                />
                            ))}
                        </div>

                        <div className="mt-10">
                            <AnimatePresence>
                                {isSidebarOpen && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="px-4 mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                                    >
                                        Account
                                    </motion.p>
                                )}
                            </AnimatePresence>
                            <div className="space-y-1">
                                <SidebarItem 
                                    icon={Settings} 
                                    label="Settings" 
                                    href="/dashboard/settings" 
                                    active={location.pathname === "/dashboard/settings"}
                                    collapsed={!isSidebarOpen} 
                                />
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-3 h-11 px-4 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive group transition-all duration-200 mt-2"
                                    onClick={() => logoutUser()}
                                >
                                    <LogOut className="h-5 w-5 shrink-0" />
                                    {isSidebarOpen && <span className="font-medium">Sign Out</span>}
                                </Button>
                            </div>
                        </div>
                    </ScrollArea>

                    <div className="p-4 bg-muted/30 border-t border-border/50 mt-auto">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border-2 border-background shadow-sm ring-2 ring-primary/10 shrink-0">
                                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                                    {loading ? "..." : initials}
                                </AvatarFallback>
                            </Avatar>
                            <AnimatePresence>
                                {isSidebarOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: "auto" }}
                                        exit={{ opacity: 0, width: 0 }}
                                        className="flex flex-col overflow-hidden"
                                    >
                                        <span className="text-sm font-bold text-foreground truncate">
                                            {loading ? "Loading..." : fullName}
                                        </span>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight truncate">
                                            {loading ? "..." : accType}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.aside>

            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>
            
            <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: isSidebarOpen ? 0 : "-100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="fixed inset-y-0 left-0 z-50 w-72 bg-background/95 backdrop-blur-xl border-r border-border shadow-2xl lg:hidden"
            >
                <div className="flex flex-col h-full">
                     <div className="h-20 flex items-center px-6 border-b border-border/50 justify-between">
                        <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-gradient-to-tr from-primary to-indigo-500 rounded-lg flex items-center justify-center">
                                <FileText className="text-white h-4 w-4" />
                            </div>
                            <span className="text-lg font-bold">ESPTFA</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                            <ChevronRight className="h-5 w-5 rotate-180" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 px-4 py-6">
                        <div className="space-y-1">
                            {menuItems.map((item) => (
                                <SidebarItem
                                    key={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    href={item.href}
                                    active={location.pathname === item.href}
                                />
                            ))}
                        </div>
                        <div className="mt-8 space-y-1">
                             <SidebarItem icon={Settings} label="Settings" href="/dashboard/settings" active={location.pathname === "/dashboard/settings"} />
                             <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 h-11 px-4 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive mt-2"
                                onClick={() => logoutUser()}
                            >
                                <LogOut className="h-5 w-5" />
                                <span className="font-medium">Sign Out</span>
                            </Button>
                        </div>
                    </ScrollArea>
                </div>
            </motion.aside>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="h-20 px-6 flex items-center justify-between sticky top-0 z-10">
                    <div className="absolute inset-0 glass-panel border-b border-border/40" />
                    <div className="relative z-10 flex items-center gap-4 flex-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden lg:flex rounded-xl hover:bg-accent/50 transition-colors"
                            onClick={toggleSidebar}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden hover:bg-accent/50 transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="relative z-10 flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="relative h-10 w-10 rounded-full p-0 focus:outline-none"
                                >
                                    <Avatar className="h-10 w-10 ring-2 ring-border hover:ring-primary/50 transition-all">
                                        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs uppercase">
                                            {loading ? "..." : initials}
                                        </AvatarFallback>
                                    </Avatar>
                                </motion.button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 glass-panel border-border/50" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-bold leading-none">{loading ? "Loading..." : fullName}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{loading ? "..." : user?.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-border/50" />
                                <Link to="/dashboard/settings">
                                    <DropdownMenuItem className="cursor-pointer focus:bg-accent/50">Profile Settings</DropdownMenuItem>
                                </Link>
                                <DropdownMenuSeparator className="bg-border/50" />
                                <DropdownMenuItem
                                    className="text-destructive cursor-pointer focus:bg-destructive/10"
                                    onClick={() => logoutUser()}
                                >
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background pointer-events-none" />
                    <div className="relative p-8 animate-enter">
                        {children || <Outlet />}
                    </div>
                </div>
            </main>
        </div>
    );
}
