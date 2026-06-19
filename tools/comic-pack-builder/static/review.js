const state = {
  project: null,
  pages: [],
  currentPageIndex: 0,
  selectedBubbleId: null,
  dirty: false,
}

const elements = {
  subtitle: document.querySelector('#project-subtitle'),
  pageCount: document.querySelector('#page-count'),
  pageList: document.querySelector('#page-list'),
  pageTitle: document.querySelector('#page-title'),
  pagePosition: document.querySelector('#page-position'),
  previousPage: document.querySelector('#previous-page'),
  nextPage: document.querySelector('#next-page'),
  pageImage: document.querySelector('#page-image'),
  boxLayer: document.querySelector('#box-layer'),
  bubbleCount: document.querySelector('#bubble-count'),
  bubbleList: document.querySelector('#bubble-list'),
  bubbleTemplate: document.querySelector('#bubble-template'),
  addBubble: document.querySelector('#add-bubble'),
  save: document.querySelector('#save-button'),
  validate: document.querySelector('#validate-button'),
  export: document.querySelector('#export-button'),
  status: document.querySelector('#status-message'),
  title: document.querySelector('#project-title'),
  titleZh: document.querySelector('#project-title-zh'),
  author: document.querySelector('#project-author'),
  description: document.querySelector('#project-description'),
  translate: document.querySelector('#translate-button'),
  translationEndpoint: document.querySelector('#translation-endpoint'),
  translationModel: document.querySelector('#translation-model'),
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`)
  return payload
}

async function loadProject() {
  try {
    state.project = await request('/api/project')
    state.pages = state.project.chapters.flatMap((chapter) =>
      chapter.pages.map((page) => ({ ...page, chapterId: chapter.id, chapterTitle: chapter.title })),
    )
    elements.subtitle.textContent = `${state.project.title} · ${state.project.packId}`
    elements.title.value = state.project.title || ''
    elements.titleZh.value = state.project.titleChinese || ''
    elements.author.value = state.project.author || ''
    elements.description.value = state.project.description || ''
    setPage(0)
    renderPageRail()
    setStatus('Project loaded from disk.')
  } catch (error) {
    setStatus(error.message, true)
  }
}

function currentPage() {
  return state.pages[state.currentPageIndex]
}

function setPage(index) {
  if (!state.pages.length) return
  state.currentPageIndex = Math.max(0, Math.min(index, state.pages.length - 1))
  state.selectedBubbleId = currentPage().bubbles[0]?.id || null
  renderAll()
}

function renderAll() {
  renderPageRail()
  renderCurrentPage()
  renderBubbles()
  renderBoxes()
}

function renderPageRail() {
  elements.pageCount.textContent = `${state.pages.length}`
  elements.pageList.replaceChildren()
  state.pages.forEach((page, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `page-button${index === state.currentPageIndex ? ' active' : ''}`
    button.innerHTML = `<strong>${escapeHtml(page.id)}</strong><small>${escapeHtml(page.originalFilename || page.image)} · ${page.bubbles.length} regions</small>`
    button.addEventListener('click', () => setPage(index))
    elements.pageList.append(button)
  })
}

function renderCurrentPage() {
  const page = currentPage()
  if (!page) return
  elements.pageTitle.textContent = `${page.chapterTitle} · ${page.id}`
  elements.pagePosition.textContent = `Page ${state.currentPageIndex + 1} of ${state.pages.length}`
  elements.previousPage.disabled = state.currentPageIndex === 0
  elements.nextPage.disabled = state.currentPageIndex === state.pages.length - 1
  elements.pageImage.src = `/api/image?path=${encodeURIComponent(page.image)}&v=${Date.now()}`
  elements.pageImage.alt = `${state.project.title}, ${page.id}`
}

function renderBoxes() {
  const page = currentPage()
  elements.boxLayer.replaceChildren()
  page.bubbles.forEach((bubble) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = [
      'ocr-box',
      bubble.id === state.selectedBubbleId ? 'selected' : '',
      bubble.ignored ? 'ignored' : '',
    ].filter(Boolean).join(' ')
    button.style.left = `${bubble.box.x * 100}%`
    button.style.top = `${bubble.box.y * 100}%`
    button.style.width = `${bubble.box.width * 100}%`
    button.style.height = `${bubble.box.height * 100}%`
    button.textContent = `${bubble.order}. ${bubble.chinese || '(empty)'}`
    button.addEventListener('click', () => selectBubble(bubble.id))
    elements.boxLayer.append(button)
  })
}

function renderBubbles() {
  const page = currentPage()
  elements.bubbleCount.textContent = `${page.bubbles.length} regions`
  elements.bubbleList.replaceChildren()
  page.bubbles.forEach((bubble, index) => {
    const fragment = elements.bubbleTemplate.content.cloneNode(true)
    const editor = fragment.querySelector('.bubble-editor')
    editor.dataset.bubbleId = bubble.id
    editor.classList.toggle('selected', bubble.id === state.selectedBubbleId)
    editor.classList.toggle('needs-review', Boolean(bubble.needsReview))
    editor.classList.toggle('ignored', Boolean(bubble.ignored))

    const selectButton = editor.querySelector('.select-bubble')
    selectButton.textContent = `${bubble.order}. ${bubble.chinese || '(empty OCR region)'}`
    selectButton.addEventListener('click', () => selectBubble(bubble.id))

    bindValue(editor, '.bubble-chinese', bubble, 'chinese')
    bindValue(editor, '.bubble-english', bubble, 'english')
    bindValue(editor, '.bubble-type', bubble, 'type')
    bindCheck(editor, '.bubble-review', bubble, 'needsReview')
    bindCheck(editor, '.bubble-ignored', bubble, 'ignored')
    bindBox(editor, '.box-x', bubble, 'x')
    bindBox(editor, '.box-y', bubble, 'y')
    bindBox(editor, '.box-width', bubble, 'width')
    bindBox(editor, '.box-height', bubble, 'height')

    const up = editor.querySelector('.move-up')
    const down = editor.querySelector('.move-down')
    up.disabled = index === 0
    down.disabled = index === page.bubbles.length - 1
    up.addEventListener('click', () => moveBubble(index, -1))
    down.addEventListener('click', () => moveBubble(index, 1))
    editor.querySelector('.delete-bubble').addEventListener('click', () => deleteBubble(index))
    elements.bubbleList.append(fragment)
  })
  requestAnimationFrame(() => {
    document.querySelector(`.bubble-editor[data-bubble-id="${cssEscape(state.selectedBubbleId || '')}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  })
}

function bindValue(editor, selector, target, field) {
  const input = editor.querySelector(selector)
  input.value = target[field] || ''
  input.addEventListener('input', () => {
    target[field] = input.value
    markDirty()
    renderBoxes()
    editor.querySelector('.select-bubble').textContent = `${target.order}. ${target.chinese || '(empty OCR region)'}`
  })
}

function bindCheck(editor, selector, target, field) {
  const input = editor.querySelector(selector)
  input.checked = Boolean(target[field])
  input.addEventListener('change', () => {
    target[field] = input.checked
    markDirty()
    renderBubbles()
    renderBoxes()
  })
}

function bindBox(editor, selector, bubble, field) {
  const input = editor.querySelector(selector)
  input.value = bubble.box[field]
  input.addEventListener('input', () => {
    bubble.box[field] = clamp(Number(input.value), 0, 1)
    const page = currentPage()
    bubble.sourceBoxPixels = {
      x: Math.round(bubble.box.x * page.width),
      y: Math.round(bubble.box.y * page.height),
      width: Math.round(bubble.box.width * page.width),
      height: Math.round(bubble.box.height * page.height),
    }
    markDirty()
    renderBoxes()
  })
}

function selectBubble(id) {
  state.selectedBubbleId = id
  renderBubbles()
  renderBoxes()
}

function moveBubble(index, delta) {
  const bubbles = currentPage().bubbles
  const next = index + delta
  if (next < 0 || next >= bubbles.length) return
  ;[bubbles[index], bubbles[next]] = [bubbles[next], bubbles[index]]
  resequence(bubbles)
  markDirty()
  renderAll()
}

function deleteBubble(index) {
  const bubbles = currentPage().bubbles
  const [removed] = bubbles.splice(index, 1)
  if (removed?.id === state.selectedBubbleId) {
    state.selectedBubbleId = bubbles[Math.min(index, bubbles.length - 1)]?.id || null
  }
  resequence(bubbles)
  markDirty()
  renderAll()
}

function addBubble() {
  const page = currentPage()
  const used = new Set(page.bubbles.map((bubble) => bubble.id))
  let counter = page.bubbles.length + 1
  let id = `${page.id}-bubble-${String(counter).padStart(3, '0')}`
  while (used.has(id)) {
    counter += 1
    id = `${page.id}-bubble-${String(counter).padStart(3, '0')}`
  }
  page.bubbles.push({
    id,
    pageId: page.id,
    order: page.bubbles.length + 1,
    rawText: '',
    chinese: '',
    english: '',
    type: 'dialogue',
    confidence: 0,
    box: { x: 0.1, y: 0.1, width: 0.3, height: 0.1 },
    sourceBoxPixels: {
      x: Math.round(page.width * 0.1),
      y: Math.round(page.height * 0.1),
      width: Math.round(page.width * 0.3),
      height: Math.round(page.height * 0.1),
    },
    needsReview: true,
    ignored: false,
  })
  state.selectedBubbleId = id
  markDirty()
  renderAll()
}

function resequence(bubbles) {
  bubbles.forEach((bubble, index) => {
    bubble.order = index + 1
  })
}

function syncProjectFields() {
  state.project.title = elements.title.value.trim()
  state.project.titleChinese = elements.titleZh.value.trim()
  state.project.author = elements.author.value.trim()
  state.project.description = elements.description.value.trim()
}

async function saveProject() {
  syncProjectFields()
  try {
    await request('/api/project', {
      method: 'POST',
      body: JSON.stringify(state.project),
    })
    state.dirty = false
    setStatus('Project saved to disk.')
  } catch (error) {
    setStatus(error.message, true)
  }
}

async function validateProject() {
  try {
    if (state.dirty) await saveProject()
    const report = await request('/api/validate', { method: 'POST', body: '{}' })
    const messages = [...report.errors.map((item) => `Error: ${item}`), ...report.warnings.map((item) => `Warning: ${item}`)]
    setStatus(messages.length ? messages.join(' | ') : 'Validation passed.', report.errors.length > 0)
  } catch (error) {
    setStatus(error.message, true)
  }
}

async function exportProject() {
  try {
    if (state.dirty) await saveProject()
    const result = await request('/api/export', { method: 'POST', body: '{}' })
    setStatus(`Exported ${result.pages} pages to ${result.output}`)
  } catch (error) {
    setStatus(error.message, true)
  }
}

async function translatePage() {
  try {
    if (state.dirty) await saveProject()
    const result = await request('/api/translate-page', {
      method: 'POST',
      body: JSON.stringify({
        pageId: currentPage().id,
        endpoint: elements.translationEndpoint.value,
        model: elements.translationModel.value,
      }),
    })
    setStatus(`Translated ${result.translations.length} regions. Reloading project...`)
    await loadProject()
  } catch (error) {
    setStatus(error.message, true)
  }
}

function markDirty() {
  state.dirty = true
  setStatus('Unsaved changes.')
}

function setStatus(message, isError = false) {
  elements.status.textContent = message
  elements.status.style.color = isError ? '#ffb4ab' : '#ffffff'
}

function clamp(value, minimum, maximum) {
  if (!Number.isFinite(value)) return minimum
  return Math.max(minimum, Math.min(maximum, value))
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function cssEscape(value) {
  return window.CSS?.escape ? window.CSS.escape(value) : value.replaceAll('"', '\\"')
}

elements.previousPage.addEventListener('click', () => setPage(state.currentPageIndex - 1))
elements.nextPage.addEventListener('click', () => setPage(state.currentPageIndex + 1))
elements.addBubble.addEventListener('click', addBubble)
elements.save.addEventListener('click', saveProject)
elements.validate.addEventListener('click', validateProject)
elements.export.addEventListener('click', exportProject)
elements.translate.addEventListener('click', translatePage)
for (const field of [elements.title, elements.titleZh, elements.author, elements.description]) {
  field.addEventListener('input', markDirty)
}
window.addEventListener('beforeunload', (event) => {
  if (!state.dirty) return
  event.preventDefault()
})
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void saveProject()
  }
})

void loadProject()
