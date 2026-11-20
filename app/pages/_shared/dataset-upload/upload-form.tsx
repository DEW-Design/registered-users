"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertFullWidth } from "@/components/application/alerts/alerts";
import { DestructiveModal } from "@/components/application/modals/modal";
import { FormPage } from "@/app/pages/_shared/form-page";
import { RecommendedTemplates } from "@/app/pages/_shared/dataset-upload/recommended-templates";
import { FormRow } from "@/app/pages/_shared/form-row";
import { FormSectionList, FormSidebar, deriveSectionStatus } from "@/app/pages/_shared/form-section-list";
import { FileQueue, UploadDropzone, useFileQueue } from "@/app/pages/_shared/dataset-upload/upload-dropzone";
import { AcknowledgementRows, emptyAcknowledgement, type Acknowledgement } from "@/app/pages/_shared/dataset-upload/acknowledgement-rows";
import type { AcceptedMethodology } from "@/app/pages/_shared/dataset-upload/accepted-methodologies";
import { DatasetIdentifiers } from "@/app/pages/_shared/dataset-upload/dataset-identifiers";
import {
  emptyUploadDraft,
  kindOfFiles,
  missingForUpload,
  recommendTemplates,
  uploadSectionOrder,
  uploadSections,
  type UploadDraft,
  type UploadSection,
} from "@/app/pages/_shared/dataset-upload/dataset-data";
import { useDatasets } from "@/app/pages/_shared/dataset-upload/dataset-store";
import { describePlace, useDetectedConcepts } from "@/app/pages/_shared/dataset-upload/custom-concepts";
import { CustomConceptRows } from "@/app/pages/_shared/dataset-upload/custom-concepts-views";
import { sampleAcknowledgement, sampleDatasetFiles } from "@/app/pages/_shared/dataset-upload/dataset-sample";
import { useFormDraft } from "@/app/pages/_shared/form-draft-store";
import { useSampleContent } from "@/app/_prototype-tools/sample-content";
import { projectDetailsPath } from "@/app/pages/_shared/project-routes";
import { useCanOpen } from "@/lib/use-can-open";
import { useRoleHref } from "@/lib/use-role-href";
import { NumberedSteps } from "@/app/pages/_shared/numbered-steps";
import { ArrowLeft, Trash01 } from "@untitledui/icons";

// The upload-dataset form, fitted from the wireframe (Figma YMproGZfrFB5jUqPHPxMhk node 67:33213)
// into the shared form pattern (FormPage, sections in column 2, CONTRACTS 4.1). The wireframe's one
// screen becomes two sections: Upload files (instructions, the drop area and queue, the recommended
// templates) and Data upload acknowledgement (licence, First Nations, privacy),
// ending in "Confirm and upload". Departures from the wireframe, on purpose:
//   - the three "select one" groups are radio buttons, not checkboxes (a checkbox lets two be ticked);
//   - there is no Save draft: a draft has nothing to save before validation (the workflow sheet's
//     "Save draft" comes after validation passes);
//   - the templates have no images or downloads, because there are no template files yet.
// Unstructured data (PDFs, images, Word, audio, video: 10 MB each) is added in the same queue as the spreadsheets, with the same upload component, so one
// upload can hold both. Those files have no custom concepts and are not checked before upload: they go straight to post-flight validation on Fluree
// (the designer, 2 Nov 2026). A dataset with no spreadsheet in it is stored as unstructured.
// Mandatory details block Continue for the section being left, never ahead of it.
// The Pre-fill sample content switch on the Prototype tools bar adds a real workbook (with columns the vocabularies do not have, so the Custom concepts
// section shows) and a PDF, and answers the acknowledgement down its fullest branch (dataset-sample.ts). Switching it off takes those files out again.
// The Custom concepts section has nothing to decide before the upload: it lists the columns, and a BioData admin approves each one afterwards.

const uploadInstructions = [
  "Supported file formats for data: .XLS and .XLSX",
  "Please use the standard BioData SA templates recommended for this project when preparing and uploading data.",
  "PDF, images (JPG, PNG, GIF, RAW), Word, audio and video can be added too. Each file can be up to 10 MB.",
];

