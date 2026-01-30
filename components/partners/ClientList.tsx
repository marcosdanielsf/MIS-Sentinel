import { Building2, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

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

interface ClientListProps {
    clients: Client[];
    showAll?: boolean;
}

const statusConfig = {
    active: { 
        label: 'Ativo', 
        color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', 
        icon: CheckCircle 
    },
    inactive: { 
        label: 'Inativo', 
        color: 'bg-red-500/20 text-red-400 border border-red-500/30', 
        icon: AlertCircle 
    },
    pending: { 
        label: 'Pendente', 
        color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', 
        icon: AlertCircle 
    },
};

export default function ClientList({ clients, showAll = false }: ClientListProps) {
    const displayClients = showAll ? clients : clients.slice(0, 5);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    if (clients.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                <p className="text-gray-400">Nenhum cliente encontrado</p>
                <p className="text-sm mt-1 text-gray-500">Seus clientes aparecerão aqui</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {displayClients.map((client) => {
                const StatusIcon = statusConfig[client.status].icon;
                const monthlyCommission = (client.monthlyValue * client.commissionRate) / 100;

                return (
                    <div
                        key={client.id}
                        className="bg-[#0a0a0f] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                                <div className="p-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg">
                                    <Building2 className="h-6 w-6 text-cyan-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-white">{client.name}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig[client.status].color}`}>
                                            {statusConfig[client.status].label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-2">{client.plan}</p>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">Valor mensal: </span>
                                            <span className="font-semibold text-white">{formatCurrency(client.monthlyValue)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Sua comissão: </span>
                                            <span className="font-semibold text-emerald-400">{formatCurrency(monthlyCommission)}</span>
                                        </div>
                                    </div>
                                    {client.lastActivity && (
                                        <p className="text-xs text-gray-600 mt-2">
                                            Última atividade: {formatDate(client.lastActivity)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500 mb-1">Taxa de comissão</div>
                                <div className="text-lg font-bold text-cyan-400">{client.commissionRate}%</div>
                                <div className="text-xs text-gray-600 mt-1">Início: {formatDate(client.startDate)}</div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {!showAll && clients.length > 5 && (
                <Link
                    href="/partners/clients"
                    className="block text-center py-3 text-sm text-cyan-400 hover:text-cyan-300 font-medium"
                >
                    Ver todos os {clients.length} clientes →
                </Link>
            )}
        </div>
    );
}
