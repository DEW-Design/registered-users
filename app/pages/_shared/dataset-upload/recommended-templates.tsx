"use client";

import { ArrowNarrowRight, FileSearch01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { EmbeddedTable, type EmbeddedColumn } from "@/app/pages/_shared/embedded-table";
import { ListEmptyState } from "@/app/pages/_shared/list-empty-state";
import { TemplateDownloads } from "@/app/pages/_shared/template-finder/template-downloads";
import type { DatasetTemplate } from "@/app/pages/_shared/template-finder/template-data";

// The recommended templates of the upload form, as a table in the form (the embedded table, 4.2h) with the Template Finder's columns and cells (0.9): the template's name and
// what it is, and the one Download button (the collection method and species type columns were taken off both, 20 Nov 2026). It was a card for each. With none to recommend it says why and points to the Template Finder.

const COLUMNS: EmbeddedColumn[] = [
  { id: "template", label: "Template", isRowHeader: true, className: "w-[76%]" },
  { id: "download", label: "Download", className: "w-[24%]" },
];

export function RecommendedTemplates({ templates, hasMethodologies, browseHref }: { templates: DatasetTemplate[]; hasMethodologies: boolean; browseHref?: string }) {
  if (templates.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-secondary bg-primary">
        <ListEmptyState
          compact
          icon={FileSearch01}
          title="No template recommended"
          description={hasMethodologies ? "None of the standard templates is for a methodology this project accepts." : "This project has no methodologies yet, so no template is recommended for it."}
        >
          {browseHref && (
            <Button color="secondary" size="sm" href={browseHref} iconTrailing={ArrowNarrowRight}>
              Browse all templates
            </Button>
          )}
        </ListEmptyState>
      </div>
    );
  }
  return (
    <EmbeddedTable
      ariaLabel="Recommended templates"
      columns={COLUMNS}
      rows={templates}
      minWidth="min-w-[480px]"
      cell={(t, column) => {
        if (column === "template")
          return (
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-primary">{t.title}</p>
              <p className="max-w-xl text-xs text-balance text-tertiary">{t.description}</p>
            </div>
          );
        return <TemplateDownloads />;
      }}
    />
  );
}
