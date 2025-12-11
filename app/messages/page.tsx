'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import DateFilter, { DateRange } from '@/components/DateFilter';
import { Search, MessageSquare, TrendingUp, Zap, Filter } from 'lucide-react';

interface Message {
    id: string;
    external_id: string | null;
    group_name: string | null;
    sender_name: string;
    message_body: string;
    created_at: string;
    sentiment: string | null;
    urgency_score: number | null;
    category: string | null;
    keywords: string[];
    group_sender_name: string | null;
    sender_type: string;
}

const sentimentColors: Record<string, string> = {
    positive: 'bg-green-100 text-green-800',
    neutral: 'bg-blue-100 text-blue-800',
    negative: 'bg-red-100 text-red-800',
    urgent: 'bg-orange-100 text-orange-800',
    mixed: 'bg-purple-100 text-purple-800',
};

const sentimentEmojis: Record<string, string> = {
    positive: '😊',
    neutral: '😐',
    negative: '😞',
    urgent: '⚡',
    mixed: '🤔',
};

export default function MessagesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        label: 'Últimos 7 dias'
    });
    const [messages, setMessages] = useState<Message[]>([]);
    const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSender, setFilterSender] = useState('all');
    const [filterGroup, setFilterGroup] = useState('all');
    const [filterSentiment, setFilterSentiment] = useState('all');
    const [minUrgency, setMinUrgency] = useState(0);
    const [messagesPerMinute, setMessagesPerMinute] = useState(0);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const fetchMessages = useCallback(async (range: DateRange) => {
        try {
            setLoadingMessages(true);
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .gte('created_at', range.startDate.toISOString())
                .lte('created_at', range.endDate.toISOString())
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) {
                console.error('Error fetching messages:', error);
                setMessages([]);
            } else {
                setMessages(data || []);

                // Calculate messages per minute (last hour)
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                const recentMessages = (data || []).filter(m => new Date(m.created_at) >= oneHourAgo);
                setMessagesPerMinute(recentMessages.length / 60);
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchMessages(dateRange);
        }
    }, [user, dateRange, fetchMessages]);

    useEffect(() => {
        let filtered = messages;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(
                (msg) =>
                    msg.message_body.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    msg.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (msg.group_sender_name && msg.group_sender_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    msg.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Sender filter
        if (filterSender !== 'all') {
            filtered = filtered.filter((msg) => (msg.group_sender_name || msg.sender_name) === filterSender);
        }

        // Group filter
        if (filterGroup !== 'all') {
            filtered = filtered.filter((msg) => msg.group_name === filterGroup);
        }

        // Sentiment filter
        if (filterSentiment !== 'all') {
            filtered = filtered.filter((msg) => msg.sentiment === filterSentiment);
        }

        // Urgency filter
        if (minUrgency > 0) {
            filtered = filtered.filter((msg) => (msg.urgency_score || 0) >= minUrgency);
        }

        setFilteredMessages(filtered);
    }, [searchTerm, filterSender, filterGroup, filterSentiment, minUrgency, messages]);

    const handleDateChange = (range: DateRange) => {
        setDateRange(range);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const uniqueSenders = Array.from(new Set(
        messages.map((m) => m.group_sender_name || m.sender_name).filter(Boolean)
    )).sort();
    const uniqueGroups = Array.from(new Set(
        messages.map((m) => m.group_name).filter((g): g is string => Boolean(g))
    )).sort();

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
        total: messages.length,
        highUrgency: messages.filter((m) => (m.urgency_score || 0) >= 7).length,
        positive: messages.filter((m) => m.sentiment === 'positive').length,
        urgent: messages.filter((m) => m.sentiment === 'urgent').length,
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">💬 Mensagens Monitoradas</h1>
                            <p className="mt-2 text-gray-600">
                                Histórico completo de mensagens analisadas pela AI
                            </p>
                        </div>
                        <DateFilter
                            onDateChange={handleDateChange}
                            showMessagesPerMinute={true}
                            messagesPerMinute={messagesPerMinute}
                        />
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total no Período</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                                </div>
                                <MessageSquare className="h-12 w-12 text-blue-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Alta Urgência</p>
                                    <p className="text-3xl font-bold text-orange-600 mt-1">{stats.highUrgency}</p>
                                </div>
                                <Zap className="h-12 w-12 text-orange-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Positivas</p>
                                    <p className="text-3xl font-bold text-green-600 mt-1">{stats.positive}</p>
                                </div>
                                <TrendingUp className="h-12 w-12 text-green-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Urgentes</p>
                                    <p className="text-3xl font-bold text-red-600 mt-1">{stats.urgent}</p>
                                </div>
                                <Filter className="h-12 w-12 text-red-500" />
                            </div>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="bg-white p-6 rounded-lg shadow mb-6">
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar mensagens, remetentes ou tópicos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Remetente</label>
                                <select
                                    value={filterSender}
                                    onChange={(e) => setFilterSender(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">Todos</option>
                                    {uniqueSenders.map((sender) => (
                                        <option key={sender} value={sender}>
                                            {sender}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Grupo</label>
                                <select
                                    value={filterGroup}
                                    onChange={(e) => setFilterGroup(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">Todos</option>
                                    {uniqueGroups.map((group) => (
                                        <option key={group} value={group}>
                                            {group}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sentimento</label>
                                <select
                                    value={filterSentiment}
                                    onChange={(e) => setFilterSentiment(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">Todos</option>
                                    <option value="positive">Positivo</option>
                                    <option value="neutral">Neutro</option>
                                    <option value="negative">Negativo</option>
                                    <option value="urgent">Urgente</option>
                                    <option value="mixed">Misto</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Urgência Mín: {minUrgency}
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    value={minUrgency}
                                    onChange={(e) => setMinUrgency(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Messages List */}
                    <div className="space-y-4">
                        {loadingMessages ? (
                            <div className="bg-white p-12 rounded-lg shadow text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Carregando mensagens...</p>
                            </div>
                        ) : filteredMessages.length === 0 ? (
                            <div className="bg-white p-12 rounded-lg shadow text-center">
                                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-900 font-semibold text-lg">Nenhuma mensagem encontrada</p>
                                <p className="text-gray-500 mt-2">Tente ajustar os filtros de busca ou o período</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4 text-sm text-gray-600">
                                    Mostrando {filteredMessages.length} de {messages.length} mensagens no período
                                </div>

                                {filteredMessages.map((message) => {
                                    const sentimentColor = message.sentiment ? (sentimentColors[message.sentiment] || sentimentColors.neutral) : sentimentColors.neutral;
                                    const sentimentEmoji = message.sentiment ? (sentimentEmojis[message.sentiment] || '💬') : '💬';

                                    return (
                                        <div key={message.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                                                        {(message.group_sender_name || message.sender_name).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{message.group_sender_name || message.sender_name}</p>
                                                        <p className="text-sm text-gray-500">{message.group_name || message.sender_name}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sentimentColor}`}>
                                                        {sentimentEmoji} {message.sentiment || 'neutral'}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <Zap className={`h-4 w-4 ${(message.urgency_score || 0) >= 7 ? 'text-red-500' : 'text-gray-400'}`} />
                                                        <span className={`text-sm font-semibold ${(message.urgency_score || 0) >= 7 ? 'text-red-600' : 'text-gray-600'}`}>
                                                            {message.urgency_score || 0}/10
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="text-gray-800 mb-3">{message.message_body}</p>

                                            {message.keywords && message.keywords.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {message.keywords.map((keyword, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                                        >
                                                            #{keyword}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {message.category && (
                                                <div className="mb-3">
                                                    <span className="text-xs text-gray-500">Categoria: </span>
                                                    <span className="text-xs font-semibold text-indigo-600">{message.category}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                                <p className="text-xs text-gray-500">
                                                    ⏰ {formatDate(message.created_at)}
                                                </p>
                                                <p className="text-xs text-gray-400">ID: {message.external_id || message.id.slice(0, 8)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
