'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import PartnerStats from '@/components/partners/PartnerStats';
import ClientList from '@/components/partners/ClientList';
import EarningsChart from '@/components/partners/EarningsChart';
import { Users, DollarSign, TrendingUp, Award } from 'lucide-react';

interface Client {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'pending';
    plan: string;
    monthlyValue: number;
    commissionRate: number;
    startDate: string;
    lastActivity?: string;
}

interface EarningData {
    month: string;
    amount: number;
    clients: number;
}

export default function PartnersPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [loadingData, setLoadingData] = useState(true);
    const [clients, setClients] = useState<Client[]>([]);
    const [earningsData, setEarningsData] = useState<EarningData[]>([]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchPartnerData();
        }
    }, [user]);

    const fetchPartnerData = async () => {
        try {
            setLoadingData(true);

            // Mock data - Replace with real Supabase queries
            // In production, fetch from a 'partner_clients' table
            const mockClients: Client[] = [
                {
                    id: '1',
                    name: 'Empresa Alpha Ltda',
                    status: 'active',
                    plan: 'Enterprise',
                    monthlyValue: 5000,
                    commissionRate: 20,
                    startDate: '2024-01-15',
                    lastActivity: '2024-12-30',
                },
                {
                    id: '2',
                    name: 'Beta Solutions',
                    status: 'active',
                    plan: 'Professional',
                    monthlyValue: 2500,
                    commissionRate: 15,
                    startDate: '2024-03-20',
                    lastActivity: '2024-12-28',
                },
                {
                    id: '3',
                    name: 'Gamma Tech',
                    status: 'active',
                    plan: 'Business',
                    monthlyValue: 3500,
                    commissionRate: 18,
                    startDate: '2024-05-10',
                    lastActivity: '2024-12-29',
                },
                {
                    id: '4',
                    name: 'Delta Corp',
                    status: 'pending',
                    plan: 'Professional',
                    monthlyValue: 2000,
                    commissionRate: 15,
                    startDate: '2024-12-01',
                },
                {
                    id: '5',
                    name: 'Epsilon Industries',
                    status: 'inactive',
                    plan: 'Basic',
                    monthlyValue: 1500,
                    commissionRate: 10,
                    startDate: '2024-02-01',
                    lastActivity: '2024-11-15',
                },
            ];

            const mockEarnings: EarningData[] = [
                { month: 'Jul', amount: 1200, clients: 2 },
                { month: 'Ago', amount: 1650, clients: 3 },
                { month: 'Set', amount: 1850, clients: 3 },
                { month: 'Out', amount: 2100, clients: 4 },
                { month: 'Nov', amount: 2350, clients: 4 },
                { month: 'Dez', amount: 2680, clients: 5 },
            ];

            setClients(mockClients);
            setEarningsData(mockEarnings);
        } catch (error) {
            console.error('Failed to fetch partner data:', error);
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

    const activeClients = clients.filter(c => c.status === 'active').length;
    const totalMonthlyRevenue = clients
        .filter(c => c.status === 'active')
        .reduce((sum, c) => sum + c.monthlyValue, 0);
    const totalMonthlyCommission = clients
        .filter(c => c.status === 'active')
        .reduce((sum, c) => sum + (c.monthlyValue * c.commissionRate) / 100, 0);
    const totalLifetimeEarnings = earningsData.reduce((sum, e) => sum + e.amount, 0);

    const stats = [
        {
            title: 'Clientes Ativos',
            value: activeClients,
            icon: Users,
            color: 'cyan' as const,
            trend: { value: 25, isPositive: true },
        },
        {
            title: 'Receita Mensal Total',
            value: new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
            }).format(totalMonthlyRevenue),
            icon: TrendingUp,
            color: 'green' as const,
            trend: { value: 15, isPositive: true },
        },
        {
            title: 'Comissão Mensal',
            value: new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
            }).format(totalMonthlyCommission),
            icon: DollarSign,
            color: 'purple' as const,
            trend: { value: 20, isPositive: true },
        },
        {
            title: 'Total Acumulado',
            value: new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
            }).format(totalLifetimeEarnings),
            icon: Award,
            color: 'orange' as const,
        },
    ];

    return (
        <div className="flex min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Portal de Parceiros</h1>
                        <p className="mt-2 text-gray-400">
                            Acompanhe seus clientes, comissões e performance
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
                            <PartnerStats stats={stats} />

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                                <div className="bg-[#12121a] border border-gray-800 p-6 rounded-xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-white">
                                            Evolução de Comissões
                                        </h3>
                                        <Link
                                            href="/partners/earnings"
                                            className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
                                        >
                                            Ver detalhes →
                                        </Link>
                                    </div>
                                    <EarningsChart data={earningsData} type="bar" />
                                </div>

                                <div className="bg-[#12121a] border border-gray-800 p-6 rounded-xl">
                                    <h3 className="text-lg font-semibold text-white mb-4">
                                        Distribuição por Status
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                            <div>
                                                <p className="text-sm text-gray-400">Ativos</p>
                                                <p className="text-2xl font-bold text-emerald-400">
                                                    {clients.filter(c => c.status === 'active').length}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-400">MRR</p>
                                                <p className="text-lg font-semibold text-white">
                                                    {new Intl.NumberFormat('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                        minimumFractionDigits: 0,
                                                    }).format(totalMonthlyRevenue)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                            <div>
                                                <p className="text-sm text-gray-400">Pendentes</p>
                                                <p className="text-2xl font-bold text-yellow-400">
                                                    {clients.filter(c => c.status === 'pending').length}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">Aguardando ativação</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                            <div>
                                                <p className="text-sm text-gray-400">Inativos</p>
                                                <p className="text-2xl font-bold text-red-400">
                                                    {clients.filter(c => c.status === 'inactive').length}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">Precisam atenção</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#12121a] border border-gray-800 rounded-xl mt-8">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-white">
                                            Seus Clientes
                                        </h3>
                                        <Link
                                            href="/partners/clients"
                                            className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
                                        >
                                            Ver todos →
                                        </Link>
                                    </div>
                                    <ClientList clients={clients} showAll={false} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
