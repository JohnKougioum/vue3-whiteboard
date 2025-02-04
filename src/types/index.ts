import type { Drawable } from "roughjs/bin/core";

export interface Element {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    roughElement: Drawable
    type: ElementType
    id: number
    position?: string
}

export const ToolTypes = {
    SELECTION: 'selection',
    ARROW: 'arrow',
    LINE: 'line',
    // CIRCLE: 'circle',
    RECTANGLE: 'rectangle',
} as const

export type ElementType = typeof ToolTypes[keyof typeof ToolTypes]

export const ActionTypes = {
    DRAWING: 'drawing',
    MOVING: 'moving',
    DELETE: 'delete',
    RESIZING: 'resizing',
    NONE: 'none'
}

export const positionNames = {
    topLeft: 'topLeft',
    topRight: 'topRight',
    bottomLeft: 'bottomLeft',
    bottomRight: 'bottomRight',
    inside: 'inside',
    start: 'start',
    end: 'end'
}