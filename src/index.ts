import * as core from "@actions/core";
import * as https from "https";
import * as fs from "fs";
import * as path from "path";

async function run(): Promise<void> {
  const time = Date.now() / 1000;

  try {
    const workspace = process.env.GITHUB_WORKSPACE!;
    const { pages } = require(path.join(
      workspace,
      ".next/build-manifest.json"
    ));

    for (const k in pages) {
      const files: any[] = pages[k];
      const value = files.reduce(
        (a, f) => a + fs.statSync(path.join(workspace, ".next", f)).size,
        0
      );
      upload({ time, series: `pages${k}`, value });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

function upload({ time, series, value }: any) {
  const data = JSON.stringify({
    dataSet: `github.com/${process.env.GITHUB_REPOSITORY}`,
    series,
    version: process.env.GITHUB_SHA,
    measure: "size",
    time,
    value,
  });

  const options = {
    hostname: "europe-west3-endless-empire-169618.cloudfunctions.net",
    port: 443,
    path: "/ingress",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };

  const req = https.request(options, (res) => {
    res.on("data", (d) => {
      core.info(d);
    });
  });

  req.on("error", (error) => {
    core.debug(error.message);
  });

  req.write(data);
  req.end();
}
