"use client";

// The prototype picker: harness chrome, not a design (emil-prototype PICKER.md, copied as specified: a floating dark pill, bottom
// centre, number keys and arrows switch, the choice is kept in `?v=`). It is not styled with the product's tokens on purpose.
// Switching is instant (the variant is keyed, so it re-mounts); only the highlight slides.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const CSS = `
.proto-picker {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(10, 10, 10, 0.82);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  backdrop-filter: blur(12px) saturate(1.4);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 8px 24px rgba(0, 0, 0, 0.24),
    0 2px 6px rgba(0, 0, 0, 0.12);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  user-select: none;
  -webkit-user-select: none;
}
.proto-picker-highlight {
  position: absolute;
  top: 4px;
  left: 0;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  will-change: transform;
}
.proto-picker[data-ready] .proto-picker-highlight {
  transition:
    transform 250ms cubic-bezier(0.23, 1, 0.32, 1),
    width 250ms cubic-bezier(0.23, 1, 0.32, 1);
}
@media (prefers-reduced-motion: reduce) {
  .proto-picker[data-ready] .proto-picker-highlight { transition: none; }
}
.proto-picker-item {
  position: relative;
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font: inherit;
  cursor: pointer;
  transition: color 150ms ease-out;
}
.proto-picker-item:hover { color: rgba(255, 255, 255, 0.85); }
.proto-picker-item:active { transform: scale(0.97); }
.proto-picker-item:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.4); outline-offset: 2px; }
.proto-picker-item[data-active] { color: #fff; }
.proto-picker[data-position="top"] { bottom: auto; top: 24px; }
`;

/** The active variant (1 to `count`), kept in the address as `?v=`. */
export function useProtoVariant(count: number): [number, (n: number) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = Number(params.get("v"));
  const active = Number.isInteger(raw) && raw >= 1 && raw <= count ? raw : 1;
  const set = useCallback(
    (n: number) => {
      const next = new URLSearchParams(params.toString());
      next.set("v", String(n));
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, router, pathname],
  );
  return [active, set];
}

export function ProtoPicker({ names, active, onChange, position = "bottom" }: { names: string[]; active: number; onChange: (n: number) => void; position?: "bottom" | "top" }) {
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = itemRefs.current[active - 1];
    if (el) setBox({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active, names]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= names.length) onChange(n);
      else if (e.key === "ArrowRight") onChange(Math.min(names.length, active + 1));
      else if (e.key === "ArrowLeft") onChange(Math.max(1, active - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, names.length, onChange]);

  return (
    <>
      <style>{CSS}</style>
      <nav ref={navRef} className="proto-picker" aria-label="Prototype variants" data-position={position} data-ready={ready ? "" : undefined}>
        <span className="proto-picker-highlight" aria-hidden="true" style={{ transform: `translateX(${box.left}px)`, width: box.width }} />
        {names.map((name, i) => (
          <button
            key={name}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            className="proto-picker-item"
            data-active={i + 1 === active ? "" : undefined}
            aria-current={i + 1 === active ? "true" : undefined}
            onClick={() => onChange(i + 1)}
          >
            {name}
          </button>
        ))}
      </nav>
    </>
  );
}
