window.__ModuleLoader__.load({ id: "dsh-process-fold", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.ts
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(client_exports);
var name = "dsh-process-fold-client";
var inject = [];
function apply(ctx) {
  const ATTR = {
    boxPart: "data-box-part",
    gap: "data-box-gap",
    hidden: "data-fold-hidden",
    /**
     * 官方折叠时藏的是整个流项（`hidden="until-found"` 挂在流项上），而框的可见项可能是流项内部的块。
     * 子元素的样式救不了被父级 content-visibility 藏起来的内容，所以这里额外给"含可见项的流项"打标记，
     * 由同一条 CSS 盾在流项层面失效官方的隐藏。
     */
    flowShow: "data-fold-flow-show",
    /** 含模型文本的流项：必须始终可见（官方折叠时也要豁免），并承担框间间隔的流间距。 */
    textFlow: "data-fold-text-flow",
    /**
     * 折叠时确实藏了项的框：在框的上边线之上堆叠两条线，提示"里面还有东西"。
     * 标记挂在框的第一个可见项上；那两条线本身可点击（点击带 = 上边线以上），点击即展开。
     */
    stack: "data-fold-stack",
    /**
     * 展开后、且收起时确实会藏项的框：上边线就是收回控件。鼠标移到框的上边缘时，
     * 线中间浮出一个"合并/收起"图标；点这条带即只收回这一个框。
     */
    merge: "data-fold-merge",
    open: "data-open"
  };
  const CLASS = { row: "dsh-fold-row", rowLabel: "dsh-fold-row-label", rowChevron: "dsh-fold-row-chevron" };
  const FLOW = "[data-chat-flow-kind]";
  const TURN_ATTR = "data-chat-turn";
  const FLOW_KEY_ATTR = "data-chat-flow-key";
  const OFFICIAL = "[data-turn-process]";
  const BOUNDARY = /* @__PURE__ */ new Set([
    "user",
    "steering",
    "turn-tail",
    "turn-error",
    "turn-max-tokens",
    "turn-process",
    "manual-compaction"
  ]);
  const PROCESS = /* @__PURE__ */ new Set(["tool-call", "context"]);
  const QUESTION_TOOL = '[data-tool="ask_user_question"]';
  const BORDER = "color-mix(in srgb, var(--dsw-alias-label-secondary) 40%, transparent)";
  const BG = "color-mix(in srgb, var(--dsw-alias-label-secondary) 5%, var(--dsw-alias-bg-base))";
  const css = `
    [${ATTR.boxPart}] { box-sizing: border-box; border: 1px solid ${BORDER}; padding: 6px 10px; background: ${BG}; }
    [${ATTR.boxPart}="start"] { border-bottom: none; border-radius: 8px 8px 0 0; }
    [${ATTR.boxPart}="middle"] { border-top: none; border-bottom: none; border-radius: 0; }
    [${ATTR.boxPart}="end"] { border-top: none; border-radius: 0 0 8px 8px; }
    [${ATTR.boxPart}="only"] { border-radius: 8px; }
    /* \u5B98\u65B9\u6298\u53E0\u65F6\u4F1A\u628A\u81EA\u5DF1\u9690\u85CF\u7684\u6210\u5458\u6302\u4E0A hidden="until-found"\uFF1B\u5BF9\u672C\u63D2\u4EF6\u8981\u663E\u793A\u7684\u9879\u5931\u6548\u6389\u3002
       \u6D41\u9879\u5C42\u9762\u4E00\u4EFD\uFF08\u5B98\u65B9\u85CF\u7684\u662F\u6574\u4E2A\u6D41\u9879\uFF09\uFF0C\u5185\u8054\u5757\u5C42\u9762\u4E00\u4EFD\uFF08\u5B98\u65B9\u85CF\u7684\u662F answer step \u91CC\u7684\u5185\u8054\u601D\u8003\uFF09\uFF1B
       \u542B\u6A21\u578B\u6587\u672C\u7684\u6D41\u9879\u5355\u72EC\u4E00\u4EFD\uFF1A\u6587\u672C\u4E0D\u8FDB\u6846\uFF0C\u4F46\u540C\u6837\u8981\u8C41\u514D\u5B98\u65B9\u7684\u6574\u9879\u9690\u85CF\u3002 */
    [${ATTR.flowShow}][hidden="until-found"],
    [${ATTR.textFlow}][hidden="until-found"],
    [${ATTR.boxPart}][hidden="until-found"] { content-visibility: visible !important; }
    /* \u540C\u884C\u5185\u8054\u601D\u8003\u88AB\u5B98\u65B9\u6309"\u5DF2\u9690\u85CF"\u538B\u7F29\u4E86\u5E95\u90E8\u95F4\u8DDD\uFF0C\u672C\u63D2\u4EF6\u628A\u5B83\u663E\u793A\u51FA\u6765\u65F6\u8981\u8FD8\u56DE\u6765\u3002 */
    [${ATTR.boxPart}][data-turn-process-inline][hidden] { margin-bottom: 0 !important; }
    /* \u6587\u672C\u662F\u6846\u4E0E\u6846\u4E4B\u95F4\u7684\u95F4\u9694\uFF1A\u5B98\u65B9\u6298\u53E0\u65F6 [hidden] \u4F1A\u8BA9\u5B98\u65B9\u5217\u7684 margin-top \u89C4\u5219\u5931\u6548\uFF0C
       \u8FD9\u91CC\u628A\u6587\u672C\u6D41\u9879\u3001\u4EE5\u53CA\u7D27\u968F\u5176\u540E\u7684\u6D41\u9879\u5404\u8865\u56DE\u4E00\u4EFD\u6B63\u5E38\u6D41\u95F4\u8DDD\u3002
       \u5FC5\u987B\u6392\u5728\u4E0B\u9762\u7684 gap \u89C4\u5219\u4E4B\u524D\uFF1A\u6846\u5185\u76F8\u90BB\u9879\u7684 0 \u95F4\u8DDD\u8981\u80FD\u8986\u76D6\u5B83\u3002 */
    [${ATTR.textFlow}] { margin-top: var(--dsh-chat-flow-gap, 16px) !important; }
    [${ATTR.textFlow}] + * { margin-top: var(--dsh-chat-flow-gap, 16px) !important; }
    /* \u540C\u4E00\u6B63\u6587\u5BB9\u5668\u5185\uFF1A\u95F4\u8DDD\u6765\u81EA flex gap \u2192 \u8D1F margin \u62B5\u6D88\uFF1B\u8DE8\u6D41\u9879\uFF1A\u95F4\u8DDD\u6765\u81EA\u5B98\u65B9\u5217\u7684 margin-top \u2192 \u5F52\u96F6\uFF1B
       \u7D27\u8DDF\u5728\u6A21\u578B\u6587\u672C\u4E4B\u540E\u7684\u6846\uFF1A\u5B98\u65B9\u6298\u53E0\u65F6\u540C\u6837\u4E22\u6389\u4E86\u8FD9\u4EFD\u95F4\u8DDD\uFF0C\u8FD9\u91CC\u8865\u56DE\u6765\u3002 */
    [${ATTR.gap}="cancel"] { margin-top: -16px !important; }
    [${ATTR.gap}="zero"] { margin-top: 0 !important; }
    [${ATTR.gap}="text"] { margin-top: var(--dsh-chat-flow-gap, 16px) !important; }
    /* \u6298\u53E0\u65F6\u85CF\u4E86\u9879\u7684\u6846\uFF1A\u5728\u6846\u7684\u4E0A\u8FB9\u7EBF\u4E4B\u4E0A\u518D\u5806\u53E0\u4E24\u6761\u7EBF\uFF08\u8D8A\u9760\u4E0A\u8D8A\u7A84\uFF0C\u50CF\u53E0\u8D77\u6765\u7684\u51E0\u5F20\u7EB8\uFF09\uFF0C
       \u63D0\u793A"\u91CC\u9762\u8FD8\u6709\u4E1C\u897F"\u3002\u4E24\u6761\u7EBF\u53EA\u662F\u4F2A\u5143\u7D20\uFF0C\u4E0D\u5360\u5E03\u5C40\uFF1B\u5B83\u4EEC\u753B\u5728\u4E0A\u8FB9\u7EBF\u4EE5\u4E0A\uFF0C\u53EF\u547D\u4E2D\u3001\u53EF\u70B9\u51FB\u3002 */
    [${ATTR.stack}] { position: relative; }
    [${ATTR.stack}]::before,
    [${ATTR.stack}]::after {
      content: ""; position: absolute; box-sizing: border-box; pointer-events: auto; cursor: pointer;
      border: 1px solid ${BORDER}; border-bottom: none; background: ${BG}; border-radius: 8px 8px 0 0;
    }
    [${ATTR.stack}]::before { top: -11px; left: 16px; right: 16px; height: 6px; }
    [${ATTR.stack}]::after { top: -6px; left: 8px; right: 8px; height: 6px; }
    /* \u5C55\u5F00\u540E\uFF1A\u4E0A\u8FB9\u7EBF\u53D8\u6210\u6536\u56DE\u63A7\u4EF6\u3002\u9F20\u6807\u79FB\u5230\u6846\u7684\u4E0A\u8FB9\u7F18\u65F6\uFF0C\u7EBF\u4E2D\u95F4\u6D6E\u51FA\u4E00\u4E2A"\u5408\u5E76/\u6536\u8D77"\u56FE\u6807\uFF1B
       \u70B9\u8FD9\u6761\u5E26\u5373\u53EA\u6536\u56DE\u8FD9\u4E00\u4E2A\u6846\u3002\u56FE\u6807\u5360\u7684\u6B63\u662F\u6298\u53E0\u65F6\u90A3\u4E24\u6761\u5806\u53E0\u7EBF\u7684\u4F4D\u7F6E\uFF0C\u89C6\u89C9\u4E0A\u8FDE\u8D2F\u3002 */
    [${ATTR.merge}] { position: relative; }
    [${ATTR.merge}]::before {
      content: ""; position: absolute; top: -12px; left: 50%; width: 26px; height: 12px; margin-left: -13px;
      box-sizing: border-box; border: 1px solid ${BORDER}; border-bottom: none;
      border-radius: 8px 8px 0 0; background: ${BG};
      opacity: 0; transition: opacity .1s; pointer-events: auto; cursor: pointer;
    }
    [${ATTR.merge}]::after {
      content: ""; position: absolute; top: -9.5px; left: 50%; width: 7px; height: 7px; margin-left: -3.5px;
      box-sizing: border-box; border-left: 1.5px solid var(--dsw-alias-label-secondary); border-top: 1.5px solid var(--dsw-alias-label-secondary);
      transform: rotate(45deg); opacity: 0; transition: opacity .1s; pointer-events: none;
    }
    [${ATTR.merge}]:hover::before, [${ATTR.merge}]:hover::after { opacity: 1; }
    @media (prefers-reduced-motion: reduce) { [${ATTR.merge}]::before, [${ATTR.merge}]::after { transition: none; } }
    [${ATTR.hidden}] { display: none !important; }
    /* \u6298\u53E0\u5F00\u5173\uFF1A\u4E0E\u5B98\u65B9 TurnProcessNodeView \u540C\u4E00\u5957\u5C3A\u5BF8\u4E0E token\uFF0C\u5B98\u65B9\u6309\u94AE\u4E0D\u5728\u65F6\u9876\u66FF\u5B83\u3002 */
    .${CLASS.row} { box-sizing: border-box; display: flex; align-items: center; width: 100%; min-width: 0; height: 33px; padding: 0 0 8px; border: none; border-bottom: .5px solid var(--dsw-alias-border-l2); background: none; color: var(--dsw-alias-label-secondary); font-size: 14px; line-height: 24px; text-align: left; cursor: pointer; }
    .${CLASS.row}:not([${ATTR.open}]) { margin-bottom: 8px; }
    .${CLASS.rowLabel} { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .${CLASS.rowChevron} { flex: none; width: 16px; height: 16px; margin-left: 6px; color: var(--dsw-alias-label-tertiary); transition: transform .1s; transform: rotate(-90deg); }
    .${CLASS.row}[${ATTR.open}] .${CLASS.rowChevron} { transform: rotate(0); }
    @media (prefers-reduced-motion: reduce) { .${CLASS.rowChevron} { transition: none; } }
  `;
  const expandedBoxes = /* @__PURE__ */ new Set();
  const rows = /* @__PURE__ */ new Map();
  let turnBoxes = /* @__PURE__ */ new Map();
  let root = null;
  let observer = null;
  function scroller() {
    return document.querySelector("[data-conversation-scroll]") ?? document.scrollingElement ?? document.documentElement;
  }
  function keyOf(anchor) {
    return anchor.getAttribute(TURN_ATTR) ?? anchor.getAttribute(FLOW_KEY_ATTR) ?? "";
  }
  function bodyOf(flow) {
    const slot = flow.querySelector(":scope > [data-slot]");
    const root2 = (slot ?? flow).firstElementChild;
    return root2 === null ? null : root2.firstElementChild;
  }
  function isThinkBlock(el) {
    return el.getAttribute("data-variant") === "think" || el.hasAttribute("data-turn-process-inline") || el.firstElementChild?.getAttribute("data-variant") === "think";
  }
  function boxKey(box) {
    const first = box.items[0];
    const flow = first.closest(FLOW);
    if (flow === null) return "";
    const base = flow.getAttribute(FLOW_KEY_ATTR) ?? flow.getAttribute(TURN_ATTR) ?? "";
    const body = flow.getAttribute("data-chat-flow-kind") === "assistant-step" ? bodyOf(flow) : null;
    const index = body !== null && first.parentElement === body ? Array.prototype.indexOf.call(body.children, first) : 0;
    return `${base}#${String(index)}`;
  }
  function officialRows(scope) {
    const found = /* @__PURE__ */ new Map();
    for (const row of scope.querySelectorAll(OFFICIAL)) {
      const turn = row.getAttribute("data-turn-process");
      if (turn !== null && !found.has(turn)) found.set(turn, row);
    }
    return found;
  }
  function collectBoxes(scope) {
    const flows = scope.querySelectorAll(FLOW);
    const boxes = [];
    const textFlows = /* @__PURE__ */ new Set();
    let afterText = false;
    let current = null;
    const push = (el) => {
      if (!current) {
        current = { items: [], afterText };
        boxes.push(current);
      }
      current.items.push(el);
    };
    for (const f of Array.from(flows)) {
      const kind = f.getAttribute("data-chat-flow-kind");
      if (kind === null || BOUNDARY.has(kind)) {
        current = null;
        afterText = false;
        continue;
      }
      if (PROCESS.has(kind)) {
        if (kind === "tool-call" && f.querySelector(QUESTION_TOOL)) {
          current = null;
          afterText = false;
          continue;
        }
        push(f);
        continue;
      }
      if (kind === "assistant-step") {
        const body = bodyOf(f);
        if (body) {
          for (const c of Array.from(body.children)) {
            if (isThinkBlock(c)) {
              push(c);
              continue;
            }
            current = null;
            textFlows.add(f);
            afterText = true;
          }
        }
        continue;
      }
      current = null;
      afterText = false;
    }
    return { boxes, textFlows };
  }
  function removeRow(anchor) {
    const row = rows.get(anchor);
    if (row) {
      row.remove();
      rows.delete(anchor);
    }
  }
  function rowText(toolCalls) {
    return toolCalls > 0 ? `${String(toolCalls)} \u6B21\u5DE5\u5177\u8C03\u7528` : "\u5DF2\u601D\u8003";
  }
  function applyBox(box, seen, withOfficial, withRow) {
    const items = box.items;
    const anchor = items[0].closest(FLOW);
    const turn = keyOf(anchor);
    const entry = turnBoxes.get(turn);
    const key = boxKey(box);
    const isExpanded = expandedBoxes.has(key);
    const allOpen = entry !== void 0 && entry.keys.length > 0 && entry.keys.every((k) => expandedBoxes.has(k));
    const visible = isExpanded ? items : items.slice(-2);
    if (!isExpanded) {
      for (let i = 0; i < items.length - 2; i++) items[i].setAttribute(ATTR.hidden, "1");
    }
    visible.forEach((el, k) => {
      const part = visible.length === 1 ? "only" : k === 0 ? "start" : k === visible.length - 1 ? "end" : "middle";
      el.setAttribute(ATTR.boxPart, part);
      const flow = el.closest(FLOW);
      flow?.setAttribute(ATTR.flowShow, "1");
      if (k > 0) {
        const prev = visible[k - 1];
        const sameFlow = prev.closest(FLOW) === flow;
        const gapOn = sameFlow ? el : flow;
        gapOn?.setAttribute(ATTR.gap, sameFlow ? "cancel" : "zero");
      } else if (box.afterText && flow !== null && flow.getAttribute(ATTR.gap) !== "zero") {
        flow.setAttribute(ATTR.gap, "text");
      }
      if (k === 0 && items.length > 2) el.setAttribute(isExpanded ? ATTR.merge : ATTR.stack, key);
    });
    const official = withOfficial.get(turn);
    if (official) {
      official.toggleAttribute(ATTR.open, allOpen);
      official.setAttribute("aria-expanded", String(allOpen));
      removeRow(anchor);
      return;
    }
    if (withRow.has(turn)) return;
    withRow.add(turn);
    const beforeEl = items[0].closest(FLOW);
    let row = rows.get(anchor);
    if (!row) {
      row = document.createElement("button");
      row.type = "button";
      row.className = CLASS.row;
      row.innerHTML = `<span class="${CLASS.rowLabel}"></span><svg class="${CLASS.rowChevron}" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 6.25 8 9.75l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle(anchor);
      });
      rows.set(anchor, row);
    }
    const labelEl = row.firstElementChild;
    const text = rowText(entry?.toolCalls ?? 0);
    if (labelEl && labelEl.textContent !== text) labelEl.textContent = text;
    row.toggleAttribute(ATTR.open, allOpen);
    row.setAttribute("aria-expanded", String(allOpen));
    if (row.parentNode !== beforeEl.parentNode || row.nextSibling !== beforeEl) {
      beforeEl.parentNode.insertBefore(row, beforeEl);
    }
    seen.add(anchor);
  }
  function hideEmptySteps(scope) {
    for (const f of scope.querySelectorAll(FLOW + '[data-chat-flow-kind="assistant-step"]')) {
      const kids = Array.from(bodyOf(f)?.children ?? []);
      if (kids.length > 0 && kids.every((c) => c.hasAttribute(ATTR.hidden))) {
        f.setAttribute(ATTR.hidden, "1");
      }
    }
  }
  function applyFold() {
    if (!root || !root.isConnected) root = document.querySelector("[data-chat-flow]");
    if (!root) return;
    if (document.querySelector("[data-question-key], [data-plan-review-key]")) return;
    observer?.disconnect();
    try {
      for (const el of root.querySelectorAll(`[${ATTR.hidden}], [${ATTR.boxPart}], [${ATTR.gap}], [${ATTR.flowShow}], [${ATTR.textFlow}], [${ATTR.stack}], [${ATTR.merge}]`)) {
        el.removeAttribute(ATTR.hidden);
        el.removeAttribute(ATTR.boxPart);
        el.removeAttribute(ATTR.gap);
        el.removeAttribute(ATTR.flowShow);
        el.removeAttribute(ATTR.textFlow);
        el.removeAttribute(ATTR.stack);
        el.removeAttribute(ATTR.merge);
      }
      const withOfficial = officialRows(root);
      const { boxes, textFlows } = collectBoxes(root);
      for (const flow of textFlows) flow.setAttribute(ATTR.textFlow, "1");
      turnBoxes = /* @__PURE__ */ new Map();
      for (const box of boxes) {
        const turn = keyOf(box.items[0].closest(FLOW));
        const entry = turnBoxes.get(turn) ?? { keys: [], toolCalls: 0 };
        entry.keys.push(boxKey(box));
        for (const el of box.items) if (el.getAttribute("data-chat-flow-kind") === "tool-call") entry.toolCalls++;
        turnBoxes.set(turn, entry);
      }
      const seen = /* @__PURE__ */ new Set();
      const withRow = /* @__PURE__ */ new Set();
      for (const box of boxes) applyBox(box, seen, withOfficial, withRow);
      for (const [anchor, row] of Array.from(rows)) {
        if (!seen.has(anchor)) {
          row.remove();
          rows.delete(anchor);
        }
      }
      hideEmptySteps(root);
    } catch (err) {
      console.error("[dsh-process-fold] applyFold error", err);
    } finally {
      observer?.observe(document.body, { childList: true, subtree: true });
    }
  }
  function toggleTurn(turn) {
    if (turn === null) return;
    const entry = turnBoxes.get(turn);
    if (entry === void 0) return;
    const allOpen = entry.keys.every((key) => expandedBoxes.has(key));
    for (const key of entry.keys) {
      if (allOpen) expandedBoxes.delete(key);
      else expandedBoxes.add(key);
    }
    applyFold();
  }
  function toggle(anchor) {
    const row = rows.get(anchor);
    const before = row ? row.getBoundingClientRect().top : null;
    toggleTurn(keyOf(anchor) || null);
    if (before !== null && row && row.isConnected) {
      const delta = row.getBoundingClientRect().top - before;
      if (delta !== 0) scroller().scrollTop += delta;
    }
  }
  function expandBox(key) {
    if (key === null || key === "" || expandedBoxes.has(key)) return;
    expandedBoxes.add(key);
    applyFold();
  }
  function collapseBox(key) {
    if (key === null || key === "" || !expandedBoxes.has(key)) return;
    expandedBoxes.delete(key);
    applyFold();
  }
  function onDocumentClick(event) {
    const target = event.target;
    const stack = target?.closest?.(`[${ATTR.stack}]`);
    if (stack !== null && event.clientY < stack.getBoundingClientRect().top) {
      event.stopPropagation();
      event.preventDefault();
      expandBox(stack.getAttribute(ATTR.stack));
      return;
    }
    const merge = target?.closest?.(`[${ATTR.merge}]`);
    if (merge !== null) {
      const top = merge.getBoundingClientRect().top;
      if (event.clientY >= top - 14 && event.clientY <= top + 4) {
        event.stopPropagation();
        event.preventDefault();
        collapseBox(merge.getAttribute(ATTR.merge));
        return;
      }
    }
    const row = target?.closest?.(OFFICIAL);
    if (!row) return;
    const before = row.getBoundingClientRect().top;
    toggleTurn(row.getAttribute("data-turn-process"));
    requestAnimationFrame(() => {
      if (!row.isConnected) return;
      const delta = row.getBoundingClientRect().top - before;
      if (delta !== 0) scroller().scrollTop += delta;
    });
  }
  function onBeforeMatch(event) {
    const flow = event.target?.closest?.(FLOW);
    if (!flow || !flow.hasAttribute("data-turn-process-member")) return;
    const turn = flow.getAttribute(TURN_ATTR);
    if (turn === null) return;
    const entry = turnBoxes.get(turn);
    if (entry === void 0 || entry.keys.every((key) => expandedBoxes.has(key))) return;
    for (const key of entry.keys) expandedBoxes.add(key);
    applyFold();
  }
  ctx.effect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-plugin", "dsh-process-fold");
    style.textContent = css;
    document.head.appendChild(style);
    root = document.querySelector("[data-chat-flow]");
    observer = new MutationObserver(applyFold);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("beforematch", onBeforeMatch, true);
    applyFold();
    return () => {
      style.remove();
      observer?.disconnect();
      observer = null;
      root = null;
      document.removeEventListener("click", onDocumentClick, true);
      document.removeEventListener("beforematch", onBeforeMatch, true);
      document.querySelectorAll(`[${ATTR.hidden}], [${ATTR.boxPart}], [${ATTR.gap}], [${ATTR.flowShow}], [${ATTR.textFlow}], [${ATTR.stack}], [${ATTR.merge}]`).forEach((el) => {
        el.removeAttribute(ATTR.hidden);
        el.removeAttribute(ATTR.boxPart);
        el.removeAttribute(ATTR.gap);
        el.removeAttribute(ATTR.flowShow);
        el.removeAttribute(ATTR.textFlow);
        el.removeAttribute(ATTR.stack);
        el.removeAttribute(ATTR.merge);
      });
      for (const row of rows.values()) row.remove();
      rows.clear();
      expandedBoxes.clear();
      turnBoxes = /* @__PURE__ */ new Map();
    };
  }, "dsh-process-fold: box + fold + toggle");
}
return module.exports; } });
