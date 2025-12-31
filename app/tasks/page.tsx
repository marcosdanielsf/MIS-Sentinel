'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import TasksWidget from '@/components/TasksWidget';
import { Plus, ListTodo, BarChart3 } from 'lucide-react';

interface ProjectSummary {
  project_key: string;
  project_name: string;
  pending: number;
  in_progress: number;
  completed: number;
  blocked: number;
}

export default function TasksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    project_key: '',
    title: '',
    description: '',
    priority: 'medium',
  });

  const MEMORY_API = 'https://cliente-a1.mentorfy.io/webhook/claude-memory';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadProjects();
      loadSummaries();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      const response = await fetch(MEMORY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_projects' }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadSummaries = async () => {
    setLoadingSummaries(true);
    try {
      const response = await fetch(MEMORY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_projects' }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const summariesPromises = data.data.map(async (project: any) => {
          const summaryResponse = await fetch(MEMORY_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'project_summary',
              params: { project_key: project.project_key },
            }),
          });

          const summaryData = await summaryResponse.json();
          if (summaryData.success && summaryData.data) {
            return {
              project_key: project.project_key,
              project_name: project.project_name,
              ...summaryData.data,
            };
          }
          return null;
        });

        const results = await Promise.all(summariesPromises);
        setSummaries(results.filter(Boolean) as ProjectSummary[]);
      }
    } catch (err) {
      console.error('Failed to load summaries:', err);
    } finally {
      setLoadingSummaries(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.project_key || !newTask.title) {
      alert('Preencha os campos obrigatórios');
      return;
    }

    try {
      const response = await fetch(MEMORY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_task',
          params: newTask,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowAddTask(false);
        setNewTask({
          project_key: '',
          title: '',
          description: '',
          priority: 'medium',
        });
        loadSummaries();
        // Force reload tasks widget
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to add task:', err);
      alert('Erro ao adicionar tarefa');
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

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📋 Gerenciador de Tarefas</h1>
              <p className="mt-2 text-gray-600">
                Tarefas sincronizadas com sistema de memória persistente
              </p>
            </div>
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Nova Tarefa
            </button>
          </div>

          {/* Add Task Modal */}
          {showAddTask && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Nova Tarefa
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Projeto *
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título *
                    </label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: Implementar autenticação"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                      placeholder="Descreva a tarefa..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridade
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddTask(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddTask}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Project Summaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {loadingSummaries ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              summaries.map((summary) => (
                <div key={summary.project_key} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <BarChart3 className="h-6 w-6 text-indigo-600" />
                    <h3 className="font-semibold text-gray-900">{summary.project_name}</h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Pendentes</span>
                      <span className="font-semibold text-gray-900">{summary.pending || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Em Progresso</span>
                      <span className="font-semibold text-blue-600">{summary.in_progress || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Concluídas</span>
                      <span className="font-semibold text-green-600">{summary.completed || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Bloqueadas</span>
                      <span className="font-semibold text-red-600">{summary.blocked || 0}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Total: {(summary.pending || 0) + (summary.in_progress || 0) + (summary.completed || 0) + (summary.blocked || 0)} tarefas
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tasks List with Filters */}
          <TasksWidget showFilters={true} limit={50} />
        </div>
      </div>
    </div>
  );
}
