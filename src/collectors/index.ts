import { default as next } from "./next.js";
import { default as npm } from "./npm";

export const collectors = {
  ["next.js"]: next,
  ["npm"]: npm,
} as const;
