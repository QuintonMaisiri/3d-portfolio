import { profile } from "@/content/profile";
import { TextLink } from "./ui";

export const profileLinks = [
  { label: "Email", href: `mailto:${profile.links.email}`, display: profile.links.email },
  { label: "GitHub", href: profile.links.github, display: "github.com/QuintonMaisiri" },
  { label: "LinkedIn", href: profile.links.linkedin, display: "linkedin.com/in/quinton-maisiri" },
];

export function ProfileLinks({ detailed = false }: { detailed?: boolean }) {
  return (
    <ul className={detailed ? "space-y-1.5" : "flex flex-wrap gap-x-6 gap-y-2"}>
      {profileLinks.map((link) => (
        <li key={link.label}>
          {detailed ? <span className="mr-2 text-muted">{link.label}:</span> : null}
          <TextLink href={link.href}>{detailed ? link.display : link.label}</TextLink>
        </li>
      ))}
    </ul>
  );
}
