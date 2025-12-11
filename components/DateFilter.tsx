'use client';

import { useState } from 'react';
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
                <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-lg shadow">
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
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                >
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{selectedLabel}</span>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="p-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">Períodos</p>
                            {presetRanges.map((range) => (
                                <button
                                    key={range.label}
                                    onClick={() => handlePresetClick(range.label, range.days)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${
                                        selectedLabel === range.label ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                                    }`}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-gray-200 p-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Período personalizado</p>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                            </div>
                            <button
                                onClick={handleCustomRange}
                                disabled={!customStart || !customEnd}
                                className="w-full px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
