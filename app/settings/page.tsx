'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import { Settings, User, Bell, Shield, Database, Webhook, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';

type SettingsTab = 'profile' | 'notifications' | 'security' | 'integrations';

export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    // Profile state
    const [profile, setProfile] = useState({
        name: 'Marcos Daniels',
        email: 'marcos@mottivme.com',
        company: 'Mottivme',
        role: 'Administrador',
        timezone: 'America/Sao_Paulo',
    });

    // Notifications state
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        criticalAlerts: true,
        dailyDigest: false,
        weeklyReport: true,
        newIssues: true,
        resolvedIssues: false,
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const handleSave = async () => {
        setSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const tabs = [
        { id: 'profile' as SettingsTab, label: 'Perfil', icon: User },
        { id: 'notifications' as SettingsTab, label: 'Notificações', icon: Bell },
        { id: 'security' as SettingsTab, label: 'Segurança', icon: Shield },
        { id: 'integrations' as SettingsTab, label: 'Integrações', icon: Webhook },
    ];

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-6 max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Settings className="h-7 w-7 text-gray-600" />
                                Configurações
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Gerencie suas preferências e configurações do sistema
                            </p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : saved ? (
                                <CheckCircle className="h-5 w-5" />
                            ) : (
                                <Save className="h-5 w-5" />
                            )}
                            {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Alterações'}
                        </button>
                    </div>

                    <div className="flex gap-6">
                        {/* Tabs Sidebar */}
                        <div className="w-56 space-y-1">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Informações do Perfil</h3>

                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                                            {profile.name.charAt(0)}
                                        </div>
                                        <div>
                                            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                                Alterar Foto
                                            </button>
                                            <p className="text-xs text-gray-500 mt-1">JPG, PNG max 2MB</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                                            <input
                                                type="text"
                                                value={profile.name}
                                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                            <input
                                                type="email"
                                                value={profile.email}
                                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
                                            <input
                                                type="text"
                                                value={profile.company}
                                                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Cargo</label>
                                            <input
                                                type="text"
                                                value={profile.role}
                                                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Fuso Horário</label>
                                            <select
                                                value={profile.timezone}
                                                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            >
                                                <option value="America/Sao_Paulo">America/Sao_Paulo (GMT-3)</option>
                                                <option value="America/New_York">America/New_York (GMT-5)</option>
                                                <option value="Europe/London">Europe/London (GMT+0)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notifications Tab */}
                            {activeTab === 'notifications' && (
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Preferências de Notificação</h3>

                                    <div className="space-y-4">
                                        {[
                                            { key: 'emailAlerts', label: 'Alertas por Email', desc: 'Receber alertas críticos por email' },
                                            { key: 'criticalAlerts', label: 'Alertas Críticos', desc: 'Notificações push para issues críticas' },
                                            { key: 'dailyDigest', label: 'Resumo Diário', desc: 'Resumo diário de atividades às 9h' },
                                            { key: 'weeklyReport', label: 'Relatório Semanal', desc: 'Relatório de performance toda segunda-feira' },
                                            { key: 'newIssues', label: 'Novas Issues', desc: 'Notificar quando novas issues forem criadas' },
                                            { key: 'resolvedIssues', label: 'Issues Resolvidas', desc: 'Notificar quando issues forem resolvidas' },
                                        ].map((item) => (
                                            <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                                <div>
                                                    <p className="font-medium text-gray-900">{item.label}</p>
                                                    <p className="text-sm text-gray-500">{item.desc}</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={notifications[item.key as keyof typeof notifications]}
                                                        onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Security Tab */}
                            {activeTab === 'security' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Segurança da Conta</h3>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between py-4 border-b border-gray-100">
                                                <div>
                                                    <p className="font-medium text-gray-900">Autenticação de Dois Fatores</p>
                                                    <p className="text-sm text-gray-500">Adicione uma camada extra de segurança</p>
                                                </div>
                                                <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                                    Ativar
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between py-4 border-b border-gray-100">
                                                <div>
                                                    <p className="font-medium text-gray-900">Alterar Senha</p>
                                                    <p className="text-sm text-gray-500">Última alteração há 30 dias</p>
                                                </div>
                                                <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                                    Alterar
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">Sessões Ativas</p>
                                                    <p className="text-sm text-gray-500">2 dispositivos conectados</p>
                                                </div>
                                                <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                                    Gerenciar
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                                        <h4 className="font-medium text-red-900 mb-2">Zona de Perigo</h4>
                                        <p className="text-sm text-red-700 mb-4">Ações irreversíveis para sua conta</p>
                                        <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                                            Excluir Conta
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Integrations Tab */}
                            {activeTab === 'integrations' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-6">API & Webhooks</h3>

                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Chave da API</label>
                                            <div className="flex gap-2">
                                                <div className="flex-1 relative">
                                                    <input
                                                        type={showApiKey ? 'text' : 'password'}
                                                        value="sk_live_mottivme_sentinel_abc123xyz789"
                                                        readOnly
                                                        className="w-full px-4 py-2 pr-10 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                                                    />
                                                    <button
                                                        onClick={() => setShowApiKey(!showApiKey)}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                                <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                                    Copiar
                                                </button>
                                                <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                                    Regenerar
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                                            <input
                                                type="text"
                                                placeholder="https://seu-servidor.com/webhook"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">URL para receber eventos do SENTINEL</p>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg shadow p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Integrações Conectadas</h3>

                                        <div className="space-y-4">
                                            {[
                                                { name: 'Supabase', status: 'connected', color: 'bg-green-500' },
                                                { name: 'n8n', status: 'connected', color: 'bg-orange-500' },
                                                { name: 'WhatsApp Business', status: 'pending', color: 'bg-yellow-500' },
                                            ].map((integration) => (
                                                <div key={integration.name} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 ${integration.color} rounded-lg flex items-center justify-center text-white`}>
                                                            <Database className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{integration.name}</p>
                                                            <p className="text-sm text-gray-500">
                                                                {integration.status === 'connected' ? 'Conectado' : 'Pendente'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button className={`px-4 py-2 rounded-lg text-sm font-medium ${integration.status === 'connected'
                                                        ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                        }`}>
                                                        {integration.status === 'connected' ? 'Configurar' : 'Conectar'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
