'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import ClientList from '@/components/partners/ClientList';
import { Search, Filter } from 'lucide-react';

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

type FilterStatus = 'all' | 'active' | 'inactive' | 'pending';

export default function PartnersClientsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [loadingData, setLoadingData] = useState(true);
    const [clients, setClients] = useState<Client[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchClients();
        }
    }, [user]);

    useEffect(() => {
        filterClients();
    }, [clients, searchTerm, statusFilter]);

    const fetchClients = async () => {
        try {
            setLoadingData(true);

            // Mock data - Replace with real Supabase queries
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
                {
                    id: '6',
                    name: 'Zeta Enterprises',
                    status: 'active',
                    plan: 'Enterprise',
                    monthlyValue: 6000,
                    commissionRate: 20,
                    startDate: '2024-06-01',
                    lastActivity: '2024-12-31',
                },
                {
                    id: '7',
                    name: 'Eta Systems',
                    status: 'active',
                    plan: 'Business',
                    monthlyValue: 3000,
                    commissionRate: 18,
                    startDate: '2024-07-15',
                    lastActivity: '2024-12-29',
                },
                {
                    id: '8',
                    name: 'Theta Digital',
                    status: 'pending',
                    plan: 'Professional',
                    monthlyValue: 2200,
                    commissionRate: 15,
                    startDate: '2024-12-15',
                },
            ];

            setClients(mockClients);
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const filterClients = () => {
        let filtered = [...clients];

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(client => client.status === statusFilter);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(client =>
                client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.plan.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredClients(filtered);
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

    const stats = {
        total: clients.length,
        active: clients.filter(c => c.status === 'active').length,
        pending: clients.filter(c => c.status === 'pending').length,
        inactive: clients.filter(c => c.status === 'inactive').length,
    };

    return (
        <div className="flex min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Meus Clientes</h1>
                        <p className="mt-2 text-gray-400">
                            Gerencie e acompanhe todos os seus clientes
                        </p>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-[#12121a] border border-gray-800 p-4 rounded-xl">
                            <p className="text-sm text-gray-400">Total de Clientes</p>
                            <p className="text-2xl font-bold text-white">{stats.total}</p>
                        </div>
                        <div className="bg-[#12121a] border border-gray-800 p-4 rounded-xl">
                            <p className="text-sm text-gray-400">Ativos</p>
                            <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
                        </div>
                        <div className="bg-[#12121a] border border-gray-800 p-4 rounded-xl">
                            <p className="text-sm text-gray-400">Pendentes</p>
                            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                        </div>
                        <div className="bg-[#12121a] border border-gray-800 p-4 rounded-xl">
                            <p className="text-sm text-gray-400">Inativos</p>
                            <p className="text-2xl font-bold text-red-400">{stats.inactive}</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-[#12121a] border border-gray-800 p-6 rounded-xl mb-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou plano..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div className="md:w-64">
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                                        className="w-full pl-10 pr-4 py-2 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none"
                                    >
                                        <option value="all">Todos os Status</option>
                                        <option value="active">Ativos</option>
                                        <option value="pending">Pendentes</option>
                                        <option value="inactive">Inativos</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Results count */}
                        <div className="mt-4 text-sm text-gray-500">
                            Mostrando {filteredClients.length} de {clients.length} clientes
                        </div>
                    </div>

                    {/* Client List */}
                    {loadingData ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
                                <p className="mt-4 text-gray-400">Carregando clientes...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#12121a] border border-gray-800 rounded-xl p-6">
                            <ClientList clients={filteredClients} showAll={true} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
