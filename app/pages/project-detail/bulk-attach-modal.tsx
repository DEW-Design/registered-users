"use client";

// "Upload attachments", from the project card's Upload menu (designer, 25 Oct 2026): many files and web links attached to
// the project's records in one go, with the project's own template (bulk-attachments.ts). The sibling of "Add attachment"
// and "Add web link" (record-quick-actions.tsx), which add one at a time from a record, so it is the same modal and the
// files land the same way: on a field, audio and video waiting for an admin's review.
//
// One file needs no template (designer, 20 Nov 2026: "for single ones, let me just do, make it easy", then "reuse the bulk upload, no
// need to create two tabs"): the same drop area takes a single file too, and once one is added, the record and the concept of it the file
// documents are asked under it (attach-fields.tsx, as a record's own "Add attachment" asks them). A zip or the template is the many-files path below.
//
// Three steps, on one screen: download the template, fill it, add the zip. Once added, every row is checked and shown
// with where it goes and whether it is ready, already attached (skipped) or to fix, problems first. The ready rows are
// attached; the rest are left for the person to fix and add again. Borrowed: the drop area from Upload dataset
// (upload-dropzone.tsx), the file row from its queue, and the embedded table (embedded-table.tsx, CONTRACTS 4.2h).

import { useEffect, useMemo, useRef, useState } from "react";
import { Download01, File05, Trash01, Upload01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { FormModal } from "@/components/application/modals/modal";
import { toast } from "@/components/application/toast/toast";
import { UploadDropzone } from "@/app/pages/_shared/dataset-upload/upload-dropzone";
import { useSampleContent } from "@/app/_prototype-tools/sample-content";
import { fileRulesFor, formatFileSize } from "@/app/pages/_shared/dataset-upload/dataset-data";
import { EmbeddedTable } from "@/app/pages/_shared/embedded-table";
import { NumberedSteps } from "@/app/pages/_shared/numbered-steps";
import { useUserRole } from "@/lib/use-user-role";
import { useEditStore } from "./edit-store";
import { useCurrentUserName } from "./field-notes";
import { PROJECT_FIELD_KEY, fieldNotesActions, kindForFile, reviewForNewFile, useFieldNotes } from "./field-notes-store";
import { AttachmentDetails, ConceptSelect, RecordSelect, emptyAttachmentDetails, metaOfDetails, type AttachmentDetailsDraft } from "./attach-fields";
import { sampleAttachmentFiles } from "./bulk-attach-sample";
import {
  attachableFields,
  buildAttachmentTemplate,
  checkUpload,
  expandUpload,
  templateFileName,
  type CheckedRow,
  type RowStatus,
  type UploadedFile,
} from "./bulk-attachments";

const STATUS: Record<RowStatus, { label: string; color: "success" | "gray" | "error"; order: number }> = {
  problem: { label: "To fix", color: "error", order: 0 },
  ready: { label: "Ready", color: "success", order: 1 },
  attached: { label: "Already attached", color: "gray", order: 2 },
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Upload = { names: string[]; size: number; files: UploadedFile[] } | null;

export function BulkAttachModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { records, meta, project } = useEditStore();
  const notes = useFieldNotes();
  const me = useCurrentUserName();
  const role = useUserRole();
  const [upload, setUpload] = useState<Upload>(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  // One file, added in the same drop area: the record and the concept it documents are asked under it.
  const [oneRecordId, setOneRecordId] = useState<string | null>(null);
  const [oneFieldKey, setOneFieldKey] = useState<string | null>(null);
  const [oneFile, setOneFile] = useState<File | null>(null);
  const [oneKey, setOneKey] = useState(0);
  const [details, setDetails] = useState<AttachmentDetailsDraft>(emptyAttachmentDetails);
  // The project as a whole is a place a file can sit (no concept to choose).
  const onProject = oneRecordId === meta.id;
  const oneRecord = useMemo(() => records.find((r) => r.id === oneRecordId) ?? null, [records, oneRecordId]);
  const oneFields = useMemo(() => (oneRecord ? attachableFields(oneRecord) : []), [oneRecord]);
  const projectName = project.details.shortTitle;
  const target = useMemo(() => ({ id: meta.id, code: meta.code, name: projectName, publisher: meta.publisher }), [meta.id, meta.code, meta.publisher, projectName]);

  // Checked against the notes as they are now, so a row attached since is shown as already attached.
  const check = useMemo(() => (upload ? checkUpload(upload.files, target, records, notes) : null), [upload, records, notes, target]);
  const rows = useMemo(
    () => [...(check?.rows ?? [])].sort((a, b) => STATUS[a.status].order - STATUS[b.status].order || a.row - b.row).map((r) => ({ ...r, id: String(r.row) })),
    [check],
  );
  const ready = rows.filter((r) => r.status === "ready");
  const readyFiles = ready.filter((r) => r.kind !== "link").length;
  const readyLinks = ready.length - readyFiles;
  const count = (s: RowStatus) => rows.filter((r) => r.status === s).length;

  const reset = () => {
    setUpload(null);
    setReadError(null);
    setTried(false);
  };
  const resetOne = () => {
    setOneRecordId(null);
    setOneFieldKey(null);
    setOneFile(null);
    setDetails(emptyAttachmentDetails);
    setOneKey((k) => k + 1);
  };
  const close = () => {
    reset();
    resetOne();
    onClose();
  };

  const downloadTemplate = () => {
    const bytes = buildAttachmentTemplate(target, records);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFileName(meta.code);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const add = async (dropped: File[]) => {
    if (dropped.length === 0) return;
    // One file that is not a zip or the template: no template needed, just where it goes.
    const isOne = dropped.length === 1 && !/\.(zip|xlsx|xls)$/i.test(dropped[0].name);
    if (isOne) {
      if (!kindForFile(dropped[0].name)) {
        setUpload(null);
        setReadError(`${dropped[0].name} isn't a supported type. Use an image, PDF, spreadsheet, audio or video file.`);
        return;
      }
      setUpload(null);
      setReadError(null);
      setOneFile(dropped[0]);
      return;
    }
    setOneFile(null);
    setReading(true);
    setReadError(null);
    try {
      const files = await expandUpload(dropped);
      setUpload({ names: dropped.map((f) => f.name), size: dropped.reduce((n, f) => n + f.size, 0), files });
    } catch {
      setUpload(null);
      setReadError(`${dropped.map((f) => f.name).join(", ")} couldn't be opened. Zip the template and files again, then add the zip.`);
    } finally {
      setReading(false);
    }
  };

  // The Pre-fill sample content switch (Prototype tools), on the bar while this modal is open. The modal is filled with a zip of a filled-in template and the
  // files it names, added as a person would add it, each time it opens while the switch is on. `sampleOn` is the switch as this modal sees it; what was
  // in the modal before it went on (the hook's value) is put back when it goes off. A modal covers the bar (CONTRACTS 3.8), so the switch is
  // reached here only by its remembered choice, turned on from another form.
  const [sampleOn, setSampleOn] = useState(false);
  useSampleContent({
    value: { on: sampleOn, upload },
    onChange: (next) => {
      setSampleOn(next.on);
      if (!next.on) resetOne();
      setUpload(next.upload);
      setReadError(null);
      setTried(false);
    },
    sample: () => ({ on: true, upload }),
    enabled: isOpen && role !== "public-user",
  });
  const latest = useRef({ add, target, records });
  useEffect(() => {
    latest.current = { add, target, records };
  });
  useEffect(() => {
    if (!isOpen || !sampleOn) return;
    let current = true;
    void sampleAttachmentFiles(latest.current.target, latest.current.records).then((files) => {
      if (current) latest.current.add(files);
    });
    return () => {
      current = false;
    };
  }, [isOpen, sampleOn]);

  const submitOne = () => {
    setTried(true);
    if (!oneFile || !oneRecordId || (!onProject && (!oneRecord || !oneFieldKey))) return;
    const kind = kindForFile(oneFile.name);
    if (!kind) {
      toast.error("That file type isn't supported", { description: "Use an image, PDF, spreadsheet, audio or video file." });
      return;
    }
    const label = onProject ? projectName : (oneFields.find((f) => f.key === oneFieldKey)?.label ?? "the concept");
    fieldNotesActions.attach(onProject ? meta.id : oneRecordId, onProject ? PROJECT_FIELD_KEY : (oneFieldKey as string), { name: oneFile.name, sizeBytes: oneFile.size, kind }, me, reviewForNewFile(kind, role), metaOfDetails(details));
    toast.success(`${oneFile.name} attached to ${label}`, { description: "Changes are kept in this browser. This preview has no backend." });
    close();
  };

  const submit = () => {
    if (oneFile) return submitOne();
    setTried(true);
    if (!check || check.error) return;
    if (ready.length === 0) {
      toast.error("Nothing is ready to attach", { description: "Fix the rows marked To fix in the template, then add the zip again." });
      return;
    }
    let waiting = 0;
    for (const r of ready) {
      // On the project as a whole, or on a field of a record.
      const recordId = r.onProject ? meta.id : r.record?.id;
      const fieldKey = r.onProject ? PROJECT_FIELD_KEY : r.field?.key;
      if (!recordId || !fieldKey) continue;
      if (r.kind === "link") {
        fieldNotesActions.addLink(recordId, fieldKey, { url: r.url, name: r.meta.title || r.url.replace(/^https?:\/\//, ""), meta: r.meta }, me);
      } else if (r.file && r.kind) {
        const review = reviewForNewFile(r.kind, role);
        if (review) waiting += 1;
        fieldNotesActions.attach(recordId, fieldKey, { name: r.file.name, sizeBytes: r.file.size, kind: r.kind }, me, review, r.meta);
      }
    }
    const left = count("problem");
    toast.success(`${plural(ready.length, "attachment", "attachments")} added`, {
      description: [
        waiting ? `${plural(waiting, "recording waits", "recordings wait")} for a BioData Admin to review.` : "",
        left ? `${plural(left, "row", "rows")} still to fix: correct them in the template and add the zip again.` : "",
        "Changes are kept in this browser. This preview has no backend.",
      ]
        .filter(Boolean)
        .join(" "),
    });
    close();
  };

  const where = (r: CheckedRow) =>
    r.onProject ? (
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-primary">{target.code} {target.name}</span>
        <span className="truncate text-sm text-tertiary">Whole project</span>
      </span>
    ) : r.record && r.field ? (
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-primary" title={`${r.record.code} ${r.record.name}`}>
          {r.record.code} {r.record.name}
        </span>
        <span className="truncate text-sm text-tertiary">{r.field.label}</span>
      </span>
    ) : (
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-primary">{r.recordCode || "Not provided"}</span>
        <span className="truncate text-sm text-tertiary">{r.fieldId || "Not provided"}</span>
      </span>
    );

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && close()}
      size="lg"
      title="Upload attachments"
      description={oneFile ? `Choose where this file goes in ${target.name}.` : "Add one file, or many files and links with this project's template."}
      submitLabel={oneFile ? "Attach file" : ready.length ? `Attach ${[readyFiles ? plural(readyFiles, "file", "files") : "", readyLinks ? plural(readyLinks, "link", "links") : ""].filter(Boolean).join(" and ")}` : "Attach"}
      submitIcon={Upload01}
      isSubmitLoading={reading}
      onSubmit={submit}
    >
      {!oneFile && (
      <NumberedSteps
        steps={[
          <span key="template" className="flex flex-col items-start gap-2">
            Download this project&apos;s template. It lists every record and its concepts, with the IDs to use.
            <Button color="secondary" size="sm" iconLeading={Download01} onPress={downloadTemplate}>
              Download template
            </Button>
          </span>,
          "Add one row for each file or link: the record, the concept it documents, and its details.",
          "Zip the files with the filled-in template and add the zip here. For web links only, add the template on its own.",
        ]}
      />
      )}

      {upload ? (
        <div className="flex items-center gap-3 rounded-xl border border-secondary bg-primary p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-fg-quaternary">
            <File05 className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="m-0 truncate text-sm font-medium text-secondary">{upload.names.join(", ")}</p>
            <p className="m-0 text-sm text-tertiary tabular-nums">
              {formatFileSize(upload.size)}
              {check?.template ? `, template ${check.template}` : ""}
            </p>
          </div>
          <Button color="tertiary" size="sm" iconLeading={Trash01} aria-label={`Remove ${upload.names.join(", ")}`} onPress={reset} />
        </div>
      ) : oneFile ? (
        <>
          <div className="flex items-center gap-3 rounded-xl border border-secondary bg-primary p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-fg-quaternary">
              <File05 className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="m-0 truncate text-sm font-medium text-secondary">{oneFile.name}</p>
              <p className="m-0 text-sm text-tertiary tabular-nums">{formatFileSize(oneFile.size)}</p>
            </div>
            <Button color="tertiary" size="sm" iconLeading={Trash01} aria-label={`Remove ${oneFile.name}`} onPress={resetOne} />
          </div>
          <RecordSelect
            records={records.filter((r) => attachableFields(r).length > 0)}
            project={{ id: meta.id, code: meta.code, name: projectName }}
            value={oneRecordId}
            onChange={(id) => {
              setOneRecordId(id);
              setOneFieldKey(null);
            }}
            isInvalid={tried && !oneRecordId}
            resetKey={oneKey}
          />
          {oneRecord && !onProject && <ConceptSelect fields={oneFields} value={oneFieldKey} onChange={setOneFieldKey} isInvalid={tried && !oneFieldKey} resetKey={`${oneRecord.id}-${oneKey}`} />}
          <AttachmentDetails value={details} onChange={setDetails} publisher={meta.publisher} />
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <UploadDropzone
            onAdd={add}
            isInvalid={(tried && !upload && !oneFile) || !!readError}
            acceptedFileTypes={[".zip", ...fileRulesFor("everything").extensions]}
            formats="One file, a ZIP of the template and its files, or the template alone for links"
          />
          {reading && <p className="m-0 text-sm text-tertiary">Reading the zip…</p>}
          {(readError || (tried && !upload && !oneFile)) && (
            <p className="m-0 text-sm text-error-primary">{readError ?? "Add a file, or a ZIP with your filled-in template and its files."}</p>
          )}
        </div>
      )}

      {check?.error && <p className="m-0 text-sm text-balance text-error-primary">{check.error}</p>}

      {check && !check.error && (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm text-balance text-secondary tabular-nums">
            {rows.length === 0
              ? "The template has no rows filled in yet."
              : [
                  `${plural(rows.length, "row", "rows")} read`,
                  [
                    count("ready") ? `${count("ready")} ready` : "",
                    count("attached") ? `${count("attached")} already attached` : "",
                    count("problem") ? `${count("problem")} to fix` : "",
                  ]
                    .filter(Boolean)
                    .join(", "),
                ].join(": ") + "."}
          </p>
          {check.unused.length > 0 && (
            <p className="m-0 text-sm text-balance text-tertiary">
              {plural(check.unused.length, "file in the zip is", "files in the zip are")} not named in the template and won&apos;t be attached:{" "}
              {check.unused.join(", ")}.
            </p>
          )}
          {rows.length > 0 && (
            <EmbeddedTable
              ariaLabel="Rows in the template"
              minWidth="min-w-[600px]"
              columns={[
                { id: "row", label: "Row", className: "w-[9%]", isRowHeader: true },
                { id: "where", label: "Attach to", className: "w-[29%]" },
                { id: "what", label: "File or link", className: "w-[22%]" },
                { id: "status", label: "Status", className: "w-[40%]" },
              ]}
              rows={rows}
              cell={(r, column) => {
                if (column === "row") return <span className="text-sm text-tertiary tabular-nums">{r.row}</span>;
                if (column === "where") return where(r);
                if (column === "what")
                  return (
                    <span className="block truncate text-sm text-secondary" title={r.fileName || r.url}>
                      {r.fileName || r.url || "Not provided"}
                    </span>
                  );
                return (
                  <span className="flex flex-col items-start gap-1">
                    <Badge size="sm" color={STATUS[r.status].color}>
                      {STATUS[r.status].label}
                    </Badge>
                    {r.problems.map((p) => (
                      <span key={p} className="text-sm text-balance text-tertiary">
                        {p}
                      </span>
                    ))}
                  </span>
                );
              }}
            />
          )}
        </div>
      )}
    </FormModal>
  );
}
