import { profile } from "@/content/profile";
import { ProfileLinks } from "../ProfileLinks";
import { Copy, Eyebrow, headingId, type SectionProps } from "../ui";

export function HeroContent({ region, variant }: SectionProps) {
  const journey = variant === "journey";
  return (
    <div className={journey ? "text-center" : undefined}>
      <div data-beat>
        <Eyebrow>{profile.headline}</Eyebrow>
      </div>
      <h1
        data-beat
        id={headingId(region)}
        className="mt-3 font-display text-4xl font-bold text-ink sm:text-5xl"
      >
        {profile.name}
      </h1>
      <p data-beat className="mt-3 text-muted">
        {profile.role} at {profile.organisation.name} &middot; {profile.location}
      </p>
      <p data-beat className="mt-6 font-display text-lg text-ink md:text-xl">
        <Copy text={profile.tagline} />
      </p>
      <p data-beat className={`mt-4 max-w-[60ch] text-ink ${journey ? "mx-auto" : ""}`}>{profile.intro}</p>
      <div data-beat className={`mt-6 ${journey ? "flex justify-center" : ""}`}>
        <ProfileLinks />
      </div>
      {journey ? (
        <div data-beat className="mt-8 flex flex-col items-center gap-2">
          <a
            href="#archive"
            className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2 text-sm font-medium text-ink hover:border-accent hover:text-accent"
          >
            Begin the journey
            <svg aria-hidden="true" viewBox="0 0 16 16" className="nudge h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3.5 6l4.5 4.5L12.5 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <p className="text-xs text-muted">or scroll, or use the map to jump to any region</p>
        </div>
      ) : null}
    </div>
  );
}
