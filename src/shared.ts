import * as core from "@actions/core";
import * as https from "https";

interface Observation {
  time: number;
  series: string;
  measure: string;
  value: number;
}

export async function upload(obs: Observation) {
  const { time, series, measure, value } = obs;

  core.info(`Series ${series}`);
  const data = JSON.stringify({
    dataSet: `github.com/${process.env.GITHUB_REPOSITORY!}`,
    lineage: process.env.GITHUB_REF!.replace("refs/heads/", ""),
    series,
    measure,
    time,
    version: process.env.GITHUB_SHA!,
    value,
  });

  const options = {
    hostname: "api.niquis.im",
    port: 443,
    path: "/ingress",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
      Authorization: `token ${process.env.NIQUIS_TOKEN}`,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.on("data", (d) => {
        core.info(d);
        resolve();
      });
    });

    req.on("error", (error) => {
      core.debug(error.message);
      reject(new Error(error.message));
    });

    req.write(data);
    req.end();
  });
}
