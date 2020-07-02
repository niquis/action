import * as path from "path";
import * as fs from "fs";
import { upload } from "../shared";

export default async ({ time }: any) => {
  const workspace = process.env.GITHUB_WORKSPACE!;

  const series = "dependencies";

  if (fs.existsSync(path.join(workspace, "package-lock.json"))) {
    const { dependencies } = require(path.join(workspace, "package-lock.json"));
    const value = (function count(deps: any): number {
      const values = Object.values(deps) as any[];
      return values.reduce<number>(
        (a, v): number => a + count(v.dependencies || {}),
        values.length
      );
    })(dependencies);

    await upload({ time, series, measure: "count", value });
  }
};
