"use client";

import { useRef, useState } from "react";
import { parseDate } from "@internationalized/date";
import { Plus, Upload01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { MultiSelect } from "@/components/base/select/multi-select";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { InputDatePicker } from "@/components/custom/date-picker/input-date-picker";
import { dataLicenceOptions, type DataLicence } from "@/app/pages/_shared/dataset-upload/dataset-data";
import type { AttachableField } from "./bulk-attachments";
import type { FileMeta } from "./field-notes-store";
import { formatDate, type SurveyRecord } from "./survey-data";

// The three controls of "attach one file", shared by the two places that do it: a record's "Add attachment" (record-quick-actions.tsx) and the project's "Upload attachments", one file
// (bulk-attach-modal.tsx). The record, the concept of the record the file documents, and the file: no template (the designer, 20 Nov 2026: "for single ones, let me just do, make it easy").

/** The concept a file documents, from the record's own concepts. No concept is chosen to start: which one a file documents is the person's call. `resetKey` re-reads the value (the sample fill). */
export function ConceptSelect({
  fields,
  value,
  onChange,
  isInvalid,
  resetKey,
}: {
  fields: AttachableField[];
  value: string | null;
  onChange: (key: string) => void;
  isInvalid?: boolean;
  resetKey?: string | number;
}) {
  return (
    <MultiSelect
      key={resetKey}
      label="Concept"
      isRequired
      selectionMode="single"
      placeholder="Choose a concept"
      isInvalid={isInvalid}
      hint={isInvalid ? "Choose the concept this documents." : undefined}
      items={fields.map((f) => ({ id: f.key, label: f.label, supportingText: f.section }))}
      selectedKeys={new Set(value ? [value] : [])}
      onSelectionChange={(keys) => {
        const next = keys === "all" ? undefined : Array.from(keys)[0];
        if (next) onChange(String(next));
      }}
    >
      {(item) => <MultiSelect.Item {...item} />}
    </MultiSelect>
  );
}

/** The record a file goes on, searched by its ID or name, for a place that is not already on one record. */
export function RecordSelect({
  records,
  project,
  value,
  onChange,
  isInvalid,
  resetKey,
}: {
  records: SurveyRecord[];
  /** The project itself, first in the list: a file can sit on the project as a whole (an item of its own, with no concept). */
  project?: { id: string; code: string; name: string };
  value: string | null;
  onChange: (id: string) => void;
  isInvalid?: boolean;
  resetKey?: string | number;
}) {
  return (
    <MultiSelect
      key={resetKey}
      label="Record"
      isRequired
      selectionMode="single"
      placeholder="Choose a record"
      isInvalid={isInvalid}
      hint={isInvalid ? "Choose the record this file belongs to." : undefined}
      items={[
        ...(project ? [{ id: project.id, label: `${project.code} ${project.name}`, supportingText: "Whole project" }] : []),
        ...records.map((r) => ({ id: r.id, label: `${r.code} ${r.name}`, supportingText: r.kind === "event" ? r.type : `${r.type} ${r.kind}` })),
      ]}
      selectedKeys={new Set(value ? [value] : [])}
      onSelectionChange={(keys) => {
        const next = keys === "all" ? undefined : Array.from(keys)[0];
        if (next) onChange(String(next));
      }}
    >
      {(item) => <MultiSelect.Item {...item} />}
    </MultiSelect>
  );
}

/** One file: a button and the name chosen. Images, PDF, spreadsheets, audio and video. */
export function FileChooser({ file, onChange, isInvalid }: { file: File | null; onChange: (file: File | null) => void; isInvalid?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-secondary">
        File <span className="text-brand-tertiary">*</span>
      </p>
      <div className="flex items-center gap-3">
        <Button color="secondary" size="sm" iconLeading={Upload01} onClick={() => input.current?.click()}>
          {file ? "Choose another file" : "Choose file"}
        </Button>
        <span className="min-w-0 truncate text-sm text-tertiary">{file ? file.name : "No file chosen"}</span>
      </div>
      {isInvalid && !file && <p className="text-sm text-error-primary">Choose a file to attach.</p>}
      <input
        ref={input}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose a file to attach"
        accept="image/*,.pdf,.xls,.xlsx,.csv,audio/*,video/*"
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ── What the viewer shows about a file (its metadata), as the bulk template's optional columns give it (bulk-attachments.ts COLUMNS) ──
// Title, description, created, creator, licence, publisher and rights holder: every one optional, with the defaults the viewer uses when one is left empty (the file name,
// nothing, today, the person who added it, CC-BY, the project's publisher, the publisher). Each default is said once, in its hint, as "Defaults to ..."; a field whose
// label already says what it is (Description) has no hint (2.12).

export interface AttachmentDetailsDraft {
  title: string;
  description: string;
  /** ISO day, or "". */
  created: string;
  creator: string;
  licence: DataLicence | null;
  publisher: string;
  rightsHolder: string;
}

export const emptyAttachmentDetails: AttachmentDetailsDraft = { title: "", description: "", created: "", creator: "", licence: null, publisher: "", rightsHolder: "" };

/** The draft as the file's `meta`: only what was filled in. */
export function metaOfDetails(d: AttachmentDetailsDraft): FileMeta {
  return Object.fromEntries(
    Object.entries({
      title: d.title.trim(),
      description: d.description.trim(),
      created: d.created ? formatDate(d.created) : "",
      creator: d.creator.trim(),
      licence: d.licence ?? "",
      publisher: d.publisher.trim(),
      rightsHolder: d.rightsHolder.trim(),
    }).filter(([, v]) => v),
  ) as FileMeta;
}

/** The optional details of one attachment, behind a link so the common case stays three fields (6, reveal in steps). */
export function AttachmentDetails({ value, onChange, publisher }: { value: AttachmentDetailsDraft; onChange: (next: AttachmentDetailsDraft) => void; publisher: string }) {
  const [open, setOpen] = useState(false);
  const set = (change: Partial<AttachmentDetailsDraft>) => onChange({ ...value, ...change });
  if (!open)
    return (
      <Button color="link-color" size="sm" className="w-max" iconLeading={Plus} onPress={() => setOpen(true)}>
        Add details
      </Button>
    );
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-secondary p-4">
      <p className="m-0 text-sm font-semibold text-primary">Optional details</p>
      <Input label="Title" placeholder="E.g., Looking north from the site marker" hint="Defaults to the file name." value={value.title} onChange={(title) => set({ title })} />
      <TextArea label="Description" rows={2} value={value.description} onChange={(description) => set({ description })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <InputDatePicker
          label="Created"
          hint="Defaults to today."
          value={value.created ? parseDate(value.created) : null}
          onChange={(d) => set({ created: d ? d.toString() : "" })}
        />
        <Input label="Creator" hint="Defaults to you." value={value.creator} onChange={(creator) => set({ creator })} />
      </div>
      <Select
        label="Licence"
        hint="Defaults to CC-BY."
        placeholder="Choose a licence"
        items={dataLicenceOptions}
        selectedKey={value.licence}
        onSelectionChange={(key) => set({ licence: (key as DataLicence | null) ?? null })}
      >
        {(item) => <Select.Item {...item} />}
      </Select>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Publisher" hint={publisher ? `Defaults to ${publisher}.` : "Defaults to the project's publisher."} value={value.publisher} onChange={(p) => set({ publisher: p })} />
        <Input label="Rights holder" hint="Defaults to the publisher." value={value.rightsHolder} onChange={(rightsHolder) => set({ rightsHolder })} />
      </div>
    </div>
  );
}
