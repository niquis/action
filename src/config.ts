import * as t from "io-ts";
import { collectors } from "./collectors";

export type Config = t.TypeOf<typeof Config>;
export const Config = t.type({
  version: t.literal("v0"),
  collect: t.array(t.union([collectors["next.js"].Config, collectors["npm"].Config, collectors["sloc"].Config])),
});
