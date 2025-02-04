import type { Point } from 'roughjs/bin/geometry'
import type { Element } from '@/types'
import { ToolTypes, positionNames } from '@/types'

export function positionWithinElement(x: number, y: number, element: Element) {
  const { x1, y1, x2, y2, type } = element
  if (type === ToolTypes.RECTANGLE) {
    const topLeft = nearPoint(x, y, x1, y1, positionNames.topLeft)
    const topRight = nearPoint(x, y, x2, y1, positionNames.topRight)
    const bottomLeft = nearPoint(x, y, x1, y2, positionNames.bottomLeft)
    const bottomRight = nearPoint(x, y, x2, y2, positionNames.bottomRight)
    const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? positionNames.inside : null
    return topLeft || topRight || bottomLeft || bottomRight || inside
  } else if (type === ToolTypes.LINE || type === ToolTypes.ARROW) {
    const a = { x: x1, y: y1 }
    const b = { x: x2, y: y2 }
    const c = { x, y }
    const offset = distance(a, b) - (distance(a, c) + distance(b, c))
    const start = nearPoint(x, y, x1, y1, positionNames.start)
    const end = nearPoint(x, y, x2, y2, positionNames.end)
    const inside = Math.abs(offset) < 1 ? positionNames.inside : null
    return start || end || inside
  }
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

export function nearPoint(x: number, y: number, x1: number, y1: number, position: string) {
  const offsetValue = 5
  return Math.abs(x - x1) < offsetValue && Math.abs(y - y1) < offsetValue ? position : null
}

export function adjustElementCoordinates(element: Element) {  const { type, x1, y1, x2, y2 } = element
  if (type === ToolTypes.RECTANGLE) {
    return {
      x1: Math.min(x1, x2),
      y1: Math.min(y1, y2),
      x2: Math.max(x1, x2),
      y2: Math.max(y1, y2)
    }
  } else {
    if ((x1 < x2 || (x1 === x2 && y1 < y2) )|| type === ToolTypes.ARROW) {
      return { x1, y1, x2, y2 }
    } else {
      return { x1: x2, y1: y2, x2: x1, y2: y1 }
    }
  }
}

export function resizedCoordinates(
  clientX: number,
  clientY: number,
  position: string | undefined,
  coordinates: any
) {
  const { x1, y1, x2, y2 } = coordinates
  switch (position) {
    case positionNames.topLeft:
    case positionNames.start:
      return { x1: clientX, y1: clientY, x2, y2 }
    case positionNames.topRight:
      return { x1, y1: clientY, x2: clientX, y2 }
    case positionNames.bottomLeft:
      return { x1: clientX, y1, x2, y2: clientY }
    case positionNames.bottomRight:
    case positionNames.end:
      return { x1, y1, x2: clientX, y2: clientY }
    default:
      return { x1: 0, y1: 0, x2: 0, y2: 0 }
  }
}

export function cursorForPosition(position: string) {
  switch (position) {
    case positionNames.topLeft:
    case positionNames.bottomRight:
    case positionNames.start:
    case positionNames.end:
      return 'nwse-resize'
    case positionNames.topRight:
    case positionNames.bottomLeft:
      return 'nesw-resize'
    case positionNames.inside:
      return 'move'
    default:
      return 'default'
  }
}

export function getArrowPoints(x1: number, y1: number, x2: number, y2: number): Point[] {
  const headLength = 18
  const angle = Math.atan2(y2 - y1, x2 - x1)

  const headPoint1 = [
    x2 - headLength * Math.cos(angle - Math.PI / 6),
    y2 - headLength * Math.sin(angle - Math.PI / 6)
  ] as Point

  const headPoint2 = [
    x2 - headLength * Math.cos(angle + Math.PI / 6),
    y2 - headLength * Math.sin(angle + Math.PI / 6)
  ] as Point

  return [[x1, y1], [x2, y2], headPoint1, [x2, y2], headPoint2]
}
