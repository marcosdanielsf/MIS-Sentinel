'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Circle, Clock, AlertTriangle, ChevronRight } from 'lucide-react';

interface Task {
  id: string;
  project_key: string;
  project_name: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  notes?: string;
}

interface TasksWidgetProps {
  projectKey?: string;
  limit?: number;
  showFilters?: boolean;
}

export default function TasksWidget({ projectKey, limit = 10, showFilters = false }: TasksWidgetProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>(projectKey || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [projects, setProjects] = useState<any[]>([]);

  const MEMORY_API = 'https://cliente-a1.mentorfy.io/webhook/claude-memory';

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [selectedProject, selectedStatus]);

  const loadProjects = async () => {
    try {
      const response = await fetch(MEMORY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_projects' }),
      });

      const text = await response.text();
      if (!text || text.trim() === '') return;

      const data = JSON.parse(text);
      if (data.success && data.data) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {};
      if (selectedProject !== 'all') {
        params.project_key = selectedProject;
      }

      const response = await fetch(MEMORY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list_tasks',
          params,
        }),
      });

      // Check if response has content
      const text = await response.text();
      if (!text || text.trim() === '') {
        setTasks([]);
        setLoading(false);
        return;
      }

      const data = JSON.parse(text);

      if (data.success && data.data) {
        let filteredTasks = data.data;

        // Filter by status if needed
        if (selectedStatus !== 'all') {
          filteredTasks = filteredTasks.filter((t: Task) => t.status === selectedStatus);
        }

        // Limit results
        filteredTasks = filteredTasks.slice(0, limit);

        setTasks(filteredTasks);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const response = await fetch(MEMORY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_task',
          params: {
            task_id: taskId,
            status: newStatus,
          },
        }),
      });

      const text = await response.text();
      if (!text || text.trim() === '') {
        loadTasks();
        return;
      }

      const data = JSON.parse(text);
      if (data.success) {
        loadTasks();
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const response = await fetch(MEMORY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_task',
          params: { task_id: taskId },
        }),
      });

      const text = await response.text();
      if (!text || text.trim() === '') {
        loadTasks();
        return;
      }

      const data = JSON.parse(text);
      if (data.success) {
        loadTasks();
      }
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'blocked':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
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

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            📋 Tarefas Pendentes
          </h3>
          <button
            onClick={loadTasks}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Atualizar
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projeto
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos os Projetos</option>
                {projects.map((project) => (
                  <option key={project.project_key} value={project.project_key}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendente</option>
                <option value="in_progress">Em Progresso</option>
                <option value="blocked">Bloqueado</option>
                <option value="completed">Concluído</option>
              </select>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>Nenhuma tarefa pendente</p>
            <p className="text-sm mt-1">Todas as tarefas foram concluídas 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(task.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {task.title}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {task.description}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{task.project_name}</span>
                    <span>•</span>
                    <span>{new Date(task.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>

                  {task.notes && (
                    <p className="text-xs text-gray-500 mt-2 italic">
                      📝 {task.notes}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0 flex flex-col gap-2">
                  {task.status === 'pending' && (
                    <button
                      onClick={() => updateTaskStatus(task.id, 'in_progress')}
                      className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                    >
                      Iniciar
                    </button>
                  )}

                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => completeTask(task.id)}
                      className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100"
                    >
                      Concluir
                    </button>
                  )}

                  {task.status === 'blocked' && (
                    <button
                      onClick={() => updateTaskStatus(task.id, 'in_progress')}
                      className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-50 rounded hover:bg-orange-100"
                    >
                      Desbloquear
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
