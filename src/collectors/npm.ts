import * as fs from "fs";
import * as path from "path";

export default async function* () {
  const workspace = process.env.GITHUB_WORKSPACE!;

  if (fs.existsSync(path.join(workspace, "package-lock.json"))) {
    const { dependencies } = require(path.join(workspace, "package-lock.json"));
    const value = (function count(deps: any): number {
      const values = Object.values(deps);
      return values.reduce<number>(
        (a, v: any): number => a + count(v.dependencies || {}),
        values.length
      );
    })(dependencies);

    yield { series: "dependencies", measure: "count", value };
  }
}
