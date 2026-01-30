'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface EarningData {
    month: string;
    amount: number;
    clients: number;
}

interface EarningsChartProps {
    data: EarningData[];
    type?: 'bar' | 'line';
}

export default function EarningsChart({ data, type = 'bar' }: EarningsChartProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#1a1a24] border border-gray-700 rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-white mb-1">{payload[0].payload.month}</p>
                    <p className="text-sm text-emerald-400 font-semibold">
                        Comissão: {formatCurrency(payload[0].value)}
                    </p>
                    {payload[0].payload.clients && (
                        <p className="text-xs text-gray-400 mt-1">
                            {payload[0].payload.clients} clientes ativos
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
                <div className="text-center">
                    <p className="text-gray-400">Sem dados de comissões</p>
                    <p className="text-sm mt-1 text-gray-500">Dados aparecerão quando você tiver clientes ativos</p>
                </div>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            {type === 'bar' ? (
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis
                        dataKey="month"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickLine={{ stroke: '#374151' }}
                        axisLine={{ stroke: '#374151' }}
                    />
                    <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickLine={{ stroke: '#374151' }}
                        axisLine={{ stroke: '#374151' }}
                        tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                        dataKey="amount" 
                        fill="#06b6d4" 
                        radius={[8, 8, 0, 0]}
                        style={{ filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.3))' }}
                    />
                </BarChart>
            ) : (
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis
                        dataKey="month"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickLine={{ stroke: '#374151' }}
                        axisLine={{ stroke: '#374151' }}
                    />
                    <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickLine={{ stroke: '#374151' }}
                        axisLine={{ stroke: '#374151' }}
                        tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={{ fill: '#06b6d4', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#06b6d4', stroke: '#0a0a0f', strokeWidth: 2 }}
                        style={{ filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))' }}
                    />
                </LineChart>
            )}
        </ResponsiveContainer>
    );
}
