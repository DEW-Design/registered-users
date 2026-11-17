import type { NextConfig } from "next";

// BioData SA testing edition: a fully static site (`next build` writes `out/`), so any static host can serve it.
//
// - `next dev` is a normal dev server.
// - `next build` always exports static HTML into `out/`.
// - Served from a sub-path (e.g. https://example.com/testing/)? Build with BASE_PATH=/testing. Served from the root of its own host: leave it unset.
const basePath = process.env.BASE_PATH ?? process.env.PAGES_BASE_PATH ?? "";
const isBuild = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  logging: {
    incomingRequests: false,
    browserToTerminal: false,
  },
  // Read by lib/base-path.ts - Next only prefixes next/link, router and its own assets with basePath; plain <img src> strings and
  // react-aria links need it added by hand.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(basePath && { basePath }),
  ...(isBuild && {
    output: "export",
    // /foo/ is served from foo/index.html on every static host, so both URL forms work.
    trailingSlash: true,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
