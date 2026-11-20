"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Plus, Trash01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { MultiSelect } from "@/components/base/select/multi-select";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { AlertFullWidth } from "@/components/application/alerts/alerts";
import { InputDatePicker } from "@/components/custom/date-picker/input-date-picker";
import { FormRow } from "@/app/pages/_shared/form-row";
import { BentoCard } from "@/app/pages/_shared/bento-card";
import { ANALYSIS_REPORTING_OPTIONS, COLLECTION_METHOD_OPTIONS, COLLECTION_METHOD_OPTIONS_V2, REGISTRATION_SPECIES, ROLE_IN_PROJECT_OPTIONS, ROLE_OF_WORK_OPTIONS } from "../data";
import { GeoExtentMapFirst } from "@/app/pages/_shared/geo-extent/geo-extent-map-first";
import { ProjectAccessSelect } from "../project-access";
import { OTHER_METHODOLOGY, useMethodologyOptions } from "../methodology-fields";
import { ManagerCard } from "../step-1-project-details";
import { OFFERED_RESTRICTION_TYPES, RESTRICTION_TYPE_META, RestrictionTypeFields } from "../step-3-privacy-restrictions";
import { emptyContact, emptyDataOwner, emptyProjectContact, ownersOf, type DataOwner, emptyProjectManager, type CollectionMethod, type DataCollectionState, type MethodologyChoice, type ProjectContact, type ProjectDetailsState, type ProjectManager, type RestrictionsState } from "../types";
import { nextOfficerId, PROJECT_NAME_MAX, withOwners, type FormState, type FormVersion, type SectionId } from "./sections";

// One component per section of the second Add Project layout. Every field is a real DEW component
// (`Input`, `TextArea`, `Select`, `MultiSelect`, `RadioGroup`, `Checkbox`, `Accordion`); the one
// custom piece, the calendar date picker, is the same one the first layout uses, since DEW has no
// calendar picker yet. Required fields show an
// inline message only after the person tries to move on (`showErrors`), never while they are still
// typing their first answer.

export interface SectionProps {
  state: FormState;
  onChange: (next: FormState) => void;
  /** True once Continue/Create was pressed on this section with something missing. */
  showErrors: boolean;
  /** Option 2's version (see `FormVersion` in sections.ts). Defaults to 1, which the project page's edit form also uses. */
  version?: FormVersion;
}

const SPECIES_ITEMS = REGISTRATION_SPECIES.map((s) => ({ id: s.id, label: `${s.commonName} (${s.species})` }));
const REQUIRED = "This field is required";

function useSectionPatches(state: FormState, onChange: (next: FormState) => void) {
  return {
    patchDetails: (p: Partial<ProjectDetailsState>) => onChange({ ...state, details: { ...state.details, ...p } }),
    patchCollection: (p: Partial<DataCollectionState>) => onChange({ ...state, collection: { ...state.collection, ...p } }),
    patchRestrictions: (p: Partial<RestrictionsState>) => onChange({ ...state, restrictions: { ...state.restrictions, ...p } }),
  };
}

// ── Step 1 ──

function BasicsSection({ state, onChange, showErrors, version = 1 }: SectionProps) {
  const { patchDetails } = useSectionPatches(state, onChange);
  const d = state.details;
  const [showFullTitle, setShowFullTitle] = useState(!d.sameAsShortTitle);
  const nameMissing = showErrors && !d.shortTitle.trim();
  const fullTitle = (
    <>
      <Checkbox
        size="sm"
        label="The full official title is different"
        isSelected={showFullTitle}
        onChange={(v) => {
          setShowFullTitle(v);
          patchDetails({ sameAsShortTitle: !v, fullTitle: v ? d.fullTitle : "" });
        }}
      />
      {showFullTitle && (
        <Input label="Full title" placeholder="The project's complete or official name" value={d.fullTitle} onChange={(v) => patchDetails({ fullTitle: v })} />
      )}
    </>
  );

  return (
    <>
      {version === 2 ? (
        // Version 2: the name is a short title with a hard limit (PROJECT_NAME_MAX), and a live count says so while it is typed.
        // A longer official name goes in Full title, which is what makes the limit easy to live with.
        <FormRow title="Project name" required description={`A short title, shown on project cards, lists and search. Up to ${PROJECT_NAME_MAX} characters.`}>
          <Input
            aria-label="Project name"
            isRequired
            maxLength={PROJECT_NAME_MAX}
            className="[&>[slot=description]]:self-stretch [&>[slot=errorMessage]]:self-stretch"
            placeholder="Coorong Wetlands Bird Monitoring"
            value={d.shortTitle}
            onChange={(v) => patchDetails({ shortTitle: v })}
            isInvalid={nameMissing}
            hint={
              <span className="flex w-full justify-between gap-4">
                <span>{nameMissing ? "Enter a project name" : d.shortTitle.length >= PROJECT_NAME_MAX ? "That is the limit. Put the full name in Full title." : "Keep it short. Add the full official title below if it is longer."}</span>
                <span className="shrink-0 tabular-nums">
                  {d.shortTitle.length}/{PROJECT_NAME_MAX} characters
                </span>
              </span>
            }
          />
          {fullTitle}
        </FormRow>
      ) : (
        <FormRow title="Project name" required description="A short, user-facing name people see first.">
          <Input
            aria-label="Project name"
            isRequired
            placeholder="Biodiversity Monitoring of the Coorong Wetlands 2025"
            value={d.shortTitle}
            onChange={(v) => patchDetails({ shortTitle: v })}
            isInvalid={nameMissing}
            hint={nameMissing ? "Enter a project name" : undefined}
          />
          {fullTitle}
        </FormRow>
      )}
      <FormRow title="Abstract" required description="Include background, aims and objectives.">
        <TextArea
          aria-label="Abstract"
          isRequired
          rows={6}
          placeholder="Please include background, aims and objectives."
          value={d.abstract}
          onChange={(v) => patchDetails({ abstract: v })}
          isInvalid={showErrors && !d.abstract.trim()}
          hint={showErrors && !d.abstract.trim() ? "Enter an abstract" : undefined}
        />
      </FormRow>
      <FormRow title="Project dates" required description="Leave the end date blank while the project is ongoing.">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputDatePicker
            label="Start date"
            isRequired
            value={d.startDate}
            onChange={(v) => patchDetails({ startDate: v })}
            isInvalid={showErrors && !d.startDate}
            hint={showErrors && !d.startDate ? "Choose a start date" : undefined}
          />
          <InputDatePicker label="End date" value={d.endDate} onChange={(v) => patchDetails({ endDate: v })} minValue={d.startDate ?? undefined} />
        </div>
      </FormRow>
    </>
  );
}

