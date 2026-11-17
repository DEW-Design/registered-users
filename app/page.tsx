"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The testing edition opens on the landing page. A static export has no server redirect, so the address `/` forwards in the browser.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/pages/biodata-home");
  }, [router]);
  return null;
}
