import { notFound } from "next/navigation";
import { ModelLab } from "./ModelLab";

export const metadata = { robots: { index: false } };

/** Dev-only: every candidate model side by side, lit like the world, to judge style and scale. */
export default function LabPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ModelLab />;
}
