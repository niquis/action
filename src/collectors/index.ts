import * as next from "./next.js";
import * as npm from "./npm";
import * as sloc from "./sloc";

export const collectors = {
  ["next.js"]: next,
  ["npm"]: npm,
  ["sloc"]: sloc,
};
