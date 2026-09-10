# dsh-process-fold

[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com/p/uigdwunm/dsh-process-fold/)

[English](#english) | [中文](#中文)

## English

`dsh-process-fold` is a client-side UI plugin for DeepSeek Harness Web. It groups each turn's execution steps into a bordered process box that shows only the latest two items by default.

It cooperates with the shipped turn-process disclosure instead of competing with it: while the official `N 次工具调用 ▾` row is present for a turn, that row is the only toggle — clicking it switches the turn between the latest two items and the whole process. When the official row is absent (a streaming turn, unloaded older history, the standard transcript view, or an interrupted/answerless turn), the plugin's own row takes its place: one per turn, styled like the official one (`N 次工具调用` on the left, chevron on the right, same sizes and tokens).

User messages, steering messages, interactive `ask_user_question` prompts, and the final assistant answer remain outside the box and fully visible.

Unlike auto-collapse plugins that replace a finished turn's process with a single timing row, this one keeps the process in place: it folds the items into a box you can reopen, and it never hides the user's own messages, interactive questions, errors, or the final answer. Stopping the plugin removes every style, attribute, label, and control it injected.

### Install

```sh
dsh plugin --profile web add github:uigdwunm/dsh-process-fold
```

Restart `dsh web`, then refresh the page.

### Behavior

- Groups each turn's think, tool-call, and context items into one process box.
- Shows the latest two process items while collapsed, the whole process when expanded.
- Uses the official disclosure button as the toggle whenever it exists for that turn.
- Otherwise renders one replacement row per turn — same look as the official one: 33px high, bottom hairline, `N 次工具调用` label, right-hand chevron that rotates on expand.
- Reads none of the official disclosure state: one CSS rule neutralizes the official `hidden="until-found"` for the items the plugin keeps visible, and the plugin's per-turn state is only written back onto the official row's `data-open` / `aria-expanded` so its chevron matches.
- Follows browser find (`beforematch`) into the expanded state.
- Expands and collapses without moving content below the toggle in the viewport.
- Keeps final assistant answers outside process boxes.
- Treats `user`, `steering`, `ask_user_question`, `turn-error`, `turn-max-tokens`, and `turn-process` as process boundaries.
- Removes all injected styles, attributes, labels, and controls when the plugin stops.

## 中文

`dsh-process-fold` 是一个 DeepSeek Harness Web 客户端 UI 插件。它把每轮的思考、工具调用和上下文注入等执行过程合并进带边框的过程框，默认只显示最新两项。

它和官方自带的「过程折叠」按钮是协作关系而不是竞争关系：某一轮只要有官方那行「N 次工具调用 ▾」，那一行就是这一轮唯一的开关——点它在「最新两项」和「全部过程」之间切换；官方按钮不在场时（流式输出中、更早历史未加载完、官方设为标准显示、被中断或没有最终回答的轮次）由插件自己的那行顶替它——一轮一行，样式与官方一致（左侧「N 次工具调用」、右侧箭头，同样的尺寸和 token）。

用户消息、用户重定向消息、交互式 `ask_user_question` 提问以及最终助手回答始终留在框外并完整显示。

与把已结束轮次的过程替换成一行耗时摘要的自动折叠插件不同，本插件把过程留在原处：合并进一个可以随时重新展开的框，并且从不隐藏用户消息、交互提问、错误提示和最终回答。插件停用时，它注入的样式、属性、标签和控件全部清除。

### 安装

```sh
dsh plugin --profile web add github:uigdwunm/dsh-process-fold
```

重启 `dsh web`，然后刷新页面。

### 行为

- 把每轮的思考、工具调用和上下文项合并为一个过程框。
- 折叠时保留最新两项，展开时显示全部过程。
- 某一轮官方折叠按钮存在时，以它作为唯一开关。
- 不存在时，每轮渲染一行替代它的开关：与官方同款外观（33px 高、底部细线、左侧「N 次工具调用」、右侧箭头，展开时箭头旋转）。
- 不读取官方按钮的展开状态：只用一条 CSS 把官方 `hidden="until-found"` 对「插件要显示的项」失效掉；只把插件状态写回官方按钮的 `data-open` / `aria-expanded` 以对齐箭头方向。
- 浏览器查找（Ctrl+F）命中时跟随进入展开态。
- 展开/折叠时保持按钮以下内容在视口中的位置。
- 最终助手回答不进入过程框。
- `user`、`steering`、`ask_user_question`、`turn-error`、`turn-max-tokens`、`turn-process` 作为过程边界。
- 插件停止时清理所有注入的样式、属性、标签和按钮。

### 依赖的 DOM 契约

插件只依赖官方挂载的稳定属性，不依赖会随构建变化的 hash 类名：

- `[data-chat-flow]` / `[data-chat-flow-kind]`：会话流容器与流项类型
- `[data-chat-turn]` / `[data-chat-flow-key]`：轮次号（折叠状态的键）与流项唯一键
- `[data-turn-process]`：官方折叠按钮（点击源 + 是否在场的判据）
- `[data-turn-process-member]`：官方的过程成员标记（用于 Ctrl+F 跟随）

## Development

```sh
npm install
npm run typecheck
npm run build
```

The browser source is in `src/client.ts`; the prebuilt DSH client bundle is committed at `lib/client.js`.

Original requirements notes: [`docs/requirements.md`](docs/requirements.md).

## License

MIT
