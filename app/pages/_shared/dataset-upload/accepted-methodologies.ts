"use client";

import { useMemo } from "react";
import { useCreatedProject, createdProjectForm } from "@/app/pages/_shared/created-projects-store";
import { ADELAIDE_HILLS_ID } from "@/app/pages/project-detail/project-seed";
import { registrationDataCollection } from "@/app/pages/project-detail/project-registration-data";
import { acceptedMethodologies } from "@/app/pages/project-registration/option-2/sections";

// What the project the dataset is going to accepts, from its registration: each method it holds, with the methodologies chosen under it. A project made in this browser
// has its own; the Adelaide Hills sample project has the registration it was built from; the other built-in projects have no registration here, so nothing is said.

export type AcceptedMethodology = { method: string; accepted: string[] };

export function useAcceptedMethodologies(projectId: string): AcceptedMethodology[] {
  const { project } = useCreatedProject(projectId);
  return useMemo(() => {
    if (project) return acceptedMethodologies(createdProjectForm(project).collection);
    if (projectId === ADELAIDE_HILLS_ID) return acceptedMethodologies(registrationDataCollection);
    return [];
  }, [project, projectId]);
}

// The other built-in projects hold no registration here, so each is given the methodology a project of its kind would choose, from the Survey methodology vocabulary (BIODATA-117).
// SAMPLE values, not a registration: they stand in until these projects have one (0.3).
const SAMPLE_METHODOLOGY: Record<string, string[]> = {
  coorong: ["Bird survey, 20 minutes, 2 hectare"],
  flinders: ["Rangeland Assessment Method (RAM)"],
  "kangaroo-island": ["Biological Survey of South Australia"],
  "naracoorte-fossil": ["Biological Survey of South Australia"],
  "lake-eyre-waterbirds": ["Bird survey, 500 metre area search"],
  "nullarbor-arid-zone": ["Rangeland Assessment Method (RAM)"],
  "remarkable-malleefowl": ["Bush Assessment Method (BAM)"],
};

/** The methodologies of a built-in project, as Add Project's Data collection and methodology step holds them: the Adelaide Hills registration's own, a sample for the rest. */
export function builtInMethodologies(projectId: string): string[] {
  if (projectId === ADELAIDE_HILLS_ID) return acceptedMethodologies(registrationDataCollection).flatMap((m) => m.accepted);
  return SAMPLE_METHODOLOGY[projectId] ?? [];
}
