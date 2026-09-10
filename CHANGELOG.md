# Changelog

## 0.2.1 - 2026-09-10

- Declare `dsh.catalog` in `package.json` (`category: ui`, bilingual summary, `client-ui` capability) so the plugin shop publishes an authored listing instead of deriving one from the npm description.
- Add the awesome-dsh-plugin badge, a screenshots section and a note on how the plugin differs from auto-collapse plugins to the README.
- Reword the package description and add the `ui-plugin` keyword for npm search.

## 0.2.0 - 2026-09-10

- Cooperate with the shipped turn-process disclosure: when `button[data-turn-process]` exists for a turn, the plugin drops its own row and the official button becomes that turn's only toggle.
- Replace the plugin's plain label + bottom button with one summary row per turn that mirrors the official disclosure (33px, bottom hairline, `N 次工具调用` label, rotating chevron) whenever the official button is absent (streaming turns, unloaded older history, standard transcript view, interrupted or answerless turns).
- Keep expansion state per turn instead of per DOM element, so it survives React re-renders.
- Replace the hardcoded hash class selectors (`.Md3f7G_flowItem`, `.Sxvs8a_body`) with the stable `data-chat-flow-kind` / `data-chat-turn` / `data-chat-flow-key` attributes.
- Neutralize the official `hidden="until-found"` on kept-visible items with CSS instead of reading the official disclosure state; fix box gaps that this un-hiding would otherwise break.
- Mirror the plugin's per-turn state onto the official row's `data-open` / `aria-expanded` (write-only) so its chevron matches the box.
- Follow browser find (`beforematch`) into the expanded state, and keep `turn-error` / `turn-max-tokens` / `turn-process` as process boundaries.
- Fix the `assistant-step` body lookup to skip the official slot wrapper, so a turn's last reasoning block is collected into the box instead of being left outside it.
- Style every process box of a turn (boxes after the first are no longer skipped when the turn already has its one summary row).

## 0.1.1 - 2026-08-17

- Keep `ask_user_question` interactions outside process boxes.
- Treat user steering messages as dialogue boundaries.
- Prevent plugin controls from being collected as process items.
- Clean up stale labels when a process box disappears.
- Guard DOM updates while question and plan-review composers are active.

## 0.1.0 - 2026-08-17

- Initial process grouping, latest-two folding, expansion toggle, and scroll anchoring.
