'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import DateFilter, { DateRange } from '@/components/DateFilter';
import {
    Clock,
    CheckCircle,
    AlertTriangle,
    User,
    Phone,
    MessageSquare,
    X,
    Search,
} from 'lucide-react';

interface Issue {
    id: string;
    alert_id: string | null;
    issue_type: string;
    customer_name: string | null;
    customer_phone: string | null;
    detected_at: string;
    first_response_at: string | null;
    resolved_at: string | null;
    status: string;
    priority: string;
    assigned_to: string | null;
    escalated_to: string | null;
    escalated_at: string | null;
    resolution_notes: string | null;
    customer_satisfaction: number | null;
    time_to_first_response: number | null;
    time_to_resolution: number | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

interface IssueAction {
    id: string;
    issue_id: string;
    action_type: string;
    action_description: string;
    taken_by: string;
    taken_at: string;
    success: boolean;
    customer_response: string | null;
}

export default function IssuesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        label: 'Últimos 7 dias'
    });
    const [issues, setIssues] = useState<Issue[]>([]);
    const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]);
    const [loadingIssues, setLoadingIssues] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
    const [issueActions, setIssueActions] = useState<IssueAction[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');

    // Form states
    const [resolveNotes, setResolveNotes] = useState('');
    const [satisfaction, setSatisfaction] = useState(5);
    const [assignTo, setAssignTo] = useState('');
    const [newActionDescription, setNewActionDescription] = useState('');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const fetchIssues = useCallback(async (range: DateRange) => {
        try {
            setLoadingIssues(true);
            const { data, error } = await supabase
                .from('issues')
                .select('*')
                .gte('detected_at', range.startDate.toISOString())
                .lte('detected_at', range.endDate.toISOString())
                .order('detected_at', { ascending: false });

            if (error) {
                console.error('Error fetching issues:', error);
                setIssues([]);
            } else {
                setIssues(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch issues:', error);
            setIssues([]);
        } finally {
            setLoadingIssues(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchIssues(dateRange);
        }
    }, [user, dateRange, fetchIssues]);

    useEffect(() => {
        let filtered = issues;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(
                (issue) =>
                    issue.issue_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    issue.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    issue.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter((issue) => issue.status === filterStatus);
        }

        // Priority filter
        if (filterPriority !== 'all') {
            filtered = filtered.filter((issue) => issue.priority === filterPriority);
        }

        setFilteredIssues(filtered);
    }, [searchTerm, filterStatus, filterPriority, issues]);

    const handleDateChange = (range: DateRange) => {
        setDateRange(range);
    };

    const fetchIssueActions = async (issueId: string) => {
        try {
            const { data } = await supabase
                .from('issue_actions')
                .select('*')
                .eq('issue_id', issueId)
                .order('taken_at', { ascending: false });

            setIssueActions(data || []);
        } catch (error) {
            console.error('Failed to fetch issue actions:', error);
        }
    };

    const handleSelectIssue = (issue: Issue) => {
        setSelectedIssue(issue);
        setResolveNotes(issue.resolution_notes || '');
        setSatisfaction(issue.customer_satisfaction || 5);
        setAssignTo(issue.assigned_to || '');
        fetchIssueActions(issue.id);
    };

    const handleUpdateStatus = async (issueId: string, newStatus: string) => {
        try {
            const updates: Record<string, string> = { status: newStatus };

            if (newStatus === 'resolved') {
                updates.resolved_at = new Date().toISOString();
            }

            await supabase.from('issues').update(updates).eq('id', issueId);

            // Refresh
            fetchIssues(dateRange);
            if (selectedIssue?.id === issueId) {
                setSelectedIssue({ ...selectedIssue, ...updates });
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleResolve = async () => {
        if (!selectedIssue) return;

        try {
            await supabase
                .from('issues')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString(),
                    resolution_notes: resolveNotes,
                    customer_satisfaction: satisfaction,
                })
                .eq('id', selectedIssue.id);

            // Add action
            await supabase.from('issue_actions').insert({
                issue_id: selectedIssue.id,
                action_type: 'resolved',
                action_description: `Issue resolvido: ${resolveNotes}`,
                taken_by: user?.username || 'Unknown',
            });

            alert('Issue resolvido com sucesso!');
            fetchIssues(dateRange);
            setSelectedIssue(null);
        } catch (error) {
            console.error('Failed to resolve issue:', error);
            alert('Erro ao resolver issue');
        }
    };

    const handleAssign = async () => {
        if (!selectedIssue || !assignTo) return;

        try {
            await supabase
                .from('issues')
                .update({
                    assigned_to: assignTo,
                    status: 'in_progress',
                })
                .eq('id', selectedIssue.id);

            // Add action
            await supabase.from('issue_actions').insert({
                issue_id: selectedIssue.id,
                action_type: 'assigned',
                action_description: `Issue atribuído para ${assignTo}`,
                taken_by: user?.username || 'Unknown',
            });

            alert('Issue atribuído com sucesso!');
            fetchIssues(dateRange);
            fetchIssueActions(selectedIssue.id);
        } catch (error) {
            console.error('Failed to assign issue:', error);
            alert('Erro ao atribuir issue');
        }
    };

    const handleAddAction = async () => {
        if (!selectedIssue || !newActionDescription) return;

        try {
            await supabase.from('issue_actions').insert({
                issue_id: selectedIssue.id,
                action_type: 'manual_action',
                action_description: newActionDescription,
                taken_by: user?.username || 'Unknown',
            });

            // Update status if still open
            if (selectedIssue.status === 'open') {
                await supabase
                    .from('issues')
                    .update({
                        status: 'in_progress',
                    })
                    .eq('id', selectedIssue.id);
            }

            setNewActionDescription('');
            fetchIssueActions(selectedIssue.id);
            fetchIssues(dateRange);
        } catch (error) {
            console.error('Failed to add action:', error);
            alert('Erro ao adicionar ação');
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
        return date.toLocaleString('pt-BR');
    };

    const formatMinutes = (minutes: number | null) => {
        if (!minutes) return '-';
        if (minutes < 60) return `${Math.round(minutes)}min`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}min`;
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default:
                return 'bg-blue-100 text-blue-800 border-blue-300';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'resolved':
                return 'bg-green-100 text-green-800';
            case 'escalated':
                return 'bg-red-100 text-red-800';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">🎯 Gerenciamento de Issues</h1>
                            <p className="mt-2 text-gray-600">
                                Rastreie e resolva problemas identificados pelo MIS SENTINEL
                            </p>
                        </div>
                        <DateFilter onDateChange={handleDateChange} />
                    </div>

                    {/* Search and Filters */}
                    <div className="bg-white p-6 rounded-lg shadow mb-6">
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por tipo, cliente ou telefone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">Todos</option>
                                    <option value="open">Abertos</option>
                                    <option value="in_progress">Em Progresso</option>
                                    <option value="escalated">Escalados</option>
                                    <option value="resolved">Resolvidos</option>
                                    <option value="closed">Fechados</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                                <select
                                    value={filterPriority}
                                    onChange={(e) => setFilterPriority(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">Todas</option>
                                    <option value="critical">Crítica</option>
                                    <option value="high">Alta</option>
                                    <option value="medium">Média</option>
                                    <option value="low">Baixa</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Issues Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Issues List */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Issues no Período ({filteredIssues.length})
                            </h2>

                            {loadingIssues ? (
                                <div className="bg-white p-12 rounded-lg shadow text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600">Carregando issues...</p>
                                </div>
                            ) : filteredIssues.length === 0 ? (
                                <div className="bg-white p-12 rounded-lg shadow text-center">
                                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                    <p className="text-gray-900 font-semibold text-lg">Nenhum issue encontrado</p>
                                    <p className="text-gray-500 mt-2">Ajuste os filtros ou período de busca</p>
                                </div>
                            ) : (
                                filteredIssues.map((issue) => (
                                    <div
                                        key={issue.id}
                                        onClick={() => handleSelectIssue(issue)}
                                        className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${selectedIssue?.id === issue.id ? 'ring-2 ring-indigo-500' : ''
                                            } ${getPriorityColor(issue.priority)}`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-semibold text-gray-900">{issue.issue_type}</h3>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(issue.status)}`}
                                                    >
                                                        {issue.status}
                                                    </span>
                                                </div>
                                                {issue.customer_name && (
                                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                                        <User className="h-4 w-4" />
                                                        {issue.customer_name}
                                                    </p>
                                                )}
                                                {issue.customer_phone && (
                                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                                        <Phone className="h-4 w-4" />
                                                        {issue.customer_phone}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(issue.priority)}`}
                                                >
                                                    {issue.priority}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(issue.detected_at)}
                                            </div>
                                            {issue.time_to_resolution && (
                                                <div className="flex items-center gap-1 text-green-600 font-semibold">
                                                    <CheckCircle className="h-3 w-3" />
                                                    {formatMinutes(issue.time_to_resolution)}
                                                </div>
                                            )}
                                        </div>

                                        {issue.assigned_to && (
                                            <div className="mt-2 text-xs text-gray-600">
                                                Atribuído: {issue.assigned_to}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Issue Details */}
                        <div className="sticky top-8">
                            {selectedIssue ? (
                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-semibold text-gray-900">Detalhes do Issue</h2>
                                        <button
                                            onClick={() => setSelectedIssue(null)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="h-6 w-6" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Tipo do Issue</label>
                                            <p className="text-gray-900">{selectedIssue.issue_type}</p>
                                        </div>

                                        {selectedIssue.customer_phone && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Telefone</label>
                                                <p className="text-gray-900">{selectedIssue.customer_phone}</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Status</label>
                                                <select
                                                    value={selectedIssue.status}
                                                    onChange={(e) => handleUpdateStatus(selectedIssue.id, e.target.value)}
                                                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="open">Aberto</option>
                                                    <option value="in_progress">Em Progresso</option>
                                                    <option value="escalated">Escalado</option>
                                                    <option value="resolved">Resolvido</option>
                                                    <option value="closed">Fechado</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Prioridade</label>
                                                <p className={`mt-1 px-3 py-2 rounded ${getPriorityColor(selectedIssue.priority)}`}>
                                                    {selectedIssue.priority}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedIssue.customer_name && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Cliente</label>
                                                <p className="text-gray-900">{selectedIssue.customer_name}</p>
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Detectado em</label>
                                            <p className="text-gray-900">{formatDate(selectedIssue.detected_at)}</p>
                                        </div>

                                        {selectedIssue.first_response_at && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">
                                                    Primeira Resposta
                                                </label>
                                                <p className="text-gray-900">
                                                    {formatDate(selectedIssue.first_response_at)}
                                                </p>
                                            </div>
                                        )}

                                        {selectedIssue.time_to_first_response && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">
                                                    Tempo até Primeira Resposta
                                                </label>
                                                <p className="text-gray-900">
                                                    {formatMinutes(selectedIssue.time_to_first_response)}
                                                </p>
                                            </div>
                                        )}

                                        {/* Assign */}
                                        {selectedIssue.status !== 'resolved' && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Atribuir para</label>
                                                <div className="flex gap-2 mt-1">
                                                    <input
                                                        type="text"
                                                        value={assignTo}
                                                        onChange={(e) => setAssignTo(e.target.value)}
                                                        placeholder="Nome do responsável"
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                    <button
                                                        onClick={handleAssign}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                    >
                                                        Atribuir
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Add Action */}
                                        {selectedIssue.status !== 'resolved' && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">
                                                    Adicionar Ação
                                                </label>
                                                <div className="flex gap-2 mt-1">
                                                    <input
                                                        type="text"
                                                        value={newActionDescription}
                                                        onChange={(e) => setNewActionDescription(e.target.value)}
                                                        placeholder="Descreva a ação tomada..."
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                    <button
                                                        onClick={handleAddAction}
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                                    >
                                                        Adicionar
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions History */}
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                                Histórico de Ações
                                            </label>
                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                {issueActions.length === 0 ? (
                                                    <p className="text-sm text-gray-500 italic">Nenhuma ação registrada</p>
                                                ) : (
                                                    issueActions.map((action) => (
                                                        <div
                                                            key={action.id}
                                                            className="p-3 bg-gray-50 rounded border border-gray-200"
                                                        >
                                                            <p className="text-sm text-gray-900">{action.action_description}</p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {action.taken_by} • {formatDate(action.taken_at)}
                                                            </p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Resolve Issue */}
                                        {selectedIssue.status !== 'resolved' && (
                                            <div className="border-t pt-4">
                                                <h3 className="font-semibold text-gray-900 mb-3">Resolver Issue</h3>

                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-700">
                                                            Notas de Resolução
                                                        </label>
                                                        <textarea
                                                            value={resolveNotes}
                                                            onChange={(e) => setResolveNotes(e.target.value)}
                                                            placeholder="Como o problema foi resolvido?"
                                                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            rows={3}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-sm font-medium text-gray-700">
                                                            Satisfação do Cliente (1-5)
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="5"
                                                            value={satisfaction}
                                                            onChange={(e) => setSatisfaction(Number(e.target.value))}
                                                            className="w-full mt-1"
                                                        />
                                                        <div className="flex justify-between text-xs text-gray-600">
                                                            <span>1 ⭐</span>
                                                            <span className="font-semibold">{satisfaction} ⭐</span>
                                                            <span>5 ⭐</span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={handleResolve}
                                                        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle className="h-5 w-5" />
                                                        Marcar como Resolvido
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {selectedIssue.status === 'resolved' && (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                                                    <CheckCircle className="h-5 w-5" />
                                                    Issue Resolvido
                                                </div>
                                                {selectedIssue.resolution_notes && (
                                                    <p className="text-sm text-gray-700 mb-2">
                                                        {selectedIssue.resolution_notes}
                                                    </p>
                                                )}
                                                {selectedIssue.time_to_resolution && (
                                                    <p className="text-sm text-gray-600">
                                                        Tempo de resolução: {formatMinutes(selectedIssue.time_to_resolution)}
                                                    </p>
                                                )}
                                                {selectedIssue.customer_satisfaction && (
                                                    <p className="text-sm text-gray-600">
                                                        Satisfação: {'★'.repeat(selectedIssue.customer_satisfaction)}{'☆'.repeat(5 - selectedIssue.customer_satisfaction)}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow p-12 text-center">
                                    <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500">Selecione um issue para ver os detalhes</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
