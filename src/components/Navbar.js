"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AemulaLogoIcon } from "@/components/AemulaLogoIcon";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="w-full bg-zinc-900 flex items-center justify-between px-6 py-4 border-b border-zinc-800">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <AemulaLogoIcon className="h-8 w-8" />
        <span className="font-sans ml-1 font-extralight text-3xl text-stone-100">
          A E M U L A
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/publish"
          className={`px-4 py-2 rounded-md font-sans text-md font-light transition-colors ${
            pathname === "/publish"
              ? "bg-zinc-700 text-stone-100"
              : "text-stone-400 hover:text-stone-100 hover:bg-zinc-700"
          }`}
        >
          Publish
        </Link>
        <Link
          href="/explore"
          className={`px-4 py-2 rounded-md font-sans text-md font-light transition-colors ${
            pathname === "/explore"
              ? "border border-stone-100 rounded-md text-stone-100"
              : "text-stone-400 hover:text-stone-100 hover:bg-zinc-700"
          }`}
        >
          Explore
        </Link>
      </div>
    </nav>
  );
}
