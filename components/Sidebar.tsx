'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    AlertTriangle,
    MessageSquare,
    Activity,
    Timer,
    BookOpen,
    GitBranch,
    TrendingUp,
    Heart,
    Target,
    Menu,
    X,
    ListTodo,
    Bell,
    BarChart3,
    Database
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    href: string;
    onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, href, onClick }: SidebarItemProps) => {
    const pathname = usePathname();
    const isActive = pathname === href || pathname.startsWith(href + '/');

    return (
        <Link
            href={href}
            onClick={onClick}
            className={`
                flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md cursor-pointer text-sm transition-colors
                ${isActive
                    ? 'bg-bg-hover text-text-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }
            `}
        >
            <Icon size={16} />
            <span className="truncate">{label}</span>
        </Link>
    );
};

interface SectionHeaderProps {
    label: string;
}

const SectionHeader = ({ label }: SectionHeaderProps) => (
    <div className="pt-4 pb-1 px-4 text-xs font-medium text-text-muted">
        {label}
    </div>
);

export default function Sidebar() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const toggleSidebar = () => setIsOpen(!isOpen);
    const closeSidebar = () => setIsOpen(false);

    // Get user initials
    const getUserInitials = () => {
        if (!user?.username) return 'U';
        const name = user.username;
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Get display name
    const getDisplayName = () => {
        if (user?.username) {
            return user.username;
        }
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return 'Usuário';
    };

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-bg-secondary h-[52px] flex items-center justify-between px-4 border-b border-border-default">
                <div className="flex items-center gap-2 font-semibold text-text-primary">
                    <div className="w-5 h-5 bg-text-primary rounded-sm flex items-center justify-center">
                        <span className="text-bg-primary text-xs font-bold">M</span>
                    </div>
                    <span>MIS SENTINEL</span>
                </div>
                <button
                    onClick={toggleSidebar}
                    className="text-text-primary p-2 rounded-md hover:bg-bg-hover transition-colors"
                >
                    {isOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 left-0 z-50 lg:z-auto
                w-[260px] h-screen bg-bg-secondary border-r border-border-default flex flex-col
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Header */}
                <div className="h-[52px] flex items-center px-4 border-b border-border-default">
                    <div className="flex items-center gap-2 font-semibold text-text-primary">
                        <div className="w-5 h-5 bg-text-primary rounded-sm flex items-center justify-center">
                            <span className="text-bg-primary text-xs font-bold">M</span>
                        </div>
                        <span>MIS SENTINEL</span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-4 space-y-1">
                    <SectionHeader label="DASHBOARD" />
                    <SidebarItem icon={LayoutDashboard} label="Control Tower" href="/dashboard" onClick={closeSidebar} />
                    <SidebarItem icon={Bell} label="Alertas SENTINEL" href="/alerts" onClick={closeSidebar} />
                    <SidebarItem icon={Activity} label="Atividade da Equipe" href="/team" onClick={closeSidebar} />

                    <SectionHeader label="OPERAÇÕES" />
                    <SidebarItem icon={Timer} label="CRT - Resolution Time" href="/crt" onClick={closeSidebar} />
                    <SidebarItem icon={ListTodo} label="Tarefas" href="/tasks" onClick={closeSidebar} />
                    <SidebarItem icon={Target} label="Issues" href="/issues" onClick={closeSidebar} />
                    <SidebarItem icon={MessageSquare} label="Mensagens" href="/messages" onClick={closeSidebar} />

                    <SectionHeader label="ANALYTICS" />
                    <SidebarItem icon={TrendingUp} label="Comercial (BDR)" href="/sales" onClick={closeSidebar} />
                    <SidebarItem icon={Heart} label="CS - Engajamento" href="/engagement" onClick={closeSidebar} />
                    <SidebarItem icon={BarChart3} label="Performance" href="/performance" onClick={closeSidebar} />

                    <SectionHeader label="KNOWLEDGE" />
                    <SidebarItem icon={BookOpen} label="Knowledge Base" href="/knowledge" onClick={closeSidebar} />
                    <SidebarItem icon={GitBranch} label="Processos" href="/processes" onClick={closeSidebar} />
                    <SidebarItem icon={Database} label="Artifacts & Docs" href="/artifacts" onClick={closeSidebar} />

                    <SectionHeader label="SISTEMA" />
                    <SidebarItem icon={Users} label="Usuários" href="/users" onClick={closeSidebar} />
                    <SidebarItem icon={Settings} label="Configurações" href="/settings" onClick={closeSidebar} />
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-border-default">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-bg-hover flex items-center justify-center text-xs font-semibold text-text-primary">
                            {getUserInitials()}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-medium text-text-primary truncate">
                                {getDisplayName()}
                            </span>
                            <span className="text-xs text-text-muted truncate">
                                {user?.email || 'user@example.com'}
                            </span>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 hover:bg-bg-hover rounded-md text-text-muted hover:text-accent-error transition-colors"
                            title="Sair"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
