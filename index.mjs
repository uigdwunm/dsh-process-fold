/** 插件名（Node half 与 client half 各有一个，此处为宿主机侧）。 */
export const name = 'dsh-process-fold'

/**
 * Node half：纯客户端 UI 插件，宿主机侧无需注册任何服务、事件或工具。
 * 真正的框选逻辑在浏览器端（`lib/client.js`，见 `src/client.ts`）。
 */
export function apply() {}
