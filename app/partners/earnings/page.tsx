'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import EarningsChart from '@/components/partners/EarningsChart';
import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';

interface EarningData {
    month: string;
    amount: number;
    clients: number;
}

interface Transaction {
    id: string;
    date: string;
    client: string;
    amount: number;
    status: 'paid' | 'pending' | 'processing';
    invoiceId?: string;
}

export default function PartnersEarningsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [loadingData, setLoadingData] = useState(true);
    const [earningsData, setEarningsData] = useState<EarningData[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchEarningsData();
        }
    }, [user]);

    const fetchEarningsData = async () => {
        try {
            setLoadingData(true);

            // Mock data - Replace with real Supabase queries
            const mockEarnings: EarningData[] = [
                { month: 'Jan', amount: 850, clients: 2 },
                { month: 'Fev', amount: 950, clients: 2 },
                { month: 'Mar', amount: 1100, clients: 3 },
                { month: 'Abr', amount: 1100, clients: 3 },
                { month: 'Mai', amount: 1300, clients: 3 },
                { month: 'Jun', amount: 1200, clients: 3 },
                { month: 'Jul', amount: 1200, clients: 2 },
                { month: 'Ago', amount: 1650, clients: 3 },
                { month: 'Set', amount: 1850, clients: 3 },
                { month: 'Out', amount: 2100, clients: 4 },
                { month: 'Nov', amount: 2350, clients: 4 },
                { month: 'Dez', amount: 2680, clients: 5 },
            ];

            const mockTransactions: Transaction[] = [
                {
                    id: '1',
                    date: '2024-12-15',
                    client: 'Empresa Alpha Ltda',
                    amount: 1000,
                    status: 'paid',
                    invoiceId: 'INV-2024-001',
                },
                {
                    id: '2',
                    date: '2024-12-15',
                    client: 'Beta Solutions',
                    amount: 375,
                    status: 'paid',
                    invoiceId: 'INV-2024-002',
                },
                {
                    id: '3',
                    date: '2024-12-15',
                    client: 'Gamma Tech',
                    amount: 630,
                    status: 'paid',
                    invoiceId: 'INV-2024-003',
                },
                {
                    id: '4',
                    date: '2024-12-15',
                    client: 'Zeta Enterprises',
                    amount: 1200,
                    status: 'processing',
                },
                {
                    id: '5',
                    date: '2024-11-15',
                    client: 'Empresa Alpha Ltda',
                    amount: 1000,
                    status: 'paid',
                    invoiceId: 'INV-2024-004',
                },
                {
                    id: '6',
                    date: '2024-11-15',
                    client: 'Beta Solutions',
                    amount: 375,
                    status: 'paid',
                    invoiceId: 'INV-2024-005',
                },
                {
                    id: '7',
                    date: '2024-11-15',
                    client: 'Gamma Tech',
                    amount: 630,
                    status: 'paid',
                    invoiceId: 'INV-2024-006',
                },
                {
                    id: '8',
                    date: '2025-01-15',
                    client: 'Delta Corp',
                    amount: 300,
                    status: 'pending',
                },
            ];

            setEarningsData(mockEarnings);
            setTransactions(mockTransactions);
        } catch (error) {
            console.error('Failed to fetch earnings data:', error);
        } finally {
            setLoadingData(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
                    <p className="mt-4 text-gray-400">Carregando...</p>
                </div>
            </div>
        );
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const totalEarnings = earningsData.reduce((sum, e) => sum + e.amount, 0);
    const currentMonth = earningsData[earningsData.length - 1]?.amount || 0;
    const previousMonth = earningsData[earningsData.length - 2]?.amount || 0;
    const growth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0;

    const paidTransactions = transactions.filter(t => t.status === 'paid');
    const totalPaid = paidTransactions.reduce((sum, t) => sum + t.amount, 0);
    const pendingTransactions = transactions.filter(t => t.status === 'pending' || t.status === 'processing');
    const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);

    const statusConfig = {
        paid: { label: 'Pago', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
        pending: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
        processing: { label: 'Processando', color: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' },
    };

    return (
        <div className="flex min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Minhas Comissões</h1>
                        <p className="mt-2 text-gray-400">
                            Acompanhe seus ganhos e histórico de pagamentos
                        </p>
                    </div>

                    {loadingData ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
                                <p className="mt-4 text-gray-400">Carregando dados...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 p-6 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm text-gray-400">Total Acumulado</p>
                                        <DollarSign className="h-6 w-6 text-purple-400" />
                                    </div>
                                    <p className="text-3xl font-bold text-white">{formatCurrency(totalEarnings)}</p>
                                    <p className="text-xs mt-2 text-gray-500">Últimos 12 meses</p>
                                </div>

                                <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-500/30 p-6 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm text-gray-400">Mês Atual</p>
                                        <Calendar className="h-6 w-6 text-emerald-400" />
                                    </div>
                                    <p className="text-3xl font-bold text-white">{formatCurrency(currentMonth)}</p>
                                    <p className={`text-xs mt-2 ${growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}% vs mês anterior
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-900/20 border border-cyan-500/30 p-6 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm text-gray-400">Pagamentos Recebidos</p>
                                        <TrendingUp className="h-6 w-6 text-cyan-400" />
                                    </div>
                                    <p className="text-3xl font-bold text-white">{formatCurrency(totalPaid)}</p>
                                    <p className="text-xs mt-2 text-gray-500">{paidTransactions.length} transações</p>
                                </div>

                                <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 border border-yellow-500/30 p-6 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm text-gray-400">A Receber</p>
                                        <Calendar className="h-6 w-6 text-yellow-400" />
                                    </div>
                                    <p className="text-3xl font-bold text-white">{formatCurrency(totalPending)}</p>
                                    <p className="text-xs mt-2 text-gray-500">{pendingTransactions.length} pendentes</p>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="bg-[#12121a] border border-gray-800 p-6 rounded-xl mb-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-white">
                                        Evolução de Comissões
                                    </h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setChartType('bar')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                chartType === 'bar'
                                                    ? 'bg-cyan-500 text-white'
                                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            }`}
                                        >
                                            Barras
                                        </button>
                                        <button
                                            onClick={() => setChartType('line')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                chartType === 'line'
                                                    ? 'bg-cyan-500 text-white'
                                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            }`}
                                        >
                                            Linha
                                        </button>
                                    </div>
                                </div>
                                <EarningsChart data={earningsData} type={chartType} />
                            </div>

                            {/* Transactions Table */}
                            <div className="bg-[#12121a] border border-gray-800 rounded-xl">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-white">
                                            Histórico de Transações
                                        </h3>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors">
                                            <Download className="h-4 w-4" />
                                            Exportar
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-[#0a0a0f]">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                        Data
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                        Cliente
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                        Valor
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                        Nota Fiscal
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {transactions.map((transaction) => (
                                                    <tr key={transaction.id} className="hover:bg-gray-800/50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                            {formatDate(transaction.date)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                                            {transaction.client}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                                                            {formatCurrency(transaction.amount)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[transaction.status].color}`}>
                                                                {statusConfig[transaction.status].label}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {transaction.invoiceId || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
