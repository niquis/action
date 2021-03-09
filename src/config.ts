import * as t from "io-ts";

const collectors = {
  ["next.js"]: t.type({
    type: t.literal("next.js"),
    directory: t.union([t.undefined, t.string]),
  }),
  ["npm"]: t.type({
    type: t.literal("npm"),
    directory: t.union([t.undefined, t.string]),
  }),
};

export type Config = t.TypeOf<typeof Config>;
export const Config = t.type({
  version: t.literal("v0"),
  collect: t.array(t.union([collectors["next.js"], collectors["npm"]])),
});
