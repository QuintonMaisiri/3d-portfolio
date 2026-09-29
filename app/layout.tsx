import type { Metadata, Viewport } from "next";
import { Cinzel, Inter } from "next/font/google";
import { profile } from "@/content/profile";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: profile.name, url: profile.links.github }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#0b0c10",
};

/** Structured data so search engines understand who this site is about. */
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: profile.role,
  description: profile.headline,
  worksFor: { "@type": "Organization", name: profile.organisation.name },
  address: { "@type": "PostalAddress", addressLocality: "Harare", addressCountry: "ZW" },
  email: `mailto:${profile.links.email}`,
  url: SITE_URL,
  sameAs: [profile.links.github, profile.links.linkedin],
  alumniOf: { "@type": "CollegeOrUniversity", name: "University of Zimbabwe" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Before first paint: lets CSS switch journey panels to their JS layout (see globals.css). */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-black"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
