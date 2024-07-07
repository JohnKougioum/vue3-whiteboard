<script setup lang="ts">
import { ref, onMounted } from 'vue'

const canvas = ref<HTMLCanvasElement>()
const whiteboardContainer = ref<HTMLDivElement>()
let ctx: CanvasRenderingContext2D | null = null
let cameraZoom = 1
let MAX_ZOOM = 5
let MIN_ZOOM = 0.1
let SCROLL_SENSITIVITY = 0.005
let cameraOffset = { x: 0, y: 0 }

onMounted(() => {
  ctx = canvas.value!.getContext('2d')
  ctx!.fillStyle = 'red'
  ctx!.fillRect(10, 10, 100, 100)
  cameraOffset.x = whiteboardContainer.value!.clientWidth / 2
  cameraOffset.y = whiteboardContainer.value!.clientHeight / 2

  draw()
})

function draw() {
  if (!canvas.value || !ctx) return
  canvas.value.width = whiteboardContainer.value!.clientWidth
  canvas.value.height = whiteboardContainer.value!.clientHeight

  ctx.translate(canvas.value.width / 2, canvas.value.height / 2)
  ctx.scale(cameraZoom, cameraZoom)
  ctx.translate(-window.innerWidth / 2 + cameraOffset.x, -window.innerHeight / 2 + cameraOffset.y)

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  ctx.fillStyle = '#991111'
  ctx.fillRect(-50, -50, 100, 100)
}

function getEventLocation(e) {
  if (e.touches && e.touches.length == 1) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY }
  } else if (e.clientX && e.clientY) {
    return { x: e.clientX, y: e.clientY }
  }
}

let isDragging = false
let dragStart = { x: 0, y: 0 }

function onPointerDown(e) {
  isDragging = true
  dragStart.x = getEventLocation(e).x / cameraZoom - cameraOffset.x
  dragStart.y = getEventLocation(e).y / cameraZoom - cameraOffset.y
}

function onPointerUp(e) {
  isDragging = false
  initialPinchDistance = null
  lastZoom = cameraZoom
}

function onPointerMove(e) {
  if (isDragging) {
    cameraOffset.x = getEventLocation(e).x / cameraZoom - dragStart.x
    cameraOffset.y = getEventLocation(e).y / cameraZoom - dragStart.y

    draw()
  }
}

function handleTouch(e, singleTouchHandler) {
  if (e.touches.length == 1) {
    singleTouchHandler(e)
  } else if (e.type == 'touchmove' && e.touches.length == 2) {
    isDragging = false
    handlePinch(e)
  }
}

let initialPinchDistance = null
let lastZoom = cameraZoom

function handlePinch(e) {
  e.preventDefault()

  let touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  let touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }

  // This is distance squared, but no need for an expensive sqrt as it's only used in ratio
  let currentDistance = (touch1.x - touch2.x) ** 2 + (touch1.y - touch2.y) ** 2

  if (initialPinchDistance == null) {
    initialPinchDistance = currentDistance
  } else {
    adjustZoom(null, currentDistance / initialPinchDistance)
  }
}

function adjustZoom(zoomAmount) {
  if (!isDragging) {
    if (zoomAmount) {
      cameraZoom += zoomAmount
    }

    cameraZoom = Math.min(cameraZoom, MAX_ZOOM)
    cameraZoom = Math.max(cameraZoom, MIN_ZOOM)

    draw()
  }
}
</script>

<template>
  <div ref="whiteboardContainer" class="whiteboard-container">
    <canvas
      ref="canvas"
      @mousedown="onPointerDown"
      @mouseup="onPointerUp"
      @mousemove="onPointerMove"
      @wheel="adjustZoom($event.deltaY * SCROLL_SENSITIVITY)"
    />
  </div>
</template>

<style scoped>
.whiteboard-container {
  width: 100%;
  height: 100svh;
}
</style>
