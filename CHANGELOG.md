# Changelog

## Unreleased

- Cut process boxes at model text: every piece of assistant text closes the box in front of it and starts a new one after it, so a turn can hold several boxes.
- Keep all model text outside the boxes (intermediate output was previously folded in); it now separates the boxes instead.
- Neutralize the official `hidden="until-found"` on the flow items that hold model text, so the official collapse no longer swallows them.
- Restore the flow gap the official `hidden` attribute removes above and after model text, including before the box that follows it.
- Stack two lines above the top border of a collapsed box that hides items, so hidden calls are visible as a stack; clicking those lines expands the turn in place.
- Key the expanded state per box instead of per turn: the stacked lines open only their own box, while the per-turn row (or the official button) still opens or closes every box of that turn.
- Make the top border the collapse control for an expanded box: hovering the top edge fades in a miniature of the stacked lines (about 52px wide, centred) on the line, and clicking it folds that one box back in place.
- Fix the stacked lines hiding the box's own top border: absolute pseudo-elements are positioned from the padding box, so the lower line sat 1px too low and painted over that border.

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
