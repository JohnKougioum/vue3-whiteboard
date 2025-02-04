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
  adjustElementCoordinates
} from '../utils/whiteboard/utils'
import {
  createHistoryPoint,
  getLastHistoryPoint,
  getLastLocalRedo,
  getLocalHistory,
  removeLastLocalRedo,
  storeRedoPoint
} from '../utils/whiteboard/history'

let canvas: HTMLCanvasElement
let ctx: CanvasRenderingContext2D
let roughCanvas: RoughCanvas

const windowInnerWidth = computed(() => window?.innerWidth || 0)
const windowInnerHeight = computed(() => window?.innerHeight || 0)

const generator = rough.generator()

const elements = ref<Element[]>([])
let action = ActionTypes.NONE
const toolType = ref<ElementType>(ToolTypes.LINE)
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
  const elementToolType = type || toolType.value
  switch (elementToolType) {
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
    default:
      roughElement = generator.line(x1, y1, x2, y2)
  }

  return { id, x1, y1, x2, y2, type: elementToolType, roughElement, position: '' }
}

function updateElement(
  id: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type?: ElementType
) {
  const updatedElement = createElement(id, x1, y1, x2, y2, type)
  const elementsCopy = [...elements.value]
  elementsCopy[id] = updatedElement
  elements.value = elementsCopy
}

function handleMouseDown(event: MouseEvent) {
  const { clientX, clientY } = event
  if (toolType.value === ToolTypes.SELECTION) {
    const element = getElementAtPosition(clientX, clientY)
    if (element) {
      const offsetX = clientX - element.x1
      const offsetY = clientY - element.y1
      selectedElement = { ...(element as Element), offsetX, offsetY }
      if (element.position === positionNames.inside) {
        action = ActionTypes.MOVING
      } else {
        action = ActionTypes.RESIZING
      }
      const { x1, y1, x2, y2, type } = selectedElement
      createHistoryPoint(element.id, action, x1, y1, x2, y2, type)
    }
  } else {
    const newElement = createElement(elements.value.length, clientX, clientY, clientX, clientY)
    elements.value.push(newElement)
    selectedElement = { ...newElement, offsetX: 0, offsetY: 0 }
    action = ActionTypes.DRAWING
    createHistoryPoint(
      newElement.id,
      ActionTypes.DRAWING,
      newElement.x1,
      newElement.y1,
      newElement.x2,
      newElement.y2,
      newElement.type
    )
  }
}

function handleMouseMove(event: MouseEvent) {
  const { clientX, clientY } = event

  if (toolType.value === ToolTypes.SELECTION) {
    const element = getElementAtPosition(clientX, clientY)
    ;(event.target as HTMLElement).style.cursor = element
      ? cursorForPosition(element.position as string)
      : 'default'
  }

  if (action === ActionTypes.DRAWING) {
    const index = elements.value.length - 1
    const { x1, y1 } = elements.value[index]
    updateElement(index, x1, y1, clientX, clientY)
  } else if (action === ActionTypes.MOVING) {
    if (selectedElement) {
      const { id, x1, x2, y1, y2, type, offsetX, offsetY } = selectedElement
      const newX1 = clientX - offsetX
      const newY1 = clientY - offsetY
      updateElement(id, newX1, newY1, newX1 + (x2 - x1), newY1 + (y2 - y1), type)
    }
  } else if (action === ActionTypes.RESIZING) {
    if (selectedElement) {
      const { id, type, position, ...coordinates } = selectedElement
      const { x1, y1, x2, y2 } = resizedCoordinates(clientX, clientY, position, coordinates)
      updateElement(id, x1, y1, x2, y2, type)
    }
  }
}

function handleMouseUp() {
  if (selectedElement) {
    if (action === ActionTypes.DRAWING || action === ActionTypes.RESIZING) {
      const index = selectedElement.id
      const { id, type } = elements.value[index]
      const { x1, y1, x2, y2 } = adjustElementCoordinates(elements.value[index] as Element)
      updateElement(id, x1, y1, x2, y2, type)
    }
  }
  action = ActionTypes.NONE
  selectedElement = null
}

function draw() {
  elements.value.forEach(({ roughElement }) => roughCanvas.draw(roughElement as Drawable))
}

function getElementAtPosition(x: number, y: number) {
  return elements.value
    .map((element) => ({ ...element, position: positionWithinElement(x, y, element as Element) }))
    .find((element) => !!element.position)
}

let undoIndex = 0
function Undo() {
  console.log(undoIndex)
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

watch(elements, () => {
  ctx.clearRect(0, 0, windowInnerWidth.value, windowInnerHeight.value)
  draw()
})
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
