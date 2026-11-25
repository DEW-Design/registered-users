// The "here it is" highlight: scroll a field into the middle of its scroll area and flash it once in
// the brand tint. One helper, so every jump to a field (an artefact's "Go to record", a note in the
// notes list, an edit started from the details panel) looks the same. A Web Animation, so there is
// nothing to clean up.
export function flashElement(
  el: HTMLElement | null | undefined,
  { scroll = true, hold = 0 }: { scroll?: boolean; hold?: number } = {},
) {
  if (!el) return;
  if (scroll) el.scrollIntoView({ block: "center", behavior: "smooth" });
  const tint = "var(--color-brand-100)";
  const ring = "var(--color-brand-500)";
  // `hold`: ms the tint stays before it fades, for a highlight that has to be read (what a Save changed), not only seen.
  const duration = 2200 + hold;
  el.animate(
    [
      { backgroundColor: tint, boxShadow: `inset 0 0 0 1px ${ring}` },
      {
        backgroundColor: tint,
        boxShadow: `inset 0 0 0 1px ${ring}`,
        offset: (1320 + hold) / duration,
      },
      {
        backgroundColor: "transparent",
        boxShadow: "inset 0 0 0 1px transparent",
      },
    ],
    { duration, easing: "ease-out" },
  );
}

/** After a Save: the card that was saved, once its view is back, scrolled to and held in the tint long enough to read. */
export function flashSavedCard(cardId: string) {
  setTimeout(() => flashElement(document.getElementById(cardId), { hold: 3000 }), 400);
}
