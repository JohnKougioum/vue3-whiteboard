import type { Drawable } from "roughjs/bin/core";

export interface Element {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    roughElement: Drawable
}

export const ElementTypes = {
    LINE: 'line',
    CIRCLE: 'circle',
    RECTANGLE: 'rectangle'
} as const

export type ElementType = typeof ElementTypes[keyof typeof ElementTypes]