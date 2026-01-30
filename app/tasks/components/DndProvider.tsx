'use client';

import React, { ReactNode } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    MeasuringStrategy,
} from '@dnd-kit/core';
import {
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

interface DndProviderProps {
    children: ReactNode;
    onDragStart?: (event: DragStartEvent) => void;
    onDragOver?: (event: DragOverEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
    overlay?: ReactNode;
}

const measuringConfig = {
    droppable: {
        strategy: MeasuringStrategy.Always,
    },
};

export default function DndProvider({
    children,
    onDragStart,
    onDragOver,
    onDragEnd,
    overlay,
}: DndProviderProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            measuring={measuringConfig}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
        >
            {children}
            <DragOverlay dropAnimation={{
                duration: 200,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}>
                {overlay}
            </DragOverlay>
        </DndContext>
    );
}

// Export types for use in other components
export type { DragEndEvent, DragOverEvent, DragStartEvent };
