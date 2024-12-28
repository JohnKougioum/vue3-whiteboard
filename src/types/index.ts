import type { Drawable } from "roughjs/bin/core";

export interface Element {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    roughElement: Drawable
    type: ElementType
    id: number
}

export const ToolTypes = {
    LINE: 'line',
    CIRCLE: 'circle',
    RECTANGLE: 'rectangle',
    SELECTION: 'selection',
} as const

export type ElementType = typeof ToolTypes[keyof typeof ToolTypes]

export const ActionTypes = {
    DRAWING: 'drawing',
    MOVING: 'moving',
    DELETE: 'delete',
    NONE: 'none'
}