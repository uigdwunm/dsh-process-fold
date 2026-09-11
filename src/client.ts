/** 浏览器半插件名（与 Node half 的 name 独立）。 */
export const name = 'dsh-process-fold-client'

/** 无硬依赖服务：只注入样式 + 折叠逻辑。 */
export const inject: string[] = []

/** 一个过程框：成员项，以及它是否紧跟在一次模型文本之后开始（此时需要自己补一份上间距）。 */
interface ProcessBox {
  items: Element[]
  afterText: boolean
}

/** 一轮里的全部框：框键（展开状态的键）与该轮的工具调用数（开关行文案）。 */
interface TurnBoxes {
  keys: string[]
  toolCalls: number
}

/**
 * 把每轮的执行过程（思考 / 工具调用 / 上下文注入 …）按「模型文本」切成一串方框：
 * 每个框内默认只显示最新 2 项，展开时显示全部；模型文本、用户消息、提问交互始终留在框外完整显示。
 *
 * 框的收口边界是**模型文本**：assistant-step 正文里一旦出现非思考内容（文字、图片、中断提示 …），
 * 这段文本之前的框就至此完结 —— 文本本身不进框，它是框与框之间的间隔；
 * 文本之后再出现的思考过程另起一框，绝不与上面的框合并。一轮里因此可能有多个框。
 *
 * 折叠时确实藏了项（框内多于 2 项）的框，会在上边线之上再堆叠两条线，提示"里面还有东西"；
 * 那两条线可点击，点击即展开**它所属的那一个框**（点击带 = 上边线以上，点方框本体仍是原本的交互）。
 * 展开后同一条上边线反过来就是收回控件：鼠标移到框的上边缘时，线中间浮出那两条堆叠线的缩小版
 * （约 52px 宽、居中）当图标，点这条带即只收回这一个框。展开状态因此按「框」存，一轮里的多个框互不影响。
 *
 * 折叠开关长得和官方「过程折叠」按钮一样（一行摘要 + 右侧箭头），放在过程区上方：
 * - 官方按钮在场时，撤掉本插件这一行，直接用它当开关，并把它的箭头方向对齐本插件状态；
 * - 官方按钮不在时（流式输出中、更早历史未加载完、官方设为标准显示、被中断或没有最终文字回答的轮次 …），
 *   本插件这一行代替它显示，行为完全一致；一轮只出一个，**管这一轮的全部框**（没全开就全开，全开就全收）。
 * - 本插件**不读取**官方按钮的 open / aria-expanded / data-* 状态。官方折叠时会给过程成员挂
 *   `hidden="until-found"`，本插件只用 css 里的一条规则把它对「本插件要显示的项」失效掉，
 *   所以无论官方状态如何，框内可见性始终由本插件自己的状态决定。
 *
 * `ctx` 用 `any`：`ClientContext` 类型声明在 dsh profile 树里（`@deepseek-ai/dsh-client-runtime/client`），
 * 本地仓库不安装官方包，构建（esbuild）不做类型检查；`typecheck` 只查我们自己的 TS 语法/类型。
 */
