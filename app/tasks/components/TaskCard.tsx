'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Calendar,
    Clock,
    MoreVertical,
    AlertCircle,
    Edit3,
    Ban,
    XCircle,
    Bot,
    User,
    GripVertical,
} from 'lucide-react';

// ============ Types ============
export interface Task {
    id: string;
    project_key: string;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    notes: string | null;
    created_at: string;
    updated_at: string;
    started_at: string | null;
    completed_at: string | null;
    due_date: string | null;
    estimated_hours: number | null;
    actual_hours: number | null;
    time_to_start_minutes: number | null;
    time_to_complete_minutes: number | null;
    total_duration_minutes: number | null;
    assigned_to: string | null;
    source?: string;
}

export interface TaskCardProps {
    task: Task;
    isDragging?: boolean;
    onClick: () => void;
    onEdit?: (task: Task) => void;
    onBlock?: (task: Task) => void;
    onCancel?: (task: Task) => void;
    projectName?: string;
}

// ============ Constants - Dark Theme ============
const PRIORITY_CONFIG = {
    urgent: {
        bg: 'bg-accent-error/20',
        text: 'text-accent-error',
        border: 'border-accent-error/30',
        dot: 'bg-accent-error',
        label: 'Urgente',
    },
    high: {
        bg: 'bg-accent-warning/20',
        text: 'text-accent-warning',
        border: 'border-accent-warning/30',
        dot: 'bg-accent-warning',
        label: 'Alta',
    },
    medium: {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        dot: 'bg-yellow-500',
        label: 'Média',
    },
    low: {
        bg: 'bg-accent-primary/20',
        text: 'text-accent-primary',
        border: 'border-accent-primary/30',
        dot: 'bg-accent-primary',
        label: 'Baixa',
    },
};

