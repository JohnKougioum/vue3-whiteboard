import { ToolTypes } from '../../types/index'

export function createHistoryPoint(
  id: number,
  actionType: String,
  type: string,
  undoIndex = 0,
  x1?: number,
  y1?: number,
  x2?: number,
  y2?: number,
  points?: number[][]
) {
  const localHistory = getLocalHistory()
  const localRedo = getLocalRedo()
  if (localRedo.length) {
    localRedo.splice(0, localRedo.length)
    localStorage.setItem('redo', JSON.stringify(localRedo))

    undoIndex === 0
      ? localHistory.splice(0, localHistory.length)
      : localHistory.splice(localHistory.length - undoIndex, undoIndex)
    localStorage.setItem('history', JSON.stringify(localHistory))
  }
  if (type === ToolTypes.PENCIL) {
    localHistory.push({ id, actionType, points, type })
  } else {
    localHistory.push({ id, actionType, x1, y1, x2, y2, type })
  }
  localStorage.setItem('history', JSON.stringify(localHistory))
}

export function clearLocalHistory() {
  localStorage.removeItem('history')
  localStorage.removeItem('redo')
}

export function getLocalHistory() {
  return JSON.parse(localStorage.getItem('history') || '[]')
}

export function getLastHistoryPoint(index: number) {
  const localHistory = getLocalHistory()
  return localHistory.length !== getLocalRedo().length
    ? localHistory[localHistory.length - 1 - index]
    : []
}

export function removeLastHistoryPoint() {
  const localHistory = getLocalHistory()
  localHistory.pop()
  localStorage.setItem('history', JSON.stringify(localHistory))
}

export function storeRedoPoint(
  id: number,
  actionType: string,
  type: string,
  x1?: number,
  y1?: number,
  x2?: number,
  y2?: number,
  points?: number[][]
) {
  const localRedo = getLocalRedo()
  if (type === ToolTypes.PENCIL) {
    localRedo.push({ id, actionType, points, type })
  } else {
    localRedo.push({ id, actionType, type, x1, y1, x2, y2 })
  }
  localStorage.setItem('redo', JSON.stringify(localRedo))
}

export function getLocalRedo() {
  return JSON.parse(localStorage.getItem('redo') || '[]')
}

export function getLastLocalRedo() {
  const localRedo = getLocalRedo()
  return localRedo[localRedo.length - 1]
}

export function removeLastLocalRedo() {
  const localRedo = getLocalRedo()
  localRedo.pop()
  localStorage.setItem('redo', JSON.stringify(localRedo))
}
