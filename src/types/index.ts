import type { Drawable } from "roughjs/bin/core";

export interface Point {
    x: number;
    y: number;
    pressure?: number;
}
export interface Element {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    roughElement: Drawable
    type: ElementType
    id: number
    position?: string
    points?: number[][]
}

export const ToolTypes = {
    SELECTION: 'selection',
    DELETE: 'delete',
    ARROW: 'arrow',
    LINE: 'line',
    RECTANGLE: 'rectangle',
    PENCIL: 'pencil',
} as const

export type ElementType = typeof ToolTypes[keyof typeof ToolTypes]

export const ActionTypes = {
    DRAWING: 'drawing',
    MOVING: 'moving',
    RESIZING: 'resizing',
    DELETING: 'deleting',
    PANNING: 'panning',
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