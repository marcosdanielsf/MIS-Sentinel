'use client';

import { useState, useCallback } from 'react';
import {
    Search,
    Filter,
    X,
    ChevronDown,
    CheckCircle,
    XCircle,
    Link2,
} from 'lucide-react';
import { TaskFilters } from '../hooks/useTaskFilters';

interface Project {
    project_key: string;
    project_name: string;
}

interface KanbanFiltersProps {
    filters: TaskFilters;
    onFiltersChange: (updates: Partial<TaskFilters>) => void;
    onReset: () => void;
    hasActiveFilters: boolean;
    projects: Project[];
    totalTasks: number;
    filteredCount: number;
    getShareableUrl: () => string;
}

const PRIORITY_OPTIONS = [
    { value: 'all', label: 'Todas Prioridades' },
    { value: 'urgent', label: 'Urgente', color: 'bg-accent-error/20 text-accent-error' },
    { value: 'high', label: 'Alta', color: 'bg-accent-warning/20 text-accent-warning' },
    { value: 'medium', label: 'Média', color: 'bg-yellow-500/20 text-yellow-400' },
    { value: 'low', label: 'Baixa', color: 'bg-accent-primary/20 text-accent-primary' },
];

export default function KanbanFilters({
    filters,
    onFiltersChange,
    onReset,
    hasActiveFilters,
    projects,
    totalTasks,
    filteredCount,
    getShareableUrl,
}: KanbanFiltersProps) {
    const [showCopiedToast, setShowCopiedToast] = useState(false);

    const handleCopyLink = useCallback(() => {
        const url = getShareableUrl();
        navigator.clipboard.writeText(url).then(() => {
            setShowCopiedToast(true);
            setTimeout(() => setShowCopiedToast(false), 2000);
        });
    }, [getShareableUrl]);

    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onFiltersChange({ search: e.target.value });
        },
        [onFiltersChange]
    );

    const handleSearchClear = useCallback(() => {
        onFiltersChange({ search: '' });
    }, [onFiltersChange]);

    return (
        <div className="bg-bg-secondary rounded-lg border border-border-default mb-6">
            <div className="p-4">
                {/* Main Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Filter Icon */}
                    <div className="flex items-center gap-2 text-text-secondary">
                        <Filter className="h-5 w-5" />
                        <span className="text-sm font-medium hidden sm:inline">Filtros</span>
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={handleSearchChange}
                            placeholder="Buscar por título ou descrição..."
                            className="w-full pl-9 pr-8 py-2 text-sm bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                        />
                        {filters.search && (
                            <button
                                onClick={handleSearchClear}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Project Dropdown */}
                    <div className="relative">
                        <select
                            value={filters.project}
                            onChange={(e) => onFiltersChange({ project: e.target.value })}
                            className="appearance-none pl-3 pr-8 py-2 text-sm bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary cursor-pointer min-w-[150px]"
                        >
                            <option value="all">Todos Projetos</option>
                            {projects.map((project) => (
                                <option key={project.project_key} value={project.project_key}>
                                    {project.project_name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                    </div>

                    {/* Priority Dropdown */}
                    <div className="relative">
                        <select
                            value={filters.priority}
                            onChange={(e) => onFiltersChange({ priority: e.target.value })}
                            className="appearance-none pl-3 pr-8 py-2 text-sm bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary cursor-pointer min-w-[140px]"
                        >
                            {PRIORITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                    </div>

                    {/* Toggle Buttons */}
                    <div className="flex items-center gap-2">
                        {/* Show Completed Toggle */}
                        <button
                            onClick={() => onFiltersChange({ showCompleted: !filters.showCompleted })}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                                filters.showCompleted
                                    ? 'bg-accent-success/10 border-accent-success/30 text-accent-success'
                                    : 'bg-bg-tertiary border-border-default text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                            }`}
                            title="Mostrar tarefas concluídas"
                        >
                            <CheckCircle className="h-4 w-4" />
                            <span className="hidden lg:inline">Concluídas</span>
                        </button>

                        {/* Show Cancelled Toggle */}
                        <button
                            onClick={() => onFiltersChange({ showCancelled: !filters.showCancelled })}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                                filters.showCancelled
                                    ? 'bg-bg-hover border-border-hover text-text-primary'
                                    : 'bg-bg-tertiary border-border-default text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                            }`}
                            title="Mostrar tarefas canceladas"
                        >
                            <XCircle className="h-4 w-4" />
                            <span className="hidden lg:inline">Canceladas</span>
                        </button>
                    </div>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={onReset}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-accent-error hover:bg-accent-error/10 rounded-lg transition-colors"
                        >
                            <X className="h-4 w-4" />
                            <span>Limpar</span>
                        </button>
                    )}

                    {/* Share Link Button */}
                    <div className="relative ml-auto">
                        <button
                            onClick={handleCopyLink}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors"
                            title="Copiar link com filtros"
                        >
                            <Link2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Compartilhar</span>
                        </button>

                        {/* Copied Toast */}
                        {showCopiedToast && (
                            <div className="absolute right-0 top-full mt-2 px-3 py-1.5 bg-bg-tertiary text-text-primary text-xs rounded-lg shadow-lg border border-border-default whitespace-nowrap z-10">
                                Link copiado!
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Counter */}
                <div className="mt-3 pt-3 border-t border-border-default flex items-center justify-between">
                    <p className="text-sm text-text-secondary">
                        Mostrando{' '}
                        <span className="font-semibold text-text-primary">{filteredCount}</span>
                        {' de '}
                        <span className="font-semibold text-text-primary">{totalTasks}</span>
                        {' tasks'}
                    </p>

                    {/* Active Filters Tags */}
                    {hasActiveFilters && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {filters.project !== 'all' && (
                                <FilterTag
                                    label={projects.find((p) => p.project_key === filters.project)?.project_name || filters.project}
                                    onRemove={() => onFiltersChange({ project: 'all' })}
                                />
                            )}
                            {filters.priority !== 'all' && (
                                <FilterTag
                                    label={PRIORITY_OPTIONS.find((p) => p.value === filters.priority)?.label || filters.priority}
                                    onRemove={() => onFiltersChange({ priority: 'all' })}
                                    color={PRIORITY_OPTIONS.find((p) => p.value === filters.priority)?.color}
                                />
                            )}
                            {filters.search && (
                                <FilterTag
                                    label={`"${filters.search}"`}
                                    onRemove={() => onFiltersChange({ search: '' })}
                                />
                            )}
                            {filters.showCompleted && (
                                <FilterTag
                                    label="Concluídas"
                                    onRemove={() => onFiltersChange({ showCompleted: false })}
                                    color="bg-accent-success/20 text-accent-success"
                                />
                            )}
                            {filters.showCancelled && (
                                <FilterTag
                                    label="Canceladas"
                                    onRemove={() => onFiltersChange({ showCancelled: false })}
                                    color="bg-bg-hover text-text-secondary"
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper component for filter tags
function FilterTag({
    label,
    onRemove,
    color = 'bg-accent-primary/20 text-accent-primary',
}: {
    label: string;
    onRemove: () => void;
    color?: string;
}) {
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
        >
            {label}
            <button
                onClick={onRemove}
                className="hover:bg-white/10 rounded-full p-0.5 transition-colors"
            >
                <X className="h-3 w-3" />
            </button>
        </span>
    );
}