export function UploadForm({
  project,
  accepted = [],
  onCancel,
  onSubmit,
}: {
  project: { id: string; code: string; name: string };
  /** The methodologies the project accepts, from its registration: said before the files are added. None is nothing to say. */
  accepted?: AcceptedMethodology[];
  onCancel: () => void;
  onSubmit: (draft: UploadDraft) => void;
}) {
  useDatasets(); // loads the saved datasets before this one is added
  const roleHref = useRoleHref();
  const canOpen = useCanOpen();
  const queue = useFileQueue("everything");
  // The answers, the section and the sections gone through are a draft for this project that survives a refresh (form-draft-store.ts). The files are not kept: a file
  // cannot be stored, so after a refresh they are added again.
  const saved = useFormDraft<{ answers: Acknowledgement; section: UploadSection; visited: UploadSection[] }>({
    key: `upload-dataset:${project.id}`,
    initial: () => ({ answers: emptyAcknowledgement, section: "files", visited: [] }),
    encode: JSON.stringify,
    decode: (raw) => ({ ...{ answers: emptyAcknowledgement, section: "files" as UploadSection, visited: [] }, ...JSON.parse(raw) }),
  });
  const { answers, section, visited: visitedList } = saved.value;
  const visited = new Set(visitedList);
  const setAnswers = (next: React.SetStateAction<Acknowledgement>) => saved.set((d) => ({ ...d, answers: typeof next === "function" ? next(d.answers) : next }));
  const setSection = (next: UploadSection) => saved.set((d) => ({ ...d, section: next }));
  const [blocked, setBlocked] = useState<Set<UploadSection>>(new Set());
  const [submitPressed, setSubmitPressed] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const update = (change: Partial<typeof answers>) => setAnswers((a) => ({ ...a, ...change }));
  // The Pre-fill sample content switch (Prototype tools): a workbook with custom concepts and a PDF, and every acknowledgement answer down its fullest branch.
  useSampleContent({
    value: answers,
    onChange: setAnswers,
    sample: sampleAcknowledgement,
    files: { sample: sampleDatasetFiles, add: queue.add, remove: queue.removeByName },
  });
  const draft: UploadDraft = { ...emptyUploadDraft, ...answers, ...(kindOfFiles(queue.files) === "unstructured" ? { kind: "unstructured" as const } : {}), files: queue.files.filter((f) => f.status === "complete").map((f) => ({ name: f.name, size: f.size, ...(f.sheets ? { sheets: f.sheets } : {}) })) };
  const missing = missingForUpload(draft, queue.uploading);
  // Columns the controlled vocabularies do not have: a section of their own while there are some, and none when there are not.
  const detected = useDetectedConcepts(draft.files);
  const order = uploadSectionOrder(detected.length > 0);
  const index = Math.max(0, order.indexOf(section));
  const isLast = index === order.length - 1;
  const showErrors = (id: UploadSection) => submitPressed || blocked.has(id);
  const dirty = saved.restored || queue.files.length > 0 || answers.permitNumber !== "" || answers.uriDoi !== "" || answers.licence !== "" || answers.firstNations !== "" || answers.privacyConfirmed;

  const goTo = (next: UploadSection) => {
    saved.set((d) => ({ ...d, visited: [...new Set([...d.visited, d.section])], section: next }));
  };
  // Continue, and jumping ahead in column 2, refuse to leave a section with mandatory details missing.
  const proceed = (next: UploadSection) => {
    if (order.indexOf(next) > index && missing[section].length > 0) {
      setBlocked((b) => new Set(b).add(section));
      return;
    }
    goTo(next);
  };

  const submit = () => {
    setSubmitPressed(true);
    const first = order.find((id) => missing[id].length > 0);
    if (first) {
      setSection(first);
      return;
    }
    saved.clear();
    onSubmit(draft);
  };

  const sectionItems = order.map((id) => ({
    id,
    title: uploadSections[id].title,
    status: deriveSectionStatus({ isCurrent: id === section, isValid: missing[id].length === 0, visited: visited.has(id), attempted: showErrors(id) }),
    detail: showErrors(id) && missing[id].length > 0 && id !== section ? `${missing[id].length} to fix` : undefined,
  }));

  const problems = showErrors(section) ? missing[section] : [];
  const ack = showErrors("acknowledgement");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FormSidebar>
        <FormSectionList
          heading="Upload dataset"
          groups={[{ sections: sectionItems }]}
          progress={{ done: sectionItems.filter((i) => i.status === "complete").length, total: order.length }}
          onSelect={(id) => proceed(id as UploadSection)}
        />
      </FormSidebar>

      <FormPage
        eyebrow={`${project.name} - Step ${index + 1} of ${order.length}`}
        title={uploadSections[section].title}
        subtitle={uploadSections[section].description}
        onCancel={() => (dirty ? setConfirmDiscard(true) : onCancel())}
        onBack={index > 0 ? () => goTo(order[index - 1]) : undefined}
        problems={problems.length ? { items: problems } : undefined}
        primaryLabel={isLast ? "Confirm and upload" : "Continue"}
        primaryIsContinue={!isLast}
        onPrimary={isLast ? submit : () => proceed(order[index + 1])}
      >
        {section === "files" && (
          <>
            {accepted.length > 0 && (
              <div className="mb-6">
                <AlertFullWidth
                  contained
                  wrap
                  color="gray"
                  title="Methodologies this project accepts"
                  description={`${accepted.map((a) => (a.accepted.length ? `${a.method}: ${a.accepted.join(", ")}` : a.method)).join("; ")}. Upload data collected with these.`}
                  confirmLabel=""
                />
              </div>
            )}
            <FormRow title="Data upload instructions">
              <NumberedSteps steps={uploadInstructions} />
            </FormRow>
            <FormRow title="Dataset files" required description="Add one or more files." error={queue.rejectedMessage}>
              <UploadDropzone accepts="everything" onAdd={queue.add} isInvalid={showErrors("files") && queue.files.length === 0} />
              <FileQueue files={queue.files} onRemove={queue.remove} />
              <DatasetIdentifiers answers={answers} update={update} />
            </FormRow>
            <FormRow title="Recommended templates" description="Standard templates for the methodologies this project accepts.">
              <RecommendedTemplates
                templates={recommendTemplates(accepted)}
                hasMethodologies={accepted.length > 0}
                browseHref={canOpen("/pages/template-finder") ? roleHref("/pages/template-finder") : undefined}
              />
            </FormRow>
          </>
        )}

        {section === "custom" && (
          <>
            <div className="mb-6">
              <AlertFullWidth
                contained
                wrap
                color="brand"
                title="What happens next"
                description="Your data uploads as usual. A BioData admin approves or declines each concept. Until then it shows as Awaiting approval under the upload on the project's Datasets page."
                confirmLabel=""
              />
            </div>
            <FormRow title="Columns to approve">
              <CustomConceptRows
                label="Custom concepts in your files"
                rows={detected.map((d) => ({ key: d.key, name: d.name, where: describePlace(d.places, draft.files.length > 1) }))}
              />
            </FormRow>
          </>
        )}

        {section === "acknowledgement" && (
          <AcknowledgementRows
            answers={answers}
            update={update}
            showErrors={ack}
            privacyNote={
              <p className="text-sm text-balance text-tertiary">
                Project-level privacy controls are already applied. If this dataset needs additional or different restrictions,{" "}
                <Link
                  href={roleHref(projectDetailsPath(project.id))}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-tertiary underline underline-offset-2 hover:text-brand-secondary"
                >
                  review the project&apos;s Privacy and Restrictions (opens in a new tab)
                </Link>{" "}
                before uploading.
              </p>
            }
          />
        )}
      </FormPage>

      <DestructiveModal confirmIcon={Trash01} cancelIcon={ArrowLeft}
        isOpen={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard this upload?"
        description="The files you added and the details you entered will be lost."
        confirmLabel="Discard upload"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setConfirmDiscard(false);
          saved.clear();
          onCancel();
        }}
      />
    </div>
  );
}
