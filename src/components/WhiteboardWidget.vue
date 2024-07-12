<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useElementSize, watchDebounced } from '@vueuse/core'
import { getStroke } from 'perfect-freehand'

const canvas = ref<HTMLCanvasElement>()
const whiteboardContainer = ref<HTMLDivElement>()
let ctx: CanvasRenderingContext2D | null = null
const { width: canvasWidth, height: canvasHeight } = useElementSize(canvas)
let isDrawing = false
const points: Array<Array<{ x: number; y: number; color: string }>> = []

const selectedColor = ref('#000')

const dpr = window.devicePixelRatio || 1

onMounted(() => {
  ctx = canvas.value!.getContext('2d')
  canvas.value!.width = whiteboardContainer.value!.clientWidth * dpr
  canvas.value!.height = whiteboardContainer.value!.clientHeight * dpr
  canvas.value!.style.width = `${whiteboardContainer.value!.clientWidth}px`
  canvas.value!.style.height = `${whiteboardContainer.value!.clientHeight}px`
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
  draw()
})

function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return ''

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q']
  )

  d.push('Z')
  return d.join(' ')
}

function draw(isMouseDown = false) {
  if (isMouseDown && ctx) {
    drawLines(points[points.length - 1])
  }
}

function drawLines(arrayOfPoints: Array<{ x: number; y: number; color: string }>) {
  const stroke = getStroke(arrayOfPoints, {
    size: 6,
    smoothing: 0.5,
    thinning: 0.5,
    streamline: 1,
    easing: (t) => t,
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true }
  })
  const pathData = getSvgPathFromStroke(stroke)
  const myPath = new Path2D(pathData)
  ctx!.fillStyle = arrayOfPoints[0].color
  ctx!.fill(myPath)
}

function handleMouseMove(e: MouseEvent) {
  if (!isDrawing) return
  const [x, y] = mousePosition(e)
  points[points.length - 1].push({ x, y, color: selectedColor.value })
  draw(true)
}

function handleMouseDown() {
  isDrawing = true
  points.push([])
}

function mousePosition(e: MouseEvent) {
  if (canvas.value) {
    const rect = canvas.value.getBoundingClientRect()

    const x = (e.clientX - rect.left) * (canvasWidth.value / rect.width)
    const y = (e.clientY - rect.top) * (canvasHeight.value / rect.height)
    return [x, y]
  }
  return [0, 0]
}

function handleMouseUp() {
  isDrawing = false
}

const { width: containerWidth } = useElementSize(whiteboardContainer)
watchDebounced(
  containerWidth,
  () => {
    if (canvas.value && ctx) {
      canvas.value.width = whiteboardContainer.value!.clientWidth * dpr
      canvas.value.height = whiteboardContainer.value!.clientHeight * dpr
      canvas.value.style.width = `${whiteboardContainer.value!.clientWidth}px`
      canvas.value.style.height = `${whiteboardContainer.value!.clientHeight}px`

      points.forEach((point) => {
        drawLines(point)
      })
    }
  },
  { debounce: 200 }
)
</script>

<template>
  <div ref="whiteboardContainer" class="whiteboard-container">
    <canvas
      ref="canvas"
      @mousemove="handleMouseMove"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @mouseout="handleMouseUp"
    />
  </div>
</template>

<style scoped>
.whiteboard-container {
  width: 100%;
  height: 80svh;
  background: white;
}

canvas {
  image-rendering: pixelated;
}
</style>
