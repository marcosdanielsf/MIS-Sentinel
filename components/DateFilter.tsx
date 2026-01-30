'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export type DateRange = {
    startDate: Date;
    endDate: Date;
    label: string;
};

interface DateFilterProps {
    onDateChange: (range: DateRange) => void;
    showMessagesPerMinute?: boolean;
    messagesPerMinute?: number;
}

const presetRanges = [
    { label: 'Hoje', days: 0 },
    { label: 'Últimos 7 dias', days: 7 },
    { label: 'Últimos 15 dias', days: 15 },
    { label: 'Últimos 30 dias', days: 30 },
    { label: 'Últimos 90 dias', days: 90 },
];

export default function DateFilter({ onDateChange, showMessagesPerMinute = false, messagesPerMinute = 0 }: DateFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState('Últimos 7 dias');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePresetClick = (label: string, days: number) => {
        const endDate = new Date();
        const startDate = new Date();

        if (days === 0) {
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate.setDate(startDate.getDate() - days);
        }

        setSelectedLabel(label);
        setIsOpen(false);
        onDateChange({ startDate, endDate, label });
    };

    const handleCustomRange = () => {
        if (customStart && customEnd) {
            const startDate = new Date(customStart);
            const endDate = new Date(customEnd);
            endDate.setHours(23, 59, 59, 999);

            const label = `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`;
            setSelectedLabel(label);
            setIsOpen(false);
            onDateChange({ startDate, endDate, label });
        }
    };

    return (
        <div className="flex items-center gap-4">
            {/* Messages per minute indicator */}
            {showMessagesPerMinute && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-accent-primary text-white px-4 py-2 rounded-lg">
                    <div className="flex items-center gap-1">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                    </div>
                    <div>
                        <p className="text-xs opacity-90">Msgs/min</p>
                        <p className="text-lg font-bold">{messagesPerMinute.toFixed(1)}</p>
                    </div>
                </div>
            )}

            {/* Date filter dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 bg-bg-secondary border border-border-default rounded-lg px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-tertiary hover:border-border-hover transition-colors"
                >
                    <Calendar className="h-4 w-4 text-text-muted" />
                    <span>{selectedLabel}</span>
                    <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-bg-secondary rounded-lg shadow-lg border border-border-default z-50">
                        <div className="p-2">
                            <p className="text-xs font-semibold text-text-muted uppercase px-3 py-2">Períodos</p>
                            {presetRanges.map((range) => (
                                <button
                                    key={range.label}
                                    onClick={() => handlePresetClick(range.label, range.days)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                        selectedLabel === range.label 
                                            ? 'bg-accent-primary/20 text-accent-primary font-medium' 
                                            : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                    }`}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-border-default p-3">
                            <p className="text-xs font-semibold text-text-muted uppercase mb-2">Período personalizado</p>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="flex-1 px-2 py-1 text-sm bg-bg-tertiary border border-border-default rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                                />
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="flex-1 px-2 py-1 text-sm bg-bg-tertiary border border-border-default rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                                />
                            </div>
                            <button
                                onClick={handleCustomRange}
                                disabled={!customStart || !customEnd}
                                className="w-full px-3 py-1.5 text-sm bg-accent-primary text-white rounded-md hover:bg-blue-600 disabled:bg-bg-hover disabled:text-text-muted disabled:cursor-not-allowed transition-colors"
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
