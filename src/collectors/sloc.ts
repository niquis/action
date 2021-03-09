import * as fg from "fast-glob";
import * as fs from "fs";
import * as t from "io-ts";
import * as path from "path";

const sloc = require("node-sloc");

export type Config = t.TypeOf<typeof Config>;
export const Config = t.type({
  type: t.literal("sloc"),
  directory: t.union([t.undefined, t.string]),
  extensions: t.union([t.undefined, t.array(t.string)]),
});

export default async function* (c: Config) {
  const { directory = ".", extensions = ["js", "jsx", "ts", "tsx"] } = c;

  const res = await sloc({
    path: path.join(process.env.GITHUB_WORKSPACE!, directory),
    extensions,
  });

  for (const [measure, value] of Object.entries(res.sloc)) {
    yield { series: "sloc", measure, value };
  }
}
