export default (node: HTMLElement) => {
  let draggableList = [...node.querySelectorAll(':scope > *')] as HTMLElement[]

  let dragged_el: HTMLElement
  let dragged_el_index: number = -1
  let hovered_index: number = -1
  let fixed: number[] = []

  const reset_all_pos = () => {
    draggableList.forEach((draggable) => {
      draggable.style.transform = 'translate3d(0,0,0)'
    })
  }

  const reset_all_transition = () => {
    draggableList.forEach((draggable) => {
      draggable.style.transition = 'none'
    })
  }

  const onDragStart = (e: DragEvent) => {
    // control cursor which is else dictated by browser
    // see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/effectAllowed
    if (e?.dataTransfer) e.dataTransfer.effectAllowed = 'copyMove'
    const el = e.target as HTMLElement
    window.requestAnimationFrame(function () {
      el.style.visibility = 'hidden'
    })

    el.classList.add('dragging')
  }

  const onDragEnd = (e: DragEvent) => {
    const el = e.target as HTMLElement
    el.style.visibility = 'visible'
    el.classList.remove('dragging')
  }

  const onContainerDragStart = () => {
    draggableList = [...node.querySelectorAll(':scope > *')] as HTMLElement[]
    fixed = draggableList.map((el) => el.getBoundingClientRect().bottom)
    dragged_el = [...node.getElementsByClassName('dragging')][0] as HTMLElement
    dragged_el_index = [...node.children].indexOf(dragged_el)
  }

  const onContainerDragEnd = () => {
    reset_all_pos()
    reset_all_transition()
    const from = dragged_el_index
    const to = hovered_index
    if (from !== to)
      node.dispatchEvent(new CustomEvent('dragged', { detail: { from, to } }))
  }

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    // Dragged el is not a child of container, do nothing
    if ([...node.children].indexOf(dragged_el) < 0) return

    const rangeFound = [...fixed].find((min) => e.clientY < min)

    if (!rangeFound) return

    hovered_index = fixed.findIndex((range) => range === rangeFound)

    if (hovered_index === dragged_el_index) reset_all_pos()
    else {
      const direction = dragged_el_index < hovered_index ? -1 : 1

      const margin_top: number = parseInt(
        getComputedStyle(dragged_el).marginTop.slice(0, -2)
      )

      const final_unit: number = (dragged_el.offsetHeight + margin_top) * direction

      const replaced_el = draggableList[hovered_index]

      replaced_el.style.transition = 'transform ease 0.2s'
      replaced_el.style.transform =
        'translate3d(0,' + final_unit.toString() + 'px,0)'

      const unreplaced_el = draggableList[hovered_index + direction * -1]

      if (unreplaced_el) {
        unreplaced_el.style.transition = 'transform ease 0.2s'
        unreplaced_el.style.transform = 'translate3d(0,0,0)'
      }
    }
  }

  draggableList.forEach((draggable) => {
    draggable.style.transition = 'all ease 0.2s'
    draggable.addEventListener('dragstart', onDragStart)
    draggable.addEventListener('dragend', onDragEnd)
  })

  node.addEventListener('dragstart', onContainerDragStart)
  node.addEventListener('dragend', onContainerDragEnd)
  node.addEventListener('dragover', onDragOver)

  return {
    destroy() {
      // Remove event listeners
      draggableList.forEach((draggable) => {
        draggable.removeEventListener('dragstart', onDragStart)
        draggable.removeEventListener('dragend', onDragEnd)
      })
      node.removeEventListener('dragstart', onContainerDragStart)
      node.removeEventListener('dragend', onContainerDragEnd)
      node.removeEventListener('dragover', onDragOver)
    },
  }
}