# dsh-process-fold

[English](#english) | [中文](#中文)

## English

`dsh-process-fold` is a client-side UI plugin for DeepSeek Harness Web. It groups each turn's execution steps into a bordered process box, keeps the latest two items visible by default, and provides an expand/collapse control below the box.

User messages, steering messages, interactive `ask_user_question` prompts, and the final assistant answer remain outside the box and fully visible.

### Install

```sh
dsh plugin --profile web add github:uigdwunm/dsh-process-fold
```

Restart `dsh web`, then refresh the page.

### Behavior

- Groups consecutive think, tool-call, and context items into one process box.
- Shows the latest two process items while collapsed.
- Expands and collapses without moving content below the toggle in the viewport.
- Keeps final assistant answers outside process boxes.
- Treats `user`, `steering`, and `ask_user_question` interactions as boundaries.
- Removes all injected styles, attributes, labels, and controls when the plugin stops.

## 中文

`dsh-process-fold` 是一个 DeepSeek Harness Web 客户端 UI 插件。它把每轮的思考、工具调用和上下文注入等执行过程合并进带边框的过程框，默认只显示最新两项，并在框下提供“展开过程 / 折叠显示”按钮。

用户消息、用户重定向消息、交互式 `ask_user_question` 提问以及最终助手回答始终留在框外并完整显示。

### 安装

```sh
dsh plugin --profile web add github:uigdwunm/dsh-process-fold
```

重启 `dsh web`，然后刷新页面。

### 行为

- 把连续的思考、工具调用和上下文项合并为一个过程框。
- 折叠时保留最新两项。
- 展开/折叠时保持按钮以下内容在视口中的位置。
- 最终助手回答不进入过程框。
- `user`、`steering` 和 `ask_user_question` 交互作为过程边界。
- 插件停止时清理所有注入的样式、属性、标签和按钮。

## Development

```sh
npm install
npm run typecheck
npm run build
```

The browser source is in `src/client.ts`; the prebuilt DSH client bundle is committed at `lib/client.js`.

## License

MIT
