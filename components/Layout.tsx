'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
    children: ReactNode;
    className?: string;
}

export default function Layout({ children, className = '' }: LayoutProps) {
    return (
        <div className="flex min-h-screen bg-bg-primary">
            <Sidebar />
            <main className={`flex-1 overflow-auto ${className}`}>
                {children}
            </main>
        </div>
    );
}

// Page header component
interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    actions?: ReactNode;
}

export function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                    {icon}
                    {title}
                </h1>
                {description && (
                    <p className="mt-2 text-text-secondary">{description}</p>
                )}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
    );
}

// Page content wrapper
interface PageContentProps {
    children: ReactNode;
    className?: string;
}

export function PageContent({ children, className = '' }: PageContentProps) {
    return (
        <div className={`p-6 lg:p-8 pt-20 lg:pt-8 ${className}`}>
            {children}
        </div>
    );
}

// Card component
interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
}

export function Card({ children, className = '', hover = true }: CardProps) {
    return (
        <div
            className={`
                bg-bg-secondary border border-border-default rounded-lg
                ${hover ? 'transition-all duration-200 hover:border-border-hover' : ''}
                ${className}
            `}
        >
            {children}
        </div>
    );
}

// Card header
interface CardHeaderProps {
    title: string;
    icon?: ReactNode;
    actions?: ReactNode;
}

export function CardHeader({ title, icon, actions }: CardHeaderProps) {
    return (
        <div className="flex items-center justify-between p-4 border-b border-border-default">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
                {icon}
                {title}
            </h3>
            {actions}
        </div>
    );
}

// Card content
interface CardContentProps {
    children: ReactNode;
    className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
    return <div className={`p-4 ${className}`}>{children}</div>;
}

// Empty state component
interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="text-center py-12">
            {icon && <div className="mb-4 text-text-muted">{icon}</div>}
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            {description && (
                <p className="mt-2 text-text-secondary max-w-md mx-auto">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

// Loading spinner
export function LoadingSpinner({ className = '' }: { className?: string }) {
    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-primary border-t-transparent" />
        </div>
    );
}

// Full page loading
export function PageLoading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-bg-primary">
            <div className="text-center">
                <LoadingSpinner />
                <p className="mt-4 text-text-secondary">Carregando...</p>
            </div>
        </div>
    );
}
