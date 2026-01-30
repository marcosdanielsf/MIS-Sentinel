'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import { PageLoading } from '@/components/Layout';
import { KanbanFilters } from './components';
import { useTaskFilters, Task } from './hooks';
import {
    CheckCircle,
    Clock,
    PlayCircle,
    Pause,
    RefreshCw,
    Plus,
    BarChart3,
    XCircle,
    Timer,
    Calendar,
    TrendingUp,
} from 'lucide-react';

interface Project {
    project_key: string;
    project_name: string;
    current_status: string;
    current_phase: string;
}

interface ProjectSummary {
    project_key: string;
    project_name: string;
    pending: number;
    in_progress: number;
    completed: number;
    blocked: number;
    total: number;
    avg_completion_time_minutes: number | null;
}

// Wrapper component to handle Suspense for useSearchParams
function TasksPageContent() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use the new filter hook
    const {
        filters,
        setFilters,
        resetFilters,
        hasActiveFilters,
        filterTasks,
        getShareableUrl,
        isInitialized,
    } = useTaskFilters();

    // Form states for new task
    const [showNewTaskForm, setShowNewTaskForm] = useState(false);
    const [newTask, setNewTask] = useState({
        project_key: '',
        title: '',
        description: '',
        priority: 'medium' as 'urgent' | 'high' | 'medium' | 'low',
        estimated_hours: '',
        due_date: '',
    });
    const [creatingTask, setCreatingTask] = useState(false);

    // Apply filters to tasks
    const tasks = filterTasks(allTasks);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const fetchProjects = useCallback(async () => {
        try {
            const response = await fetch('/api/tasks?action=list_projects');
            const result = await response.json();

            if (result.success && result.data) {
                setProjects(result.data);
            } else {
                console.error('Error fetching projects:', result.error);
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        }
    }, []);

    const fetchTasks = useCallback(async () => {
        try {
            setLoadingTasks(true);
            setError(null);

            const response = await fetch('/api/tasks?action=list_tasks');
            const result = await response.json();

            if (result.success && result.data) {
                let fetchedTasks = result.data as Task[];

                const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                fetchedTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

                setAllTasks(fetchedTasks);
            } else {
                setAllTasks([]);
                if (result.error) {
                    setError(result.error);
                }
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            setAllTasks([]);
            setError('Failed to load tasks');
        } finally {
            setLoadingTasks(false);
        }
    }, []);

    const fetchProjectSummaries = useCallback(async () => {
        try {
            const response = await fetch('/api/tasks?action=project_summary');
            const result = await response.json();

            if (result.success && result.data) {
                setProjectSummaries(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch summaries:', error);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchProjects();
        }
    }, [user, fetchProjects]);

    useEffect(() => {
        if (user) {
            fetchTasks();
            fetchProjectSummaries();
        }
    }, [user, fetchTasks, fetchProjectSummaries]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([fetchTasks(), fetchProjectSummaries()]);
        setIsRefreshing(false);
    };

    const handleUpdateStatus = async (taskId: string, newStatus: string) => {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: newStatus === 'completed' ? 'complete_task' : 'update_task',
                    task_id: taskId,
                    status: newStatus,
                }),
            });

            const result = await response.json();

            if (result.success) {
                await Promise.all([fetchTasks(), fetchProjectSummaries()]);
            } else {
                alert('Erro ao atualizar tarefa: ' + (result.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Failed to update task:', error);
            alert('Erro ao atualizar tarefa');
        }
    };

    const handleCreateTask = async () => {
        if (!newTask.project_key || !newTask.title) {
            alert('Preencha projeto e título');
            return;
        }

        try {
            setCreatingTask(true);
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_task',
                    project_key: newTask.project_key,
                    title: newTask.title,
                    description: newTask.description || undefined,
                    priority: newTask.priority,
                    estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : undefined,
                    due_date: newTask.due_date || undefined,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setNewTask({ project_key: '', title: '', description: '', priority: 'medium', estimated_hours: '', due_date: '' });
                setShowNewTaskForm(false);
                await Promise.all([fetchTasks(), fetchProjectSummaries()]);
            } else {
                alert('Erro ao criar tarefa: ' + (result.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Failed to create task:', error);
            alert('Erro ao criar tarefa');
        } finally {
            setCreatingTask(false);
        }
    };

    if (loading || !user) {
        return <PageLoading />;
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return '-';
        if (minutes < 60) return `${Math.round(minutes)}min`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours < 24) return `${hours}h ${mins}m`;
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h`;
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'bg-accent-error/20 text-accent-error border-accent-error/30';
            case 'high':
                return 'bg-accent-warning/20 text-accent-warning border-accent-warning/30';
            case 'medium':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            default:
                return 'bg-accent-primary/20 text-accent-primary border-accent-primary/30';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-5 w-5 text-accent-success" />;
            case 'in_progress':
                return <PlayCircle className="h-5 w-5 text-accent-primary" />;
            case 'blocked':
                return <Pause className="h-5 w-5 text-accent-error" />;
            case 'cancelled':
                return <XCircle className="h-5 w-5 text-text-muted" />;
            default:
                return <Clock className="h-5 w-5 text-text-muted" />;
        }
    };

    const getProjectName = (projectKey: string) => {
        const project = projects.find(p => p.project_key === projectKey);
        return project?.project_name || projectKey;
    };

    const totalPending = projectSummaries.reduce((acc, p) => acc + (p.pending || 0), 0);
    const totalInProgress = projectSummaries.reduce((acc, p) => acc + (p.in_progress || 0), 0);
    const totalCompleted = projectSummaries.reduce((acc, p) => acc + (p.completed || 0), 0);
    const totalBlocked = projectSummaries.reduce((acc, p) => acc + (p.blocked || 0), 0);

    const completedWithTime = projectSummaries.filter(p => p.avg_completion_time_minutes);
    const avgCompletionTime = completedWithTime.length > 0
        ? completedWithTime.reduce((sum, p) => sum + (p.avg_completion_time_minutes || 0), 0) / completedWithTime.length
        : null;

    return (
        <div className="flex min-h-screen bg-bg-primary">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-6 lg:p-8 pt-20 lg:pt-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                                <CheckCircle className="h-7 w-7 text-accent-primary" />
                                Gerenciador de Tarefas
                            </h1>
                            <p className="mt-2 text-text-secondary">
                                Gestão de tarefas com métricas de tempo e performance
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="px-4 py-2 bg-bg-secondary text-text-secondary rounded-lg hover:bg-bg-tertiary hover:text-text-primary border border-border-default flex items-center gap-2 transition-colors"
                            >
                                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Atualizar
                            </button>
                            <button
                                onClick={() => setShowNewTaskForm(true)}
                                className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-colors"
                            >
                                <Plus className="h-5 w-5" />
                                Nova Tarefa
                            </button>
                        </div>
                    </div>

                    {/* Global Stats */}
                    <div className="grid grid-cols-5 gap-4 mb-8">
                        <div className="bg-bg-secondary rounded-lg border border-border-default p-4 hover:bg-bg-tertiary transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-secondary">Pendentes</p>
                                    <p className="text-2xl font-bold text-text-primary">{totalPending}</p>
                                </div>
                                <Clock className="h-8 w-8 text-text-muted" />
                            </div>
                        </div>
                        <div className="bg-bg-secondary rounded-lg border border-accent-primary/30 p-4 hover:bg-bg-tertiary transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-secondary">Em Progresso</p>
                                    <p className="text-2xl font-bold text-accent-primary">{totalInProgress}</p>
                                </div>
                                <PlayCircle className="h-8 w-8 text-accent-primary" />
                            </div>
                        </div>
                        <div className="bg-bg-secondary rounded-lg border border-accent-success/30 p-4 hover:bg-bg-tertiary transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-secondary">Concluídas</p>
                                    <p className="text-2xl font-bold text-accent-success">{totalCompleted}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-accent-success" />
                            </div>
                        </div>
                        <div className="bg-bg-secondary rounded-lg border border-accent-error/30 p-4 hover:bg-bg-tertiary transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-secondary">Bloqueadas</p>
                                    <p className="text-2xl font-bold text-accent-error">{totalBlocked}</p>
                                </div>
                                <Pause className="h-8 w-8 text-accent-error" />
                            </div>
                        </div>
                        <div className="bg-bg-secondary rounded-lg border border-purple-500/30 p-4 hover:bg-bg-tertiary transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-secondary">Tempo Médio</p>
                                    <p className="text-2xl font-bold text-purple-400">
                                        {avgCompletionTime ? formatDuration(avgCompletionTime) : '-'}
                                    </p>
                                </div>
                                <Timer className="h-8 w-8 text-purple-400" />
                            </div>
                        </div>
                    </div>

                    {/* Project Summaries Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {projectSummaries.map((summary) => (
                            <div
                                key={summary.project_key}
                                onClick={() => setFilters({
                                    project: filters.project === summary.project_key ? 'all' : summary.project_key
                                })}
                                className={`bg-bg-secondary rounded-lg border p-6 cursor-pointer hover:bg-bg-tertiary transition-all ${
                                    filters.project === summary.project_key 
                                        ? 'ring-2 ring-accent-primary border-accent-primary' 
                                        : 'border-border-default hover:border-border-hover'
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <BarChart3 className="h-6 w-6 text-accent-primary" />
                                    <h3 className="font-semibold text-text-primary">{summary.project_name}</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-secondary">Pendentes</span>
                                        <span className="font-semibold text-text-primary">{summary.pending || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-secondary">Em Progresso</span>
                                        <span className="font-semibold text-accent-primary">{summary.in_progress || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-secondary">Concluídas</span>
                                        <span className="font-semibold text-accent-success">{summary.completed || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-secondary">Bloqueadas</span>
                                        <span className="font-semibold text-accent-error">{summary.blocked || 0}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border-default flex justify-between items-center">
                                    <p className="text-xs text-text-muted">
                                        Total: {summary.total || 0} tarefas
                                    </p>
                                    {summary.avg_completion_time_minutes && (
                                        <p className="text-xs text-purple-400 flex items-center gap-1">
                                            <Timer className="h-3 w-3" />
                                            {formatDuration(summary.avg_completion_time_minutes)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Kanban Filters */}
                    <KanbanFilters
                        filters={filters}
                        onFiltersChange={setFilters}
                        onReset={resetFilters}
                        hasActiveFilters={hasActiveFilters}
                        projects={projects}
                        totalTasks={allTasks.length}
                        filteredCount={tasks.length}
                        getShareableUrl={getShareableUrl}
                    />

                    {/* Error Message */}
                    {error && (
                        <div className="bg-accent-error/10 border border-accent-error/30 rounded-lg p-4 mb-6">
                            <p className="text-accent-error">{error}</p>
                            <p className="text-accent-error/70 text-sm mt-2">
                                Execute o script SQL em <code className="bg-bg-tertiary px-1 rounded">scripts/create-tasks-table.sql</code> no seu Supabase para criar as tabelas necessárias.
                            </p>
                        </div>
                    )}

                    {/* Tasks List */}
                    <div className="bg-bg-secondary rounded-lg border border-border-default">
                        <div className="p-6 border-b border-border-default">
                            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                                <CheckCircle className="h-6 w-6 text-accent-primary" />
                                Tarefas {filters.project !== 'all' ? `- ${getProjectName(filters.project)}` : ''}
                            </h2>
                        </div>

                        {loadingTasks ? (
                            <div className="p-12 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-primary border-t-transparent mx-auto"></div>
                                <p className="mt-4 text-text-secondary">Carregando tarefas...</p>
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="p-12 text-center">
                                <CheckCircle className="h-16 w-16 text-accent-success mx-auto mb-4" />
                                <p className="text-text-primary font-semibold text-lg">Nenhuma tarefa encontrada</p>
                                <p className="text-text-secondary mt-2">
                                    {hasActiveFilters
                                        ? 'Nenhuma tarefa encontrada com os filtros atuais.'
                                        : 'Não há tarefas ativas no momento.'}
                                </p>
                                <button
                                    onClick={() => setShowNewTaskForm(true)}
                                    className="mt-4 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Criar Nova Tarefa
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-border-default">
                                {tasks.map((task) => (
                                    <div key={task.id} className="p-4 hover:bg-bg-tertiary transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="mt-1">
                                                    {getStatusIcon(task.status)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-text-primary">{task.title}</h3>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                            {task.priority}
                                                        </span>
                                                    </div>
                                                    {task.description && (
                                                        <p className="text-sm text-text-secondary mb-2">{task.description}</p>
                                                    )}

                                                    {/* Time Metrics Row */}
                                                    <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted mb-2">
                                                        <span className="bg-bg-tertiary px-2 py-1 rounded">
                                                            {getProjectName(task.project_key)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            Criada: {formatDate(task.created_at)}
                                                        </span>
                                                        {task.started_at && (
                                                            <span className="flex items-center gap-1 text-accent-primary">
                                                                <PlayCircle className="h-3 w-3" />
                                                                Início: {formatDateTime(task.started_at)}
                                                            </span>
                                                        )}
                                                        {task.completed_at && (
                                                            <span className="flex items-center gap-1 text-accent-success">
                                                                <CheckCircle className="h-3 w-3" />
                                                                Fim: {formatDateTime(task.completed_at)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Duration Metrics */}
                                                    <div className="flex flex-wrap items-center gap-3 text-xs">
                                                        {task.time_to_complete_minutes && (
                                                            <span className="flex items-center gap-1 bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                                                                <Timer className="h-3 w-3" />
                                                                Duração: {formatDuration(task.time_to_complete_minutes)}
                                                            </span>
                                                        )}
                                                        {task.estimated_hours && (
                                                            <span className="flex items-center gap-1 bg-accent-primary/20 text-accent-primary px-2 py-1 rounded">
                                                                <TrendingUp className="h-3 w-3" />
                                                                Estimado: {task.estimated_hours}h
                                                            </span>
                                                        )}
                                                        {task.actual_hours && (
                                                            <span className="flex items-center gap-1 bg-accent-success/20 text-accent-success px-2 py-1 rounded">
                                                                <CheckCircle className="h-3 w-3" />
                                                                Real: {task.actual_hours}h
                                                            </span>
                                                        )}
                                                        {task.due_date && (
                                                            <span className={`flex items-center gap-1 px-2 py-1 rounded ${
                                                                new Date(task.due_date) < new Date()
                                                                    ? 'bg-accent-error/20 text-accent-error'
                                                                    : 'bg-accent-warning/20 text-accent-warning'
                                                            }`}>
                                                                <Calendar className="h-3 w-3" />
                                                                Prazo: {formatDate(task.due_date)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                {task.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                                                        className="px-3 py-1 bg-accent-primary/20 text-accent-primary rounded hover:bg-accent-primary/30 text-sm transition-colors"
                                                    >
                                                        Iniciar
                                                    </button>
                                                )}
                                                {task.status === 'in_progress' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdateStatus(task.id, 'completed')}
                                                            className="px-3 py-1 bg-accent-success/20 text-accent-success rounded hover:bg-accent-success/30 text-sm transition-colors"
                                                        >
                                                            Concluir
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(task.id, 'blocked')}
                                                            className="px-3 py-1 bg-accent-error/20 text-accent-error rounded hover:bg-accent-error/30 text-sm transition-colors"
                                                        >
                                                            Bloquear
                                                        </button>
                                                    </>
                                                )}
                                                {task.status === 'blocked' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                                                        className="px-3 py-1 bg-accent-primary/20 text-accent-primary rounded hover:bg-accent-primary/30 text-sm transition-colors"
                                                    >
                                                        Desbloquear
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* New Task Modal */}
                    {showNewTaskForm && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-bg-secondary rounded-lg border border-border-default shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                                <h2 className="text-xl font-semibold text-text-primary mb-4">Nova Tarefa</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Projeto *</label>
                                        <select
                                            value={newTask.project_key}
                                            onChange={(e) => setNewTask({ ...newTask, project_key: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                                        >
                                            <option value="">Selecione um projeto</option>
                                            {projects.map((project) => (
                                                <option key={project.project_key} value={project.project_key}>
                                                    {project.project_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Título *</label>
                                        <input
                                            type="text"
                                            value={newTask.title}
                                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                                            placeholder="Título da tarefa"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Descrição</label>
                                        <textarea
                                            value={newTask.description}
                                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                                            placeholder="Descrição opcional"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">Prioridade</label>
                                            <select
                                                value={newTask.priority}
                                                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'urgent' | 'high' | 'medium' | 'low' })}
                                                className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                                            >
                                                <option value="urgent">Urgente</option>
                                                <option value="high">Alta</option>
                                                <option value="medium">Média</option>
                                                <option value="low">Baixa</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">Horas Estimadas</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={newTask.estimated_hours}
                                                onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })}
                                                className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                                                placeholder="Ex: 2.5"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Prazo (opcional)</label>
                                        <input
                                            type="date"
                                            value={newTask.due_date}
                                            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        onClick={() => setShowNewTaskForm(false)}
                                        className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                                        disabled={creatingTask}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreateTask}
                                        disabled={creatingTask}
                                        className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                                    >
                                        {creatingTask ? 'Criando...' : 'Criar Tarefa'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Main export with Suspense wrapper for useSearchParams
export default function TasksPage() {
    return (
        <Suspense fallback={<PageLoading />}>
            <TasksPageContent />
        </Suspense>
    );
}
