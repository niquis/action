import * as fg from "fast-glob";
import * as fs from "fs";
import { upload } from "../shared";

export default async ({ time }: any) => {
  /*
   * Pages
   */
  await (async () => {
    const entries = await fg(`.next/static/*/pages/**/*.js`, {
      cwd: process.env.GITHUB_WORKSPACE,
    });

    for (const page of entries) {
      const value = fs.statSync(page).size;
      const series = page.match(/(pages\/.*)\.js$/)![1].slice(0, -21);
      await upload({ time, series, measure: "size", value });
    }
  })();

  /*
   * Chunks
   */
  await (async () => {
    const entries = await fg(`.next/static/chunks/*.js`, {
      cwd: process.env.GITHUB_WORKSPACE,
    });

    for (const page of entries) {
      if (page.match(/(framework|main|polyfills|webpack)/)) {
        const value = fs.statSync(page).size;
        const series = page.match(/(chunks\/.*)\.js$/)![1].slice(0, -21);
        await upload({ time, series, measure: "size", value });
      }
    }
  })();
};
