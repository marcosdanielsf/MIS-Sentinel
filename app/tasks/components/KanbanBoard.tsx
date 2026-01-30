'use client';

import { useMemo } from 'react';
import {
  Clock,
  PlayCircle,
  Pause,
  CheckCircle,
  Calendar,
  Timer,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

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
}

export type KanbanStatus = 'pending' | 'in_progress' | 'blocked' | 'completed';

export interface KanbanBoardProps {
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: string) => void;
  onTaskClick: (task: Task) => void;
}

// ============================================================================
// Column Configuration
// ============================================================================

interface ColumnConfig {
  id: KanbanStatus;
  title: string;
  icon: React.ReactNode;
  headerBg: string;
  headerText: string;
  cardBorder: string;
  countBg: string;
  countText: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'pending',
    title: 'Backlog',
    icon: <Clock className="h-5 w-5" />,
    headerBg: 'bg-gray-100',
    headerText: 'text-gray-700',
    cardBorder: 'border-l-gray-400',
    countBg: 'bg-gray-200',
    countText: 'text-gray-700',
  },
  {
    id: 'in_progress',
    title: 'Em Progresso',
    icon: <PlayCircle className="h-5 w-5" />,
    headerBg: 'bg-blue-100',
    headerText: 'text-blue-700',
    cardBorder: 'border-l-blue-500',
    countBg: 'bg-blue-200',
    countText: 'text-blue-700',
  },
  {
    id: 'blocked',
    title: 'Bloqueado',
    icon: <Pause className="h-5 w-5" />,
    headerBg: 'bg-red-100',
    headerText: 'text-red-700',
    cardBorder: 'border-l-red-500',
    countBg: 'bg-red-200',
    countText: 'text-red-700',
  },
  {
    id: 'completed',
    title: 'Concluído',
    icon: <CheckCircle className="h-5 w-5" />,
    headerBg: 'bg-green-100',
    headerText: 'text-green-700',
    cardBorder: 'border-l-green-500',
    countBg: 'bg-green-200',
    countText: 'text-green-700',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

const getPriorityConfig = (priority: Task['priority']) => {
  const configs = {
    urgent: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', label: 'Urgente' },
    high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', label: 'Alta' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', label: 'Média' },
    low: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', label: 'Baixa' },
  };
  return configs[priority] || configs.medium;
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const isOverdue = (dueDate: string | null, status: Task['status']) => {
  if (!dueDate || status === 'completed') return false;
  return new Date(dueDate) < new Date();
};

// ============================================================================
// KanbanCard Component
// ============================================================================

interface KanbanCardProps {
  task: Task;
  columnConfig: ColumnConfig;
  onClick: () => void;
}

function KanbanCard({ task, columnConfig, onClick }: KanbanCardProps) {
  const priorityConfig = getPriorityConfig(task.priority);
  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${columnConfig.cardBorder}
        p-3 cursor-pointer hover:shadow-md transition-all duration-200
        hover:translate-y-[-2px] active:translate-y-0
      `}
    >
      {/* Title & Priority */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-gray-900 text-sm leading-tight flex-1 line-clamp-2">
          {task.title}
        </h4>
        <span
          className={`
            px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0
            ${priorityConfig.bg} ${priorityConfig.text} border ${priorityConfig.border}
          `}
        >
          {priorityConfig.label}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
        {/* Project Key */}
        <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">
          {task.project_key}
        </span>

        {/* Due Date */}
        {task.due_date && (
          <span
            className={`
              flex items-center gap-1 px-1.5 py-0.5 rounded
              ${overdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}
            `}
          >
            {overdue && <AlertTriangle className="h-3 w-3" />}
            <Calendar className="h-3 w-3" />
            {formatDate(task.due_date)}
          </span>
        )}

        {/* Estimated Hours */}
        {task.estimated_hours && (
          <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
            <Timer className="h-3 w-3" />
            {task.estimated_hours}h
          </span>
        )}

        {/* Completion Time (for completed tasks) */}
        {task.status === 'completed' && task.time_to_complete_minutes && (
          <span className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
            <CheckCircle className="h-3 w-3" />
            {Math.round(task.time_to_complete_minutes / 60)}h
          </span>
        )}
      </div>

      {/* Assigned To */}
      {task.assigned_to && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-[10px] text-gray-400">
            Atribuído: <span className="text-gray-600">{task.assigned_to}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// KanbanColumn Component
// ============================================================================

interface KanbanColumnProps {
  config: ColumnConfig;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

function KanbanColumn({ config, tasks, onTaskClick }: KanbanColumnProps) {
  // Sort tasks by priority
  const sortedTasks = useMemo(() => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [tasks]);

  return (
    <div className="flex flex-col min-w-[280px] md:min-w-0 md:flex-1 bg-gray-50 rounded-lg">
      {/* Column Header */}
      <div className={`${config.headerBg} rounded-t-lg p-3 sticky top-0 z-10`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${config.headerText}`}>
            {config.icon}
            <h3 className="font-semibold text-sm">{config.title}</h3>
          </div>
          <span
            className={`
              ${config.countBg} ${config.countText}
              px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center
            `}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Cards Container - Scrollable */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] md:max-h-[calc(100vh-240px)]">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Nenhuma tarefa
          </div>
        ) : (
          sortedTasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              columnConfig={config}
              onClick={() => onTaskClick(task)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// KanbanBoard Component (Main Export)
// ============================================================================

export default function KanbanBoard({ tasks, onTaskMove, onTaskClick }: KanbanBoardProps) {
  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<KanbanStatus, Task[]> = {
      pending: [],
      in_progress: [],
      blocked: [],
      completed: [],
    };

    tasks.forEach((task) => {
      // Only include tasks with kanban-compatible statuses
      if (task.status in grouped) {
        grouped[task.status as KanbanStatus].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  return (
    <div className="h-full">
      {/* Desktop: Horizontal scroll with all columns visible */}
      {/* Mobile: Horizontal swipe through columns */}
      <div
        className="
          flex gap-4 pb-4
          overflow-x-auto snap-x snap-mandatory
          md:snap-none md:overflow-x-visible
          scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
        "
      >
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            config={column}
            tasks={tasksByStatus[column.id]}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      {/* Mobile indicator dots */}
      <div className="flex justify-center gap-2 mt-2 md:hidden">
        {COLUMNS.map((column) => (
          <div
            key={column.id}
            className={`w-2 h-2 rounded-full ${column.headerBg.replace('100', '400')}`}
          />
        ))}
      </div>
    </div>
  );
}

// Export types for external use
export type { ColumnConfig };
