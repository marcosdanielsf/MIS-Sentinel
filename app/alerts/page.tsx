'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import DateFilter, { DateRange } from '@/components/DateFilter';
import { AlertTriangle, CheckCircle, Clock, XCircle, TrendingUp, Zap, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Alert {
  id: string;
  alert_type: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  affected_team_members: string[];
  suggested_actions: string[];
  confidence_score: number;
  ai_reasoning: string;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
}

const severityColors = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const severityIcons = {
  low: AlertCircle,
  medium: AlertTriangle,
  high: AlertTriangle,
  critical: XCircle,
};

const statusColors = {
  active: 'bg-red-100 text-red-800',
  acknowledged: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800',
};

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  urgent_request: Clock,
  technical_issue: XCircle,
  automation_opportunity: Zap,
  bottleneck: AlertTriangle,
  milestone: TrendingUp,
};

export default function AlertsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    label: 'Últimos 7 dias'
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchAlerts = useCallback(async (range: DateRange) => {
    try {
      setLoadingAlerts(true);
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .gte('created_at', range.startDate.toISOString())
        .lte('created_at', range.endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching alerts:', error);
        setAlerts([]);
      } else {
        setAlerts(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAlerts(dateRange);
    }
  }, [user, dateRange, fetchAlerts]);

  useEffect(() => {
    let filtered = alerts;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === filterStatus);
    }

    if (filterSeverity !== 'all') {
      filtered = filtered.filter(a => a.severity === filterSeverity);
    }

    setFilteredAlerts(filtered);
  }, [filterStatus, filterSeverity, alerts]);

  const handleDateChange = (range: DateRange) => {
    setDateRange(range);
  };

  const toggleExpand = (alertId: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.username || user?.email,
        })
        .eq('id', alertId);

      if (!error) {
        fetchAlerts(dateRange);
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.username || user?.email,
        })
        .eq('id', alertId);

      if (!error) {
        fetchAlerts(dateRange);
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
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

  const stats = {
    total: alerts.length,
    active: alerts.filter(a => a.status === 'active').length,
    critical: alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🚨 Alertas do SENTINEL</h1>
              <p className="mt-2 text-gray-600">
                Sistema de Inteligência de Alertas - Análise AI em tempo real
              </p>
            </div>
            <DateFilter onDateChange={handleDateChange} />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total no Período</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <AlertCircle className="h-12 w-12 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ativos</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{stats.active}</p>
                </div>
                <Clock className="h-12 w-12 text-orange-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Críticos</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{stats.critical}</p>
                </div>
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Resolvidos</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.resolved}</p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="acknowledged">Reconhecidos</option>
                  <option value="resolved">Resolvidos</option>
                  <option value="dismissed">Descartados</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severidade</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

          {/* Alerts List */}
          <div className="space-y-4">
            {loadingAlerts ? (
              <div className="bg-white p-12 rounded-lg shadow text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Carregando alertas...</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="bg-white p-12 rounded-lg shadow text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-900 font-semibold text-lg">Nenhum alerta encontrado</p>
                <p className="text-gray-500 mt-2">
                  {filterStatus !== 'all' || filterSeverity !== 'all'
                    ? 'Tente ajustar os filtros'
                    : 'Sistema funcionando normalmente no período'}
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const SeverityIcon = severityIcons[alert.severity];
                const TypeIcon = typeIcons[alert.alert_type] || AlertCircle;
                const isExpanded = expandedAlerts.has(alert.id);

                return (
                  <div
                    key={alert.id}
                    className={`bg-white rounded-lg shadow border-l-4 ${severityColors[alert.severity]
                      } overflow-hidden`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <TypeIcon className="h-6 w-6 text-gray-600" />
                            <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[alert.status]}`}>
                              {alert.status}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${severityColors[alert.severity]}`}>
                              {alert.severity}
                            </span>
                          </div>

                          <p className="text-gray-700 mb-4">{alert.description}</p>

                          <div className="flex items-center gap-6 text-sm text-gray-500">
                            <span>🎯 Confiança: {alert.confidence_score ? (alert.confidence_score * 100).toFixed(0) : 'N/A'}%</span>
                            <span>⏰ {formatDate(alert.created_at)}</span>
                            <span>👥 {alert.affected_team_members?.join(', ')}</span>
                          </div>

                          {isExpanded && (
                            <div className="mt-6 space-y-4">
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-semibold text-blue-900 mb-2">🤖 Análise AI</h4>
                                <p className="text-blue-800 text-sm">{alert.ai_reasoning || 'Análise AI não disponível para este alerta.'}</p>
                              </div>

                              {alert.suggested_actions && alert.suggested_actions.length > 0 && (
                                <div className="bg-green-50 p-4 rounded-lg">
                                  <h4 className="font-semibold text-green-900 mb-2">✅ Ações Sugeridas</h4>
                                  <ul className="space-y-2">
                                    {alert.suggested_actions.map((action, idx) => (
                                      <li key={idx} className="text-green-800 text-sm flex items-start">
                                        <span className="mr-2">•</span>
                                        <span>{action}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {alert.acknowledged_at && (
                                <div className="text-sm text-gray-600">
                                  ✓ Reconhecido por {alert.acknowledged_by} em {formatDate(alert.acknowledged_at)}
                                </div>
                              )}

                              {alert.resolved_at && (
                                <div className="text-sm text-green-600">
                                  ✅ Resolvido por {alert.resolved_by} em {formatDate(alert.resolved_at)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <button
                          onClick={() => toggleExpand(alert.id)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" /> Ocultar Detalhes
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" /> Ver Detalhes
                            </>
                          )}
                        </button>

                        {alert.status === 'active' && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium"
                          >
                            Reconhecer
                          </button>
                        )}

                        {(alert.status === 'active' || alert.status === 'acknowledged') && (
                          <button
                            onClick={() => handleResolve(alert.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                          >
                            Resolver
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
