'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    CheckCircle,
    Clock,
    PlayCircle,
    Pause,
    XCircle,
    Timer,
    Calendar,
    GripVertical,
} from 'lucide-react';

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

interface DraggableCardProps {
    task: Task;
    projectName?: string;
    isDragging?: boolean;
    isOverlay?: boolean;
}

export default function DraggableCard({
    task,
    projectName,
    isDragging = false,
    isOverlay = false,
}: DraggableCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'task',
            task,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const isCurrentlyDragging = isDragging || isSortableDragging;

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'border-l-red-500 bg-red-50/30';
            case 'high':
                return 'border-l-orange-500 bg-orange-50/30';
            case 'medium':
                return 'border-l-yellow-500 bg-yellow-50/30';
            default:
                return 'border-l-blue-500 bg-blue-50/30';
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-100 text-red-800';
            case 'high':
                return 'bg-orange-100 text-orange-800';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-blue-100 text-blue-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'in_progress':
                return <PlayCircle className="h-4 w-4 text-blue-600" />;
            case 'blocked':
                return <Pause className="h-4 w-4 text-red-600" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4 text-gray-400" />;
            default:
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return null;
        if (minutes < 60) return `${Math.round(minutes)}min`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}m`;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

    const cardContent = (
        <div
            ref={!isOverlay ? setNodeRef : undefined}
            style={!isOverlay ? style : undefined}
            className={`
                group bg-white rounded-lg shadow-sm border border-l-4 p-3 
                ${getPriorityColor(task.priority)}
                ${isCurrentlyDragging ? 'opacity-50 shadow-lg ring-2 ring-indigo-400' : ''}
                ${isOverlay ? 'shadow-xl rotate-2 scale-105' : ''}
                hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing
            `}
            {...(!isOverlay ? attributes : {})}
            {...(!isOverlay ? listeners : {})}
        >
            {/* Drag Handle + Status */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
                    {getStatusIcon(task.status)}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${getPriorityBadge(task.priority)}`}>
                    {task.priority}
                </span>
            </div>

            {/* Title */}
            <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                {task.title}
            </h4>

            {/* Description (truncated) */}
            {task.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                    {task.description}
                </p>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
                {projectName && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {projectName}
                    </span>
                )}
                
                {task.estimated_hours && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {task.estimated_hours}h
                    </span>
                )}

                {task.time_to_complete_minutes && (
                    <span className="text-xs text-purple-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {formatDuration(task.time_to_complete_minutes)}
                    </span>
                )}

                {task.due_date && (
                    <span className={`text-xs flex items-center gap-1 ${
                        isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                    }`}>
                        <Calendar className="h-3 w-3" />
                        {formatDate(task.due_date)}
                    </span>
                )}
            </div>
        </div>
    );

    return cardContent;
}

// Static card for DragOverlay
export function DraggableCardOverlay({ task, projectName }: { task: Task; projectName?: string }) {
    return <DraggableCard task={task} projectName={projectName} isOverlay />;
}