// Your role: one value (`roleOfWork`), asked once. An organisation owner is asked it in Step 2's Method and details; an individual
// owner is the person, so it is asked in the Data owner section (the designer, 6 Oct 2026).
function RoleRow({ state, onChange, showErrors }: SectionProps) {
  const { patchDetails } = useSectionPatches(state, onChange);
  const d = state.details;
  const roleMissing = showErrors && (!d.roleOfWork || (d.roleOfWork === "other" && !d.roleOfWorkOther.trim()));

  return (
    <FormRow title="Your role" required description="Helps us understand who is contributing to BioData SA.">
      <Select
        aria-label="Your role or type of work"
        isRequired
        placeholder="Select role or type of work"
        items={ROLE_OF_WORK_OPTIONS}
        selectedKey={d.roleOfWork}
        onSelectionChange={(key) => patchDetails({ roleOfWork: key as string, roleOfWorkOther: key === "other" ? d.roleOfWorkOther : "" })}
        isInvalid={showErrors && !d.roleOfWork}
        hint={showErrors && !d.roleOfWork ? "Select your role" : undefined}
      >
        {(item) => <Select.Item {...item}>{item.label}</Select.Item>}
      </Select>
      {d.roleOfWork === "other" && (
        <Input
          label="Please specify"
          isRequired
          placeholder="Describe your role or type of work"
          value={d.roleOfWorkOther}
          onChange={(v) => patchDetails({ roleOfWorkOther: v })}
          isInvalid={roleMissing && !d.roleOfWorkOther.trim()}
          hint={roleMissing && !d.roleOfWorkOther.trim() ? REQUIRED : undefined}
        />
      )}
    </FormRow>
  );
}

function OwnerSection(props: SectionProps) {
  if (props.version === 2)
    return (
      <>
        <DataOwnersRow {...props} />
      </>
    );
  return (
    <>
      <OwnerRows {...props} />
      {props.state.details.dataOwnerType === "individual" ? <RoleRow {...props} /> : <TeamRows {...props} />}
    </>
  );
}

// The data owner and its organisation name. Both versions ask it. The logo upload was taken out (the designer, 25 Oct 2026).
function DataOwnerRow({ state, onChange, showErrors }: SectionProps) {
  const { patchDetails } = useSectionPatches(state, onChange);
  const d = state.details;
  const missing = (v: string) => showErrors && !v.trim();

  return (
    <FormRow title="Data owner" required description="The organisation or person responsible for this project's data.">
      <RadioGroup
        aria-label="Data owner type"
        orientation="horizontal"
        className="gap-6"
        value={d.dataOwnerType}
        onChange={(v) => patchDetails({ dataOwnerType: v as ProjectDetailsState["dataOwnerType"] })}
      >
        <RadioButton value="organisation" label="Organisation / Institution" />
        <RadioButton value="individual" label="Individual / Person" />
      </RadioGroup>
      {d.dataOwnerType === "organisation" && (
        <Input
          label="Organisation / Institution name"
          isRequired
          placeholder="Department for Housing and Urban Development"
          value={d.dataOwnerOrgName}
          onChange={(v) => patchDetails({ dataOwnerOrgName: v })}
          isInvalid={missing(d.dataOwnerOrgName)}
          hint={missing(d.dataOwnerOrgName) ? "Enter the organisation name" : undefined}
        />
      )}
    </FormRow>
  );
}

