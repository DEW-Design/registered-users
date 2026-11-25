// /proto: every exploration that has been run here, with where it stands. A lab, not product (5.4). A run is added in the same pass
// as its route, and marked Decided, with its decision file, once the designer has chosen.

const RUNS = [
  {
    slug: "occurrence-add",
    title: "Adding an occurrence under an event",
    status: "Exploring",
    note: "Occurrence details open, the rest folded; Temporal details, Observers and Location inherited from the parent event (read from it, not stored). From mohan-wips.",
    decision: null as string | null,
  },
  {
    slug: "project-owners",
    title: "Data owners and project officers at scale",
    status: "Exploring",
    note: "A project with several owners and many officers: accordions of owners, a table of owners, and the officer cards. From mohan-wips.",
    decision: null as string | null,
  },
  {
    slug: "project-overview",
    title: "Project overview as a reflection of Add Project",
    status: "Exploring",
    note: "The Overview rethought as a reflection of Add Project, on the project the flow itself creates from its sample answers. From mohan-wips.",
    decision: null as string | null,
  },
  {
    slug: "geographic-extent",
    title: "Geographic extent in Add Project",
    status: "Exploring",
    note: "Four ways to capture a project's area: the picker as it is, a list of areas, a coordinates table, one box.",
    decision: null as string | null,
  },
  {
    slug: "map-drawing",
    title: "Drawing an area on the map",
    status: "Exploring",
    note: "The flow of choosing a shape, drawing it and seeing its coordinates: the areas variant as it is, a panel, everything on the map, and check it first.",
    decision: null as string | null,
  },
  {
    slug: "expand-and-draw",
    title: "Expand and draw",
    status: "Exploring",
    note: "The form holds a summary and one button; the drawing is done in a workspace that takes the window: the product's own expand, a map with a panel beside it, and everything on the map.",
    decision: null as string | null,
  },
];

export default function ProtoIndex() {
  return (
    <main className="min-h-screen bg-secondary px-6 py-10 font-barlow">
      <div className="mx-auto flex max-w-[720px] flex-col gap-4">
        <p className="m-0 text-xs font-semibold tracking-wide text-brand-tertiary uppercase">Lab, not product</p>
        <h1 className="m-0 text-xl font-semibold text-primary">Explorations</h1>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {RUNS.map((r) => (
            <li key={r.slug} className="rounded-xl border border-secondary bg-primary p-4">
              <a href={`/proto/${r.slug}`} className="text-md font-semibold text-primary hover:underline">
                {r.title}
              </a>
              <p className="m-0 mt-1 text-sm text-tertiary">{r.note}</p>
              <p className="m-0 mt-2 text-sm text-secondary">
                {r.status}
                {r.decision ? `, decided in ${r.decision}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
