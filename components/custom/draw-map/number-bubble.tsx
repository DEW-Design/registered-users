// A point's number, drawn as the progress steps' numbered bubble (IconTopNumber: 24px circle, a hairline ring, 12px semibold). The table's "#" column and the
// map's tooltip both use it, so a number reads the same on both. The design system draws that bubble only inside IconTopNumber; this is the same bubble on its
// own, with the designer's override. Open: IconTopNumber should use this one, so there is a single bubble.

import { cx } from "@/utils/cx";

export function NumberBubble({ n, className }: { n: number; className?: string }) {
  return <span className={cx("draw-tip-bubble flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-secondary tabular-nums ring-1 ring-secondary ring-inset", className)}>{n}</span>;
}
