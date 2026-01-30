'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import DateFilter, { DateRange } from '@/components/DateFilter';
import {
    Clock,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    Zap,
    Target,
    Timer,
    Star,
    ArrowUp,
    ArrowDown,
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
}

interface CRTStats {
    issuesInPeriod: number;
    resolvedInPeriod: number;
    currentlyOpen: number;
    currentlyEscalated: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    avgSatisfaction: number;
    resolutionRate: number;
    topIssues: { category: string; count: number; open: number }[];
}

export default function CRTPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        label: 'Últimos 7 dias'
    });
    const [stats, setStats] = useState<CRTStats>({
        issuesInPeriod: 0,
        resolvedInPeriod: 0,
        currentlyOpen: 0,
        currentlyEscalated: 0,
        avgResponseTime: 0,
        avgResolutionTime: 0,
        avgSatisfaction: 0,
        resolutionRate: 0,
        topIssues: [],
    });
    const [openIssues, setOpenIssues] = useState<Issue[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const fetchCRTData = useCallback(async (range: DateRange) => {
        try {
            setLoadingData(true);

            // Fetch issues within date range
            const { data: issues } = await supabase
                .from('issues')
                .select('*')
                .gte('detected_at', range.startDate.toISOString())
                .lte('detected_at', range.endDate.toISOString());

            // Fetch all open issues (regardless of date)
            const { data: allOpenIssues } = await supabase
                .from('issues')
                .select('*')
                .in('status', ['open', 'in_progress', 'escalated'])
                .order('detected_at', { ascending: false })
                .limit(10);

            const issuesInPeriod = issues?.length || 0;
            const resolvedInPeriod = issues?.filter(i => i.status === 'resolved').length || 0;
            const currentlyOpen = allOpenIssues?.filter(i => i.status !== 'escalated').length || 0;
            const currentlyEscalated = allOpenIssues?.filter(i => i.status === 'escalated').length || 0;

            // Calculate avg response time
            const issuesWithResponse = issues?.filter(i => i.time_to_first_response) || [];
            const avgResponseTime = issuesWithResponse.length > 0
                ? issuesWithResponse.reduce((sum, i) => sum + (i.time_to_first_response || 0), 0) / issuesWithResponse.length
                : 0;

            // Calculate avg resolution time
            const issuesWithResolution = issues?.filter(i => i.time_to_resolution) || [];
            const avgResolutionTime = issuesWithResolution.length > 0
                ? issuesWithResolution.reduce((sum, i) => sum + (i.time_to_resolution || 0), 0) / issuesWithResolution.length
                : 0;

            // Calculate avg satisfaction
            const issuesWithSatisfaction = issues?.filter(i => i.customer_satisfaction) || [];
            const avgSatisfaction = issuesWithSatisfaction.length > 0
                ? issuesWithSatisfaction.reduce((sum, i) => sum + (i.customer_satisfaction || 0), 0) / issuesWithSatisfaction.length
                : 0;

            // Calculate resolution rate
            const resolutionRate = issuesInPeriod > 0 ? (resolvedInPeriod / issuesInPeriod) * 100 : 0;

            // Calculate top issues by issue_type
            const issueTypeCounts: Record<string, { count: number; open: number }> = {};

            issues?.forEach((i) => {
                const type = i.issue_type || 'sem_tipo';
                if (!issueTypeCounts[type]) {
                    issueTypeCounts[type] = { count: 0, open: 0 };
                }
                issueTypeCounts[type].count++;
                if (i.status !== 'resolved' && i.status !== 'closed') {
                    issueTypeCounts[type].open++;
                }
            });

            const topIssues = Object.keys(issueTypeCounts)
                .map((issue_type) => ({
                    category: issue_type,
                    count: issueTypeCounts[issue_type].count,
                    open: issueTypeCounts[issue_type].open
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            setStats({
                issuesInPeriod,
                resolvedInPeriod,
                currentlyOpen,
                currentlyEscalated,
                avgResponseTime,
                avgResolutionTime,
                avgSatisfaction,
                resolutionRate,
                topIssues,
            });

            setOpenIssues(allOpenIssues || []);
        } catch (error) {
            console.error('Failed to fetch CRT data:', error);
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchCRTData(dateRange);
        }
    }, [user, dateRange, fetchCRTData]);

    const handleDateChange = (range: DateRange) => {
        setDateRange(range);
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

    const formatMinutes = (minutes: number | null) => {
        if (!minutes) return '-';
        if (minutes < 60) return `${Math.round(minutes)}min`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}min`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 60) return `${diffMins}min atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        return date.toLocaleDateString('pt-BR');
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical':
                return 'bg-red-500/20 text-red-400 border border-red-500/30';
            case 'high':
                return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
            case 'medium':
                return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
            default:
                return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'resolved':
                return 'bg-accent-success/20 text-green-400 border border-green-500/30';
            case 'escalated':
                return 'bg-accent-error/20 text-red-400 border border-red-500/30';
            case 'in_progress':
                return 'bg-accent-primary/20 text-blue-400 border border-blue-500/30';
            default:
                return 'bg-bg-tertiary text-text-secondary border border-border-default';
        }
    };

    return (
        <div className="flex min-h-screen bg-bg-primary">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-text-primary">⏱️ Customer Resolution Time (CRT)</h1>
                            <p className="mt-2 text-text-secondary">
                                Dashboard focado em resolver problemas, não apenas monitorá-los
                            </p>
                        </div>
                        <DateFilter onDateChange={handleDateChange} />
                    </div>

                    {loadingData ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto"></div>
                                <p className="mt-4 text-text-secondary">Carregando métricas...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Key Metrics - Dark Cards with Accent Colors */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <div className="bg-bg-secondary border border-border-default p-6 rounded-xl hover:border-blue-500/50 transition-all duration-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-medium text-text-secondary">Tempo Médio de Resposta</h4>
                                        <div className="p-2 bg-blue-500/20 rounded-lg">
                                            <Timer className="h-5 w-5 text-blue-400" />
                                        </div>
                                    </div>
                                    <p className="text-3xl font-bold text-text-primary">
                                        {formatMinutes(stats.avgResponseTime)}
                                    </p>
                                    <p className="text-xs text-text-muted mt-1">{dateRange.label}</p>
                                    <div className="mt-4 flex items-center gap-2">
                                        {stats.avgResponseTime < 60 || stats.avgResponseTime === 0 ? (
                                            <>
                                                <ArrowDown className="h-4 w-4 text-accent-success" />
                                                <span className="text-xs text-accent-success">Meta: &lt;60min ✅</span>
                                            </>
                                        ) : (
                                            <>
                                                <ArrowUp className="h-4 w-4 text-accent-warning" />
                                                <span className="text-xs text-accent-warning">Meta: &lt;60min ⚠️</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-bg-secondary border border-border-default p-6 rounded-xl hover:border-green-500/50 transition-all duration-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-medium text-text-secondary">Tempo Médio de Resolução</h4>
                                        <div className="p-2 bg-green-500/20 rounded-lg">
                                            <CheckCircle className="h-5 w-5 text-green-400" />
                                        </div>
                                    </div>
                                    <p className="text-3xl font-bold text-text-primary">
                                        {formatMinutes(stats.avgResolutionTime)}
                                    </p>
                                    <p className="text-xs text-text-muted mt-1">{dateRange.label}</p>
                                    <div className="mt-4 flex items-center gap-2">
                                        {stats.avgResolutionTime < 240 || stats.avgResolutionTime === 0 ? (
                                            <>
                                                <ArrowDown className="h-4 w-4 text-accent-success" />
                                                <span className="text-xs text-accent-success">Meta: &lt;4h ✅</span>
                                            </>
                                        ) : (
                                            <>
                                                <ArrowUp className="h-4 w-4 text-accent-warning" />
                                                <span className="text-xs text-accent-warning">Meta: &lt;4h ⚠️</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-bg-secondary border border-border-default p-6 rounded-xl hover:border-purple-500/50 transition-all duration-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-medium text-text-secondary">Taxa de Resolução</h4>
                                        <div className="p-2 bg-purple-500/20 rounded-lg">
                                            <Target className="h-5 w-5 text-purple-400" />
                                        </div>
                                    </div>
                                    <p className="text-3xl font-bold text-text-primary">
                                        {Math.round(stats.resolutionRate)}%
                                    </p>
                                    <p className="text-xs text-text-muted mt-1">{dateRange.label}</p>
                                    <div className="mt-4 flex items-center gap-2">
                                        {stats.resolutionRate >= 90 ? (
                                            <>
                                                <TrendingUp className="h-4 w-4 text-accent-success" />
                                                <span className="text-xs text-accent-success">Meta: ≥90% ✅</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="h-4 w-4 text-accent-warning" />
                                                <span className="text-xs text-accent-warning">Meta: ≥90% ⚠️</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-bg-secondary border border-border-default p-6 rounded-xl hover:border-orange-500/50 transition-all duration-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-medium text-text-secondary">Satisfação do Cliente</h4>
                                        <div className="p-2 bg-orange-500/20 rounded-lg">
                                            <Star className="h-5 w-5 text-orange-400" />
                                        </div>
                                    </div>
                                    <p className="text-3xl font-bold text-text-primary">
                                        {stats.avgSatisfaction.toFixed(1)}/5
                                    </p>
                                    <p className="text-xs text-text-muted mt-1">{dateRange.label}</p>
                                    <div className="mt-4 flex items-center gap-2 text-orange-400">
                                        {'★'.repeat(Math.round(stats.avgSatisfaction))}
                                        <span className="text-text-muted">{'☆'.repeat(5 - Math.round(stats.avgSatisfaction))}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Period Performance - Compact Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-bg-secondary border border-border-default p-5 rounded-xl hover:bg-bg-hover transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-text-muted uppercase tracking-wider">Issues no Período</p>
                                            <p className="text-2xl font-bold text-text-primary mt-1">
                                                {stats.issuesInPeriod}
                                            </p>
                                        </div>
                                        <AlertTriangle className="h-10 w-10 text-orange-400/60" />
                                    </div>
                                </div>

                                <div className="bg-bg-secondary border border-border-default p-5 rounded-xl hover:bg-bg-hover transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-text-muted uppercase tracking-wider">Resolvidos no Período</p>
                                            <p className="text-2xl font-bold text-accent-success mt-1">
                                                {stats.resolvedInPeriod}
                                            </p>
                                        </div>
                                        <CheckCircle className="h-10 w-10 text-green-400/60" />
                                    </div>
                                </div>

                                <div className="bg-bg-secondary border border-border-default p-5 rounded-xl hover:bg-bg-hover transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-text-muted uppercase tracking-wider">Atualmente Abertos</p>
                                            <p className="text-2xl font-bold text-accent-primary mt-1">
                                                {stats.currentlyOpen}
                                            </p>
                                        </div>
                                        <Clock className="h-10 w-10 text-blue-400/60" />
                                    </div>
                                </div>

                                <div className="bg-bg-secondary border border-border-default p-5 rounded-xl hover:bg-bg-hover transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-text-muted uppercase tracking-wider">Escalados</p>
                                            <p className="text-2xl font-bold text-accent-error mt-1">
                                                {stats.currentlyEscalated}
                                            </p>
                                        </div>
                                        <Zap className="h-10 w-10 text-red-400/60" />
                                    </div>
                                </div>
                            </div>

                            {/* Top Issues and Goals */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                <div className="bg-bg-secondary border border-border-default p-6 rounded-xl">
                                    <h3 className="text-lg font-semibold text-text-primary mb-4">
                                        📊 Top Tipos de Problemas ({dateRange.label})
                                    </h3>
                                    {stats.topIssues.length > 0 ? (
                                        <div className="space-y-3">
                                            {stats.topIssues.map((issue, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-text-primary">{issue.category}</p>
                                                        <p className="text-sm text-text-muted">
                                                            {issue.count} ocorrências
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="px-2 py-1 text-xs font-medium bg-orange-500/20 text-orange-400 rounded-md">
                                                            {issue.open} abertos
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-text-muted text-center py-8">Nenhum issue registrado no período</p>
                                    )}
                                </div>

                                <div className="bg-bg-secondary border border-border-default p-6 rounded-xl">
                                    <h3 className="text-lg font-semibold text-text-primary mb-4">
                                        🎯 Metas vs Realidade
                                    </h3>
                                    <div className="space-y-5">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm text-text-secondary">Tempo de Resposta</span>
                                                <span className="text-sm font-medium text-text-primary">
                                                    {formatMinutes(stats.avgResponseTime)} / 60min
                                                </span>
                                            </div>
                                            <div className="w-full bg-bg-tertiary rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-500 ${stats.avgResponseTime <= 60 || stats.avgResponseTime === 0
                                                        ? 'bg-accent-success'
                                                        : 'bg-accent-error'
                                                        }`}
                                                    style={{
                                                        width: `${Math.min((stats.avgResponseTime / 60) * 100, 100)}%`,
                                                    }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm text-text-secondary">Tempo de Resolução</span>
                                                <span className="text-sm font-medium text-text-primary">
                                                    {formatMinutes(stats.avgResolutionTime)} / 4h
                                                </span>
                                            </div>
                                            <div className="w-full bg-bg-tertiary rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-500 ${stats.avgResolutionTime <= 240 || stats.avgResolutionTime === 0
                                                        ? 'bg-accent-success'
                                                        : 'bg-accent-error'
                                                        }`}
                                                    style={{
                                                        width: `${Math.min((stats.avgResolutionTime / 240) * 100, 100)}%`,
                                                    }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm text-text-secondary">Taxa de Resolução</span>
                                                <span className="text-sm font-medium text-text-primary">
                                                    {Math.round(stats.resolutionRate)}% / 90%
                                                </span>
                                            </div>
                                            <div className="w-full bg-bg-tertiary rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-500 ${stats.resolutionRate >= 90 ? 'bg-accent-success' : 'bg-accent-warning'
                                                        }`}
                                                    style={{
                                                        width: `${Math.min(stats.resolutionRate, 100)}%`,
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Open Issues Table */}
                            <div className="bg-bg-secondary border border-border-default rounded-xl">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-text-primary">
                                            🚨 Issues Abertos - Ação Necessária
                                        </h3>
                                        <Link
                                            href="/issues"
                                            className="text-sm text-accent-primary hover:text-blue-400 font-medium transition-colors"
                                        >
                                            Ver todos →
                                        </Link>
                                    </div>

                                    {openIssues.length === 0 ? (
                                        <div className="text-center py-8">
                                            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-accent-success" />
                                            <p className="text-text-primary">Nenhum issue aberto!</p>
                                            <p className="text-sm text-text-muted mt-1">Todos os problemas foram resolvidos 🎉</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {openIssues.map((issue) => (
                                                <div
                                                    key={issue.id}
                                                    className="flex items-start gap-4 p-4 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors border border-transparent hover:border-border-hover"
                                                >
                                                    <div
                                                        className={`p-2 rounded-lg ${issue.priority === 'critical'
                                                            ? 'bg-red-500/20'
                                                            : issue.priority === 'high'
                                                                ? 'bg-orange-500/20'
                                                                : 'bg-yellow-500/20'
                                                            }`}
                                                    >
                                                        <AlertTriangle
                                                            className={`h-5 w-5 ${issue.priority === 'critical'
                                                                ? 'text-red-400'
                                                                : issue.priority === 'high'
                                                                    ? 'text-orange-400'
                                                                    : 'text-yellow-400'
                                                                }`}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <p className="font-medium text-text-primary">{issue.issue_type}</p>
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                                                                {issue.priority}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(issue.status)}`}>
                                                                {issue.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-text-secondary">
                                                            Cliente: {issue.customer_name || 'N/A'}
                                                            {issue.assigned_to && ` • Atribuído: ${issue.assigned_to}`}
                                                        </p>
                                                        <p className="text-xs text-text-muted mt-1">
                                                            Detectado: {formatDate(issue.detected_at)}
                                                            {issue.time_to_resolution && ` • Resolução: ${formatMinutes(issue.time_to_resolution)}`}
                                                        </p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <Clock className="h-5 w-5 text-text-muted ml-auto" />
                                                        <p className="text-xs text-text-muted mt-1">
                                                            {formatDate(issue.detected_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
