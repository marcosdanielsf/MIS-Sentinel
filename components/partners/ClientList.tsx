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
    active: { label: 'Ativo', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    inactive: { label: 'Inativo', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
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
                <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>Nenhum cliente encontrado</p>
                <p className="text-sm mt-1">Seus clientes aparecerão aqui</p>
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
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Building2 className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900">{client.name}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig[client.status].color}`}>
                                            {statusConfig[client.status].label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{client.plan}</p>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">Valor mensal: </span>
                                            <span className="font-semibold text-gray-900">{formatCurrency(client.monthlyValue)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Sua comissão: </span>
                                            <span className="font-semibold text-green-600">{formatCurrency(monthlyCommission)}</span>
                                        </div>
                                    </div>
                                    {client.lastActivity && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            Última atividade: {formatDate(client.lastActivity)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500 mb-1">Taxa de comissão</div>
                                <div className="text-lg font-bold text-indigo-600">{client.commissionRate}%</div>
                                <div className="text-xs text-gray-400 mt-1">Início: {formatDate(client.startDate)}</div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {!showAll && clients.length > 5 && (
                <Link
                    href="/partners/clients"
                    className="block text-center py-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                    Ver todos os {clients.length} clientes →
                </Link>
            )}
        </div>
    );
}
