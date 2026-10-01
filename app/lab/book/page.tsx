import { notFound } from "next/navigation";
import { BookLab } from "./BookLab";

export const metadata = { robots: { index: false } };

/** Dev-only: the Codex book held part open. ?p=0.4 holds the cover 40% open; ?narrow for the phone framing. */
export default async function BookLabPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const q = await searchParams;
  return <BookLab p={Number(q.p ?? 0.5)} narrow={q.narrow !== undefined} />;
}
