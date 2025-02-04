<script setup lang="ts">
import { onMounted } from 'vue'
import { clearLocalHistory } from '@/utils/whiteboard/history'
import WhiteboardWidget from './components/WhiteboardWidget.vue'
import NewWhiteboard from './components/NewWhiteboard.vue'

onMounted(() => {
  clearLocalHistory()
})
</script>

<template>
  <div id="app">
    <NewWhiteboard />
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
