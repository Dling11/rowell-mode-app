import type { Metadata } from "next";
import { SharedGameSaves } from "@/features/game-saves/components/SharedGameSaves";
export const metadata: Metadata = {
  title: "Private game saves",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";
export default function SharedSavesPage() {
  return (
    <main id="main" className="container">
      <SharedGameSaves />
    </main>
  );
}
