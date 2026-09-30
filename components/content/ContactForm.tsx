"use client";

import { useId, useState, type FormEvent } from "react";
import { contact } from "@/content/contact";
import { profile } from "@/content/profile";
import { useCodex } from "@/lib/store";

/** Let the raven take off before the email app takes focus. */
const RAVEN_HEAD_START_MS = 900;

// [TODO: form backend] Until a sending service is chosen, the raven is a mailto: link.
function buildMailto(name: string, email: string, message: string) {
  const subject = `Message from ${name} via The Adventurer's Codex`;
  const body = `${message}\n\nFrom: ${name}\nReply to: ${email}`;
  return `mailto:${profile.links.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const fieldClass =
  "mt-1 block w-full rounded-lg border border-line bg-field px-3 py-2 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-accent";

export function ContactForm() {
  const id = useId();
  const [sent, setSent] = useState(false);
  const sendRaven = useCodex((s) => s.sendRaven);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const href = buildMailto(get("name"), get("email"), get("message"));
    const { reducedMotion, viewMode, activeRegion, closeCodex } = useCodex.getState();
    setSent(true);
    // At the Campfire (journey, or exploring there) the raven flies first; otherwise open the email app straight away.
    const ravenInView = viewMode === "journey" || (viewMode === "explore" && activeRegion === "campfire");
    if (ravenInView && !reducedMotion) {
      // Exploring, close the Codex so the raven can be seen leaving.
      if (viewMode === "explore") closeCodex();
      sendRaven();
      window.setTimeout(() => {
        window.location.href = href;
      }, RAVEN_HEAD_START_MS);
    } else {
      window.location.href = href;
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className="text-sm font-medium text-ink">
            Name
          </label>
          <input id={`${id}-name`} name="name" required autoComplete="name" className={fieldClass} />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="text-sm font-medium text-ink">
            Your email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            className={fieldClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-message`} className="text-sm font-medium text-ink">
          Message
        </label>
        <textarea id={`${id}-message`} name="message" required rows={3} className={fieldClass} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-2 font-semibold text-on-accent hover:brightness-110"
        >
          Send the raven
        </button>
        <p className="text-sm text-muted">{contact.formNote}</p>
      </div>
      <p role="status" className="text-sm text-ink">
        {sent
          ? "The raven is away. Your email app should open with the message ready; if it doesn't, write to me at the address above."
          : ""}
      </p>
    </form>
  );
}
