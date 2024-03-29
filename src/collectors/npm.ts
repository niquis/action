import * as fs from "fs";
import * as path from "path";
import * as t from "io-ts";

export type Config = t.TypeOf<typeof Config>;
export const Config = t.type({
  type: t.literal("npm"),
  directory: t.union([t.undefined, t.string]),
});

export default async function* (c: Config) {
  const { directory = "." } = c;
  const workspace = process.env.GITHUB_WORKSPACE!;

  const packageLockPath = path.join(workspace, directory, "package-lock.json");
  if (fs.existsSync(packageLockPath)) {
    const { dependencies } = JSON.parse(fs.readFileSync(packageLockPath, "utf8"));
    const value = (function count(deps: any): number {
      const values = Object.values(deps);
      return values.reduce<number>((a, v: any): number => a + count(v.dependencies || {}), values.length);
    })(dependencies);

    yield { series: "dependencies", measure: "count", value };
  }
}
