<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import rough from 'roughjs'
import type { RoughCanvas } from 'roughjs/bin/canvas'
import type { Element, ElementType } from '@/types'
import { ToolTypes, ActionTypes, positionNames } from '@/types'
import type { Drawable } from 'roughjs/bin/core'
import {
  getArrowPoints,
  positionWithinElement,
  cursorForPosition,
  resizedCoordinates,
  adjustElementCoordinates,
  getSvgPathFromStroke
} from '../utils/whiteboard/utils'
import {
  createHistoryPoint,
  getLastHistoryPoint,
  getLastLocalRedo,
  getLocalHistory,
  removeLastLocalRedo,
  storeRedoPoint
} from '../utils/whiteboard/history'
import { getStroke } from 'perfect-freehand'

let canvas: HTMLCanvasElement
let ctx: CanvasRenderingContext2D
let roughCanvas: RoughCanvas

const windowInnerWidth = computed(() => window?.innerWidth || 0)
const windowInnerHeight = computed(() => window?.innerHeight || 0)

const generator = rough.generator()

const elements = ref<Element[]>([])
let action = ActionTypes.NONE
const toolType = ref<ElementType>(ToolTypes.PENCIL)
let selectedElement: (Element & { offsetX: number; offsetY: number }) | null

onMounted(() => {
  canvas = document.getElementById('canvas') as HTMLCanvasElement
  ctx = canvas.getContext('2d') as CanvasRenderingContext2D

  roughCanvas = rough.canvas(canvas)
  draw()
})

function createElement(
  id: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type?: ElementType
) {
  let roughElement
  switch (type) {
    case ToolTypes.ARROW:
      roughElement = generator.linearPath(getArrowPoints(x1, y1, x2, y2), {
        stroke: 'black',
        strokeWidth: 2
      })
      break
    case ToolTypes.LINE:
      roughElement = generator.line(x1, y1, x2, y2)
      break
    case ToolTypes.RECTANGLE:
      roughElement = generator.rectangle(x1, y1, x2 - x1, y2 - y1)
      break
    case ToolTypes.PENCIL:
      return { id, type, points: [[x1, y1]] }
    default:
      throw new Error('Invalid tool type')
  }

  return { id, x1, y1, x2, y2, type, roughElement, position: '' }
}

function updateElement(
  id: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type?: ElementType
) {
  const elementToolType = type || toolType.value
  const elementsCopy = [...elements.value]
  if (elementToolType === ToolTypes.PENCIL) {
    elementsCopy[id]?.points?.push([x2, y2])
  } else {
    const updatedElement = createElement(id, x1, y1, x2, y2, elementToolType)
    elementsCopy[id] = updatedElement as Element
  }
  elements.value = elementsCopy
  reDraw()
}

function handleMouseDown(event: MouseEvent) {
  const { clientX, clientY } = event
  if (toolType.value === ToolTypes.SELECTION) {
    const element = getElementAtPosition(clientX, clientY)
    if (!element || element.type === ToolTypes.PENCIL) return
    const offsetX = clientX - element.x1
    const offsetY = clientY - element.y1
    selectedElement = { ...(element as Element), offsetX, offsetY }
    element.position === positionNames.inside
      ? (action = ActionTypes.MOVING)
      : (action = ActionTypes.RESIZING)
    const { x1, y1, x2, y2, type } = selectedElement
    createHistoryPoint(element.id, action, x1, y1, x2, y2, type, undoIndex)
    undoIndex = 0
  } else {
    const newElement = createElement(
      elements.value.length,
      clientX,
      clientY,
      clientX,
      clientY,
      toolType.value
    )
    elements.value.push(newElement as Element)
    selectedElement = { ...newElement, offsetX: 0, offsetY: 0 } as Element & {
      offsetX: number
      offsetY: number
    }
    reDraw()
    action = ActionTypes.DRAWING
    // TODO: fix for pencil
    createHistoryPoint(
      newElement.id,
      ActionTypes.DRAWING,
      newElement.x1,
      newElement.y1,
      newElement.x2,
      newElement.y2,
      newElement.type,
      undoIndex
    )
    undoIndex = 0
  }
}

