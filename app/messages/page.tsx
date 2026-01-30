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
    positive: 'bg-accent-success/20 text-accent-success border border-accent-success/30',
    neutral: 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30',
    negative: 'bg-accent-error/20 text-accent-error border border-accent-error/30',
    urgent: 'bg-accent-warning/20 text-accent-warning border border-accent-warning/30',
    mixed: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
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
            <div className="flex items-center justify-center min-h-screen bg-bg-primary">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto"></div>
                    <p className="mt-4 text-text-secondary">Carregando...</p>
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
        <div className="flex min-h-screen bg-bg-primary">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-text-primary">💬 Mensagens Monitoradas</h1>
                            <p className="mt-2 text-text-secondary">
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
                        <div className="bg-bg-secondary p-6 rounded-lg border border-border-default hover:border-border-hover transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-secondary">Total no Período</p>
                                    <p className="text-3xl font-bold text-text-primary mt-1">{stats.total}</p>
                                </div>
                                <MessageSquare className="h-12 w-12 text-accent-primary" />
                            </div>
                        </div>

                        <div className="bg-bg-secondary p-6 rounded-lg border border-border-default hover:border-border-hover transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-secondary">Alta Urgência</p>
                                    <p className="text-3xl font-bold text-accent-warning mt-1">{stats.highUrgency}</p>
                                </div>
                                <Zap className="h-12 w-12 text-accent-warning" />
                            </div>
                        </div>

                        <div className="bg-bg-secondary p-6 rounded-lg border border-border-default hover:border-border-hover transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-secondary">Positivas</p>
                                    <p className="text-3xl font-bold text-accent-success mt-1">{stats.positive}</p>
                                </div>
                                <TrendingUp className="h-12 w-12 text-accent-success" />
                            </div>
                        </div>

                        <div className="bg-bg-secondary p-6 rounded-lg border border-border-default hover:border-border-hover transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-secondary">Urgentes</p>
                                    <p className="text-3xl font-bold text-accent-error mt-1">{stats.urgent}</p>
                                </div>
                                <Filter className="h-12 w-12 text-accent-error" />
                            </div>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="bg-bg-secondary p-6 rounded-lg border border-border-default mb-6">
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="Buscar mensagens, remetentes ou tópicos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Remetente</label>
                                <select
                                    value={filterSender}
                                    onChange={(e) => setFilterSender(e.target.value)}
                                    className="w-full px-4 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-colors"
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
                                <label className="block text-sm font-medium text-text-secondary mb-2">Grupo</label>
                                <select
                                    value={filterGroup}
                                    onChange={(e) => setFilterGroup(e.target.value)}
                                    className="w-full px-4 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-colors"
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
                                <label className="block text-sm font-medium text-text-secondary mb-2">Sentimento</label>
                                <select
                                    value={filterSentiment}
                                    onChange={(e) => setFilterSentiment(e.target.value)}
                                    className="w-full px-4 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-colors"
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
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Urgência Mín: {minUrgency}
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    value={minUrgency}
                                    onChange={(e) => setMinUrgency(Number(e.target.value))}
                                    className="w-full accent-accent-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Messages List */}
                    <div className="space-y-4">
                        {loadingMessages ? (
                            <div className="bg-bg-secondary p-12 rounded-lg border border-border-default text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto"></div>
                                <p className="mt-4 text-text-secondary">Carregando mensagens...</p>
                            </div>
                        ) : filteredMessages.length === 0 ? (
                            <div className="bg-bg-secondary p-12 rounded-lg border border-border-default text-center">
                                <MessageSquare className="h-16 w-16 text-text-muted mx-auto mb-4" />
                                <p className="text-text-primary font-semibold text-lg">Nenhuma mensagem encontrada</p>
                                <p className="text-text-secondary mt-2">Tente ajustar os filtros de busca ou o período</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4 text-sm text-text-secondary">
                                    Mostrando {filteredMessages.length} de {messages.length} mensagens no período
                                </div>

                                {filteredMessages.map((message) => {
                                    const sentimentColor = message.sentiment ? (sentimentColors[message.sentiment] || sentimentColors.neutral) : sentimentColors.neutral;
                                    const sentimentEmoji = message.sentiment ? (sentimentEmojis[message.sentiment] || '💬') : '💬';

                                    return (
                                        <div key={message.id} className="bg-bg-secondary rounded-lg border border-border-default p-6 hover:bg-bg-tertiary hover:border-border-hover transition-all duration-200">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-accent-primary flex items-center justify-center text-white font-medium">
                                                        {(message.group_sender_name || message.sender_name).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-text-primary">{message.group_sender_name || message.sender_name}</p>
                                                        <p className="text-sm text-text-muted">{message.group_name || message.sender_name}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sentimentColor}`}>
                                                        {sentimentEmoji} {message.sentiment || 'neutral'}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <Zap className={`h-4 w-4 ${(message.urgency_score || 0) >= 7 ? 'text-accent-error' : 'text-text-muted'}`} />
                                                        <span className={`text-sm font-semibold ${(message.urgency_score || 0) >= 7 ? 'text-accent-error' : 'text-text-secondary'}`}>
                                                            {message.urgency_score || 0}/10
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="text-text-primary mb-3">{message.message_body}</p>

                                            {message.keywords && message.keywords.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {message.keywords.map((keyword, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-2 py-1 bg-bg-tertiary text-text-secondary rounded text-xs border border-border-default"
                                                        >
                                                            #{keyword}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {message.category && (
                                                <div className="mb-3">
                                                    <span className="text-xs text-text-muted">Categoria: </span>
                                                    <span className="text-xs font-semibold text-accent-primary">{message.category}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-3 border-t border-border-default">
                                                <p className="text-xs text-text-muted">
                                                    ⏰ {formatDate(message.created_at)}
                                                </p>
                                                <p className="text-xs text-text-muted">ID: {message.external_id || message.id.slice(0, 8)}</p>
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
