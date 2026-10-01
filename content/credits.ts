/**
 * Third-party assets. CC-BY entries must be credited wherever the site is
 * shared (shown in the page view's footer and the Codex); CC0 entries are
 * credited as thanks.
 */
export interface Credit {
  title: string;
  author: string;
  url: string;
  license: "CC-BY-4.0" | "CC0" | "Pixabay";
}

export const credits: Credit[] = [
  { title: "Black Ox Beetle", author: "naviogutierrezdavid", url: "https://sketchfab.com/3d-models/black-ox-beetle-77257801e7d84521b61d84d18ba90076", license: "CC-BY-4.0" },
  { title: "Dung beetle", author: "HeavenlyGnochi", url: "https://sketchfab.com/3d-models/dung-beetle-befebbdf23ba475aa3ebc8f08d90f219", license: "CC-BY-4.0" },
  { title: "FREE Simple Opening Book", author: "Cécile Amstad", url: "https://sketchfab.com/3d-models/free-simple-opening-book-334ac25cb42f484bae059b920aed0e4f", license: "CC-BY-4.0" },
  { title: "Raven", author: "David Clowes", url: "https://sketchfab.com/3d-models/raven-60155d61e6904e87b899a96c4c106792", license: "CC-BY-4.0" },
  { title: "Nature, props, village, ruins, dungeon and survival packs", author: "Quaternius", url: "https://quaternius.com", license: "CC0" },
  { title: "Resource Bits", author: "Kay Lousberg", url: "https://www.kaylousberg.com", license: "CC0" },
  { title: "Ambient music", author: "leberch", url: "https://pixabay.com", license: "Pixabay" },
  { title: "Paper, leather and carpet textures", author: "ambientCG", url: "https://ambientcg.com", license: "CC0" },
];
