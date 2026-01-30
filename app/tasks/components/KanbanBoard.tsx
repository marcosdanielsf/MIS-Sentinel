'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import DndProvider, { DragEndEvent, DragStartEvent, DragOverEvent } from './DndProvider';
import DroppableColumn, { COLUMNS } from './DroppableColumn';
import { DraggableCardOverlay } from './DraggableCard';

interface Task {
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
}

interface KanbanBoardProps {
    tasks: Task[];
    onTaskStatusChange: (taskId: string, newStatus: Task['status'], newPosition?: number) => Promise<void>;
    getProjectName: (projectKey: string) => string;
    onAddTask?: () => void;
}

export default function KanbanBoard({
    tasks,
    onTaskStatusChange,
    getProjectName,
    onAddTask,
}: KanbanBoardProps) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
    const [isUpdating, setIsUpdating] = useState(false);

    // Sync local tasks when props change
    React.useEffect(() => {
        setLocalTasks(tasks);
    }, [tasks]);

    // Group tasks by status
    const tasksByStatus = useMemo(() => {
        const grouped: Record<Task['status'], Task[]> = {
            pending: [],
            in_progress: [],
            blocked: [],
            completed: [],
            cancelled: [],
        };

        // Sort by priority within each group
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

        localTasks.forEach((task) => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            }
        });

        // Sort each column by priority
        Object.keys(grouped).forEach((status) => {
            grouped[status as Task['status']].sort(
                (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
            );
        });

        return grouped;
    }, [localTasks]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const task = localTasks.find((t) => t.id === active.id);
        if (task) {
            setActiveTask(task);
        }
    }, [localTasks]);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Get the task being dragged
        const activeTask = localTasks.find((t) => t.id === activeId);
        if (!activeTask) return;

        // Determine target status
        let targetStatus: Task['status'] | null = null;

        // Check if over a column
        const overColumn = COLUMNS.find((col) => col.id === overId);
        if (overColumn) {
            targetStatus = overColumn.status;
        } else {
            // Check if over another task
            const overTask = localTasks.find((t) => t.id === overId);
            if (overTask) {
                targetStatus = overTask.status;
            }
        }

        // If moving to a different column, update locally for visual feedback
        if (targetStatus && activeTask.status !== targetStatus) {
            setLocalTasks((prev) =>
                prev.map((t) =>
                    t.id === activeId ? { ...t, status: targetStatus! } : t
                )
            );
        }
    }, [localTasks]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) {
            // Reset to original tasks if dropped outside
            setLocalTasks(tasks);
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find the task that was dragged
        const draggedTask = tasks.find((t) => t.id === activeId);
        if (!draggedTask) return;

        // Determine target status
        let targetStatus: Task['status'] = draggedTask.status;

        // Check if over a column
        const overColumn = COLUMNS.find((col) => col.id === overId);
        if (overColumn) {
            targetStatus = overColumn.status;
        } else {
            // Check if over another task
            const overTask = localTasks.find((t) => t.id === overId);
            if (overTask) {
                targetStatus = overTask.status;
            }
        }

        // Calculate new position (index within the column)
        const targetTasks = tasksByStatus[targetStatus] || [];
        let newPosition = targetTasks.findIndex((t) => t.id === overId);
        if (newPosition === -1) {
            newPosition = targetTasks.length;
        }

        // Only call API if status changed
        if (targetStatus !== draggedTask.status) {
            setIsUpdating(true);
            try {
                await onTaskStatusChange(activeId, targetStatus, newPosition);
            } catch (error) {
                console.error('Failed to update task status:', error);
                // Revert to original tasks on error
                setLocalTasks(tasks);
            } finally {
                setIsUpdating(false);
            }
        } else {
            // Same column reordering - update locally (position is optional)
            // For now we just keep the new visual order
            const oldIndex = targetTasks.findIndex((t) => t.id === activeId);
            if (oldIndex !== -1 && oldIndex !== newPosition) {
                const newTasks = [...localTasks];
                const statusTasks = newTasks.filter((t) => t.status === targetStatus);
                const reordered = arrayMove(statusTasks, oldIndex, newPosition);
                
                // Rebuild full task list with reordered status group
                const otherTasks = newTasks.filter((t) => t.status !== targetStatus);
                setLocalTasks([...otherTasks, ...reordered]);
            }
        }
    }, [tasks, localTasks, tasksByStatus, onTaskStatusChange]);

    // Filter columns to show (exclude cancelled unless there are cancelled tasks)
    const visibleColumns = COLUMNS.filter(
        (col) => col.status !== 'cancelled' || tasksByStatus.cancelled.length > 0
    );

    return (
        <div className={`relative ${isUpdating ? 'opacity-75' : ''}`}>
            {isUpdating && (
                <div className="absolute top-2 right-2 z-10 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                    Atualizando...
                </div>
            )}
            
            <DndProvider
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                overlay={
                    activeTask ? (
                        <DraggableCardOverlay
                            task={activeTask}
                            projectName={getProjectName(activeTask.project_key)}
                        />
                    ) : null
                }
            >
                <div className="flex gap-4 overflow-x-auto pb-4 px-1">
                    {visibleColumns.map((column) => (
                        <DroppableColumn
                            key={column.id}
                            column={column}
                            tasks={tasksByStatus[column.status] || []}
                            getProjectName={getProjectName}
                            onAddTask={column.status === 'pending' ? onAddTask : undefined}
                            activeId={activeTask?.id}
                        />
                    ))}
                </div>
            </DndProvider>
        </div>
    );
}
