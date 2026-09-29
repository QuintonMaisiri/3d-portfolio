/** Marks copy that still needs real content. Rendered with a visible highlight. */
export const todo = (what: string) => `[TODO: ${what}]`;

export const isTodo = (text: string) => text.startsWith("[TODO");
