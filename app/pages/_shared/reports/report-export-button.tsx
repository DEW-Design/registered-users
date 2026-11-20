"use client";

import { ChevronDown, Download01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import type { RecordAction } from "@/app/pages/_shared/record-action-bar";

// Export as one button with a chevron that opens the formats, for a report that sits inside another screen (Explore's Map and table view, designer, 20 Nov 2026: "ditch the three dot menu and have export as
// chevron down button instead"). Same treatment as a template's Download (template-downloads.tsx), at the toolbar's own size, beside Filter and Columns. A role that must sign up before it can export
// gives `onBlocked`: the button then asks for that instead of opening the formats.
export function ReportExportButton({ actions, onBlocked, blockedHint }: { actions: RecordAction[]; onBlocked?: () => void; blockedHint?: string }) {
  if (onBlocked) {
    const button = (
      <Button color="secondary" size="sm" iconLeading={Download01} iconTrailing={ChevronDown} onPress={onBlocked}>
        Export
      </Button>
    );
    return blockedHint ? <Tooltip title={blockedHint}>{button}</Tooltip> : button;
  }
  return (
    <Dropdown.Root>
      <Button color="secondary" size="sm" iconLeading={Download01} iconTrailing={ChevronDown}>
        Export
      </Button>
      <Dropdown.Popover placement="bottom right" className="w-48">
        <Dropdown.Menu aria-label="Export format" onAction={(key) => actions.find((a) => a.id === key)?.onPress()}>
          {actions.map((a) => (
            <Dropdown.Item key={a.id} id={a.id} label={a.label} icon={a.icon} isDisabled={a.isDisabled} />
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}
