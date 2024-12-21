<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import rough from 'roughjs'
import type { RoughCanvas } from 'roughjs/bin/canvas'
import type { Element, ElementType } from '@/types'
import { ElementTypes } from '@/types'
import type { Drawable } from 'roughjs/bin/core'
//TODO: https://www.youtube.com/watch?v=6arkndScw7A&list=PLSxgVLtIB0IFmQGuVMSE_wDHPW5rq4Ik7&index=1

let canvas: HTMLCanvasElement
let ctx: CanvasRenderingContext2D
let roughCanvas: RoughCanvas

const windowInnerWidth = computed(() => window?.innerWidth || 0)
const windowInnerHeight = computed(() => window?.innerHeight || 0)

const generator = rough.generator()

const elements = ref<Element[]>([])
let drawing = false
const elementType = ref<ElementType>(ElementTypes.LINE)

onMounted(() => {
  canvas = document.getElementById('canvas') as HTMLCanvasElement
  ctx = canvas.getContext('2d') as CanvasRenderingContext2D

  roughCanvas = rough.canvas(canvas)
  draw()
})

function createElement(x1: number, y1: number, x2: number, y2: number) {
  let roughElement
  switch (elementType.value) {
    case 'line':
      roughElement = generator.line(x1, y1, x2, y2)
      break
    case 'rectangle':
      roughElement = generator.rectangle(x1, y1, x2 - x1, y2 - y1)
      break
    default:
      roughElement = generator.line(x1, y1, x2, y2)
  }

  return { x1, y1, x2, y2, roughElement }
}
function handleMouseDown(event: MouseEvent) {
  drawing = true
  const { clientX, clientY } = event

  const newElement = createElement(clientX, clientY, clientX, clientY)
  elements.value.push(newElement)
}

function handleMouseMove(event: MouseEvent) {
  if (!drawing) return

  const { clientX, clientY } = event
  const index = elements.value.length - 1
  const { x1, y1 } = elements.value[index]
  const updatedElement = createElement(x1, y1, clientX, clientY)

  const elementsCopy = [...elements.value]
  elementsCopy[index] = updatedElement
  elements.value = elementsCopy
}

function handleMouseUp(event: MouseEvent) {
  drawing = false
}

function draw() {
  elements.value.forEach(({ roughElement }) => roughCanvas.draw(roughElement as Drawable))
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
        id="line"
        :checked="elementType === ElementTypes.LINE"
        @change="elementType = ElementTypes.LINE"
      />
      <label for="line">Line</label>
      <input
        type="radio"
        id="rectangle"
        :checked="elementType === ElementTypes.RECTANGLE"
        @change="elementType = ElementTypes.RECTANGLE"
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
