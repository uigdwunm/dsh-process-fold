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
  const ATTR = { boxPart: "data-box-part", gap: "data-box-gap", hidden: "data-fold-hidden" };
  const CLASS = { toggle: "dsh-fold-toggle", label: "dsh-fold-label" };
  const FLOW = ".Md3f7G_flowItem";
  const BODY = ".Sxvs8a_body";
  const BOUNDARY = /* @__PURE__ */ new Set(["user", "steering", "turn-tail", "manual-compaction"]);
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
    [${ATTR.gap}] { margin-top: -16px !important; }
    [${ATTR.hidden}] { display: none !important; }
    .${CLASS.toggle} { align-self: flex-start; margin: -10px 0 0; padding: 3px 10px; border: 1px solid ${BORDER}; border-radius: 6px; background: ${BG}; color: var(--dsw-alias-label-secondary, #888); font-size: 12px; line-height: 16px; cursor: pointer; user-select: none; }
    .${CLASS.toggle}:hover { color: var(--dsw-alias-label-primary, #333); border-color: color-mix(in srgb, var(--dsw-alias-label-secondary) 70%, transparent); }
    .${CLASS.label} { align-self: flex-start; margin: 0 0 -10px; padding: 0 2px; color: var(--dsw-alias-label-secondary, #888); font-size: 12px; line-height: 16px; user-select: none; }
  `;
  const expanded = /* @__PURE__ */ new WeakSet();
  const buttons = /* @__PURE__ */ new Map();
  const labels = /* @__PURE__ */ new Map();
  let root = null;
  let observer = null;
  function scroller() {
    return document.querySelector("[data-conversation-scroll]") ?? document.scrollingElement ?? document.documentElement;
  }
  function collectBoxes(scope) {
    const flows = scope.querySelectorAll(FLOW);
    const boxes = [];
    let current = null;
    const push = (el) => {
      if (!current) {
        current = [];
        boxes.push(current);
      }
      current.push(el);
    };
    for (let i = 0; i < flows.length; i++) {
      const f = flows[i];
      const kind = f.getAttribute("data-chat-flow-kind");
      const nextKind = flows[i + 1]?.getAttribute("data-chat-flow-kind") ?? null;
      const endsHere = nextKind === null || BOUNDARY.has(nextKind);
      if (kind === null) {
        current = null;
        continue;
      }
      if (BOUNDARY.has(kind)) {
        current = null;
        continue;
      }
      if (PROCESS.has(kind)) {
        if (kind === "tool-call" && f.querySelector(QUESTION_TOOL)) {
          current = null;
          continue;
        }
        push(f);
        continue;
      }
      if (kind === "assistant-step") {
        const body = f.querySelector(BODY);
        if (body) {
          for (const c of Array.from(body.children)) {
            if (c.classList && (c.classList.contains(CLASS.toggle) || c.classList.contains(CLASS.label))) continue;
            if (c.getAttribute("data-variant") === "think" || !endsHere) push(c);
          }
        }
        if (endsHere) current = null;
        continue;
      }
      current = null;
    }
    return boxes;
  }
  function applyBox(box, seen) {
    const anchor = box[0].closest(FLOW);
    const isExpanded = expanded.has(anchor);
    const visible = isExpanded ? box : box.slice(-2);
    if (!isExpanded) {
      for (let i = 0; i < box.length - 2; i++) box[i].setAttribute(ATTR.hidden, "1");
    }
    visible.forEach((el, k) => {
      const part = visible.length === 1 ? "only" : k === 0 ? "start" : k === visible.length - 1 ? "end" : "middle";
      el.setAttribute(ATTR.boxPart, part);
      if (k > 0) {
        const prev = visible[k - 1];
        const gapOn = prev.closest(FLOW) === el.closest(FLOW) ? el : el.closest(FLOW);
        gapOn.setAttribute(ATTR.gap, "1");
      }
    });
    const boxStart = visible[0];
    const beforeEl = boxStart.closest(FLOW);
    let cap = labels.get(anchor);
    if (!cap) {
      cap = document.createElement("div");
      cap.className = CLASS.label;
      cap.textContent = "\u6267\u884C\u8FC7\u7A0B";
      labels.set(anchor, cap);
    }
    if (cap.parentNode !== beforeEl.parentNode || cap.nextSibling !== beforeEl) {
      beforeEl.parentNode.insertBefore(cap, beforeEl);
    }
    const boxEnd = visible[visible.length - 1];
    let btn = buttons.get(anchor);
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = CLASS.toggle;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle(anchor);
      });
      buttons.set(anchor, btn);
    }
    const label = isExpanded ? "\u6298\u53E0\u663E\u793A" : "\u5C55\u5F00\u8FC7\u7A0B";
    if (btn.textContent !== label) btn.textContent = label;
    if (btn.parentNode !== boxEnd.parentNode || btn.previousSibling !== boxEnd) {
      boxEnd.parentNode.insertBefore(btn, boxEnd.nextSibling);
    }
    seen.add(anchor);
  }
  function hideEmptySteps(scope) {
    for (const f of scope.querySelectorAll(FLOW + '[data-chat-flow-kind="assistant-step"]')) {
      const kids = Array.from(f.querySelector(BODY)?.children ?? []);
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
      for (const el of root.querySelectorAll(`[${ATTR.hidden}], [${ATTR.boxPart}], [${ATTR.gap}]`)) {
        el.removeAttribute(ATTR.hidden);
        el.removeAttribute(ATTR.boxPart);
        el.removeAttribute(ATTR.gap);
      }
      const seen = /* @__PURE__ */ new Set();
      for (const box of collectBoxes(root)) applyBox(box, seen);
      for (const [anchor, btn] of Array.from(buttons)) {
        if (!seen.has(anchor)) {
          btn.remove();
          buttons.delete(anchor);
        }
      }
      for (const [anchor, cap] of Array.from(labels)) {
        if (!seen.has(anchor)) {
          cap.remove();
          labels.delete(anchor);
        }
      }
      hideEmptySteps(root);
    } catch (err) {
      console.error("[dsh-process-fold] applyFold error", err);
    } finally {
      observer?.observe(document.body, { childList: true, subtree: true });
    }
  }
  function toggle(anchor) {
    const btn = buttons.get(anchor);
    const before = btn ? btn.getBoundingClientRect().top : null;
    if (expanded.has(anchor)) expanded.delete(anchor);
    else expanded.add(anchor);
    applyFold();
    if (before !== null && btn) {
      const delta = btn.getBoundingClientRect().top - before;
      if (delta !== 0) scroller().scrollTop += delta;
    }
  }
  ctx.effect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-plugin", "dsh-process-fold");
    style.textContent = css;
    document.head.appendChild(style);
    root = document.querySelector("[data-chat-flow]");
    observer = new MutationObserver(applyFold);
    observer.observe(document.body, { childList: true, subtree: true });
    applyFold();
    return () => {
      style.remove();
      observer?.disconnect();
      observer = null;
      root = null;
      document.querySelectorAll(`[${ATTR.hidden}], [${ATTR.boxPart}], [${ATTR.gap}]`).forEach((el) => {
        el.removeAttribute(ATTR.hidden);
        el.removeAttribute(ATTR.boxPart);
        el.removeAttribute(ATTR.gap);
      });
      for (const btn of buttons.values()) btn.remove();
      buttons.clear();
      for (const cap of labels.values()) cap.remove();
      labels.clear();
    };
  }, "dsh-process-fold: box + fold + toggle");
}
return module.exports; } });
