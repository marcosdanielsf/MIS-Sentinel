'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { GitBranch, Plus, Search, Filter, Clock, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight, Zap, TrendingUp } from 'lucide-react';

interface ProcessMap {
    id: string;
    process_name: string;
    category: string;
    description: string;
    steps: ProcessStep[];
    bottlenecks: string[];
    optimization_suggestions: string[];
    avg_resolution_time: number;
    success_rate: number;
    status: string;
    created_at: string;
    updated_at: string;
}

interface ProcessStep {
    order: number;
    name: string;
    description: string;
    responsible: string;
    avg_time_minutes: number;
}

interface AutomationOpportunity {
    id: string;
    process_id: string;
    opportunity_description: string;
    estimated_time_saved_hours: number;
    implementation_complexity: string;
    priority_score: number;
    status: string;
}

const categories = [
    { value: 'all', label: 'Todas Categorias' },
    { value: 'atendimento', label: 'Atendimento' },
    { value: 'vendas', label: 'Vendas' },
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'suporte', label: 'Suporte Técnico' },
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'cancelamento', label: 'Cancelamento' },
];

const statusColors: Record<string, string> = {
    'active': 'bg-green-500/20 text-green-400 border border-green-500/30',
    'draft': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    'deprecated': 'bg-red-500/20 text-red-400 border border-red-500/30',
    'review': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

const complexityColors: Record<string, string> = {
    'low': 'bg-green-500/20 text-green-400',
    'medium': 'bg-yellow-500/20 text-yellow-400',
    'high': 'bg-red-500/20 text-red-400',
};

export default function ProcessesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [processes, setProcesses] = useState<ProcessMap[]>([]);
    const [automations, setAutomations] = useState<AutomationOpportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [expandedProcess, setExpandedProcess] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'processes' | 'automations'>('processes');

    const [stats, setStats] = useState({
        totalProcesses: 0,
        activeProcesses: 0,
        avgSuccessRate: 0,
        automationOpportunities: 0,
        potentialTimeSaved: 0,
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    async function fetchData() {
        setLoading(true);
        try {
            const { data: processData, error: processError } = await supabase
                .from('process_maps')
                .select('*')
                .order('created_at', { ascending: false });

            if (processError) throw processError;

            const { data: automationData, error: automationError } = await supabase
                .from('automation_opportunities')
                .select('*')
                .order('priority_score', { ascending: false });

            if (automationError) throw automationError;

            const processesWithParsedData = (processData || []).map(p => ({
                ...p,
                steps: typeof p.steps === 'string' ? JSON.parse(p.steps) : (p.steps || []),
                bottlenecks: typeof p.bottlenecks === 'string' ? JSON.parse(p.bottlenecks) : (p.bottlenecks || []),
                optimization_suggestions: typeof p.optimization_suggestions === 'string'
                    ? JSON.parse(p.optimization_suggestions)
                    : (p.optimization_suggestions || []),
            }));

            setProcesses(processesWithParsedData);
            setAutomations(automationData || []);

            const active = processesWithParsedData.filter(p => p.status === 'active').length;
            const avgSuccess = processesWithParsedData.length > 0
                ? processesWithParsedData.reduce((acc, p) => acc + (p.success_rate || 0), 0) / processesWithParsedData.length
                : 0;
            const timeSaved = (automationData || []).reduce((acc, a) => acc + (a.estimated_time_saved_hours || 0), 0);

            setStats({
                totalProcesses: processesWithParsedData.length,
                activeProcesses: active,
                avgSuccessRate: avgSuccess,
                automationOpportunities: (automationData || []).filter(a => a.status === 'identified').length,
                potentialTimeSaved: timeSaved,
            });

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredProcesses = processes.filter(process => {
        const matchesSearch = process.process_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            process.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || process.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const toggleExpand = (id: string) => {
        setExpandedProcess(expandedProcess === id ? null : id);
    };

    async function handleAddProcess(formData: FormData) {
        const newProcess = {
            process_name: formData.get('process_name') as string,
            category: formData.get('category') as string,
            description: formData.get('description') as string,
            steps: [],
            bottlenecks: [],
            optimization_suggestions: [],
            avg_resolution_time: 0,
            success_rate: 0,
            status: 'draft',
        };

        const { error } = await supabase
            .from('process_maps')
            .insert([newProcess]);

        if (!error) {
            setShowAddModal(false);
            fetchData();
        }
    }

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#0a0a0a]">
            <Sidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-6 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <GitBranch className="h-7 w-7 text-indigo-500" />
                                Mapa de Processos
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Documentação de processos, gargalos e oportunidades de automação
                            </p>
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                            Novo Processo
                        </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total Processos</p>
                                    <p className="text-2xl font-bold text-white">{stats.totalProcesses}</p>
                                </div>
                                <GitBranch className="h-8 w-8 text-indigo-400" />
                            </div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Ativos</p>
                                    <p className="text-2xl font-bold text-green-400">{stats.activeProcesses}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-400" />
                            </div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Taxa Sucesso Média</p>
                                    <p className="text-2xl font-bold text-blue-400">{stats.avgSuccessRate.toFixed(1)}%</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-blue-400" />
                            </div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Oport. Automação</p>
                                    <p className="text-2xl font-bold text-purple-400">{stats.automationOpportunities}</p>
                                </div>
                                <Zap className="h-8 w-8 text-purple-400" />
                            </div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Horas Potenciais</p>
                                    <p className="text-2xl font-bold text-orange-400">{stats.potentialTimeSaved}h</p>
                                </div>
                                <Clock className="h-8 w-8 text-orange-400" />
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setActiveTab('processes')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                activeTab === 'processes'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            Processos
                        </button>
                        <button
                            onClick={() => setActiveTab('automations')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                activeTab === 'automations'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            Oportunidades de Automação
                        </button>
                    </div>

                    {activeTab === 'processes' ? (
                        <>
                            {/* Filters */}
                            <div className="flex flex-col md:flex-row gap-4 mb-6">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar processos..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Filter className="h-5 w-5 text-gray-500" />
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Processes List */}
                            {loading ? (
                                <div className="flex items-center justify-center h-64">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                                </div>
                            ) : filteredProcesses.length === 0 ? (
                                <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
                                    <GitBranch className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-white mb-2">Nenhum processo encontrado</h3>
                                    <p className="text-gray-500">Comece adicionando um novo processo ao mapa.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredProcesses.map((process) => (
                                        <div key={process.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                                            {/* Process Header */}
                                            <div
                                                className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                                                onClick={() => toggleExpand(process.id)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        {expandedProcess === process.id ? (
                                                            <ChevronDown className="h-5 w-5 text-gray-500" />
                                                        ) : (
                                                            <ChevronRight className="h-5 w-5 text-gray-500" />
                                                        )}
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-white">{process.process_name}</h3>
                                                            <p className="text-sm text-gray-500">{process.description}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[process.status] || 'bg-gray-700 text-gray-300'}`}>
                                                            {process.status}
                                                        </span>
                                                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-medium border border-indigo-500/30">
                                                            {process.category}
                                                        </span>
                                                        {process.avg_resolution_time > 0 && (
                                                            <span className="flex items-center gap-1 text-sm text-gray-500">
                                                                <Clock className="h-4 w-4" />
                                                                {process.avg_resolution_time}min
                                                            </span>
                                                        )}
                                                        {process.success_rate > 0 && (
                                                            <span className="text-sm font-medium text-green-400">
                                                                {process.success_rate}% sucesso
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Content */}
                                            {expandedProcess === process.id && (
                                                <div className="border-t border-gray-800 p-4 bg-gray-800/30">
                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                        {/* Steps */}
                                                        <div>
                                                            <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                                                                <GitBranch className="h-4 w-4 text-indigo-400" />
                                                                Etapas do Processo
                                                            </h4>
                                                            {process.steps && process.steps.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {process.steps.map((step, idx) => (
                                                                        <div key={idx} className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
                                                                            <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                                                                {step.order || idx + 1}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-medium text-white">{step.name}</p>
                                                                                <p className="text-sm text-gray-500">{step.description}</p>
                                                                                {step.responsible && (
                                                                                    <p className="text-xs text-gray-600 mt-1">Responsável: {step.responsible}</p>
                                                                                )}
                                                                                {step.avg_time_minutes > 0 && (
                                                                                    <p className="text-xs text-indigo-400 mt-1">{step.avg_time_minutes} min</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-500">Nenhuma etapa documentada</p>
                                                            )}
                                                        </div>

                                                        {/* Bottlenecks */}
                                                        <div>
                                                            <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                                                                <AlertTriangle className="h-4 w-4 text-red-400" />
                                                                Gargalos Identificados
                                                            </h4>
                                                            {process.bottlenecks && process.bottlenecks.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {process.bottlenecks.map((bottleneck, idx) => (
                                                                        <div key={idx} className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                                                                            <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                                                                            <p className="text-sm text-red-300">{bottleneck}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-500">Nenhum gargalo identificado</p>
                                                            )}
                                                        </div>

                                                        {/* Optimization Suggestions */}
                                                        <div>
                                                            <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                                                                <Zap className="h-4 w-4 text-green-400" />
                                                                Sugestões de Otimização
                                                            </h4>
                                                            {process.optimization_suggestions && process.optimization_suggestions.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {process.optimization_suggestions.map((suggestion, idx) => (
                                                                        <div key={idx} className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                                                                            <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                                                                            <p className="text-sm text-green-300">{suggestion}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-500">Nenhuma sugestão disponível</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Automations Tab */
                        <div className="bg-gray-900 rounded-xl border border-gray-800">
                            <div className="p-4 border-b border-gray-800">
                                <h3 className="font-semibold text-white">Oportunidades de Automação Identificadas</h3>
                                <p className="text-sm text-gray-500">Processos que podem ser automatizados para ganho de eficiência</p>
                            </div>
                            {automations.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Zap className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-white mb-2">Nenhuma oportunidade identificada</h3>
                                    <p className="text-gray-500">O SENTINEL AI identificará automaticamente oportunidades de automação.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-800">
                                    {automations.map((automation) => (
                                        <div key={automation.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="font-medium text-white">{automation.opportunity_description}</p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <span className="flex items-center gap-1 text-sm text-green-400">
                                                            <Clock className="h-4 w-4" />
                                                            {automation.estimated_time_saved_hours}h economia/mês
                                                        </span>
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${complexityColors[automation.implementation_complexity] || 'bg-gray-700 text-gray-300'}`}>
                                                            Complexidade: {automation.implementation_complexity}
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            Prioridade: {automation.priority_score}/10
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    automation.status === 'implemented' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                    automation.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                                }`}>
                                                    {automation.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Add Process Modal */}
                    {showAddModal && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg mx-4">
                                <h2 className="text-xl font-bold text-white mb-4">Novo Processo</h2>
                                <form action={handleAddProcess}>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                                Nome do Processo
                                            </label>
                                            <input
                                                type="text"
                                                name="process_name"
                                                required
                                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                placeholder="Ex: Atendimento ao Cliente - Dúvida sobre Fatura"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                                Categoria
                                            </label>
                                            <select
                                                name="category"
                                                required
                                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            >
                                                {categories.filter(c => c.value !== 'all').map(cat => (
                                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                                Descrição
                                            </label>
                                            <textarea
                                                name="description"
                                                rows={3}
                                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                placeholder="Descreva o processo e quando ele deve ser aplicado..."
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddModal(false)}
                                            className="px-4 py-2 text-gray-400 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                        >
                                            Criar Processo
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
