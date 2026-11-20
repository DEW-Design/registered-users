import type { FC } from "react";
import { Bird, Droplets, Leaf, PawPrint, Turtle } from "lucide-react";
import type { SpeciesGroup } from "./search-data";

// One icon per species group, shared by the Species tiles in Explore and the header search so a
// species looks the same everywhere. @untitledui/icons has no animal or plant glyphs (confirmed by
// search), so these come from lucide-react, the one deliberate exception to the DEW-icons-only rule
// (authorised for exactly these five). Mammal, Bird, Reptile and Plant are literal matches;
// lucide has no amphibian icon, so Droplets stands in for its defining trait (a water-dependent
// life cycle).
export const SPECIES_GROUP_ICON: Record<SpeciesGroup, FC<{ className?: string }>> = {
  Mammal: PawPrint,
  Bird,
  Reptile: Turtle,
  Amphibian: Droplets,
  Plant: Leaf,
};

// The map's dots and their key say flora or fauna, not the five species groups (the business, 20 Nov 2026: "we'll just have flora and fauna", to simplify it). A Plant is flora and
// every other group (Mammal, Bird, Reptile, Amphibian) is fauna. The species groups themselves are unchanged in the data, the cards' icons and the reports; only the map's colour and
// its key are by flora and fauna. Real utility tokens (app/globals.css): green and orange (the designer's choice, 20 Nov 2026; orange is what mammals were); the key always names each
// colour, so colour is never the only cue. "Other" (a Non-biotic or Community record, which has no species group) is neutral grey.
export type LifeForm = "Flora" | "Fauna";

export const lifeFormOf = (group: SpeciesGroup): LifeForm => (group === "Plant" ? "Flora" : "Fauna");

export const LIFE_FORM_COLOR: Record<LifeForm, string> = {
  Flora: "var(--color-utility-green-500)",
  Fauna: "var(--color-utility-orange-500)",
};

export const OTHER_RECORD_COLOR = "var(--color-utility-neutral-500)";

/** Key order. */
export const LIFE_FORM_ORDER: LifeForm[] = ["Flora", "Fauna"];
