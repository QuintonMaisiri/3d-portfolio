import type { ProblemCase } from "@/lib/types";
import { todo } from "./todo";

const placeholder = (n: number): ProblemCase => ({
  id: `case-${n}`,
  title: todo(`problem-solving case ${n} title`),
  problem: todo(`case ${n} problem`),
  approach: todo(`case ${n} approach`),
  outcome: todo(`case ${n} outcome`),
});

/** One peak per case. */
export const problemCases: ProblemCase[] = [placeholder(1), placeholder(2), placeholder(3)];
