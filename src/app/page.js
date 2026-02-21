import Link from "next/link";
import { AemulaLogoIcon } from "@/components/AemulaLogoIcon";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-800 flex flex-col items-center justify-center">
      <AemulaLogoIcon className="h-60 w-60" glow="lg" />

      <h1 className="mt-2 font-sans font-extralight text-[10vw] text-stone-100">
        A E M U L A
      </h1>

      <p className="font-serif text-stone-300 text-xl">
        News without the media
      </p>

      <div className="flex gap-4 mt-4">
        <Link
          href="/publish"
          className="px-6 py-3 rounded-md font-sans font-medium text-sm bg-cyan-500 text-zinc-900 hover:bg-cyan-400 transition-colors"
        >
          Publish
        </Link>
        <Link
          href="/explore"
          className="px-6 py-3 rounded-md font-sans font-medium text-sm bg-zinc-700 text-stone-100 hover:bg-zinc-600 transition-colors"
        >
          Explore
        </Link>
      </div>
    </main>
  );
}