function OwnerRows(props: SectionProps) {
  const { state, onChange, showErrors } = props;
  const { patchDetails } = useSectionPatches(state, onChange);
  const d = state.details;
  const contact = d.dataOwnerContacts[0];
  const updateContact = (id: number, p: Partial<typeof contact>) => patchDetails({ dataOwnerContacts: d.dataOwnerContacts.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const addContact = () => patchDetails({ dataOwnerContacts: [...d.dataOwnerContacts, emptyContact(Math.max(0, ...d.dataOwnerContacts.map((c) => c.id)) + 1)] });
  const missing = (v: string) => showErrors && !v.trim();

  return (
    <>
      <DataOwnerRow {...props} />
      <FormRow title="Primary contact" required description="Who people should contact about this data.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" isRequired placeholder="Olivia" value={contact.firstName} onChange={(v) => updateContact(contact.id, { firstName: v })} isInvalid={missing(contact.firstName)} hint={missing(contact.firstName) ? REQUIRED : undefined} />
          <Input label="Last name" isRequired placeholder="Wyatt" value={contact.lastName} onChange={(v) => updateContact(contact.id, { lastName: v })} isInvalid={missing(contact.lastName)} hint={missing(contact.lastName) ? REQUIRED : undefined} />
        </div>
        <Input label="Email" type="email" isRequired placeholder="olivia.wyatt@example.com" value={contact.email} onChange={(v) => updateContact(contact.id, { email: v })} isInvalid={missing(contact.email)} hint={missing(contact.email) ? REQUIRED : undefined} />
        <Input label="Phone number" value={contact.phone} onChange={(v) => updateContact(contact.id, { phone: v })} />
        {d.dataOwnerContacts.slice(1).map((c, i) => (
          <div key={c.id} className="flex flex-col gap-4 border-t border-secondary pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-primary">Contact {i + 2}</p>
              <ButtonUtility color="tertiary" size="xs" icon={Trash01} tooltip="Remove contact" aria-label={`Remove contact ${i + 2}`} onClick={() => patchDetails({ dataOwnerContacts: d.dataOwnerContacts.filter((x) => x.id !== c.id) })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="First name" value={c.firstName} onChange={(v) => updateContact(c.id, { firstName: v })} />
              <Input label="Last name" value={c.lastName} onChange={(v) => updateContact(c.id, { lastName: v })} />
              <Input label="Email" value={c.email} onChange={(v) => updateContact(c.id, { email: v })} />
              <Input label="Phone number" value={c.phone} onChange={(v) => updateContact(c.id, { phone: v })} />
              <Input label="Organisation" placeholder="Their team or organisation" value={c.organisation ?? ""} onChange={(v) => updateContact(c.id, { organisation: v })} className="sm:col-span-2" />
            </div>
          </div>
        ))}
        <Button color="link-color" size="sm" iconLeading={Plus} className="w-max" onClick={addContact}>
          Add another contact
        </Button>
      </FormRow>
    </>
  );
}

// Version 2's data owners and their project officers. One list of people per data owner (the designer, 9 Oct 2026: the separate
// Primary contact and Project managers blocks became one list, each person with a role in the project and one the primary
// contact; 16 Oct 2026: Project Manager is a role, not a tick). The designer, 16 Nov 2026: "Allow for the users to add multiple data
// owners and their respective project officers", "change the project contacts to project officers", and keep it clean while adding
// several. So each owner is one card (its type and name, then its officers), and its officers are rows inside that card divided by a
// line, not cards in a card. Each owner has its own primary contact (the tick only works with two or more officers; one officer is the
// primary contact). Nobody has to be a Project Manager: there is no prerequisite to be a data owner (the designer, 17 Nov 2026). The role belongs to the officer (CONTRACTS 4.7). `showAccess`
// adds what each officer can do on the project; only `/proto/project-access` turns it on, since Project access was archived (16 Nov
// 2026: not a tranche 1 feature, not in the approved wireframes or the BRD). Also the project page's Published by editor.
export function DataOwnersRow({ state, onChange, showErrors, showAccess = false }: SectionProps & { showAccess?: boolean }) {
  const { patchDetails } = useSectionPatches(state, onChange);
  const owners = ownersOf(state.details);
  const set = (next: DataOwner[]) => patchDetails(withOwners(next));
  const updateOwner = (id: number, p: Partial<DataOwner>) => set(owners.map((o) => (o.id === id ? { ...o, ...p } : o)));
  const setOfficers = (owner: DataOwner, officers: ProjectContact[]) => updateOwner(owner.id, { officers });
  const removeOfficer = (owner: DataOwner, id: number) => {
    const removingPrimary = owner.officers.find((m) => m.id === id)?.isPrimary;
    const rest = owner.officers.filter((m) => m.id !== id);
    // The one officer left is the primary contact, whatever was ticked before.
    setOfficers(owner, removingPrimary || rest.length === 1 ? rest.map((m, i) => (i === 0 ? { ...m, isPrimary: true } : m)) : rest);
  };
  const addOfficer = (owner: DataOwner) => setOfficers(owner, [...owner.officers, emptyProjectContact(nextOfficerId(owners))]);
  const addOwner = () => set([...owners, emptyDataOwner(Math.max(0, ...owners.map((o) => o.id)) + 1, nextOfficerId(owners))]);
  const many = owners.length > 1;

  return (
    <FormRow
      title={many ? "Data owners" : "Data owner"}
      required
      description="A data owner can be an organisation or an individual. Enter the details that match your circumstances."
    >
      {owners.map((owner, oi) => {
        const title = many ? `Data owner ${oi + 1}` : "Data owner";
        // One owner is asked what it is; with several, each card is told apart by its number.
        const heading = many ? title : "Are you an organisation or an individual?";
        const missing = (v: string) => showErrors && !v.trim();
        const noPrimary = showErrors && !owner.officers.some((p) => p.isPrimary);
        return (
          <BentoCard key={owner.id} className="gap-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-primary">{heading}</p>
              {many && <Button color="secondary" size="sm" iconLeading={Trash01} aria-label={`Remove ${title.toLowerCase()}`} onClick={() => set(owners.filter((o) => o.id !== owner.id))} />}
            </div>
            <RadioGroup
              aria-label={`${title} type`}
              orientation="horizontal"
              className="gap-6"
              value={owner.type}
              onChange={(v) => updateOwner(owner.id, { type: v as DataOwner["type"] })}
            >
              <RadioButton value="organisation" label="Organisation / Institution" />
              <RadioButton value="individual" label="Individual / Person" />
            </RadioGroup>
            {owner.type === "organisation" && (
              <Input
                label="Organisation / Institution name"
                isRequired
                placeholder="Department for Housing and Urban Development"
                value={owner.orgName}
                onChange={(v) => updateOwner(owner.id, { orgName: v })}
                isInvalid={missing(owner.orgName)}
                hint={missing(owner.orgName) ? "Enter the organisation name" : undefined}
              />
            )}
            <div className="flex flex-col border-t border-secondary">
              {owner.officers.map((person, i) => (
                <OfficerFields
                  key={person.id}
                  person={person}
                  title={owner.officers.length > 1 ? `Project officer ${i + 1}` : "Project officer"}
                  showErrors={showErrors}
                  showAccess={showAccess}
                  canRemove={owner.officers.length > 1}
                  canChoosePrimary={owner.officers.length > 1}
                  onChange={(p) => setOfficers(owner, owner.officers.map((m) => (m.id === person.id ? { ...m, ...p } : m)))}
                  onRemove={() => removeOfficer(owner, person.id)}
                  onSetPrimary={() => setOfficers(owner, owner.officers.map((m) => ({ ...m, isPrimary: m.id === person.id })))}
                />
              ))}
              {/* The foot of the officers keeps the card's own step (gap-5, the rows' py-5): 20px under the last row's line, as every
                  officer's content sits 20px from its lines. The button had none and touched the line. */}
              <div className="flex flex-col items-start gap-3 pt-5">
                {noPrimary && <p className="text-sm text-error-primary">Mark one officer as the primary contact.</p>}
                <Button color="link-color" size="sm" iconLeading={Plus} onClick={() => addOfficer(owner)}>
                  Add project officer
                </Button>
              </div>
            </div>
          </BentoCard>
        );
      })}
      <Button color="secondary" size="sm" iconLeading={Plus} className="w-max" onClick={addOwner}>
        Add data owner
      </Button>
    </FormRow>
  );
}

function OfficerFields({
  person,
  title,
  showErrors,
  showAccess,
  canRemove,
  canChoosePrimary,
  onChange,
  onRemove,
  onSetPrimary,
}: {
  person: ProjectContact;
  title: string;
  showErrors: boolean;
  showAccess: boolean;
  canRemove: boolean;
  /** False with only one officer, who is the primary contact. */
  canChoosePrimary: boolean;
  onChange: (p: Partial<ProjectContact>) => void;
  onRemove: () => void;
  onSetPrimary: () => void;
}) {
  const missing = (v: string) => showErrors && !v.trim();
  const roleMissing = showErrors && !person.role;
  const otherMissing = showErrors && person.role === "other" && !person.roleOther.trim();

  return (
    <div className="flex flex-col gap-4 border-b border-secondary py-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-secondary">{title}</p>
        <div className="flex items-center gap-4">
          <Checkbox size="sm" label="Primary contact" isSelected={person.isPrimary} isDisabled={!canChoosePrimary} onChange={(on) => (on ? onSetPrimary() : onChange({ isPrimary: false }))} />
          {canRemove && <ButtonUtility color="tertiary" size="xs" icon={Trash01} tooltip={`Remove ${title.toLowerCase()}`} aria-label={`Remove ${title.toLowerCase()}`} onClick={onRemove} />}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" isRequired placeholder="Olivia" value={person.firstName} onChange={(v) => onChange({ firstName: v })} isInvalid={missing(person.firstName)} hint={missing(person.firstName) ? REQUIRED : undefined} />
        <Input label="Last name" isRequired placeholder="Wyatt" value={person.lastName} onChange={(v) => onChange({ lastName: v })} isInvalid={missing(person.lastName)} hint={missing(person.lastName) ? REQUIRED : undefined} />
        <Input label="Email" type="email" isRequired placeholder="olivia.wyatt@example.com" value={person.email} onChange={(v) => onChange({ email: v })} isInvalid={missing(person.email)} hint={missing(person.email) ? REQUIRED : undefined} />
        <Input label="Phone number" value={person.phone} onChange={(v) => onChange({ phone: v })} />
        {/* Role and access side by side: what the officer does, and what that lets them do. */}
        <Select
          label="Role in project"
          isRequired
          placeholder="Select a role"
          items={ROLE_IN_PROJECT_OPTIONS}
          selectedKey={person.role}
          onSelectionChange={(key) => onChange({ role: key as string, roleOther: key === "other" ? person.roleOther : "" })}
          isInvalid={roleMissing}
          hint={roleMissing ? "Select a role" : undefined}
        >
          {(item) => <Select.Item {...item}>{item.label}</Select.Item>}
        </Select>
        {showAccess && <ProjectAccessSelect person={person} onChange={(access) => onChange({ access })} />}
        {person.role === "other" && (
          <Input label="Please specify" isRequired placeholder="Describe their role in the project" value={person.roleOther} onChange={(v) => onChange({ roleOther: v })} isInvalid={otherMissing} hint={otherMissing ? REQUIRED : undefined} className="sm:col-span-2" />
        )}
      </div>
    </div>
  );
}

// The project managers. They were part of a "Project team" section with your role; the section went into the
// Data owner section (the designer, 2 Oct 2026), and your role moved on to Step 2's Method and details
// (the designer, 6 Oct 2026), so this is rendered by the Data owner section.
function TeamRows({ state, onChange, showErrors }: SectionProps) {
  const { patchDetails } = useSectionPatches(state, onChange);
  const d = state.details;
  const updateManager = (id: number, p: Partial<ProjectManager>) => patchDetails({ projectManagers: d.projectManagers.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  const removeManager = (id: number) => {
    const removingPrimary = d.projectManagers.find((m) => m.id === id)?.isPrimary;
    const remaining = d.projectManagers.filter((m) => m.id !== id);
    patchDetails({ projectManagers: removingPrimary && remaining.length ? remaining.map((m, i) => (i === 0 ? { ...m, isPrimary: true } : m)) : remaining });
  };
  const managersMissing = showErrors && !d.projectManagers.some((m) => m.firstName.trim() && m.lastName.trim() && m.email.trim());

  return (
    <>
      <FormRow title="Project managers" required description="Add at least one manager. Organisation, role and phone are optional." error={managersMissing ? "Add at least one manager with a name and email." : undefined}>
        {d.projectManagers.map((manager, i) => (
          <ManagerCard
            key={manager.id}
            manager={manager}
            index={i}
            canRemove={d.projectManagers.length > 1}
            onChange={(p) => updateManager(manager.id, p)}
            onRemove={() => removeManager(manager.id)}
            onSetPrimary={() => patchDetails({ projectManagers: d.projectManagers.map((m) => ({ ...m, isPrimary: m.id === manager.id })) })}
          />
        ))}
        <Button color="link-color" size="sm" iconLeading={Plus} className="w-max" onClick={() => patchDetails({ projectManagers: [...d.projectManagers, emptyProjectManager(Math.max(0, ...d.projectManagers.map((m) => m.id)) + 1)] })}>
          Add another manager
        </Button>
      </FormRow>
    </>
  );
}

// ── Step 2 ──

function ExtentSection({ state, onChange, showErrors }: SectionProps) {
  const { patchCollection } = useSectionPatches(state, onChange);
  const c = state.collection;
  const extentMissing = showErrors && !(c.geographicExtent.method && (c.geographicExtent.boundary || c.geographicExtent.parkId || c.geographicExtent.shapefileName));

  return (
    <>
      <FormRow title="Geographic extent" required description="The area this project's data collection covers." error={extentMissing ? "Define the geographic extent" : undefined}>
        {/* The map first: draw on it here, or Expand it to add a place, coordinates or a file and to edit the numbers (the designer, 18 Nov 2026). */}
        <GeoExtentMapFirst value={c.geographicExtent} onChange={(geographicExtent) => patchCollection({ geographicExtent })} />
      </FormRow>
    </>
  );
}

/** Targeted taxon (it was Targeted species, in an accordion under Optional details): a combo box of its own, above Methodology (the designer, 19 Nov 2026). */
export function TargetedTaxonRow({ state, onChange }: Pick<SectionProps, "state" | "onChange">) {
  const { patchCollection } = useSectionPatches(state, onChange);
  const c = state.collection;
  return (
    <FormRow title="Targeted taxon" description="Only add this if it applies to this project.">
      <MultiSelect
        aria-label="Targeted taxon"
        placeholder="Search and select species"
        items={SPECIES_ITEMS}
        selectedKeys={new Set(c.targetedSpeciesIds)}
        onSelectionChange={(keys) => patchCollection({ targetedSpeciesIds: Array.from(keys as Set<string>) })}
        onReset={() => patchCollection({ targetedSpeciesIds: [] })}
        onSelectAll={() => patchCollection({ targetedSpeciesIds: SPECIES_ITEMS.map((o) => o.id) })}
      >
        {(item) => <MultiSelect.Item {...item} selectionIndicator="checkbox" selectionIndicatorAlign="left" />}
      </MultiSelect>
    </FormRow>
  );
}

// Version 2's methodologies, from the Survey methodology vocabulary (BIODATA-117), asked only for a Systematic project and
// shown right under that choice, indented to its label, so they read as part of it (the designer, 9 Oct 2026). Added one at a
// time, each with its own field for any variation, limitation or bias, as trap types are on the trap effort editor
// (project-detail/trap-effort.tsx). The list grows as the admins add to the vocabulary, so the picker is the searchable
// single select (MultiSelect selectionMode="single", as the Observers field) instead of a menu: it lists only what is not added
// yet (Other can be added more than once, each with its own name), and clears after each pick. A row's remove icon is always
// shown, as every other remove in the form is (11 Nov 2026; it showed on hover or focus only). An Analysis/Reporting project adds its kinds of analysis or reporting the same
// way (the designer, 25 Oct 2026), from a fixed list plus Other, kept apart so switching between the two loses neither.
function MethodologyList({ state, onChange, showErrors, kind }: SectionProps & { kind: "systematic" | "analysis" }) {
  const { patchCollection } = useSectionPatches(state, onChange);
  const analysis = kind === "analysis";
  const chosen = (analysis ? state.collection.analyses : state.collection.methodologies) ?? [];
  const methodologyOptions = useMethodologyOptions(chosen.map((m) => m.id));
  const options = analysis ? [...ANALYSIS_REPORTING_OPTIONS, OTHER_METHODOLOGY] : methodologyOptions;
  const set = (list: MethodologyChoice[]) => patchCollection(analysis ? { analyses: list } : { methodologies: list });
  const update = (rid: number, patch: Partial<MethodologyChoice>) => set(chosen.map((m) => (m.rid === rid ? { ...m, ...patch } : m)));
  const add = (id: string) => set([...chosen, { rid: Math.max(0, ...chosen.map((m) => m.rid ?? 0)) + 1, id, note: "" }]);
  const addable = options.filter((name) => name === OTHER_METHODOLOGY || !chosen.some((m) => m.id === name));
  // With one added, the picker is out of the way behind "Add another" and opens when it is pressed; before the first it is there, as it is the only way to add one.
  const [adding, setAdding] = useState(false);
  const showPicker = chosen.length === 0 || adding;

  return (
    // Under its choice as a group: a guide line hangs from the middle of the checkbox (8px in, the checkbox is 16px) and the list starts 16px past the label's text,
    // so the line says what it belongs to and the fields do not run into the next choice (the designer, 19 Nov 2026: "make the indent visually pleasing").
    <div className="mt-1 mb-4 ml-[7px] flex flex-col gap-4 border-l-2 border-secondary pl-10">
      {chosen.map((m, i) => {
        const isOther = m.id === OTHER_METHODOLOGY;
        const name = isOther ? m.other?.trim() || (analysis ? "other analysis or reporting" : "other methodology") : m.id;
        const otherMissing = showErrors && isOther && !m.other?.trim();
        return (
          <div key={m.rid ?? i} className="group/methodology flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {isOther && (
                <Input
                  label={analysis ? "Other analysis or reporting" : "Other methodology"}
                  isRequired
                  placeholder={analysis ? "Name the analysis or reporting" : "Name the methodology"}
                  value={m.other ?? ""}
                  onChange={(other) => update(m.rid, { other })}
                  isInvalid={otherMissing}
                  hint={otherMissing ? REQUIRED : undefined}
                />
              )}
              <TextArea
                label={isOther ? undefined : m.id}
                aria-label={isOther ? `Variations, limitations and biases: ${name}` : undefined}
                rows={2}
                placeholder="Optional: describe any variation, limitation or bias in how you used it"
                value={m.note}
                onChange={(note) => update(m.rid, { note })}
              />
            </div>
            <ButtonUtility color="tertiary" size="xs" icon={Trash01} tooltip="Remove" aria-label={`Remove ${name}`} onClick={() => set(chosen.filter((x) => x.rid !== m.rid))} className="mt-6" />
          </div>
        );
      })}
      {showPicker ? (
        <MultiSelect
          aria-label={analysis ? "Add a type of analysis or reporting" : "Add a methodology"}
          selectionMode="single"
          defaultOpen={adding}
          onOpenChange={(open) => !open && setAdding(false)}
          placeholder={
            analysis
              ? chosen.length === 0
                ? "Search and add a type of analysis or reporting"
                : "Search and add another type of analysis or reporting"
              : chosen.length === 0
                ? "Search and add a methodology"
                : "Search and add another methodology"
          }
          isInvalid={showErrors && chosen.length === 0}
          emptyStateTitle={analysis ? "No type found" : "No methodology found"}
          emptyStateDescription="Pick Other and name it."
          items={addable.map((name) => ({ id: name, label: name }))}
          selectedKeys={new Set<string>()}
          onSelectionChange={(keys) => {
            const picked = keys === "all" ? undefined : Array.from(keys)[0];
            if (picked !== undefined) add(String(picked));
          }}
          className="w-[calc(100%-2.75rem)]"
        >
          {(item) => <MultiSelect.Item {...item} />}
        </MultiSelect>
      ) : (
        <Button color="link-color" size="sm" iconLeading={Plus} className="w-max" onClick={() => setAdding(true)}>
          {analysis ? "Add another type of analysis or reporting" : "Add another methodology"}
        </Button>
      )}
    </div>
  );
}

// Data collection methodology (it was Method and details). Targeted taxon, then Methodology. The focus areas, and the permits and the URI / DOI number, are not asked
// here any more (the designer, 19 Nov 2026): the permit number and the URI / DOI are asked on the dataset upload. A project can use more than one method, so the
// methodology is a list of checkboxes, each with its own list under it.
function MethodSectionV2(props: SectionProps) {
  const { state, onChange } = props;

  return (
    <>
      <TargetedTaxonRow state={state} onChange={onChange} />
      <MethodologyRow {...props} />
    </>
  );
}

/** The Methodology question: every method the project uses, as checkboxes (more than one can apply), with the Systematic and Analysis/Reporting lists under their
 *  choices. Also the project page's edit form, so editing a project asks it exactly as Add Project does (the designer, 25 Oct 2026). A project that holds Unknown keeps it
 *  as a choice, so a saved answer never disappears. */
export function MethodologyRow(props: SectionProps) {
  const { state, onChange, showErrors } = props;
  const { patchCollection } = useSectionPatches(state, onChange);
  const c = state.collection;
  const held = c.collectionMethods;
  const has = (m: CollectionMethod) => held.includes(m);
  const otherMissing = showErrors && has("other") && !c.otherMethod?.trim();
  const error = !showErrors
    ? undefined
    : held.length === 0
      ? "Choose at least one method"
      : has("systematic") && (c.methodologies ?? []).length === 0
        ? "Add at least one systematic methodology"
        : has("analysis") && (c.analyses ?? []).length === 0
          ? "Add at least one type of analysis or reporting"
          : otherMissing
            ? "Describe the methodology"
            : undefined;
  const offered = COLLECTION_METHOD_OPTIONS.filter((o) => COLLECTION_METHOD_OPTIONS_V2.includes(o) || held.includes(o.id));
  const toggle = (id: CollectionMethod, on: boolean) => patchCollection({ collectionMethods: on ? [...held, id] : held.filter((m) => m !== id) });

  return (
    <FormRow title="Methodology" required description="Select any methodologies that are relevant to your current dataset or expected for future loads in this project." error={error}>
      <div role="group" aria-label="Methodology" className="flex flex-col gap-3">
        {offered.map((option) => (
          <Fragment key={option.id}>
            <Checkbox size="sm" label={option.label} hint={option.description} isSelected={has(option.id)} onChange={(on) => toggle(option.id, on)} />
            {option.id === "systematic" && has("systematic") && <MethodologyList {...props} kind="systematic" />}
            {option.id === "analysis" && has("analysis") && <MethodologyList {...props} kind="analysis" />}
            {option.id === "other" && has("other") && (
              <div className="pl-6">
                <TextArea
                  label="Describe the methodology"
                  isRequired
                  rows={3}
                  placeholder="How the data was or will be collected"
                  value={c.otherMethod ?? ""}
                  onChange={(otherMethod) => patchCollection({ otherMethod })}
                  isInvalid={otherMissing}
                />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </FormRow>
  );
}

// ── Step 3 ──

type RestrictionKind = (typeof RESTRICTION_TYPE_META)[number]["key"];

/** The "Kinds of restriction" list: every kind that can be switched on, as a checkbox with what it does under it. One list for Add Project's
 *  Restrictions section and the project page's "Add a restriction" card, so the two cannot drift (the designer, 11 Nov 2026: "the same lift and
 *  shift from the restriction list"). `locked` (opt-in) are kinds that stay ticked and cannot be changed here. */
export function RestrictionKindsRow({
  enabled,
  onToggle,
  description,
  required,
  error,
  locked,
  types = OFFERED_RESTRICTION_TYPES,
  notice,
  below,
}: {
  /** The kinds listed. Default: every kind that can be switched on. Add Project lists fewer (19 Nov 2026). */
  types?: { key: RestrictionKind; title: string; description: string }[];
  /** Above the list: what ticking a kind means. */
  notice?: ReactNode;
  /** Under a kind's checkbox, when it is ticked: the field that kind asks for. */
  below?: (key: RestrictionKind) => ReactNode;
  enabled: Set<RestrictionKind>;
  onToggle: (key: RestrictionKind, on: boolean) => void;
  description: string;
  required?: boolean;
  error?: string;
  locked?: Set<RestrictionKind>;
}) {
  return (
    <FormRow title="Kinds of restriction" required={required} description={description} error={error}>
      {notice}
      {types.map(({ key, title, description: hint }) => (
        <Fragment key={key}>
          <Checkbox size="sm" label={title} hint={hint || undefined} isSelected={enabled.has(key)} isDisabled={locked?.has(key)} onChange={(on) => onToggle(key, on)} />
          {enabled.has(key) && below?.(key)}
        </Fragment>
      ))}
    </FormRow>
  );
}

// The kinds of restriction Add Project offers for now (the designer, 19 Nov 2026: species, cultural sensitivities, locations and all records are hidden "for next
// week's test"): an Embargo, which has its own section, and Other restrictions, explained on this page. A kind a saved draft already ticked stays in the list, so it can
// still be unticked.
const SHOWN_KINDS: RestrictionKind[] = ["embargo", "other"];
const OTHER_KIND = { key: "other" as const, title: "Other restrictions", description: "" };

function RestrictionsSection({ state, onChange, showErrors }: SectionProps) {
  const { patchRestrictions } = useSectionPatches(state, onChange);
  const r = state.restrictions;
  const toggleType = (key: RestrictionKind, on: boolean) => {
    const enabledTypes = new Set(r.enabledTypes);
    if (on) enabledTypes.add(key);
    else enabledTypes.delete(key);
    // Un-ticking Other takes its explanation with it, as un-ticking an embargo's Other type does.
    patchRestrictions({ enabledTypes, ...(key === "other" && !on ? { otherRestrictions: "" } : {}) });
  };
  const kinds = [...OFFERED_RESTRICTION_TYPES, OTHER_KIND].filter((m) => SHOWN_KINDS.includes(m.key) || r.enabledTypes.has(m.key));
  const otherMissing = showErrors && r.enabledTypes.has("other") && !r.otherRestrictions.trim();

  return (
    <>
      <FormRow title="Restrictions on distribution" required description="Whether some or all of this project's data needs protecting.">
        {/* No restrictions is the default (the form starts on it) and is the recommended answer. */}
        <RadioGroup aria-label="Restrictions on distribution" value={r.hasRestrictions ? "yes" : "no"} onChange={(v) => patchRestrictions({ hasRestrictions: v === "yes" })}>
          <RadioButton
            value="no"
            label={
              <span className="inline-flex items-center gap-2">
                No restrictions
                <Badge size="sm" color="brand">
                  Recommended
                </Badge>
              </span>
            }
            hint={
              <>
                Everything in this project is available in accordance with the Department&apos;s{" "}
                {/* `relative z-10` lifts the link above the radio's invisible hit area, which would otherwise take the press. A link with nowhere to go yet (the designer, 19 Nov 2026: "doesn't need to link to anywhere for now"): the policy's address is not known, so none is made up. */}
                <a href="#" onClick={(e) => e.preventDefault()} className="relative z-10 font-medium text-brand-tertiary underline underline-offset-2 outline-focus-ring hover:text-brand-secondary focus-visible:outline-2">
                  restricted data policy
                </a>
                .
              </>
            }
          />
          <RadioButton value="yes" label="Yes, apply restrictions" hint="Choose an embargo, or describe any other restriction." />
        </RadioGroup>
      </FormRow>
      {r.hasRestrictions && (
        <RestrictionKindsRow
          required
          description="Tick each kind that applies."
          error={showErrors && r.enabledTypes.size === 0 ? "Select at least one kind of restriction" : undefined}
          enabled={r.enabledTypes}
          onToggle={toggleType}
          types={kinds}
          notice={
            <AlertFullWidth
              color="gray"
              title="Your project stays restricted until its sensitivities are set"
              description="We will get back to you within two weeks. You will be notified when the restrictions have been approved."
              confirmLabel=""
              contained
              wrap
            />
          }
          below={(key) =>
            key === "other" ? (
              <div className="pl-6">
                <TextArea
                  label="Please explain any other sensitivities that should be considered"
                  isRequired
                  rows={4}
                  placeholder="Why does this project need protection?"
                  value={r.otherRestrictions}
                  onChange={(otherRestrictions) => patchRestrictions({ otherRestrictions })}
                  isInvalid={otherMissing}
                  hint={otherMissing ? REQUIRED : undefined}
                />
              </div>
            ) : null
          }
        />
      )}
    </>
  );
}

// One kind of restriction, laid out as every other section is: a form row per field group, the label and help on the left and the field on the
// right (CONTRACTS 4.1 item 3). Until 11 Nov 2026 these five sections were a flat stack with the labels above. The row's title is the field's own label.
function RestrictionTypeSection({ typeKey, state, onChange, showErrors }: { typeKey: (typeof RESTRICTION_TYPE_META)[number]["key"] } & Pick<SectionProps, "state" | "onChange" | "showErrors">) {
  return (
    <RestrictionTypeFields
      typeKey={typeKey}
      value={state.restrictions}
      onChange={(restrictions) => onChange({ ...state, restrictions })}
      showErrors={showErrors}
      row={({ title, required, children }) => (
        <FormRow key={title} title={title} required={required}>
          {children}
        </FormRow>
      )}
    />
  );
}

/** The fields for one section (everything except Review, which the page renders itself). */
export function SectionFields({ id, ...props }: SectionProps & { id: Exclude<SectionId, "review" | "dataset"> }) {
  switch (id) {
    case "basics":
      return <BasicsSection {...props} />;
    case "owner":
      return <OwnerSection {...props} />;
    case "extent":
      return <ExtentSection {...props} />;
    case "method":
      return <MethodSectionV2 {...props} />;
    case "restrictions":
      return <RestrictionsSection {...props} />;
    default:
      return <RestrictionTypeSection typeKey={id} state={props.state} onChange={props.onChange} showErrors={props.showErrors} />;
  }
}
