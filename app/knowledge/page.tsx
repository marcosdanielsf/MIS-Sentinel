'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import DateFilter, { DateRange } from '@/components/DateFilter';
import {
    BookOpen,
    Search,
    Plus,
    ThumbsUp,
    Eye,
    Tag,
    ChevronDown,
    ChevronUp,
    FileText,
    Lightbulb,
    HelpCircle,
    CheckCircle,
} from 'lucide-react';

interface KnowledgeEntry {
    id: string;
    category: string;
    subcategory: string | null;
    question: string | null;
    answer: string | null;
    title: string | null;
    content: string | null;
    tags: string[];
    usage_count: number;
    helpful_votes: number;
    status: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    faq: HelpCircle,
    solution: CheckCircle,
    process: FileText,
    best_practice: Lightbulb,
};

const categoryColors: Record<string, string> = {
    faq: 'bg-blue-100 text-blue-800',
    solution: 'bg-green-100 text-green-800',
    process: 'bg-purple-100 text-purple-800',
    best_practice: 'bg-orange-100 text-orange-800',
};

const categoryLabels: Record<string, string> = {
    faq: 'FAQ',
    solution: 'Solução',
    process: 'Processo',
    best_practice: 'Boa Prática',
};

export default function KnowledgePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<KnowledgeEntry[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
    const [showAddForm, setShowAddForm] = useState(false);

    // Form states
    const [newEntry, setNewEntry] = useState({
        category: 'faq',
        question: '',
        answer: '',
        title: '',
        content: '',
        tags: '',
    });

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const fetchKnowledge = useCallback(async () => {
        try {
            setLoadingData(true);
            const { data, error } = await supabase
                .from('knowledge_base')
                .select('*')
                .eq('status', 'published')
                .order('usage_count', { ascending: false });

            if (error) {
                console.error('Error fetching knowledge:', error);
                setEntries([]);
            } else {
                setEntries(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch knowledge:', error);
            setEntries([]);
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchKnowledge();
        }
    }, [user, fetchKnowledge]);

    useEffect(() => {
        let filtered = entries;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (e) =>
                    e.question?.toLowerCase().includes(term) ||
                    e.answer?.toLowerCase().includes(term) ||
                    e.title?.toLowerCase().includes(term) ||
                    e.content?.toLowerCase().includes(term) ||
                    e.tags?.some(t => t.toLowerCase().includes(term))
            );
        }

        if (filterCategory !== 'all') {
            filtered = filtered.filter((e) => e.category === filterCategory);
        }

        setFilteredEntries(filtered);
    }, [searchTerm, filterCategory, entries]);

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedEntries);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedEntries(newExpanded);
    };

    const handleVote = async (id: string) => {
        try {
            const entry = entries.find(e => e.id === id);
            if (!entry) return;

            await supabase
                .from('knowledge_base')
                .update({ helpful_votes: (entry.helpful_votes || 0) + 1 })
                .eq('id', id);

            fetchKnowledge();
        } catch (error) {
            console.error('Failed to vote:', error);
        }
    };

    const handleAddEntry = async () => {
        try {
            const entryData: Record<string, unknown> = {
                category: newEntry.category,
                status: 'published',
                created_by: user?.username || 'Unknown',
                tags: newEntry.tags.split(',').map(t => t.trim()).filter(t => t),
            };

            if (newEntry.category === 'faq') {
                entryData.question = newEntry.question;
                entryData.answer = newEntry.answer;
            } else {
                entryData.title = newEntry.title;
                entryData.content = newEntry.content;
            }

            await supabase.from('knowledge_base').insert(entryData);

            setShowAddForm(false);
            setNewEntry({ category: 'faq', question: '', answer: '', title: '', content: '', tags: '' });
            fetchKnowledge();
        } catch (error) {
            console.error('Failed to add entry:', error);
        }
    };

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
        total: entries.length,
        faqs: entries.filter(e => e.category === 'faq').length,
        solutions: entries.filter(e => e.category === 'solution').length,
        processes: entries.filter(e => e.category === 'process').length,
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />

            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">📚 Knowledge Base</h1>
                            <p className="mt-2 text-gray-600">
                                FAQs, soluções e conhecimento documentado pelo SENTINEL
                            </p>
                        </div>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            <Plus className="h-5 w-5" />
                            Adicionar
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total de Entradas</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                                </div>
                                <BookOpen className="h-12 w-12 text-indigo-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">FAQs</p>
                                    <p className="text-3xl font-bold text-blue-600 mt-1">{stats.faqs}</p>
                                </div>
                                <HelpCircle className="h-12 w-12 text-blue-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Soluções</p>
                                    <p className="text-3xl font-bold text-green-600 mt-1">{stats.solutions}</p>
                                </div>
                                <CheckCircle className="h-12 w-12 text-green-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Processos</p>
                                    <p className="text-3xl font-bold text-purple-600 mt-1">{stats.processes}</p>
                                </div>
                                <FileText className="h-12 w-12 text-purple-500" />
                            </div>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="bg-white p-6 rounded-lg shadow mb-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por pergunta, resposta ou tags..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">Todas Categorias</option>
                                    <option value="faq">FAQs</option>
                                    <option value="solution">Soluções</option>
                                    <option value="process">Processos</option>
                                    <option value="best_practice">Boas Práticas</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Add Form Modal */}
                    {showAddForm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                <h2 className="text-xl font-semibold mb-4">Adicionar ao Knowledge Base</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                                        <select
                                            value={newEntry.category}
                                            onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        >
                                            <option value="faq">FAQ</option>
                                            <option value="solution">Solução</option>
                                            <option value="process">Processo</option>
                                            <option value="best_practice">Boa Prática</option>
                                        </select>
                                    </div>

                                    {newEntry.category === 'faq' ? (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Pergunta</label>
                                                <input
                                                    type="text"
                                                    value={newEntry.question}
                                                    onChange={(e) => setNewEntry({ ...newEntry, question: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                    placeholder="Ex: Como faço para..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Resposta</label>
                                                <textarea
                                                    value={newEntry.answer}
                                                    onChange={(e) => setNewEntry({ ...newEntry, answer: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                    rows={5}
                                                    placeholder="A resposta detalhada..."
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                                                <input
                                                    type="text"
                                                    value={newEntry.title}
                                                    onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                    placeholder="Título do documento"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
                                                <textarea
                                                    value={newEntry.content}
                                                    onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                    rows={8}
                                                    placeholder="O conteúdo completo..."
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tags (separadas por vírgula)</label>
                                        <input
                                            type="text"
                                            value={newEntry.tags}
                                            onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            placeholder="vendas, cliente, processo"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        onClick={() => setShowAddForm(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAddEntry}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                        Salvar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Knowledge List */}
                    <div className="space-y-4">
                        {loadingData ? (
                            <div className="bg-white p-12 rounded-lg shadow text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Carregando knowledge base...</p>
                            </div>
                        ) : filteredEntries.length === 0 ? (
                            <div className="bg-white p-12 rounded-lg shadow text-center">
                                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-900 font-semibold text-lg">Nenhuma entrada encontrada</p>
                                <p className="text-gray-500 mt-2">
                                    {searchTerm || filterCategory !== 'all'
                                        ? 'Tente ajustar sua busca ou filtros'
                                        : 'Comece adicionando conhecimento ao sistema'}
                                </p>
                            </div>
                        ) : (
                            filteredEntries.map((entry) => {
                                const Icon = categoryIcons[entry.category] || BookOpen;
                                const isExpanded = expandedEntries.has(entry.id);

                                return (
                                    <div key={entry.id} className="bg-white rounded-lg shadow overflow-hidden">
                                        <div
                                            className="p-6 cursor-pointer hover:bg-gray-50"
                                            onClick={() => toggleExpand(entry.id)}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 rounded-lg ${categoryColors[entry.category] || 'bg-gray-100'}`}>
                                                    <Icon className="h-6 w-6" />
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${categoryColors[entry.category]}`}>
                                                            {categoryLabels[entry.category] || entry.category}
                                                        </span>
                                                        {entry.tags?.slice(0, 3).map((tag, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs flex items-center gap-1">
                                                                <Tag className="h-3 w-3" />
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {entry.question || entry.title}
                                                    </h3>

                                                    {!isExpanded && (
                                                        <p className="text-gray-600 mt-2 line-clamp-2">
                                                            {entry.answer || entry.content}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="h-4 w-4" />
                                                        {entry.usage_count || 0}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <ThumbsUp className="h-4 w-4" />
                                                        {entry.helpful_votes || 0}
                                                    </span>
                                                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-6 pb-6 border-t">
                                                <div className="mt-4 prose max-w-none">
                                                    <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                                                        {entry.answer || entry.content}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                                    <div className="text-sm text-gray-500">
                                                        {entry.created_by && `Por ${entry.created_by} · `}
                                                        {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleVote(entry.id);
                                                        }}
                                                        className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                    >
                                                        <ThumbsUp className="h-4 w-4" />
                                                        Foi útil
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
