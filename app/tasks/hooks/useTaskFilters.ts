'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export interface TaskFilters {
    project: string;
    priority: string;
    showCompleted: boolean;
    showCancelled: boolean;
    search: string;
}

export interface Task {
    id: string;
    project_key: string;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    notes: string | null;
    created_at: string;
    updated_at: string;
    started_at: string | null;
    completed_at: string | null;
    due_date: string | null;
    estimated_hours: number | null;
    actual_hours: number | null;
    time_to_start_minutes: number | null;
    time_to_complete_minutes: number | null;
    total_duration_minutes: number | null;
    assigned_to: string | null;
}

const STORAGE_KEY = 'kanban-filters';

const DEFAULT_FILTERS: TaskFilters = {
    project: 'all',
    priority: 'all',
    showCompleted: false,
    showCancelled: false,
    search: '',
};

export function useTaskFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Initialize filters from URL params first, then localStorage, then defaults
    const getInitialFilters = useCallback((): TaskFilters => {
        // Try URL params first
        const projectParam = searchParams.get('project');
        const priorityParam = searchParams.get('priority');
        const showCompletedParam = searchParams.get('showCompleted');
        const showCancelledParam = searchParams.get('showCancelled');
        const searchParam = searchParams.get('search');

        const hasUrlParams = projectParam || priorityParam || showCompletedParam || showCancelledParam || searchParam;

        if (hasUrlParams) {
            return {
                project: projectParam || 'all',
                priority: priorityParam || 'all',
                showCompleted: showCompletedParam === 'true',
                showCancelled: showCancelledParam === 'true',
                search: searchParam || '',
            };
        }

        // Try localStorage
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    return { ...DEFAULT_FILTERS, ...parsed };
                }
            } catch (e) {
                console.warn('Failed to load filters from localStorage:', e);
            }
        }

        return DEFAULT_FILTERS;
    }, [searchParams]);

    const [filters, setFiltersState] = useState<TaskFilters>(DEFAULT_FILTERS);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize on mount
    useEffect(() => {
        const initial = getInitialFilters();
        setFiltersState(initial);
        setIsInitialized(true);
    }, [getInitialFilters]);

    // Sync to localStorage whenever filters change
    useEffect(() => {
        if (!isInitialized) return;
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
        } catch (e) {
            console.warn('Failed to save filters to localStorage:', e);
        }
    }, [filters, isInitialized]);

    // Sync to URL params whenever filters change
    useEffect(() => {
        if (!isInitialized) return;

        const params = new URLSearchParams();

        if (filters.project !== 'all') params.set('project', filters.project);
        if (filters.priority !== 'all') params.set('priority', filters.priority);
        if (filters.showCompleted) params.set('showCompleted', 'true');
        if (filters.showCancelled) params.set('showCancelled', 'true');
        if (filters.search) params.set('search', filters.search);

        const queryString = params.toString();
        const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

        // Use replaceState to avoid polluting browser history
        window.history.replaceState(null, '', newUrl);
    }, [filters, pathname, isInitialized]);

    const setFilters = useCallback((updates: Partial<TaskFilters>) => {
        setFiltersState((prev) => ({ ...prev, ...updates }));
    }, []);

    const resetFilters = useCallback(() => {
        setFiltersState(DEFAULT_FILTERS);
    }, []);

    const hasActiveFilters = useMemo(() => {
        return (
            filters.project !== 'all' ||
            filters.priority !== 'all' ||
            filters.showCompleted ||
            filters.showCancelled ||
            filters.search.trim() !== ''
        );
    }, [filters]);

    // Filter tasks based on current filters
    const filterTasks = useCallback(
        (tasks: Task[]): Task[] => {
            return tasks.filter((task) => {
                // Project filter
                if (filters.project !== 'all' && task.project_key !== filters.project) {
                    return false;
                }

                // Priority filter
                if (filters.priority !== 'all' && task.priority !== filters.priority) {
                    return false;
                }

                // Status filters
                if (!filters.showCompleted && task.status === 'completed') {
                    return false;
                }
                if (!filters.showCancelled && task.status === 'cancelled') {
                    return false;
                }

                // Search filter
                if (filters.search.trim()) {
                    const searchLower = filters.search.toLowerCase();
                    const titleMatch = task.title.toLowerCase().includes(searchLower);
                    const descriptionMatch = task.description?.toLowerCase().includes(searchLower);
                    if (!titleMatch && !descriptionMatch) {
                        return false;
                    }
                }

                return true;
            });
        },
        [filters]
    );

    // Get the shareable URL with current filters
    const getShareableUrl = useCallback(() => {
        if (typeof window === 'undefined') return '';
        
        const params = new URLSearchParams();

        if (filters.project !== 'all') params.set('project', filters.project);
        if (filters.priority !== 'all') params.set('priority', filters.priority);
        if (filters.showCompleted) params.set('showCompleted', 'true');
        if (filters.showCancelled) params.set('showCancelled', 'true');
        if (filters.search) params.set('search', filters.search);

        const queryString = params.toString();
        return queryString 
            ? `${window.location.origin}${pathname}?${queryString}`
            : `${window.location.origin}${pathname}`;
    }, [filters, pathname]);

    return {
        filters,
        setFilters,
        resetFilters,
        hasActiveFilters,
        filterTasks,
        getShareableUrl,
        isInitialized,
    };
}
