"use client";

import { ObservationsExplore } from "@/app/pages/observations/observations-search";

// Explore with the "Table toggle": the map, with a floating "Map only" / "Map and table" switch above the zoom buttons. Map and table
// stacks the map (search card and all) over the Species Detail Report's table of the species records the search found, split by a
// drag handle, the table able to go full screen. See observations-search.tsx, "Table toggle".
export default function ObservationsPage() {
  return <ObservationsExplore variant="table-toggle" />;
}
