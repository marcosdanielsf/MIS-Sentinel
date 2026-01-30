'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    CheckCircle,
    Clock,
    PlayCircle,
    Pause,
    XCircle,
    Plus,
} from 'lucide-react';
import DraggableCard from './DraggableCard';

interface Task {
    id: string;
    project_key: string;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    notes: string | null;
    created_at: string;
    due_date: string | null;
    estimated_hours: number | null;
    time_to_complete_minutes: number | null;
}

interface ColumnConfig {
    id: string;
    title: string;
    status: Task['status'];
    color: string;
    bgColor: string;
    borderColor: string;
    iconColor: string;
    icon: React.ReactNode;
}

interface DroppableColumnProps {
    column: ColumnConfig;
    tasks: Task[];
    getProjectName: (projectKey: string) => string;
    onAddTask?: () => void;
    activeId?: string | null;
}

export const COLUMNS: ColumnConfig[] = [
    {
        id: 'pending',
        title: 'Pendentes',
        status: 'pending',
        color: 'text-text-secondary',
        bgColor: 'bg-bg-tertiary/50',
        borderColor: 'border-border-default',
        iconColor: 'text-text-muted',
        icon: <Clock className="h-5 w-5" />,
    },
    {
        id: 'in_progress',
        title: 'Em Progresso',
        status: 'in_progress',
        color: 'text-accent-primary',
        bgColor: 'bg-accent-primary/5',
        borderColor: 'border-accent-primary/30',
        iconColor: 'text-accent-primary',
        icon: <PlayCircle className="h-5 w-5" />,
    },
    {
        id: 'blocked',
        title: 'Bloqueadas',
        status: 'blocked',
        color: 'text-accent-error',
        bgColor: 'bg-accent-error/5',
        borderColor: 'border-accent-error/30',
        iconColor: 'text-accent-error',
        icon: <Pause className="h-5 w-5" />,
    },
    {
        id: 'completed',
        title: 'Concluídas',
        status: 'completed',
        color: 'text-accent-success',
        bgColor: 'bg-accent-success/5',
        borderColor: 'border-accent-success/30',
        iconColor: 'text-accent-success',
        icon: <CheckCircle className="h-5 w-5" />,
    },
];

export default function DroppableColumn({
    column,
    tasks,
    getProjectName,
    onAddTask,
    activeId,
}: DroppableColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
        data: {
            type: 'column',
            status: column.status,
        },
    });

    const taskIds = tasks.map(t => t.id);

    return (
        <div
            className={`
                flex flex-col min-w-[300px] max-w-[350px] rounded-xl border-2 
                ${column.borderColor} ${column.bgColor}
                ${isOver ? 'ring-2 ring-accent-primary ring-offset-2 ring-offset-bg-primary' : ''}
                transition-all duration-200
            `}
        >
            {/* Column Header */}
            <div className={`flex items-center justify-between p-4 border-b ${column.borderColor}`}>
                <div className="flex items-center gap-2">
                    <span className={column.iconColor}>{column.icon}</span>
                    <h3 className={`font-semibold ${column.color}`}>
                        {column.title}
                    </h3>
                    <span className={`
                        text-xs px-2 py-0.5 rounded-full font-medium
                        bg-bg-hover text-text-secondary border border-border-default
                    `}>
                        {tasks.length}
                    </span>
                </div>
                {column.status === 'pending' && onAddTask && (
                    <button
                        onClick={onAddTask}
                        className="p-1 hover:bg-bg-hover rounded transition-colors"
                        title="Nova tarefa"
                    >
                        <Plus className="h-4 w-4 text-text-muted" />
                    </button>
                )}
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className={`
                    flex-1 p-3 space-y-3 min-h-[200px] overflow-y-auto max-h-[calc(100vh-300px)]
                    ${isOver ? 'bg-accent-primary/10' : ''}
                    transition-colors duration-200
                `}
            >
                <SortableContext
                    items={taskIds}
                    strategy={verticalListSortingStrategy}
                >
                    {tasks.map((task) => (
                        <DraggableCard
                            key={task.id}
                            task={task}
                            projectName={getProjectName(task.project_key)}
                            isDragging={activeId === task.id}
                        />
                    ))}
                </SortableContext>

                {/* Empty state */}
                {tasks.length === 0 && (
                    <div className={`
                        flex flex-col items-center justify-center py-8 
                        border-2 border-dashed ${column.borderColor} rounded-lg
                        ${isOver ? 'border-accent-primary bg-accent-primary/10' : ''}
                    `}>
                        <span className={column.iconColor}>{column.icon}</span>
                        <p className="text-sm text-text-muted mt-2">
                            {isOver ? 'Solte aqui' : 'Nenhuma tarefa'}
                        </p>
                    </div>
                )}

                {/* Drop placeholder when dragging over */}
                {isOver && tasks.length > 0 && (
                    <div className="h-20 border-2 border-dashed border-accent-primary rounded-lg bg-accent-primary/10 flex items-center justify-center">
                        <p className="text-sm text-accent-primary">Solte aqui</p>
                    </div>
                )}
            </div>
        </div>
    );
}
