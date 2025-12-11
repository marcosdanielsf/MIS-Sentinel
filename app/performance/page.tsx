'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { TrendingUp, Clock, CheckCircle, Zap, AlertTriangle, Activity, Target } from 'lucide-react';

interface PerformanceMetrics {
    ttfr_avg: number; // Time to First Response (minutes)
    ttr_avg: number; // Time to Resolution (hours)
    automation_rate: number; // Percentage
    ai_accuracy: number; // Percentage
    total_issues_24h: number;
    resolved_issues_24h: number;
    auto_resolved_24h: number;
    critical_issues_pending: number;
}

interface TimeSeriesData {
    hour: string;
    issues_created: number;
    issues_resolved: number;
    avg_ttfr: number;
}

export default function PerformancePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
    const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
    const [loadingMetrics, setLoadingMetrics] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchMetrics();
            // Auto-refresh every 30 seconds
            const interval = setInterval(() => {
                fetchMetrics();
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchMetrics = async () => {
        try {
            // Fetch last 24 hours of data
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            // Get all issues from last 24h
            const { data: issues, error: issuesError } = await supabase
                .from('issues')
                .select('*')
                .gte('detected_at', twentyFourHoursAgo)
                .order('detected_at', { ascending: false });

            if (issuesError) throw issuesError;

            // Get all actions from last 24h
            const { data: actions, error: actionsError } = await supabase
                .from('issue_actions')
                .select('*')
                .gte('action_timestamp', twentyFourHoursAgo);

            if (actionsError) throw actionsError;

            // Calculate metrics
            const totalIssues = issues?.length || 0;
            const resolvedIssues = issues?.filter(i => i.resolved_at)?.length || 0;
            const autoResolved = issues?.filter(i => i.resolved_by?.includes('SYSTEM_AUTO'))?.length || 0;

            // Calculate TTFR (Time to First Response) in minutes
            const issuesWithResponse = issues?.filter(i => i.first_response_at) || [];
            const ttfrValues = issuesWithResponse.map(i => {
                const detected = new Date(i.detected_at).getTime();
                const responded = new Date(i.first_response_at).getTime();
                return (responded - detected) / (1000 * 60); // minutes
            });
            const avgTTFR = ttfrValues.length > 0
                ? ttfrValues.reduce((a, b) => a + b, 0) / ttfrValues.length
                : 0;

            // Calculate TTR (Time to Resolution) in hours
            const resolvedWithTime = issues?.filter(i => i.resolved_at) || [];
            const ttrValues = resolvedWithTime.map(i => {
                const detected = new Date(i.detected_at).getTime();
                const resolved = new Date(i.resolved_at).getTime();
                return (resolved - detected) / (1000 * 60 * 60); // hours
            });
            const avgTTR = ttrValues.length > 0
                ? ttrValues.reduce((a, b) => a + b, 0) / ttrValues.length
                : 0;

            // Calculate automation rate
            const automatedActions = actions?.filter(a => a.taken_by?.includes('SYSTEM'))?.length || 0;
            const totalActions = actions?.length || 0;
            const automationRate = totalActions > 0 ? (automatedActions / totalActions) * 100 : 0;

            // Calculate AI accuracy (based on customer satisfaction >= 4)
            const satisfactionScores = resolvedWithTime
                .filter(i => i.customer_satisfaction !== null)
                .map(i => i.customer_satisfaction);
            const highSatisfaction = satisfactionScores.filter(s => s >= 4).length;
            const aiAccuracy = satisfactionScores.length > 0
                ? (highSatisfaction / satisfactionScores.length) * 100
                : 0;

            // Critical issues pending
            const criticalPending = issues?.filter(
                i => i.priority === 'critical' && !i.resolved_at
            )?.length || 0;

            setMetrics({
                ttfr_avg: avgTTFR,
                ttr_avg: avgTTR,
                automation_rate: automationRate,
                ai_accuracy: aiAccuracy,
                total_issues_24h: totalIssues,
                resolved_issues_24h: resolvedIssues,
                auto_resolved_24h: autoResolved,
                critical_issues_pending: criticalPending,
            });

            // Generate time series data (last 12 hours, hourly)
            const timeSeriesData: TimeSeriesData[] = [];
            for (let i = 11; i >= 0; i--) {
                const hourStart = new Date(Date.now() - i * 60 * 60 * 1000);
                const hourEnd = new Date(Date.now() - (i - 1) * 60 * 60 * 1000);

                const issuesInHour = issues?.filter(issue => {
                    const detected = new Date(issue.detected_at);
                    return detected >= hourStart && detected < hourEnd;
                }) || [];

                const resolvedInHour = issues?.filter(issue => {
                    if (!issue.resolved_at) return false;
                    const resolved = new Date(issue.resolved_at);
                    return resolved >= hourStart && resolved < hourEnd;
                }) || [];

                const ttfrInHour = issuesInHour
                    .filter(i => i.first_response_at)
                    .map(i => {
                        const detected = new Date(i.detected_at).getTime();
                        const responded = new Date(i.first_response_at).getTime();
                        return (responded - detected) / (1000 * 60);
                    });

                const avgTTFRInHour = ttfrInHour.length > 0
                    ? ttfrInHour.reduce((a, b) => a + b, 0) / ttfrInHour.length
                    : 0;

                timeSeriesData.push({
                    hour: hourStart.getHours().toString().padStart(2, '0') + ':00',
                    issues_created: issuesInHour.length,
                    issues_resolved: resolvedInHour.length,
                    avg_ttfr: avgTTFRInHour,
                });
            }

            setTimeSeries(timeSeriesData);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
        } finally {
            setLoadingMetrics(false);
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

    const getMetricStatus = (metric: string, value: number) => {
        switch (metric) {
            case 'ttfr':
                if (value <= 2) return { color: 'text-green-600', status: '🎯 META ATINGIDA!' };
                if (value <= 5) return { color: 'text-yellow-600', status: '⚠️ Próximo da meta' };
                return { color: 'text-red-600', status: '❌ Acima da meta' };
            case 'ttr':
                if (value <= 2) return { color: 'text-green-600', status: '🎯 META ATINGIDA!' };
                if (value <= 4) return { color: 'text-yellow-600', status: '⚠️ Próximo da meta' };
                return { color: 'text-red-600', status: '❌ Acima da meta' };
            case 'automation':
                if (value >= 95) return { color: 'text-green-600', status: '🚀 MUSK LEVEL!' };
                if (value >= 70) return { color: 'text-yellow-600', status: '⚡ Bom desempenho' };
                return { color: 'text-red-600', status: '❌ Abaixo da meta' };
            case 'accuracy':
                if (value >= 90) return { color: 'text-green-600', status: '🎯 META ATINGIDA!' };
                if (value >= 70) return { color: 'text-yellow-600', status: '⚠️ Próximo da meta' };
                return { color: 'text-red-600', status: '❌ Abaixo da meta' };
            default:
                return { color: 'text-gray-600', status: '' };
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">⚡ Performance Dashboard</h1>
                            <p className="mt-2 text-gray-600">
                                Métricas em tempo real - Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                            </p>
                        </div>
                        <button
                            onClick={fetchMetrics}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                        >
                            <Activity className="h-4 w-4" />
                            Atualizar
                        </button>
                    </div>

                    {loadingMetrics ? (
                        <div className="bg-white p-12 rounded-lg shadow text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Carregando métricas...</p>
                        </div>
                    ) : (
                        <>
                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                {/* TTFR */}
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <Clock className="h-8 w-8 text-blue-500" />
                                        <Target className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-600">TTFR (Time to First Response)</p>
                                    <p className={`text-3xl font-bold mt-1 ${getMetricStatus('ttfr', metrics?.ttfr_avg || 0).color}`}>
                                        {metrics?.ttfr_avg.toFixed(1)}min
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Meta: &lt;2min</p>
                                    <p className="text-xs mt-1">{getMetricStatus('ttfr', metrics?.ttfr_avg || 0).status}</p>
                                </div>

                                {/* TTR */}
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <CheckCircle className="h-8 w-8 text-green-500" />
                                        <Target className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-600">TTR (Time to Resolution)</p>
                                    <p className={`text-3xl font-bold mt-1 ${getMetricStatus('ttr', metrics?.ttr_avg || 0).color}`}>
                                        {metrics?.ttr_avg.toFixed(1)}h
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Meta: &lt;2h</p>
                                    <p className="text-xs mt-1">{getMetricStatus('ttr', metrics?.ttr_avg || 0).status}</p>
                                </div>

                                {/* Automation Rate */}
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <Zap className="h-8 w-8 text-yellow-500" />
                                        <Target className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-600">Taxa de Automação</p>
                                    <p className={`text-3xl font-bold mt-1 ${getMetricStatus('automation', metrics?.automation_rate || 0).color}`}>
                                        {metrics?.automation_rate.toFixed(0)}%
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Meta: &gt;95% (Musk Level)</p>
                                    <p className="text-xs mt-1">{getMetricStatus('automation', metrics?.automation_rate || 0).status}</p>
                                </div>

                                {/* AI Accuracy */}
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <TrendingUp className="h-8 w-8 text-purple-500" />
                                        <Target className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-600">Precisão da IA</p>
                                    <p className={`text-3xl font-bold mt-1 ${getMetricStatus('accuracy', metrics?.ai_accuracy || 0).color}`}>
                                        {metrics?.ai_accuracy.toFixed(0)}%
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Meta: &gt;90%</p>
                                    <p className="text-xs mt-1">{getMetricStatus('accuracy', metrics?.ai_accuracy || 0).status}</p>
                                </div>
                            </div>

                            {/* Secondary Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <p className="text-sm text-gray-600">Total Issues (24h)</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{metrics?.total_issues_24h}</p>
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow">
                                    <p className="text-sm text-gray-600">Resolvidos (24h)</p>
                                    <p className="text-3xl font-bold text-green-600 mt-1">{metrics?.resolved_issues_24h}</p>
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow">
                                    <p className="text-sm text-gray-600">Auto-Resolvidos (24h)</p>
                                    <p className="text-3xl font-bold text-blue-600 mt-1">{metrics?.auto_resolved_24h}</p>
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow">
                                    <p className="text-sm text-gray-600">Críticos Pendentes</p>
                                    <p className={`text-3xl font-bold mt-1 ${(metrics?.critical_issues_pending || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {metrics?.critical_issues_pending || 0}
                                    </p>
                                    {(metrics?.critical_issues_pending || 0) > 0 && (
                                        <div className="mt-2 flex items-center gap-1 text-red-600">
                                            <AlertTriangle className="h-4 w-4" />
                                            <span className="text-xs">Requer atenção!</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Time Series Chart (Simple ASCII-style) */}
                            <div className="bg-white p-6 rounded-lg shadow mb-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Últimas 12 Horas</h2>

                                <div className="space-y-4">
                                    {timeSeries.map((data, idx) => {
                                        const maxIssues = Math.max(...timeSeries.map(d => d.issues_created), 1);
                                        const barWidth = (data.issues_created / maxIssues) * 100;

                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-mono text-gray-600 w-12">{data.hour}</span>
                                                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                                                        <div
                                                            className="bg-indigo-600 h-6 rounded-full flex items-center justify-end pr-2"
                                                            style={{ width: `${barWidth}%` }}
                                                        >
                                                            {data.issues_created > 0 && (
                                                                <span className="text-xs text-white font-semibold">{data.issues_created}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-500 w-32">
                                                        TTFR: {data.avg_ttfr > 0 ? `${data.avg_ttfr.toFixed(1)}min` : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between text-xs text-gray-600">
                                        <span>🔵 Azul: Issues Criados</span>
                                        <span>⏱️ TTFR médio por hora</span>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Status */}
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-lg shadow text-white">
                                <h2 className="text-xl font-bold mb-4">🎯 Status Geral</h2>
                                <div className="space-y-2">
                                    {metrics && (
                                        <>
                                            {metrics.ttfr_avg <= 2 && metrics.automation_rate >= 95 && (
                                                <p className="text-lg font-semibold">🚀 MUSK LEVEL ATINGIDO! Sistema operando em performance máxima!</p>
                                            )}
                                            {metrics.ttfr_avg <= 2 && metrics.automation_rate < 95 && (
                                                <p className="text-lg font-semibold">⚡ Excelente TTFR! Foco agora em aumentar automação para 95%.</p>
                                            )}
                                            {metrics.ttfr_avg > 2 && metrics.automation_rate >= 95 && (
                                                <p className="text-lg font-semibold">🎯 Alta automação! Otimizar TTFR para &lt;2min.</p>
                                            )}
                                            {metrics.ttfr_avg > 2 && metrics.automation_rate < 95 && (
                                                <p className="text-lg font-semibold">📈 Oportunidades de melhoria em TTFR e automação.</p>
                                            )}
                                        </>
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