import * as fg from "fast-glob";
import * as fs from "fs";
import * as t from "io-ts";
import * as path from "path";

export type Config = t.TypeOf<typeof Config>;
export const Config = t.type({
  type: t.literal("next.js"),
  directory: t.union([t.undefined, t.string]),
});

export default async function* (c: Config) {
  const { directory = "." } = c;
  const cwd = path.join(process.env.GITHUB_WORKSPACE!, directory);

  /*
   * Pages
   */
  {
    const entries = await fg(`.next/static/*/pages/**/*.js`, {
      cwd,
    });

    for (const page of entries) {
      const value = (await fs.promises.stat(page)).size;
      const series = page.match(/(pages\/.*)\.js$/)![1].slice(0, -21);
      yield { series, measure: "size", value };
    }
  }

  /*
   * Chunks
   */
  {
    const entries = await fg(`.next/static/chunks/*.js`, {
      cwd,
    });

    for (const page of entries) {
      if (page.match(/(framework|main|polyfills|webpack)/)) {
        const value = (await fs.promises.stat(page)).size;
        const series = page.match(/(chunks\/.*)\.js$/)![1].slice(0, -21);
        yield { series, measure: "size", value };
      }
    }
  }
}
