import type { Testimonial } from "@/lib/types";
import { todo } from "./todo";

// Real quotes only. Replace these placeholders; never invent them.
const placeholder = (n: number): Testimonial => ({
  id: `testimonial-${n}`,
  quote: todo(`testimonial ${n} quote`),
  author: todo(`testimonial ${n} name`),
  relation: todo(`testimonial ${n} role and how you worked together`),
});

/** One crystal per quote. */
export const testimonials: Testimonial[] = [placeholder(1), placeholder(2), placeholder(3)];
