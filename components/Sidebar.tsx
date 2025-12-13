'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Settings, LogOut, AlertTriangle, MessageSquare, Activity, Timer, BookOpen, GitBranch, TrendingUp, Heart, Target, Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const menuItems = [
    {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        name: 'CRT - Resolution Time',
        href: '/crt',
        icon: Timer,
    },
    {
        name: 'Issues',
        href: '/issues',
        icon: Target,
    },
    {
        name: 'Alertas SENTINEL',
        href: '/alerts',
        icon: AlertTriangle,
    },
    {
        name: 'Mensagens',
        href: '/messages',
        icon: MessageSquare,
    },
    {
        name: 'Knowledge Base',
        href: '/knowledge',
        icon: BookOpen,
    },
    {
        name: 'Processos',
        href: '/processes',
        icon: GitBranch,
    },
    {
        name: 'Comercial (BDR)',
        href: '/sales',
        icon: TrendingUp,
    },
    {
        name: 'CS - Engajamento',
        href: '/engagement',
        icon: Heart,
    },
    {
        name: 'Atividade da Equipe',
        href: '/team',
        icon: Activity,
    },
    {
        name: 'Usuários',
        href: '/users',
        icon: Users,
    },
    {
        name: 'Configurações',
        href: '/settings',
        icon: Settings,
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const toggleSidebar = () => setIsOpen(!isOpen);
    const closeSidebar = () => setIsOpen(false);

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 h-14 flex items-center justify-between px-4">
                <h1 className="text-white text-lg font-bold">🤖 MIS SENTINEL</h1>
                <button
                    onClick={toggleSidebar}
                    className="text-white p-2 rounded-lg hover:bg-gray-800"
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
            <div className={`
                fixed lg:static inset-y-0 left-0 z-50
                flex flex-col w-64 bg-gray-900 min-h-screen
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="flex items-center justify-center h-16 bg-gray-800">
                    <h1 className="text-white text-xl font-bold">🤖 MIS SENTINEL</h1>
                </div>

                <div className="flex flex-col flex-1 overflow-y-auto">
                    <nav className="flex-1 px-2 py-4 space-y-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={closeSidebar}
                                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                                            ? 'bg-gray-800 text-white'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                        }`}
                                >
                                    <Icon className="mr-3 h-5 w-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-gray-800">
                        <div className="flex items-center mb-4">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-white">
                                    {user?.username || 'Usuário'}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {user?.email || ''}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={logout}
                            className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
                        >
                            <LogOut className="mr-3 h-5 w-5" />
                            Sair
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}