export function apply(ctx: any): void {
  // —— 常量 ——
  const ATTR = {
    boxPart: 'data-box-part',
    gap: 'data-box-gap',
    hidden: 'data-fold-hidden',
    /**
     * 官方折叠时藏的是整个流项（`hidden="until-found"` 挂在流项上），而框的可见项可能是流项内部的块。
     * 子元素的样式救不了被父级 content-visibility 藏起来的内容，所以这里额外给"含可见项的流项"打标记，
     * 由同一条 CSS 盾在流项层面失效官方的隐藏。
     */
    flowShow: 'data-fold-flow-show',
    /** 含模型文本的流项：必须始终可见（官方折叠时也要豁免），并承担框间间隔的流间距。 */
    textFlow: 'data-fold-text-flow',
    /**
     * 折叠时确实藏了项的框：在框的上边线之上堆叠两条线，提示"里面还有东西"。
     * 标记挂在框的第一个可见项上；那两条线本身可点击（点击带 = 上边线以上），点击即展开。
     */
    stack: 'data-fold-stack',
    /**
     * 展开后、且收起时确实会藏项的框：上边线就是收回控件。鼠标移到框的上边缘时，
     * 线中间浮出那两条堆叠线的缩小版当图标；点这条带即只收回这一个框。
     */
    merge: 'data-fold-merge',
    open: 'data-open',
  } as const
  const CLASS = { row: 'dsh-fold-row', rowLabel: 'dsh-fold-row-label', rowChevron: 'dsh-fold-row-chevron' } as const

  /**
   * 官方挂在流项上的稳定属性。旧的实现写死了 hash 类名（`.Md3f7G_flowItem` / `.Sxvs8a_body`），
   * 那些类名会随官方构建变化（在当前 dsh 里已经不存在），所以一律改用这些属性：
   * - `data-chat-flow-kind`：流项类型（assistant-step / tool-call / context / turn-process …）
   * - `data-chat-turn`：所属轮次，同时是本插件折叠状态的键
   * - `data-chat-flow-key`：流项唯一键（没有轮次号时的回退键）
   */
  const FLOW = '[data-chat-flow-kind]'
  const TURN_ATTR = 'data-chat-turn'
  const FLOW_KEY_ATTR = 'data-chat-flow-key'
  /** 官方折叠按钮：既是点击源，也是「这一轮官方控件是否在场」的判据。 */
  const OFFICIAL = '[data-turn-process]'

  // 用户的对话（user + steering）永远不进框：steering 是用户打断/重定向时的新输入，
  // 渲染成和 user 完全一样的右侧气泡（源码里二者都走 UserMessageNodeView）。
  // 错误与中断提示同样是必须可见的信息，官方也把它们定义为不参与过程折叠的独立节点。
  const BOUNDARY = new Set([
    'user',
    'steering',
    'turn-tail',
    'turn-error',
    'turn-max-tokens',
    'turn-process',
    'manual-compaction',
  ])
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
    /* 官方折叠时会把自己隐藏的成员挂上 hidden="until-found"；对本插件要显示的项失效掉。
       流项层面一份（官方藏的是整个流项），内联块层面一份（官方藏的是 answer step 里的内联思考）；
       含模型文本的流项单独一份：文本不进框，但同样要豁免官方的整项隐藏。 */
    [${ATTR.flowShow}][hidden="until-found"],
    [${ATTR.textFlow}][hidden="until-found"],
    [${ATTR.boxPart}][hidden="until-found"] { content-visibility: visible !important; }
    /* 同行内联思考被官方按"已隐藏"压缩了底部间距，本插件把它显示出来时要还回来。 */
    [${ATTR.boxPart}][data-turn-process-inline][hidden] { margin-bottom: 0 !important; }
    /* 文本是框与框之间的间隔：官方折叠时 [hidden] 会让官方列的 margin-top 规则失效，
       这里把文本流项、以及紧随其后的流项各补回一份正常流间距。
       必须排在下面的 gap 规则之前：框内相邻项的 0 间距要能覆盖它。 */
    [${ATTR.textFlow}] { margin-top: var(--dsh-chat-flow-gap, 16px) !important; }
    [${ATTR.textFlow}] + * { margin-top: var(--dsh-chat-flow-gap, 16px) !important; }
    /* 同一正文容器内：间距来自 flex gap → 负 margin 抵消；跨流项：间距来自官方列的 margin-top → 归零；
       紧跟在模型文本之后的框：官方折叠时同样丢掉了这份间距，这里补回来。 */
    [${ATTR.gap}="cancel"] { margin-top: -16px !important; }
    [${ATTR.gap}="zero"] { margin-top: 0 !important; }
    [${ATTR.gap}="text"] { margin-top: var(--dsh-chat-flow-gap, 16px) !important; }
    /* 折叠时藏了项的框：在框的上边线之上再堆叠两条线（越靠上越窄，像叠起来的几张纸），
       提示"里面还有东西"。两条线只是伪元素，不占布局；它们画在上边线以上，可命中、可点击。
       注意：绝对定位的伪元素以**内边距盒**为基准，比边框盒低 1px（= 上边框宽度），
       所以每条的 top 都要多减 1px，否则 ::after 的下沿会盖掉框自己的上边线（最上层那张纸的线）。 */
    [${ATTR.stack}] { position: relative; }
    [${ATTR.stack}]::before,
    [${ATTR.stack}]::after {
      content: ""; position: absolute; box-sizing: border-box; pointer-events: auto; cursor: pointer;
      border: 1px solid ${BORDER}; border-bottom: none; background: ${BG}; border-radius: 8px 8px 0 0;
    }
    [${ATTR.stack}]::before { top: -12px; left: 16px; right: 16px; height: 6px; }
    [${ATTR.stack}]::after { top: -7px; left: 8px; right: 8px; height: 6px; }
    /* 展开后：上边线变成收回控件。鼠标移到框的上边缘时，线中间浮出"堆叠线的小号版"当图标
       —— 就是上面那两条线的缩小版（总宽 52px、居中、越靠上越窄），点这条带即只收回这一个框。
       和折叠态占同一块地方、同一套描边与底色，top 同样按内边距盒多减 1px，不盖住上边线。 */
    [${ATTR.merge}] { position: relative; }
    [${ATTR.merge}]::before,
    [${ATTR.merge}]::after {
      content: ""; position: absolute; left: 50%; box-sizing: border-box;
      border: 1px solid ${BORDER}; border-bottom: none; background: ${BG}; border-radius: 8px 8px 0 0;
      opacity: 0; transition: opacity .1s; pointer-events: auto; cursor: pointer;
    }
    [${ATTR.merge}]::before { top: -12px; width: 40px; height: 6px; margin-left: -20px; }
    [${ATTR.merge}]::after { top: -7px; width: 52px; height: 6px; margin-left: -26px; }
    [${ATTR.merge}]:hover::before, [${ATTR.merge}]:hover::after { opacity: 1; }
    @media (prefers-reduced-motion: reduce) { [${ATTR.merge}]::before, [${ATTR.merge}]::after { transition: none; } }
    [${ATTR.hidden}] { display: none !important; }
    /* 折叠开关：与官方 TurnProcessNodeView 同一套尺寸与 token，官方按钮不在时顶替它。 */
    .${CLASS.row} { box-sizing: border-box; display: flex; align-items: center; width: 100%; min-width: 0; height: 33px; padding: 0 0 8px; border: none; border-bottom: .5px solid var(--dsw-alias-border-l2); background: none; color: var(--dsw-alias-label-secondary); font-size: 14px; line-height: 24px; text-align: left; cursor: pointer; }
    .${CLASS.row}:not([${ATTR.open}]) { margin-bottom: 8px; }
    .${CLASS.rowLabel} { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .${CLASS.rowChevron} { flex: none; width: 16px; height: 16px; margin-left: 6px; color: var(--dsw-alias-label-tertiary); transition: transform .1s; transform: rotate(-90deg); }
    .${CLASS.row}[${ATTR.open}] .${CLASS.rowChevron} { transform: rotate(0); }
    @media (prefers-reduced-motion: reduce) { .${CLASS.rowChevron} { transition: none; } }
  `

  // —— 状态 ——
  /**
   * 展开状态按**框**存（不是按轮），元素引用会在 React 重渲染时失效，所以键由 boxKey 生成：
   * 「框首项所在流项的 key + 它在正文里的位置」。
   * 每轮的开关行 / 官方按钮管整轮：这一轮的框全开时它才显示为展开态。
   */
  const expandedBoxes = new Set<string>()
  /** 每轮一个折叠开关行，键是这一轮第一个过程框的流项。 */
  const rows = new Map<Element, HTMLButtonElement>()
  /** 最近一次 applyFold 算出的「轮 → 该轮的框」，供开关行、查找跟随和官方按钮状态使用。 */
  let turnBoxes = new Map<string, TurnBoxes>()
  let root: Element | null = null
  let observer: MutationObserver | null = null

  function scroller(): Element {
    return document.querySelector('[data-conversation-scroll]') ?? document.scrollingElement ?? document.documentElement
  }

  /** 流项所属轮次的键；没有轮次号时退回流项唯一键。 */
  function keyOf(anchor: Element): string {
    return anchor.getAttribute(TURN_ATTR) ?? anchor.getAttribute(FLOW_KEY_ATTR) ?? ''
  }

  /**
   * assistant-step 的正文容器。官方结构是
   * `flowItem > [data-slot]（槽位包装层，display:contents）> root > body`，
   * 块（思考 / 文字 …）是 body 的直接子元素。槽位包装层必须跳过，否则会把 root 当成 body。
   */
  function bodyOf(flow: Element): Element | null {
    const slot = flow.querySelector(':scope > [data-slot]')
    const root = (slot ?? flow).firstElementChild
    return root === null ? null : (root.firstElementChild as Element | null)
  }

  /** 思考块：可能是 ReasoningRow 本身，也可能被官方的内联思考包装层包着。 */
  function isThinkBlock(el: Element): boolean {
    return (
      el.getAttribute('data-variant') === 'think' ||
      el.hasAttribute('data-turn-process-inline') ||
      el.firstElementChild?.getAttribute('data-variant') === 'think'
    )
  }

  /**
   * 框的稳定键（展开状态按框存）。元素引用会在 React 重渲染时失效，所以用
   * 「框首项所在流项的 key + 它在正文里的位置」：同一个正文里被文本切开的多个框靠位置区分。
   */
  function boxKey(box: ProcessBox): string {
    const first = box.items[0]
    const flow = first.closest(FLOW)
    if (flow === null) return ''
    const base = flow.getAttribute(FLOW_KEY_ATTR) ?? flow.getAttribute(TURN_ATTR) ?? ''
    const body = flow.getAttribute('data-chat-flow-kind') === 'assistant-step' ? bodyOf(flow) : null
    const index = body !== null && first.parentElement === body ? Array.prototype.indexOf.call(body.children, first) : 0
    return `${base}#${String(index)}`
  }

  /** 当前在场的官方折叠按钮：轮次 → 按钮元素（每轮 applyFold 只查一次 DOM）。 */
  function officialRows(scope: Element): Map<string, Element> {
    const found = new Map<string, Element>()
    for (const row of scope.querySelectorAll(OFFICIAL)) {
      const turn = row.getAttribute('data-turn-process')
      if (turn !== null && !found.has(turn)) found.set(turn, row)
    }
    return found
  }

  /**
   * 收集所有过程框，以及承载模型文本的流项。
   *
   * 框的收口边界就是**模型文本**：assistant-step 正文里一旦出现非思考内容（文字、图片、中断提示 …），
   * 当前框就到此为止 —— 这段内容本身不进框，它是框与框之间的间隔；
   * 文本之后新出现的思考过程另起一框，绝不与上面的框合并。
   * 也就是说：模型每输出一次文本，这段文本之前的框就至此完结。
   *
   * 官方定义的轮次边界（`BOUNDARY`）同样收口；`ask_user_question` 交互工具调用单独收口，
   * 保证用户始终能看到并作答。
   */
  function collectBoxes(scope: Element): { boxes: ProcessBox[]; textFlows: Set<Element> } {
    const flows = scope.querySelectorAll(FLOW)
    const boxes: ProcessBox[] = []
    const textFlows = new Set<Element>()
    /** 当前框是否紧跟在一次模型文本之后开始；官方折叠时那份流间距要由本插件补回来。 */
    let afterText = false
    let current: ProcessBox | null = null
    const push = (el: Element): void => {
      if (!current) { current = { items: [], afterText }; boxes.push(current) }
      current.items.push(el)
    }

    for (const f of Array.from(flows)) {
      const kind = f.getAttribute('data-chat-flow-kind')
      if (kind === null || BOUNDARY.has(kind)) { current = null; afterText = false; continue }
      if (PROCESS.has(kind)) {
        // 提问工具调用不套框：跳过当前框并收口，保证用户始终能看到并作答。
        if (kind === 'tool-call' && f.querySelector(QUESTION_TOOL)) { current = null; afterText = false; continue }
        push(f); continue
      }
      if (kind === 'assistant-step') {
        const body = bodyOf(f)
        if (body) {
          for (const c of Array.from(body.children)) {
            if (isThinkBlock(c)) { push(c); continue }
            // 模型文本（文字 / 图片 / 中断提示 …）：不进框，并在此收口当前框。
            current = null
            textFlows.add(f)
            afterText = true
          }
        }
        continue
      }
      current = null
      afterText = false
    }
    return { boxes, textFlows }
  }

  /** 撤掉某一轮的折叠开关行（官方按钮接管、或这一轮已经有行了）。 */
  function removeRow(anchor: Element): void {
    const row = rows.get(anchor)
    if (row) { row.remove(); rows.delete(anchor) }
  }

  /** 开关行文案：与官方一致的措辞，没有工具调用时退化为「已思考」。 */
  function rowText(toolCalls: number): string {
    return toolCalls > 0 ? `${String(toolCalls)} 次工具调用` : '已思考'
  }

  /** 应用单个框：折叠隐藏 / 框样式 / 缝隙 / 开关行。 */
  function applyBox(
    box: ProcessBox,
    seen: Set<Element>,
    withOfficial: Map<string, Element>,
    withRow: Set<string>,
  ): void {
    const items = box.items
    const anchor = items[0].closest(FLOW) as Element
    const turn = keyOf(anchor)
    const entry = turnBoxes.get(turn)
    const key = boxKey(box)
    const isExpanded = expandedBoxes.has(key)
    // 开关行 / 官方按钮管整轮：这一轮的框全开时才显示为展开态。
    const allOpen = entry !== undefined && entry.keys.length > 0 && entry.keys.every((k) => expandedBoxes.has(k))
    const visible = isExpanded ? items : items.slice(-2)

    if (!isExpanded) {
      for (let i = 0; i < items.length - 2; i++) items[i].setAttribute(ATTR.hidden, '1')
    }

    visible.forEach((el, k) => {
      const part = visible.length === 1 ? 'only' : k === 0 ? 'start' : k === visible.length - 1 ? 'end' : 'middle'
      el.setAttribute(ATTR.boxPart, part)
      const flow = el.closest(FLOW) as Element | null
      flow?.setAttribute(ATTR.flowShow, '1')
      if (k > 0) {
        const prev = visible[k - 1]
        const sameFlow = prev.closest(FLOW) === flow
        const gapOn = sameFlow ? el : flow
        gapOn?.setAttribute(ATTR.gap, sameFlow ? 'cancel' : 'zero')
      } else if (box.afterText && flow !== null && flow.getAttribute(ATTR.gap) !== 'zero') {
        // 框紧跟在模型文本之后：官方折叠会让官方列的 margin-top 规则失效，这里自己补一份流间距。
        // 若该流项已经是上一个框的延续（gap=zero），保持无缝，不覆盖。
        flow.setAttribute(ATTR.gap, 'text')
      }
      // 收起时确实会藏项（>2 项）→ 折叠态挂堆叠线、展开态挂上边缘的收回控件；值都是这个框的键。
      if (k === 0 && items.length > 2) el.setAttribute(isExpanded ? ATTR.merge : ATTR.stack, key)
    })

    // 官方按钮在场 → 用它当这一轮的开关：撤掉本插件这一行，并把它的箭头方向对齐本插件状态
    // （只写不读：本插件从不据此判断可见性）。
    const official = withOfficial.get(turn)
    if (official) {
      official.toggleAttribute(ATTR.open, allOpen)
      official.setAttribute('aria-expanded', String(allOpen))
      removeRow(anchor)
      return
    }

    // 一轮只出一个开关行：放在这一轮第一个过程框的上方，位置和官方按钮一致。
    // 这一轮后续的过程框照常上框/折叠，只是不再插第二行。
    if (withRow.has(turn)) return
    withRow.add(turn)

    const beforeEl = items[0].closest(FLOW) as Element
    let row = rows.get(anchor)
    if (!row) {
      row = document.createElement('button')
      row.type = 'button'
      row.className = CLASS.row
      row.innerHTML = `<span class="${CLASS.rowLabel}"></span><svg class="${CLASS.rowChevron}" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 6.25 8 9.75l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      row.addEventListener('click', (e) => { e.stopPropagation(); toggle(anchor) })
      rows.set(anchor, row)
    }
    const labelEl = row.firstElementChild
    const text = rowText(entry?.toolCalls ?? 0)
    if (labelEl && labelEl.textContent !== text) labelEl.textContent = text
    row.toggleAttribute(ATTR.open, allOpen)
    row.setAttribute('aria-expanded', String(allOpen))
    if (row.parentNode !== beforeEl.parentNode || row.nextSibling !== beforeEl) {
      beforeEl.parentNode!.insertBefore(row, beforeEl)
    }
    seen.add(anchor)
  }

  /** 所有子项都被折叠的 assistant-step 流项整体隐藏，避免留下空白。 */
  function hideEmptySteps(scope: Element): void {
    for (const f of scope.querySelectorAll(FLOW + '[data-chat-flow-kind="assistant-step"]')) {
      const kids = Array.from(bodyOf(f)?.children ?? [])
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
      for (const el of root.querySelectorAll(`[${ATTR.hidden}], [${ATTR.boxPart}], [${ATTR.gap}], [${ATTR.flowShow}], [${ATTR.textFlow}], [${ATTR.stack}], [${ATTR.merge}]`)) {
        el.removeAttribute(ATTR.hidden)
        el.removeAttribute(ATTR.boxPart)
        el.removeAttribute(ATTR.gap)
        el.removeAttribute(ATTR.flowShow)
        el.removeAttribute(ATTR.textFlow)
        el.removeAttribute(ATTR.stack)
        el.removeAttribute(ATTR.merge)
      }

      const withOfficial = officialRows(root)
      const { boxes, textFlows } = collectBoxes(root)
      // 模型文本永远可见：官方折叠会把它所在的整个流项藏掉，这里连同流间距一起豁免。
      for (const flow of textFlows) flow.setAttribute(ATTR.textFlow, '1')
      // 按轮汇总：开关行文案用整轮的工具调用数，开关行的展开态用整轮的框是否全开。
      turnBoxes = new Map<string, TurnBoxes>()
      for (const box of boxes) {
        const turn = keyOf(box.items[0].closest(FLOW) as Element)
        const entry = turnBoxes.get(turn) ?? { keys: [], toolCalls: 0 }
        entry.keys.push(boxKey(box))
        for (const el of box.items) if (el.getAttribute('data-chat-flow-kind') === 'tool-call') entry.toolCalls++
        turnBoxes.set(turn, entry)
      }

      const seen = new Set<Element>()
      const withRow = new Set<string>()
      for (const box of boxes) applyBox(box, seen, withOfficial, withRow)

      for (const [anchor, row] of Array.from(rows)) {
        if (!seen.has(anchor)) { row.remove(); rows.delete(anchor) }
      }
      hideEmptySteps(root)
    } catch (err) {
      // 任何异常都不能冒泡打断 React/turn，仅记录。
      console.error('[dsh-process-fold] applyFold error', err)
    } finally {
      observer?.observe(document.body, { childList: true, subtree: true })
    }
  }

  /** 切换某一轮的全部框：没全开就全开，全开就全收。 */
  function toggleTurn(turn: string | null): void {
    if (turn === null) return
    const entry = turnBoxes.get(turn)
    if (entry === undefined) return
    const allOpen = entry.keys.every((key) => expandedBoxes.has(key))
    for (const key of entry.keys) {
      if (allOpen) expandedBoxes.delete(key)
      else expandedBoxes.add(key)
    }
    applyFold()
  }

  /** 点击本插件自己的开关行：切换状态 → 重排 → 锚定行的视口位置补偿滚动（下方不动）。 */
  function toggle(anchor: Element): void {
    const row = rows.get(anchor)
    const before = row ? row.getBoundingClientRect().top : null
    toggleTurn(keyOf(anchor) || null)
    if (before !== null && row && row.isConnected) {
      const delta = row.getBoundingClientRect().top - before
      if (delta !== 0) scroller().scrollTop += delta
    }
  }

  /**
   * 展开**单个**框（堆叠线点击）。堆叠线画在「隐藏内容的起点」上，所以这里不做滚动补偿：
   * 直接让藏起来的项在原处长出来，用户点的那个位置就是新内容的开头。
   */
  function expandBox(key: string | null): void {
    if (key === null || key === '' || expandedBoxes.has(key)) return
    expandedBoxes.add(key)
    applyFold()
  }

  /**
   * 收回**单个**框（点击展开框的上边缘）。和展开对称：不做滚动补偿 ——
   * 藏起来的那几项原地消失，剩下的项上移补位，正好落回用户点的那条线上。
   */
  function collapseBox(key: string | null): void {
    if (key === null || key === '' || !expandedBoxes.has(key)) return
    expandedBoxes.delete(key)
    applyFold()
  }

  /**
   * 用户点击官方折叠按钮：这是插件与官方唯一的交互点。
   * 不拦截事件 —— 官方自己也会切它的 open（它的箭头方向因此自动跟随），
   * 本插件只翻自己的状态；可见性由本插件的属性 + CSS 盾决定，与官方写入顺序无关。
   */
  function onDocumentClick(event: MouseEvent): void {
    const target = event.target as Element | null
    // 折叠框上边线以上的堆叠线：点击只展开这一个框（点方框本体保持原有行为）。
    const stack = target?.closest?.(`[${ATTR.stack}]`) as Element | null
    if (stack !== null && event.clientY < stack.getBoundingClientRect().top) {
      event.stopPropagation()
      event.preventDefault()
      expandBox(stack.getAttribute(ATTR.stack))
      return
    }
    // 展开框的上边缘（图标就压在这条线上）：点击只收回这一个框。
    const merge = target?.closest?.(`[${ATTR.merge}]`) as Element | null
    if (merge !== null) {
      const top = merge.getBoundingClientRect().top
      if (event.clientY >= top - 14 && event.clientY <= top + 4) {
        event.stopPropagation()
        event.preventDefault()
        collapseBox(merge.getAttribute(ATTR.merge))
        return
      }
    }
    const row = target?.closest?.(OFFICIAL) as Element | null
    if (!row) return
    const before = row.getBoundingClientRect().top
    toggleTurn(row.getAttribute('data-turn-process'))
    // 官方的重渲染在本次事件之后落地，下一帧再补偿按钮的视口位置。
    requestAnimationFrame(() => {
      if (!row.isConnected) return
      const delta = row.getBoundingClientRect().top - before
      if (delta !== 0) scroller().scrollTop += delta
    })
  }

  /**
   * 浏览器查找（Ctrl+F）命中被官方折叠的内容时，官方会自己把这一轮展开；
   * 跟随同一轮的展开态，避免"找到了却被本插件重新收成 2 项"。
   */
  function onBeforeMatch(event: Event): void {
    const flow = (event.target as Element | null)?.closest?.(FLOW) as Element | null
    if (!flow || !flow.hasAttribute('data-turn-process-member')) return
    const turn = flow.getAttribute(TURN_ATTR)
    if (turn === null) return
    const entry = turnBoxes.get(turn)
    if (entry === undefined || entry.keys.every((key) => expandedBoxes.has(key))) return
    for (const key of entry.keys) expandedBoxes.add(key)
    applyFold()
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
    document.addEventListener('click', onDocumentClick, true)
    document.addEventListener('beforematch', onBeforeMatch, true)
    applyFold()

    return () => {
      style.remove()
      observer?.disconnect()
      observer = null
      root = null
      document.removeEventListener('click', onDocumentClick, true)
      document.removeEventListener('beforematch', onBeforeMatch, true)
      document.querySelectorAll(`[${ATTR.hidden}], [${ATTR.boxPart}], [${ATTR.gap}], [${ATTR.flowShow}], [${ATTR.textFlow}], [${ATTR.stack}], [${ATTR.merge}]`).forEach((el) => {
        el.removeAttribute(ATTR.hidden)
        el.removeAttribute(ATTR.boxPart)
        el.removeAttribute(ATTR.gap)
        el.removeAttribute(ATTR.flowShow)
        el.removeAttribute(ATTR.textFlow)
        el.removeAttribute(ATTR.stack)
        el.removeAttribute(ATTR.merge)
      })
      for (const row of rows.values()) row.remove()
      rows.clear()
      expandedBoxes.clear()
      turnBoxes = new Map()
    }
  }, 'dsh-process-fold: box + fold + toggle')
}
