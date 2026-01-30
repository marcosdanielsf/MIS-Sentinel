'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
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

            // Fetch ALL tasks - filtering is now done client-side
            const response = await fetch('/api/tasks?action=list_tasks');
            const result = await response.json();

            if (result.success && result.data) {
                let fetchedTasks = result.data as Task[];

                // Sort by priority
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
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Carregando...</p>
                </div>
            </div>
        );
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
                return 'bg-red-100 text-red-800 border-red-300';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default:
                return 'bg-blue-100 text-blue-800 border-blue-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'in_progress':
                return <PlayCircle className="h-5 w-5 text-blue-600" />;
            case 'blocked':
                return <Pause className="h-5 w-5 text-red-600" />;
            case 'cancelled':
                return <XCircle className="h-5 w-5 text-gray-400" />;
            default:
                return <Clock className="h-5 w-5 text-gray-400" />;
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

    // Calculate average completion time
    const completedWithTime = projectSummaries.filter(p => p.avg_completion_time_minutes);
    const avgCompletionTime = completedWithTime.length > 0
        ? completedWithTime.reduce((sum, p) => sum + (p.avg_completion_time_minutes || 0), 0) / completedWithTime.length
        : null;

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <CheckCircle className="h-8 w-8 text-indigo-600" />
                                Gerenciador de Tarefas
                            </h1>
                            <p className="mt-2 text-gray-600">
                                Gestão de tarefas com métricas de tempo e performance
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                            >
                                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Atualizar
                            </button>
                            <button
                                onClick={() => setShowNewTaskForm(true)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                            >
                                <Plus className="h-5 w-5" />
                                Nova Tarefa
                            </button>
                        </div>
                    </div>

                    {/* Global Stats */}
                    <div className="grid grid-cols-5 gap-4 mb-8">
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Pendentes</p>
                                    <p className="text-2xl font-bold text-gray-900">{totalPending}</p>
                                </div>
                                <Clock className="h-8 w-8 text-gray-400" />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Em Progresso</p>
                                    <p className="text-2xl font-bold text-blue-600">{totalInProgress}</p>
                                </div>
                                <PlayCircle className="h-8 w-8 text-blue-400" />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Concluídas</p>
                                    <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-400" />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Bloqueadas</p>
                                    <p className="text-2xl font-bold text-red-600">{totalBlocked}</p>
                                </div>
                                <Pause className="h-8 w-8 text-red-400" />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Tempo Médio</p>
                                    <p className="text-2xl font-bold text-purple-600">
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
                                className={`bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow ${
                                    filters.project === summary.project_key ? 'ring-2 ring-indigo-500' : ''
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <BarChart3 className="h-6 w-6 text-indigo-600" />
                                    <h3 className="font-semibold text-gray-900">{summary.project_name}</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Pendentes</span>
                                        <span className="font-semibold text-gray-900">{summary.pending || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Em Progresso</span>
                                        <span className="font-semibold text-blue-600">{summary.in_progress || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Concluídas</span>
                                        <span className="font-semibold text-green-600">{summary.completed || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Bloqueadas</span>
                                        <span className="font-semibold text-red-600">{summary.blocked || 0}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                    <p className="text-xs text-gray-500">
                                        Total: {summary.total || 0} tarefas
                                    </p>
                                    {summary.avg_completion_time_minutes && (
                                        <p className="text-xs text-purple-600 flex items-center gap-1">
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
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <p className="text-red-700">{error}</p>
                            <p className="text-red-500 text-sm mt-2">
                                Execute o script SQL em <code>scripts/create-tasks-table.sql</code> no seu Supabase para criar as tabelas necessárias.
                            </p>
                        </div>
                    )}

                    {/* Tasks List */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <CheckCircle className="h-6 w-6 text-indigo-600" />
                                Tarefas {filters.project !== 'all' ? `- ${getProjectName(filters.project)}` : ''}
                            </h2>
                        </div>

                        {loadingTasks ? (
                            <div className="p-12 text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Carregando tarefas...</p>
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="p-12 text-center">
                                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                <p className="text-gray-900 font-semibold text-lg">Nenhuma tarefa encontrada</p>
                                <p className="text-gray-500 mt-2">
                                    {hasActiveFilters
                                        ? 'Nenhuma tarefa encontrada com os filtros atuais.'
                                        : 'Não há tarefas ativas no momento.'}
                                </p>
                                <button
                                    onClick={() => setShowNewTaskForm(true)}
                                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Criar Nova Tarefa
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {tasks.map((task) => (
                                    <div key={task.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="mt-1">
                                                    {getStatusIcon(task.status)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-gray-900">{task.title}</h3>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                            {task.priority}
                                                        </span>
                                                    </div>
                                                    {task.description && (
                                                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                                    )}

                                                    {/* Time Metrics Row */}
                                                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-2">
                                                        <span className="bg-gray-100 px-2 py-1 rounded">
                                                            {getProjectName(task.project_key)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            Criada: {formatDate(task.created_at)}
                                                        </span>
                                                        {task.started_at && (
                                                            <span className="flex items-center gap-1 text-blue-600">
                                                                <PlayCircle className="h-3 w-3" />
                                                                Início: {formatDateTime(task.started_at)}
                                                            </span>
                                                        )}
                                                        {task.completed_at && (
                                                            <span className="flex items-center gap-1 text-green-600">
                                                                <CheckCircle className="h-3 w-3" />
                                                                Fim: {formatDateTime(task.completed_at)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Duration Metrics */}
                                                    <div className="flex flex-wrap items-center gap-3 text-xs">
                                                        {task.time_to_complete_minutes && (
                                                            <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded">
                                                                <Timer className="h-3 w-3" />
                                                                Duração: {formatDuration(task.time_to_complete_minutes)}
                                                            </span>
                                                        )}
                                                        {task.estimated_hours && (
                                                            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                                                <TrendingUp className="h-3 w-3" />
                                                                Estimado: {task.estimated_hours}h
                                                            </span>
                                                        )}
                                                        {task.actual_hours && (
                                                            <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded">
                                                                <CheckCircle className="h-3 w-3" />
                                                                Real: {task.actual_hours}h
                                                            </span>
                                                        )}
                                                        {task.due_date && (
                                                            <span className={`flex items-center gap-1 px-2 py-1 rounded ${
                                                                new Date(task.due_date) < new Date()
                                                                    ? 'bg-red-50 text-red-700'
                                                                    : 'bg-yellow-50 text-yellow-700'
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
                                                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                                                    >
                                                        Iniciar
                                                    </button>
                                                )}
                                                {task.status === 'in_progress' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdateStatus(task.id, 'completed')}
                                                            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                                                        >
                                                            Concluir
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(task.id, 'blocked')}
                                                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                                        >
                                                            Bloquear
                                                        </button>
                                                    </>
                                                )}
                                                {task.status === 'blocked' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                                                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
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
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Nova Tarefa</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Projeto *</label>
                                        <select
                                            value={newTask.project_key}
                                            onChange={(e) => setNewTask({ ...newTask, project_key: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                                        <input
                                            type="text"
                                            value={newTask.title}
                                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Título da tarefa"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                        <textarea
                                            value={newTask.description}
                                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Descrição opcional"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                                            <select
                                                value={newTask.priority}
                                                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'urgent' | 'high' | 'medium' | 'low' })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="urgent">Urgente</option>
                                                <option value="high">Alta</option>
                                                <option value="medium">Média</option>
                                                <option value="low">Baixa</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Horas Estimadas</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={newTask.estimated_hours}
                                                onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Ex: 2.5"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Prazo (opcional)</label>
                                        <input
                                            type="date"
                                            value={newTask.due_date}
                                            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        onClick={() => setShowNewTaskForm(false)}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                        disabled={creatingTask}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreateTask}
                                        disabled={creatingTask}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
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
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Carregando...</p>
                    </div>
                </div>
            }
        >
            <TasksPageContent />
        </Suspense>
    );
}
