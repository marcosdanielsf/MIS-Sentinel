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
        color: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: <Clock className="h-5 w-5 text-gray-500" />,
    },
    {
        id: 'in_progress',
        title: 'Em Progresso',
        status: 'in_progress',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: <PlayCircle className="h-5 w-5 text-blue-500" />,
    },
    {
        id: 'blocked',
        title: 'Bloqueadas',
        status: 'blocked',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: <Pause className="h-5 w-5 text-red-500" />,
    },
    {
        id: 'completed',
        title: 'Concluídas',
        status: 'completed',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
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
                ${isOver ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}
                transition-all duration-200
            `}
        >
            {/* Column Header */}
            <div className={`flex items-center justify-between p-4 border-b ${column.borderColor}`}>
                <div className="flex items-center gap-2">
                    {column.icon}
                    <h3 className={`font-semibold ${column.color}`}>
                        {column.title}
                    </h3>
                    <span className={`
                        text-xs px-2 py-0.5 rounded-full font-medium
                        ${column.bgColor} ${column.color} border ${column.borderColor}
                    `}>
                        {tasks.length}
                    </span>
                </div>
                {column.status === 'pending' && onAddTask && (
                    <button
                        onClick={onAddTask}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Nova tarefa"
                    >
                        <Plus className="h-4 w-4 text-gray-500" />
                    </button>
                )}
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className={`
                    flex-1 p-3 space-y-3 min-h-[200px] overflow-y-auto max-h-[calc(100vh-300px)]
                    ${isOver ? 'bg-indigo-50/50' : ''}
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
                        ${isOver ? 'border-indigo-400 bg-indigo-50' : ''}
                    `}>
                        {column.icon}
                        <p className="text-sm text-gray-500 mt-2">
                            {isOver ? 'Solte aqui' : 'Nenhuma tarefa'}
                        </p>
                    </div>
                )}

                {/* Drop placeholder when dragging over */}
                {isOver && tasks.length > 0 && (
                    <div className="h-20 border-2 border-dashed border-indigo-400 rounded-lg bg-indigo-50/50 flex items-center justify-center">
                        <p className="text-sm text-indigo-500">Solte aqui</p>
                    </div>
                )}
            </div>
        </div>
    );
}
