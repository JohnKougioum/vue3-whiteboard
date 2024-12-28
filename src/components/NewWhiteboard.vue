<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import rough from 'roughjs'
import type { RoughCanvas } from 'roughjs/bin/canvas'
import type { Element, ElementType } from '@/types'
import { ToolTypes, ActionTypes } from '@/types'
import type { Drawable } from 'roughjs/bin/core'
//TODO: https://www.youtube.com/watch?v=6arkndScw7A&list=PLSxgVLtIB0IFmQGuVMSE_wDHPW5rq4Ik7&index=1

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
    case 'line':
      roughElement = generator.line(x1, y1, x2, y2)
      break
    case 'rectangle':
      roughElement = generator.rectangle(x1, y1, x2 - x1, y2 - y1)
      break
    default:
      roughElement = generator.line(x1, y1, x2, y2)
  }

  return { id, x1, y1, x2, y2, type: elementToolType, roughElement }
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
      action = ActionTypes.MOVING
    }
  } else {
    const newElement = createElement(elements.value.length, clientX, clientY, clientX, clientY)
    elements.value.push(newElement)
    action = ActionTypes.DRAWING
  }
}

function handleMouseMove(event: MouseEvent) {
  const { clientX, clientY } = event

  if (toolType.value === ToolTypes.SELECTION) {
    ;(event.target as HTMLElement).style.cursor = getElementAtPosition(clientX, clientY)
      ? 'move'
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
  }
}

function handleMouseUp(event: MouseEvent) {
  action = ActionTypes.NONE
  selectedElement = null
}

function draw() {
  elements.value.forEach(({ roughElement }) => roughCanvas.draw(roughElement as Drawable))
}

function getElementAtPosition(x: number, y: number) {
  return elements.value.find((element) => isWithinElement(x, y, element as Element))
}

function isWithinElement(x: number, y: number, element: Element) {
  const { x1, y1, x2, y2, type } = element
  if (type === ToolTypes.RECTANGLE) {
    const minX = Math.min(x1, x2)
    const maxX = Math.max(x1, x2)
    const minY = Math.min(y1, y2)
    const maxY = Math.max(y1, y2)
    return x >= minX && x <= maxX && y >= minY && y <= maxY
  } else if (type === ToolTypes.LINE) {
    const a = { x: x1, y: y1 }
    const b = { x: x2, y: y2 }
    const c = { x, y }
    const offset = distance(a, b) - (distance(a, c) + distance(b, c))
    return Math.abs(offset) < 1
  }
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

watch(elements, () => {
  ctx.clearRect(0, 0, windowInnerWidth.value, windowInnerHeight.value)
  draw()
})
</script>

<template>
  <div>
    <div style="position: fixed">
      <input
        type="radio"
        id="selection"
        :checked="toolType === ToolTypes.SELECTION"
        @change="toolType = ToolTypes.SELECTION"
      />
      <label for="selection">Selection</label>
      <input
        type="radio"
        id="line"
        :checked="toolType === ToolTypes.LINE"
        @change="toolType = ToolTypes.LINE"
      />
      <label for="line">Line</label>
      <input
        type="radio"
        id="rectangle"
        :checked="toolType === ToolTypes.RECTANGLE"
        @change="toolType = ToolTypes.RECTANGLE"
      />
      <label for="rectangle">Rectangle</label>
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
