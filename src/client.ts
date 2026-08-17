/** 浏览器半插件名（与 Node half 的 name 独立）。 */
export const name = 'dsh-process-fold-client'

/** 无硬依赖服务：只注入样式 + 折叠逻辑。 */
export const inject: string[] = []

/**
 * 把每一轮的工具调用过程（思考 / 工具调用 / 上下文注入 / 转向 …）套进一个方框：
 * - 框内只显示「最新 2 项」，更早的项 `display:none` 隐藏；
 * - 最终文字结果留在框外、完整显示；
 * - 每个框下方一个「展开过程 / 折叠显示」按钮，点击切换，且切换时锚定按钮视口位置，
 *   让下方不动、只在框的上方涨/收。
 *
 * `ctx` 用 `any`：`ClientContext` 类型声明在 dsh profile 树里（`@deepseek-ai/dsh-client-runtime/client`），
 * 本地仓库不安装官方包，构建（esbuild）不做类型检查；`typecheck` 只查我们自己的 TS 语法/类型。
 */
export function apply(ctx: any): void {
  // —— 常量 ——
  const ATTR = { boxPart: 'data-box-part', gap: 'data-box-gap', hidden: 'data-fold-hidden' } as const
  const CLASS = { toggle: 'dsh-fold-toggle', label: 'dsh-fold-label' } as const
  const FLOW = '.Md3f7G_flowItem'
  const BODY = '.Sxvs8a_body'
  // 用户的对话（user + steering）永远不进框：steering 是用户打断/重定向时的新输入，
  // 渲染成和 user 完全一样的右侧气泡（源码里二者都走 UserMessageNodeView）。
  const BOUNDARY = new Set(['user', 'steering', 'turn-tail', 'manual-compaction'])
  const PROCESS = new Set(['tool-call', 'context'])
  /** 用户提问（ask_user_question）是必须可见的交互：不进框、不折叠，作为框的收口边界。 */
  const QUESTION_TOOL = '[data-tool="ask_user_question"]'

  const BORDER = 'color-mix(in srgb, var(--dsw-alias-label-secondary) 40%, transparent)'
  const BG = 'color-mix(in srgb, var(--dsw-alias-label-secondary) 5%, var(--dsw-alias-bg-base))'
  const css = `
    [${ATTR.boxPart}] { box-sizing: border-box; border: 1px solid ${BORDER}; padding: 6px 10px; background: ${BG}; }
    [${ATTR.boxPart}="start"] { border-bottom: none; border-radius: 8px 8px 0 0; }
    [${ATTR.boxPart}="middle"] { border-top: none; border-bottom: none; border-radius: 0; }
    [${ATTR.boxPart}="end"] { border-top: none; border-radius: 0 0 8px 8px; }
    [${ATTR.boxPart}="only"] { border-radius: 8px; }
    [${ATTR.gap}] { margin-top: -16px !important; }
    [${ATTR.hidden}] { display: none !important; }
    .${CLASS.toggle} { align-self: flex-start; margin: -10px 0 0; padding: 3px 10px; border: 1px solid ${BORDER}; border-radius: 6px; background: ${BG}; color: var(--dsw-alias-label-secondary, #888); font-size: 12px; line-height: 16px; cursor: pointer; user-select: none; }
    .${CLASS.toggle}:hover { color: var(--dsw-alias-label-primary, #333); border-color: color-mix(in srgb, var(--dsw-alias-label-secondary) 70%, transparent); }
    .${CLASS.label} { align-self: flex-start; margin: 0 0 -10px; padding: 0 2px; color: var(--dsw-alias-label-secondary, #888); font-size: 12px; line-height: 16px; user-select: none; }
  `

  // —— 状态 ——
  const expanded = new WeakSet<Element>()
  const buttons = new Map<Element, HTMLButtonElement>()
  const labels = new Map<Element, HTMLElement>()
  let root: Element | null = null
  let observer: MutationObserver | null = null

  function scroller(): Element {
    return document.querySelector('[data-conversation-scroll]') ?? document.scrollingElement ?? document.documentElement
  }

  /** 把一个流项里的所有「项」追加进当前框（think 恒为项；文字在非结尾时为项）。 */
  function collectBoxes(scope: Element): Element[][] {
    const flows = scope.querySelectorAll(FLOW)
    const boxes: Element[][] = []
    let current: Element[] | null = null
    const push = (el: Element): void => {
      if (!current) { current = []; boxes.push(current) }
      current.push(el)
    }

    for (let i = 0; i < flows.length; i++) {
      const f = flows[i]
      const kind = f.getAttribute('data-chat-flow-kind')
      const nextKind = flows[i + 1]?.getAttribute('data-chat-flow-kind') ?? null
      const endsHere = nextKind === null || BOUNDARY.has(nextKind)

      if (kind === null) { current = null; continue }
      if (BOUNDARY.has(kind)) { current = null; continue }
      if (PROCESS.has(kind)) {
        // 提问工具调用不套框：跳过当前框并收口，保证用户始终能看到并作答。
        if (kind === 'tool-call' && f.querySelector(QUESTION_TOOL)) { current = null; continue }
        push(f); continue
      }
      if (kind === 'assistant-step') {
        const body = f.querySelector(BODY)
        if (body) {
          for (const c of Array.from(body.children)) {
            // 跳过插件自己插入的标签/按钮，避免它们被当成框项（否则按钮会被标成 end，出现半个框）。
            if (c.classList && (c.classList.contains(CLASS.toggle) || c.classList.contains(CLASS.label))) continue
            if (c.getAttribute('data-variant') === 'think' || !endsHere) push(c)
          }
        }
        if (endsHere) current = null
        continue
      }
      current = null
    }
    return boxes
  }

  /** 应用单个框：折叠隐藏 / 框样式 / 缝隙 / 按钮。 */
  function applyBox(box: Element[], seen: Set<Element>): void {
    const anchor = box[0].closest(FLOW) as Element
    const isExpanded = expanded.has(anchor)
    const visible = isExpanded ? box : box.slice(-2)

    if (!isExpanded) {
      for (let i = 0; i < box.length - 2; i++) box[i].setAttribute(ATTR.hidden, '1')
    }

    visible.forEach((el, k) => {
      const part = visible.length === 1 ? 'only' : k === 0 ? 'start' : k === visible.length - 1 ? 'end' : 'middle'
      el.setAttribute(ATTR.boxPart, part)
      if (k > 0) {
        const prev = visible[k - 1]
        const gapOn = prev.closest(FLOW) === el.closest(FLOW) ? el : (el.closest(FLOW) as Element)
        gapOn.setAttribute(ATTR.gap, '1')
      }
    })

    const boxStart = visible[0]
    const beforeEl = boxStart.closest(FLOW) as Element
    let cap = labels.get(anchor)
    if (!cap) {
      cap = document.createElement('div')
      cap.className = CLASS.label
      cap.textContent = '执行过程'
      labels.set(anchor, cap)
    }
    if (cap.parentNode !== beforeEl.parentNode || cap.nextSibling !== beforeEl) {
      beforeEl.parentNode!.insertBefore(cap, beforeEl)
    }

    const boxEnd = visible[visible.length - 1]
    let btn = buttons.get(anchor)
    if (!btn) {
      btn = document.createElement('button')
      btn.type = 'button'
      btn.className = CLASS.toggle
      btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(anchor) })
      buttons.set(anchor, btn)
    }
    const label = isExpanded ? '折叠显示' : '展开过程'
    if (btn.textContent !== label) btn.textContent = label
    if (btn.parentNode !== boxEnd.parentNode || btn.previousSibling !== boxEnd) {
      boxEnd.parentNode!.insertBefore(btn, boxEnd.nextSibling)
    }
    seen.add(anchor)
  }

  /** 所有子项都被折叠的 assistant-step 流项整体隐藏，避免留下空白。 */
  function hideEmptySteps(scope: Element): void {
    for (const f of scope.querySelectorAll(FLOW + '[data-chat-flow-kind="assistant-step"]')) {
      const kids = Array.from(f.querySelector(BODY)?.children ?? [])
      if (kids.length > 0 && kids.every((c) => c.hasAttribute(ATTR.hidden))) {
        f.setAttribute(ATTR.hidden, '1')
      }
    }
  }

  /**
   * 重算所有框与项。防死循环：执行期间先摘掉 MutationObserver，
   * 自己的 DOM 写入不会再次触发自己，只响应 React/流式带来的外部变更。
   */
  function applyFold(): void {
    if (!root || !root.isConnected) root = document.querySelector('[data-chat-flow]')
    if (!root) return
    // 提问进行中（composer 被提问卡接管）：完全不碰 DOM，避免干扰提问渲染/打断 turn。
    if (document.querySelector('[data-question-key], [data-plan-review-key]')) return
    observer?.disconnect()
    try {
      for (const el of root.querySelectorAll(`[${ATTR.hidden}], [${ATTR.boxPart}], [${ATTR.gap}]`)) {
        el.removeAttribute(ATTR.hidden)
        el.removeAttribute(ATTR.boxPart)
        el.removeAttribute(ATTR.gap)
      }

      const seen = new Set<Element>()
      for (const box of collectBoxes(root)) applyBox(box, seen)

      for (const [anchor, btn] of Array.from(buttons)) {
        if (!seen.has(anchor)) { btn.remove(); buttons.delete(anchor) }
      }
      for (const [anchor, cap] of Array.from(labels)) {
        if (!seen.has(anchor)) { cap.remove(); labels.delete(anchor) }
      }
      hideEmptySteps(root)
    } catch (err) {
      // 任何异常都不能冒泡打断 React/turn，仅记录。
      console.error('[dsh-process-fold] applyFold error', err)
    } finally {
      observer?.observe(document.body, { childList: true, subtree: true })
    }
  }

  /** 点击按钮：切换状态 → 重排 → 锚定按钮视口位置补偿滚动（下方不动）。 */
  function toggle(anchor: Element): void {
    const btn = buttons.get(anchor)
    const before = btn ? btn.getBoundingClientRect().top : null
    if (expanded.has(anchor)) expanded.delete(anchor)
    else expanded.add(anchor)
    applyFold()
    if (before !== null && btn) {
      const delta = btn.getBoundingClientRect().top - before
      if (delta !== 0) scroller().scrollTop += delta
    }
  }

  ctx.effect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-plugin', 'dsh-process-fold')
    style.textContent = css
    document.head.appendChild(style)

    root = document.querySelector('[data-chat-flow]')
    // 挂在 document.body：首屏时 [data-chat-flow] 可能还没渲染出来，
    // 观察 body 才能在流容器出现后立刻触发 applyFold。
    observer = new MutationObserver(applyFold)
    observer.observe(document.body, { childList: true, subtree: true })
    applyFold()

    return () => {
      style.remove()
      observer?.disconnect()
      observer = null
      root = null
      document.querySelectorAll(`[${ATTR.hidden}], [${ATTR.boxPart}], [${ATTR.gap}]`).forEach((el) => {
        el.removeAttribute(ATTR.hidden)
        el.removeAttribute(ATTR.boxPart)
        el.removeAttribute(ATTR.gap)
      })
      for (const btn of buttons.values()) btn.remove()
      buttons.clear()
      for (const cap of labels.values()) cap.remove()
      labels.clear()
    }
  }, 'dsh-process-fold: box + fold + toggle')
}
