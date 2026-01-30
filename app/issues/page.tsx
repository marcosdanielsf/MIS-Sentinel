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
    Zap,
    Target,
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
            <div className="flex items-center justify-center min-h-screen bg-bg-primary">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto"></div>
                    <p className="mt-4 text-text-secondary">Carregando...</p>
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

    const getPriorityConfig = (priority: string) => {
        switch (priority) {
            case 'critical':
                return {
                    bg: 'bg-red-500/20',
                    border: 'border-red-500/50',
                    text: 'text-red-400',
                    glow: 'shadow-red-500/20'
                };
            case 'high':
                return {
                    bg: 'bg-orange-500/20',
                    border: 'border-orange-500/50',
                    text: 'text-orange-400',
                    glow: 'shadow-orange-500/20'
                };
            case 'medium':
                return {
                    bg: 'bg-amber-500/20',
                    border: 'border-amber-500/50',
                    text: 'text-amber-400',
                    glow: 'shadow-amber-500/20'
                };
            default:
                return {
                    bg: 'bg-blue-500/20',
                    border: 'border-blue-500/50',
                    text: 'text-blue-400',
                    glow: 'shadow-blue-500/20'
                };
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'resolved':
                return {
                    bg: 'bg-accent-success/20',
                    text: 'text-accent-success',
                    icon: CheckCircle
                };
            case 'escalated':
                return {
                    bg: 'bg-accent-error/20',
                    text: 'text-accent-error',
                    icon: AlertTriangle
                };
            case 'in_progress':
                return {
                    bg: 'bg-accent-primary/20',
                    text: 'text-accent-primary',
                    icon: Zap
                };
            case 'closed':
                return {
                    bg: 'bg-bg-tertiary',
                    text: 'text-text-muted',
                    icon: X
                };
            default:
                return {
                    bg: 'bg-accent-warning/20',
                    text: 'text-accent-warning',
                    icon: Clock
                };
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            open: 'Aberto',
            in_progress: 'Em Progresso',
            escalated: 'Escalado',
            resolved: 'Resolvido',
            closed: 'Fechado'
        };
        return labels[status] || status;
    };

    const getPriorityLabel = (priority: string) => {
        const labels: Record<string, string> = {
            critical: 'Crítica',
            high: 'Alta',
            medium: 'Média',
            low: 'Baixa'
        };
        return labels[priority] || priority;
    };

    return (
        <div className="flex min-h-screen bg-bg-primary">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-accent-primary/20 rounded-lg">
                                    <Target className="h-6 w-6 text-accent-primary" />
                                </div>
                                <h1 className="text-3xl font-bold text-text-primary">
                                    Gerenciamento de Issues
                                </h1>
                            </div>
                            <p className="text-text-secondary">
                                Rastreie e resolva problemas identificados pelo MIS SENTINEL
                            </p>
                        </div>
                        <DateFilter onDateChange={handleDateChange} />
                    </div>

                    {/* Search and Filters */}
                    <div className="bg-bg-secondary border border-border-default rounded-xl p-6 mb-6">
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="Buscar por tipo, cliente ou telefone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors"
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
                                <label className="block text-sm font-medium text-text-secondary mb-2">Prioridade</label>
                                <select
                                    value={filterPriority}
                                    onChange={(e) => setFilterPriority(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors"
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
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-text-primary">
                                    Issues no Período
                                </h2>
                                <span className="px-3 py-1 bg-bg-tertiary rounded-full text-sm text-text-secondary">
                                    {filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'}
                                </span>
                            </div>

                            {loadingIssues ? (
                                <div className="bg-bg-secondary border border-border-default rounded-xl p-12 text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto"></div>
                                    <p className="mt-4 text-text-secondary">Carregando issues...</p>
                                </div>
                            ) : filteredIssues.length === 0 ? (
                                <div className="bg-bg-secondary border border-border-default rounded-xl p-12 text-center">
                                    <div className="p-4 bg-accent-success/20 rounded-full w-fit mx-auto mb-4">
                                        <CheckCircle className="h-12 w-12 text-accent-success" />
                                    </div>
                                    <p className="text-text-primary font-semibold text-lg">Nenhum issue encontrado</p>
                                    <p className="text-text-muted mt-2">Ajuste os filtros ou período de busca</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredIssues.map((issue) => {
                                        const priorityConfig = getPriorityConfig(issue.priority);
                                        const statusConfig = getStatusConfig(issue.status);
                                        const StatusIcon = statusConfig.icon;

                                        return (
                                            <div
                                                key={issue.id}
                                                onClick={() => handleSelectIssue(issue)}
                                                className={`bg-bg-secondary border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:bg-bg-hover ${
                                                    selectedIssue?.id === issue.id
                                                        ? 'border-accent-primary ring-1 ring-accent-primary'
                                                        : `border-l-4 ${priorityConfig.border} border-border-default`
                                                }`}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                            <h3 className="font-semibold text-text-primary">{issue.issue_type}</h3>
                                                            <span
                                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                                                            >
                                                                <StatusIcon className="h-3 w-3" />
                                                                {getStatusLabel(issue.status)}
                                                            </span>
                                                        </div>
                                                        {issue.customer_name && (
                                                            <p className="text-sm text-text-secondary flex items-center gap-2">
                                                                <User className="h-4 w-4 text-text-muted" />
                                                                {issue.customer_name}
                                                            </p>
                                                        )}
                                                        {issue.customer_phone && (
                                                            <p className="text-sm text-text-muted flex items-center gap-2 mt-1">
                                                                <Phone className="h-4 w-4" />
                                                                {issue.customer_phone}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <span
                                                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${priorityConfig.bg} ${priorityConfig.text} border ${priorityConfig.border}`}
                                                        >
                                                            {getPriorityLabel(issue.priority)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border-default">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDate(issue.detected_at)}
                                                    </div>
                                                    {issue.time_to_resolution && (
                                                        <div className="flex items-center gap-1 text-accent-success font-medium">
                                                            <CheckCircle className="h-3 w-3" />
                                                            {formatMinutes(issue.time_to_resolution)}
                                                        </div>
                                                    )}
                                                </div>

                                                {issue.assigned_to && (
                                                    <div className="mt-2 pt-2 border-t border-border-default">
                                                        <span className="text-xs text-text-muted">
                                                            Atribuído: <span className="text-accent-primary">{issue.assigned_to}</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Issue Details */}
                        <div className="sticky top-8">
                            {selectedIssue ? (
                                <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-semibold text-text-primary">Detalhes do Issue</h2>
                                        <button
                                            onClick={() => setSelectedIssue(null)}
                                            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Tipo do Issue</label>
                                            <p className="text-text-primary mt-1 font-medium">{selectedIssue.issue_type}</p>
                                        </div>

                                        {selectedIssue.customer_phone && (
                                            <div>
                                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Telefone</label>
                                                <p className="text-text-primary mt-1 font-mono">{selectedIssue.customer_phone}</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Status</label>
                                                <select
                                                    value={selectedIssue.status}
                                                    onChange={(e) => handleUpdateStatus(selectedIssue.id, e.target.value)}
                                                    className="w-full mt-1 px-3 py-2.5 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors"
                                                >
                                                    <option value="open">Aberto</option>
                                                    <option value="in_progress">Em Progresso</option>
                                                    <option value="escalated">Escalado</option>
                                                    <option value="resolved">Resolvido</option>
                                                    <option value="closed">Fechado</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Prioridade</label>
                                                {(() => {
                                                    const config = getPriorityConfig(selectedIssue.priority);
                                                    return (
                                                        <p className={`mt-1 px-3 py-2.5 rounded-lg text-center font-medium ${config.bg} ${config.text} border ${config.border}`}>
                                                            {getPriorityLabel(selectedIssue.priority)}
                                                        </p>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {selectedIssue.customer_name && (
                                            <div>
                                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Cliente</label>
                                                <p className="text-text-primary mt-1">{selectedIssue.customer_name}</p>
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Detectado em</label>
                                            <p className="text-text-primary mt-1">{formatDate(selectedIssue.detected_at)}</p>
                                        </div>

                                        {selectedIssue.first_response_at && (
                                            <div>
                                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                                    Primeira Resposta
                                                </label>
                                                <p className="text-text-primary mt-1">
                                                    {formatDate(selectedIssue.first_response_at)}
                                                </p>
                                            </div>
                                        )}

                                        {selectedIssue.time_to_first_response && (
                                            <div>
                                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                                    Tempo até Primeira Resposta
                                                </label>
                                                <p className="text-accent-primary mt-1 font-medium">
                                                    {formatMinutes(selectedIssue.time_to_first_response)}
                                                </p>
                                            </div>
                                        )}

                                        {/* Assign */}
                                        {selectedIssue.status !== 'resolved' && (
                                            <div className="pt-4 border-t border-border-default">
                                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Atribuir para</label>
                                                <div className="flex gap-2 mt-2">
                                                    <input
                                                        type="text"
                                                        value={assignTo}
                                                        onChange={(e) => setAssignTo(e.target.value)}
                                                        placeholder="Nome do responsável"
                                                        className="flex-1 px-3 py-2.5 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors"
                                                    />
                                                    <button
                                                        onClick={handleAssign}
                                                        className="px-4 py-2.5 bg-accent-primary text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
                                                    >
                                                        Atribuir
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Add Action */}
                                        {selectedIssue.status !== 'resolved' && (
                                            <div>
                                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                                    Adicionar Ação
                                                </label>
                                                <div className="flex gap-2 mt-2">
                                                    <input
                                                        type="text"
                                                        value={newActionDescription}
                                                        onChange={(e) => setNewActionDescription(e.target.value)}
                                                        placeholder="Descreva a ação tomada..."
                                                        className="flex-1 px-3 py-2.5 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors"
                                                    />
                                                    <button
                                                        onClick={handleAddAction}
                                                        className="px-4 py-2.5 bg-bg-tertiary border border-border-default text-text-primary rounded-lg hover:bg-bg-hover hover:border-border-hover font-medium transition-colors"
                                                    >
                                                        Adicionar
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions History */}
                                        <div className="pt-4 border-t border-border-default">
                                            <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3 block">
                                                Histórico de Ações
                                            </label>
                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                {issueActions.length === 0 ? (
                                                    <p className="text-sm text-text-muted italic py-4 text-center">Nenhuma ação registrada</p>
                                                ) : (
                                                    issueActions.map((action) => (
                                                        <div
                                                            key={action.id}
                                                            className="p-3 bg-bg-tertiary rounded-lg border border-border-default"
                                                        >
                                                            <p className="text-sm text-text-primary">{action.action_description}</p>
                                                            <p className="text-xs text-text-muted mt-2">
                                                                <span className="text-accent-primary">{action.taken_by}</span> • {formatDate(action.taken_at)}
                                                            </p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Resolve Issue */}
                                        {selectedIssue.status !== 'resolved' && (
                                            <div className="pt-4 border-t border-border-default">
                                                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                                                    <CheckCircle className="h-5 w-5 text-accent-success" />
                                                    Resolver Issue
                                                </h3>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                                            Notas de Resolução
                                                        </label>
                                                        <textarea
                                                            value={resolveNotes}
                                                            onChange={(e) => setResolveNotes(e.target.value)}
                                                            placeholder="Como o problema foi resolvido?"
                                                            className="w-full mt-2 px-3 py-2.5 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors resize-none"
                                                            rows={3}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                                            Satisfação do Cliente (1-5)
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="5"
                                                            value={satisfaction}
                                                            onChange={(e) => setSatisfaction(Number(e.target.value))}
                                                            className="w-full mt-2 accent-accent-primary"
                                                        />
                                                        <div className="flex justify-between text-xs text-text-muted mt-1">
                                                            <span>1 ⭐</span>
                                                            <span className="font-semibold text-accent-warning">{satisfaction} ⭐</span>
                                                            <span>5 ⭐</span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={handleResolve}
                                                        className="w-full px-4 py-3 bg-accent-success text-white rounded-lg hover:bg-green-600 font-semibold flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        <CheckCircle className="h-5 w-5" />
                                                        Marcar como Resolvido
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {selectedIssue.status === 'resolved' && (
                                            <div className="bg-accent-success/10 border border-accent-success/30 rounded-xl p-4">
                                                <div className="flex items-center gap-2 text-accent-success font-semibold mb-3">
                                                    <CheckCircle className="h-5 w-5" />
                                                    Issue Resolvido
                                                </div>
                                                {selectedIssue.resolution_notes && (
                                                    <p className="text-sm text-text-secondary mb-2">
                                                        {selectedIssue.resolution_notes}
                                                    </p>
                                                )}
                                                {selectedIssue.time_to_resolution && (
                                                    <p className="text-sm text-text-muted">
                                                        Tempo de resolução: <span className="text-accent-primary font-medium">{formatMinutes(selectedIssue.time_to_resolution)}</span>
                                                    </p>
                                                )}
                                                {selectedIssue.customer_satisfaction && (
                                                    <p className="text-sm text-text-muted mt-1">
                                                        Satisfação: <span className="text-accent-warning">{'★'.repeat(selectedIssue.customer_satisfaction)}{'☆'.repeat(5 - selectedIssue.customer_satisfaction)}</span>
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-bg-secondary border border-border-default rounded-xl p-12 text-center">
                                    <div className="p-4 bg-bg-tertiary rounded-full w-fit mx-auto mb-4">
                                        <MessageSquare className="h-12 w-12 text-text-muted" />
                                    </div>
                                    <p className="text-text-muted">Selecione um issue para ver os detalhes</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
