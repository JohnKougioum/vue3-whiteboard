<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useElementSize, watchDebounced } from '@vueuse/core'
import { getStroke } from 'perfect-freehand'

type PointEntry = {
  type: string
  color: string
  points: Array<[number, number]>
}

const canvas = ref<HTMLCanvasElement>()
const whiteboardContainer = ref<HTMLDivElement>()
let ctx: CanvasRenderingContext2D | null = null
// const { width: canvasWidth, height: canvasHeight } = useElementSize(canvas)
let isDrawing = false
let points: PointEntry[] = []

const selectedColor = ref('#000')

const dpr = window.devicePixelRatio || 1
let zoom = 1
let translateX = 0
let translateY = 0
let panOffset = { x: 0, y: 0 }
let startPanMousePosition = { x: 0, y: 0 }
let isPanning = false

onMounted(() => {
  localStorage.removeItem('whiteboard')
  whiteboardContainer.value?.style.setProperty('caret-color', 'black')

  ctx = canvas.value!.getContext('2d')
  initCanvasDimensions()
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx?.save()
  ctx!.translate(panOffset.x, panOffset.y)
  ctx!.restore()
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

// TODO: https://www.youtube.com/watch?v=AKd1dDE9sFE
function draw(isMouseDown = false) {
  if (ctx) {
    if (isMouseDown) {
      drawLines(points[points.length - 1])
    } else {
      ctx!.clearRect(0, 0, canvas.value!.width, canvas.value!.height)
      ctx!.save()
      ctx!.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0)

      // ctx!.translate
      ctx!.scale(zoom, zoom)

      if (localStorage.getItem('whiteboard')) {
        JSON.parse(localStorage.getItem('whiteboard')!).forEach((point: PointEntry) => {
          drawLines(point)
        })
      }

      points.forEach((point) => {
        drawLines(point)
      })
    }

    ctx!.restore()
  }
}

const scaledWidth = computed(() => (canvas.value?.width || 0) * zoom)
const scaledHeight = computed(() => (canvas.value?.height || 0) * zoom)
const scaleOffsetX = computed(() => (scaledWidth.value - canvas.value!.width) / 2)
const scaleOffsetY = computed(() => (scaledHeight.value - canvas.value!.height) / 2)

function drawLines(point: PointEntry) {
  const stroke = getStroke(point.points, {
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
  ctx!.fillStyle = point.color
  ctx!.fill(myPath)
}

function handleMouseMove(e: MouseEvent) {
  if (isPanning) {
    const [x, y] = mousePosition(e)
    const deltaX = x - startPanMousePosition.x
    const deltaY = y - startPanMousePosition.y
    panOffset.x += deltaX
    panOffset.y += deltaY

    console.log('mouse position', x, y)

    // console.log('startPanMousePosition', startPanMousePosition)
    // console.log('panOffset', panOffset)

    ctx?.save()
    ctx!.translate(panOffset.x, panOffset.y)
    draw()
    ctx?.restore()
  } else if (isDrawing) {
    const [x, y] = mousePosition(e)
    points[points.length - 1].points.push([x, y])
    draw(true)
  }
}

function handleMouseDown(e: MouseEvent) {
  if (e.button === 1) {
    isPanning = true
    const [x, y] = mousePosition(e)
    startPanMousePosition.x = x
    startPanMousePosition.y = y
  } else {
    isDrawing = true
    points.push({ type: 'freehand', color: selectedColor.value, points: [] })
  }
}

function mousePosition(e: MouseEvent) {
  if (canvas.value) {
    const rect = canvas.value.getBoundingClientRect()

    //TODO: redrawing after panning is not working properly
    // console.log(canvas.value.width, canvas.value.height, rect.left, rect.top)
    // console.log(e.clientX, e.clientY)

    const x = ((e.clientX - rect.left) * dpr) / zoom - panOffset.x
    const y = ((e.clientY - rect.top) * dpr) / zoom - panOffset.y

    return [x, y]
  }
  return [0, 0]
}

function handleMouseUp() {
  isDrawing = false
  isPanning = false
  const whiteboardData = localStorage.getItem('whiteboard')
    ? JSON.parse(localStorage.getItem('whiteboard')!)
    : []
  localStorage.setItem('whiteboard', JSON.stringify([...whiteboardData, ...points]))
  points = []
}

function handleWheel(e: WheelEvent) {
  const delta = e.deltaY < 0 ? 0.1 : -0.1
  const newZoom = Math.min(Math.max(zoom + delta, 0.5), 2)

  const [mouseX, mouseY] = mousePosition(e)

  // Adjust translateX and translateY to zoom relative to the mouse pointer
  translateX -= mouseX * (newZoom - zoom)
  translateY -= mouseY * (newZoom - zoom)

  zoom = newZoom
  draw()
}

const { width: containerWidth } = useElementSize(whiteboardContainer)
watchDebounced(
  containerWidth,
  () => {
    if (canvas.value && ctx) {
      ctx!.save()
      initCanvasDimensions()
      draw()
      ctx!.restore()
    }
  },
  { debounce: 200 }
)

function initCanvasDimensions() {
  canvas.value!.width = whiteboardContainer.value!.clientWidth * dpr
  canvas.value!.height = whiteboardContainer.value!.clientHeight * dpr
  canvas.value!.style.width = `${whiteboardContainer.value!.clientWidth}px`
  canvas.value!.style.height = `${whiteboardContainer.value!.clientHeight}px`
}

onBeforeUnmount(() => {
  localStorage.removeItem('whiteboard')
})
</script>

<template>
  <div ref="whiteboardContainer" class="whiteboard-container">
    <canvas
      ref="canvas"
      id="whiteboard"
      @mousemove="handleMouseMove"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @mouseout="handleMouseUp"
      @wheel="handleWheel"
    />
  </div>
</template>

<style scoped>
.whiteboard-container {
  width: 100%;
  height: 80svh;
  overflow: hidden;
}

canvas {
  cursor:
    url("data:image/svg+xml,%3Csvg width='23' height='23' viewBox='0 0 23 23' fill='black' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0.2444 11.3203H22.8718M11.5581 0.006558V22.634' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E")
      12.5 12.5,
    crosshair;
  background-color: white;
  image-rendering: pixelated;
}
</style>
