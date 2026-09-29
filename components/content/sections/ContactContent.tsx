import { contact } from "@/content/contact";
import { ContactForm } from "../ContactForm";
import { ProfileLinks } from "../ProfileLinks";
import { SectionHeader, type SectionProps } from "../ui";

export function ContactContent({ region }: SectionProps) {
  return (
    <div>
      <SectionHeader region={region} intro={<p>{contact.intro}</p>} />
      <div data-beat>
        <ProfileLinks detailed />
      </div>
      <div data-beat className="mt-6 border-t border-line pt-5">
        <h3 className="font-display text-xl font-semibold text-ink">{contact.formHeading}</h3>
        <ContactForm />
      </div>
    </div>
  );
}