// Cores para projetos - Dark Theme
const PROJECT_COLORS = [
    { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/20' },
    { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/20' },
    { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/20' },
    { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/20' },
    { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/20' },
];

// ============ Helpers ============
function getProjectColor(projectKey: string) {
    let hash = 0;
    for (let i = 0; i < projectKey.length; i++) {
        hash = projectKey.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PROJECT_COLORS.length;
    return PROJECT_COLORS[index];
}

function getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`;
    return `${Math.floor(diffDays / 30)}m`;
}

function isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
}

function formatDueDate(dueDate: string): string {
    const date = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)}d atrasado`;
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays <= 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
}

// ============ Component ============
export default function TaskCard({
    task,
    isDragging = false,
    onClick,
    onEdit,
    onBlock,
    onCancel,
    projectName,
}: TaskCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const priority = PRIORITY_CONFIG[task.priority];
    const projectColor = getProjectColor(task.project_key);
    const overdue = isOverdue(task.due_date);
    const isFromClawdbot = task.source === 'clawdbot' || task.notes?.includes('[clawdbot]');

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(!showMenu);
    };

    const handleAction = (action: 'edit' | 'block' | 'cancel', e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        if (action === 'edit' && onEdit) onEdit(task);
        if (action === 'block' && onBlock) onBlock(task);
        if (action === 'cancel' && onCancel) onCancel(task);
    };

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className={`
                relative group bg-bg-secondary rounded-lg border shadow-sm cursor-pointer
                transition-all duration-200 ease-in-out
                hover:bg-bg-tertiary hover:border-border-hover hover:-translate-y-0.5
                ${isDragging ? 'shadow-lg scale-105 rotate-2 border-accent-primary' : 'border-border-default'}
                ${task.status === 'blocked' ? 'opacity-75 border-accent-error/30 bg-accent-error/5' : ''}
                ${task.status === 'cancelled' ? 'opacity-50' : ''}
            `}
        >
            {/* Drag Handle (visible on hover) */}
            <div className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center opacity-0 group-hover:opacity-50 transition-opacity cursor-grab">
                <GripVertical className="h-4 w-4 text-text-muted" />
            </div>

            {/* Priority Strip */}
            <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-lg ${priority.dot}`} />

            <div className="p-3 pt-4">
                {/* Header Row: Title + Menu */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-text-primary text-sm leading-tight flex-1 min-w-0">
                        {truncateText(task.title, 60)}
                    </h3>

                    {/* Actions Menu */}
                    <div ref={menuRef} className="relative flex-shrink-0">
                        <button
                            onClick={handleMenuClick}
                            className="p-1 rounded hover:bg-bg-hover opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <MoreVertical className="h-4 w-4 text-text-muted" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-bg-secondary rounded-lg shadow-lg border border-border-default z-20 py-1">
                                <button
                                    onClick={(e) => handleAction('edit', e)}
                                    className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary flex items-center gap-2 transition-colors"
                                >
                                    <Edit3 className="h-4 w-4" />
                                    Editar
                                </button>
                                {task.status !== 'blocked' && (
                                    <button
                                        onClick={(e) => handleAction('block', e)}
                                        className="w-full px-3 py-2 text-left text-sm text-accent-warning hover:bg-accent-warning/10 flex items-center gap-2 transition-colors"
                                    >
                                        <Ban className="h-4 w-4" />
                                        Bloquear
                                    </button>
                                )}
                                <button
                                    onClick={(e) => handleAction('cancel', e)}
                                    className="w-full px-3 py-2 text-left text-sm text-accent-error hover:bg-accent-error/10 flex items-center gap-2 transition-colors"
                                >
                                    <XCircle className="h-4 w-4" />
                                    Cancelar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {/* Priority Badge */}
                    <span
                        className={`
                            inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
                            ${priority.bg} ${priority.text}
                        `}
                    >
                        {priority.label}
                    </span>

                    {/* Project Badge */}
                    <span
                        className={`
                            inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
                            ${projectColor.bg} ${projectColor.text}
                        `}
                    >
                        {truncateText(projectName || task.project_key, 12)}
                    </span>

                    {/* Clawdbot indicator */}
                    {isFromClawdbot && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-violet-500/20 text-violet-400">
                            <Bot className="h-3 w-3 mr-0.5" />
                            Bot
                        </span>
                    )}
                </div>

                {/* Footer Row: Meta info */}
                <div className="flex items-center justify-between text-xs text-text-muted">
                    <div className="flex items-center gap-2">
                        {/* Time since creation */}
                        <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(task.created_at)}
                        </span>

                        {/* Due date indicator */}
                        {task.due_date && (
                            <span
                                className={`
                                    flex items-center gap-0.5 px-1.5 py-0.5 rounded
                                    ${overdue 
                                        ? 'bg-accent-error/20 text-accent-error font-medium' 
                                        : 'bg-bg-tertiary text-text-secondary'
                                    }
                                `}
                            >
                                {overdue ? (
                                    <AlertCircle className="h-3 w-3" />
                                ) : (
                                    <Calendar className="h-3 w-3" />
                                )}
                                {formatDueDate(task.due_date)}
                            </span>
                        )}
                    </div>

                    {/* Assigned to Avatar */}
                    {task.assigned_to && (
                        <div
                            className="h-6 w-6 rounded-full bg-accent-primary/20 flex items-center justify-center"
                            title={task.assigned_to}
                        >
                            {task.assigned_to.includes('@') ? (
                                <User className="h-3.5 w-3.5 text-accent-primary" />
                            ) : (
                                <span className="text-xs font-medium text-accent-primary">
                                    {getInitials(task.assigned_to)}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Hover Tooltip with extra details */}
            {showTooltip && task.description && (
                <div
                    className="
                        absolute bottom-full left-0 mb-2 w-64 p-3 
                        bg-bg-tertiary text-text-primary text-xs rounded-lg shadow-xl
                        border border-border-default
                        z-30 pointer-events-none
                        animate-in fade-in duration-150
                    "
                >
                    <p className="text-text-secondary leading-relaxed">
                        {truncateText(task.description, 150)}
                    </p>
                    {task.estimated_hours && (
                        <p className="mt-2 text-text-muted">
                            Estimativa: {task.estimated_hours}h
                        </p>
                    )}
                    <div
                        className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-bg-tertiary border-r border-b border-border-default"
                    />
                </div>
            )}
        </div>
    );
}
