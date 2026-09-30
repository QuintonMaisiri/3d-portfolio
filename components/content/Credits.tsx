import { credits } from "@/content/credits";

/** Asset credits (CC-BY requires them; the rest are thanks). */
export function Credits() {
  return (
    <footer aria-labelledby="credits-heading" className="mt-16 border-t border-line pt-8 text-sm text-muted">
      <h2 id="credits-heading" className="font-display text-base text-ink">
        Credits
      </h2>
      <ul className="mt-3 space-y-1.5">
        {credits.map((c) => (
          <li key={c.title}>
            <a href={c.url} className="underline underline-offset-2 hover:text-ink">
              {c.title}
            </a>{" "}
            by {c.author}, {c.license === "CC0" ? "CC0" : c.license === "Pixabay" ? "Pixabay Content License" : <a href="https://creativecommons.org/licenses/by/4.0/" className="underline underline-offset-2 hover:text-ink">CC BY 4.0</a>}
          </li>
        ))}
      </ul>
    </footer>
  );
}