function handleMouseMove(event: MouseEvent) {
  const { clientX, clientY } = event

  if (toolType.value === ToolTypes.SELECTION) {
    const element = getElementAtPosition(clientX, clientY)
    ;(event.target as HTMLElement).style.cursor =
      element && element.type !== ToolTypes.PENCIL // Temporary fix for pencil until I add delete functioanlity
        ? cursorForPosition(element.position as string)
        : 'default'
  }

  if (action === ActionTypes.DRAWING) {
    const index = elements.value.length - 1
    const { x1, y1 } = elements.value[index]
    updateElement(index, x1, y1, clientX, clientY)
    reDraw()
  } else if (action === ActionTypes.MOVING) {
    if (selectedElement) {
      const { id, x1, x2, y1, y2, type, offsetX, offsetY } = selectedElement
      const newX1 = clientX - offsetX
      const newY1 = clientY - offsetY
      updateElement(id, newX1, newY1, newX1 + (x2 - x1), newY1 + (y2 - y1), type)
      reDraw()
    }
  } else if (action === ActionTypes.RESIZING) {
    if (selectedElement) {
      const { id, type, position, ...coordinates } = selectedElement
      const { x1, y1, x2, y2 } = resizedCoordinates(clientX, clientY, position, coordinates)
      updateElement(id, x1, y1, x2, y2, type)
      reDraw()
    }
  }
}

function handleMouseUp() {
  if (selectedElement) {
    const index = selectedElement.id
    const { id, type } = elements.value[index]
    if (
      (action === ActionTypes.DRAWING || action === ActionTypes.RESIZING) &&
      adjustmentRequired(type)
    ) {
      const { x1, y1, x2, y2 } = adjustElementCoordinates(elements.value[index] as Element)
      updateElement(id, x1, y1, x2, y2, type)
      reDraw()
    }
  }
  action = ActionTypes.NONE
  selectedElement = null
}

function draw() {
  elements.value.forEach((element) => {
    if (element.type !== ToolTypes.PENCIL && element.roughElement) {
      roughCanvas.draw(element.roughElement as Drawable)
    } else {
      if (element.points) {
        const outlinePoints = getStroke(element.points, {
          size: 6,
          smoothing: 0.5,
          thinning: 0.5,
          streamline: 1,
          easing: (t) => t
        })
        const pathData = getSvgPathFromStroke(outlinePoints)
        const myPath = new Path2D(pathData)
        ctx.fill(myPath)
      }
    }
  })
}

function reDraw() {
  ctx.clearRect(0, 0, windowInnerWidth.value, windowInnerHeight.value)
  draw()
}

function adjustmentRequired(type: ElementType) {
  return [ToolTypes.ARROW, ToolTypes.LINE, ToolTypes.RECTANGLE].includes(
    type as 'arrow' | 'line' | 'rectangle'
  )
}

function getElementAtPosition(x: number, y: number) {
  return elements.value
    .map((element) => ({ ...element, position: positionWithinElement(x, y, element as Element) }))
    .find((element) => !!element.position)
}

let undoIndex = 0
function Undo() {
  const lastAction = getLastHistoryPoint(undoIndex)
  const elementCopy = elements.value.find(({ id }) => id === lastAction?.id)
  if (lastAction) {
    const { id, actionType, x1, y1, x2, y2, type } = lastAction
    if (actionType === ActionTypes.DRAWING) {
      elements.value = elements.value.filter((element) => element.id !== id)
    } else {
      updateElement(id, x1, y1, x2, y2, type)
    }
    if (elementCopy) {
      const { id, x1, y1, x2, y2, type } = elementCopy
      storeRedoPoint(id, lastAction.actionType, type, x1, y1, x2, y2)
    }
  }
  undoIndex < getLocalHistory().length && undoIndex++
}

function Redo() {
  const redoElement = getLastLocalRedo()
  if (redoElement) {
    const { id, x1, y1, x2, y2, type } = redoElement
    if (elements.value.findIndex((element) => element.id === id) === -1) {
      const newElement = createElement(id, x1, y1, x2, y2, type)
      elements.value.push(newElement)
      updateElement(
        newElement.id,
        newElement.x1,
        newElement.y1,
        newElement.x2,
        newElement.y2,
        newElement.type
      )
    } else {
      updateElement(id, x1, y1, x2, y2, type)
    }
  }
  removeLastLocalRedo()
  undoIndex > 0 && undoIndex--
}
</script>

<template>
  <div>
    <div style="position: fixed">
      <template v-for="tool in Object.values(ToolTypes)" :key="tool">
        <input type="radio" :id="tool" :checked="toolType === tool" @change="toolType = tool" />
        <label :for="tool">{{ tool }}</label>
      </template>
    </div>
    <div style="position: fixed; bottom: 1%; left: 1%">
      <button @click="Undo">Undo</button>
      <button @click="Redo">Redo</button>
    </div>
    <canvas
      id="canvas"
      :width="windowInnerWidth"
      :height="windowInnerHeight"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
    >
      Canvas
    </canvas>
  </div>
</template>
