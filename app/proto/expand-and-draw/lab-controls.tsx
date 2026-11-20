"use client";

// The lab's own switches for the questions that are still open (emil-prototype CONTROLS.md: harness chrome, top right, neutral, the value shown and
// copyable). They are not part of any variant and not the product's: they let the designer see each answer instead of deciding it blind.

import { useState } from "react";

export interface LabConfig {
  /** Whether a project can hold several areas, or one (a new one takes the place of the one there). */
  areas: "several" | "one";
  /** Where the workspace opens when there is no area yet. */
  start: "state" | "place";
  /** Whether Cancel asks first when areas were added. */
  confirmCancel: boolean;
}

export const DEFAULT_CONFIG: LabConfig = { areas: "several", start: "state", confirmCancel: true };

const CSS = `
.lab-controls{position:fixed;bottom:24px;right:16px;z-index:2147483646;width:232px;padding:10px;border-radius:12px;background:rgba(10,10,10,.82);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 8px 24px rgba(0,0,0,.24);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:12px;line-height:1.3;color:rgba(255,255,255,.85);-webkit-font-smoothing:antialiased}
.lab-toggle{position:fixed;bottom:24px;right:16px;z-index:2147483646;height:36px;padding:0 14px;border:0;border-radius:999px;background:rgba(10,10,10,.82);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 8px 24px rgba(0,0,0,.24);color:rgba(255,255,255,.75);font:13px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer}
.lab-toggle:hover{color:#fff}
.lab-toggle:focus-visible{outline:2px solid rgba(255,255,255,.4);outline-offset:2px}
.lab-controls h3{margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:rgba(255,255,255,.55)}
.lab-controls .row{display:flex;flex-direction:column;gap:4px;margin-bottom:8px}
.lab-controls .seg{display:flex;gap:2px;padding:2px;border-radius:8px;background:rgba(255,255,255,.08)}
.lab-controls .seg button{flex:1;height:26px;border:0;border-radius:6px;background:transparent;color:rgba(255,255,255,.6);font:inherit;cursor:pointer;transition:color 150ms ease-out,background-color 150ms ease-out}
.lab-controls .seg button[aria-pressed=true]{background:rgba(255,255,255,.16);color:#fff}
.lab-controls .seg button:focus-visible,.lab-controls .copy:focus-visible{outline:2px solid rgba(255,255,255,.4);outline-offset:2px}
.lab-controls .copy{width:100%;height:26px;border:0;border-radius:6px;background:rgba(255,255,255,.12);color:#fff;font:inherit;cursor:pointer}
.lab-controls .copy:active,.lab-controls .seg button:active{transform:scale(.97)}
`;

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="row">
      <span>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const configLine = (c: LabConfig) => `areas: ${c.areas}, opens on: ${c.start === "state" ? "the whole state" : "the project's place"}, cancel asks: ${c.confirmCancel ? "yes" : "no"}`;

export function LabControls({ config, onChange }: { config: LabConfig; onChange: (c: LabConfig) => void }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <>
        <style>{CSS}</style>
        <button type="button" className="lab-toggle" aria-expanded={false} onClick={() => setOpen(true)}>
          Still open
        </button>
      </>
    );
  }
  return (
    <>
      <style>{CSS}</style>
      <aside className="lab-controls" aria-label="Lab controls">
        <h3 style={{ display: "flex", justifyContent: "space-between" }}>
          Still open
          <button type="button" onClick={() => setOpen(false)} aria-label="Close the lab controls" style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", font: "inherit" }}>
            Close
          </button>
        </h3>
        <Seg label="A project holds" value={config.areas} options={[{ id: "several", label: "Several areas" }, { id: "one", label: "One area" }]} onChange={(areas) => onChange({ ...config, areas })} />
        <Seg label="Workspace opens on" value={config.start} options={[{ id: "state", label: "Whole state" }, { id: "place", label: "Project's place" }]} onChange={(start) => onChange({ ...config, start })} />
        <Seg label="Cancel with changes" value={config.confirmCancel ? "ask" : "no"} options={[{ id: "ask", label: "Asks" }, { id: "no", label: "Just closes" }]} onChange={(v) => onChange({ ...config, confirmCancel: v === "ask" })} />
        <button
          type="button"
          className="copy"
          onClick={() => {
            void navigator.clipboard.writeText(configLine(config));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy the choice"}
        </button>
      </aside>
    </>
  );
}
