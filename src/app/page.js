import Link from "next/link";
import { AemulaLogoIcon } from "@/components/AemulaLogoIcon";
import { CiTextAlignLeft, CiCompass1, CiText } from 'react-icons/ci'

export default function Home() {
  return (
    <main className="grain-overlay min-h-screen bg-zinc-900 flex flex-col items-center justify-center">
      <AemulaLogoIcon className="h-60 w-60 opacity-90" glow="lg" />

      <h1 className="mt-2 font-sans font-extralight text-[10vw] text-stone-100"
          style={{
            textShadow: '0 0 7px rgba(250, 250, 249, 0.2), 0 0 25px rgba(250, 250, 249, 0.1)',
          }}      
      >
        A E M U L A
      </h1>

      <p className="font-serif font-light tracking-wide text-stone-300 text-2xl">
        News without the media
      </p>

      <div className="flex gap-4 mt-4">
        <Link
          href="/publish"
          className="px-6 py-3 border flex flex-row border-stone-100 rounded-md font-sans font-medium text-sm text-stone-100 hover:text-stone-300 transition-colors"
        >
          <CiTextAlignLeft />
          <div>Publish</div>
        </Link>
        <Link
          href="/explore"
          className="px-6 py-3 flex flex-row border border-stone-100 rounded-md font-sans font-medium text-sm text-stone-100 hover:text-stone-300 transition-colors"
        >
          <CiCompass1 />
          <div>Explore</div>
        </Link>
      </div>
    </main>
  );
}
