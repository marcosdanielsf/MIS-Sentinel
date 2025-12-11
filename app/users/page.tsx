'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import { Users, Plus, Search, Mail, Shield, Edit, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    status: 'active' | 'inactive' | 'pending';
    created_at: string;
    last_login?: string;
}

const roleColors: Record<string, string> = {
    'admin': 'bg-purple-100 text-purple-800',
    'manager': 'bg-blue-100 text-blue-800',
    'analyst': 'bg-green-100 text-green-800',
    'viewer': 'bg-gray-100 text-gray-800',
};

const statusColors: Record<string, { bg: string; icon: any }> = {
    'active': { bg: 'bg-green-100 text-green-800', icon: CheckCircle },
    'inactive': { bg: 'bg-red-100 text-red-800', icon: XCircle },
    'pending': { bg: 'bg-yellow-100 text-yellow-800', icon: Clock },
};

export default function UsersPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            fetchUsers();
        }
    }, [user]);

    async function fetchUsers() {
        setLoading(true);
        const mockUsers: User[] = [
            { id: '1', username: 'Marcos Daniels', email: 'marcos@mottivme.com', role: 'admin', status: 'active', created_at: '2024-01-15', last_login: '2024-12-11' },
            { id: '2', username: 'Isabella Santos', email: 'isabella@mottivme.com', role: 'manager', status: 'active', created_at: '2024-02-20', last_login: '2024-12-10' },
            { id: '3', username: 'Arthur Lima', email: 'arthur@mottivme.com', role: 'analyst', status: 'active', created_at: '2024-03-10', last_login: '2024-12-11' },
            { id: '4', username: 'Allesson Costa', email: 'allesson@mottivme.com', role: 'analyst', status: 'active', created_at: '2024-04-05', last_login: '2024-12-09' },
            { id: '5', username: 'Novo Usuário', email: 'novo@mottivme.com', role: 'viewer', status: 'pending', created_at: '2024-12-01' },
        ];
        setUsers(mockUsers);
        setLoading(false);
    }

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const stats = {
        total: users.length,
        active: users.filter(u => u.status === 'active').length,
        pending: users.filter(u => u.status === 'pending').length,
        admins: users.filter(u => u.role === 'admin').length,
    };

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-6 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Users className="h-7 w-7 text-purple-600" />
                                Gerenciamento de Usuários
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Gerencie acessos e permissões da equipe
                            </p>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                            <Plus className="h-5 w-5" />
                            Novo Usuário
                        </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-sm text-gray-500">Total de Usuários</div>
                            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-sm text-gray-500">Usuários Ativos</div>
                            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-sm text-gray-500">Pendentes</div>
                            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="text-sm text-gray-500">Administradores</div>
                            <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                <option value="all">Todos os Cargos</option>
                                <option value="admin">Administrador</option>
                                <option value="manager">Gerente</option>
                                <option value="analyst">Analista</option>
                                <option value="viewer">Visualizador</option>
                            </select>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Acesso</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            Nenhum usuário encontrado
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u) => {
                                        const StatusIcon = statusColors[u.status].icon;
                                        return (
                                            <tr key={u.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium">
                                                            {u.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{u.username}</div>
                                                            <div className="text-sm text-gray-500 flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                {u.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                                                        <Shield className="h-3 w-3" />
                                                        {u.role === 'admin' ? 'Administrador' :
                                                            u.role === 'manager' ? 'Gerente' :
                                                                u.role === 'analyst' ? 'Analista' : 'Visualizador'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[u.status].bg}`}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {u.status === 'active' ? 'Ativo' :
                                                            u.status === 'inactive' ? 'Inativo' : 'Pendente'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {u.last_login ? new Date(u.last_login).toLocaleDateString('pt-BR') : 'Nunca'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Permissions Info */}
                    <div className="mt-6 bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Níveis de Permissão</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="h-5 w-5 text-purple-600" />
                                    <span className="font-medium text-purple-900">Administrador</span>
                                </div>
                                <p className="text-sm text-purple-700">Acesso total ao sistema, gerenciamento de usuários e configurações</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="h-5 w-5 text-blue-600" />
                                    <span className="font-medium text-blue-900">Gerente</span>
                                </div>
                                <p className="text-sm text-blue-700">Acesso a relatórios, equipe e configurações básicas</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="h-5 w-5 text-green-600" />
                                    <span className="font-medium text-green-900">Analista</span>
                                </div>
                                <p className="text-sm text-green-700">Visualização e edição de dados, sem acesso a configurações</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="h-5 w-5 text-gray-600" />
                                    <span className="font-medium text-gray-900">Visualizador</span>
                                </div>
                                <p className="text-sm text-gray-700">Apenas visualização de dashboards e relatórios</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
