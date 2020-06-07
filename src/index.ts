import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import * as https from "https";
import fetch from "node-fetch";
import * as fg from "fast-glob";
import { format } from "d3-format";

async function run(): Promise<void> {
  const time = Date.now() / 1000;

  try {
    const context = github.context;
    // core.info(context.eventName);
    // core.info(JSON.stringify(context.payload));

    const octokit = new github.GitHub(process.env.GITHUB_TOKEN!);

    const workspace = process.env.GITHUB_WORKSPACE!;
    const entries = await fg(`.next/static/*/pages/**/*.js`, {
      cwd: workspace,
    });
    for (const page of entries) {
      const value = fs.statSync(page).size;
      const series = page.match(/(pages\/.*)\.js$/)![1];
      upload({ time, series, value });
    }

    core.info(context.eventName);
    if (context.eventName === "pull_request") {
      const { pull_request } = context.payload;

      const base = pull_request!.base.sha;
      const head = process.env.GITHUB_SHA;

      core.info(
        JSON.stringify({ base, head, GITHUB_SHA: process.env.GITHUB_SHA })
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const res = await fetch("https://api.niquis.im/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
          query comparisonQuery($dataSet: String!, $base: String!, $head: String!) {
            comparison(dataSet: $dataSet, base: $base, head: $head) {
              observations {
                id
                series {
                  name
                }
                measure {
                  name
                }
                value
                diff {
                  base {
                    value
                  }
                  absolute
                  relative
                }
              }
            }
          }
        `,
          variables: {
            dataSet: `github.com/${process.env.GITHUB_REPOSITORY!}`,
            base,
            head,
          },
        }),
      }).then((res) => res.json());

      core.info(JSON.stringify(res));

      await octokit.issues.createComment({
        owner: context.payload.repository!.owner.login,
        repo: context.payload.repository!.name,
        issue_number: pull_request!.number,
        body: `
# Comparison

${res.data.comparison.observations
  .map((obs: any) => {
    const abs = bytesToString(obs.diff.absolute);
    const pct = Math.round(obs.diff.relative * 10) / 10;

    const sign = { [-1]: "-", [0]: "", [1]: "+" }[Math.sign(pct) as -1 | 0 | 1];
    return ` - **${obs.series.name}**: ${sign}${abs} (${sign}${pct}%)`;
  })
  .join("\n")}
`,
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

function upload({ time, series, value }: any) {
  core.info(`Series ${series}`);
  const data = JSON.stringify({
    dataSet: `github.com/${process.env.GITHUB_REPOSITORY!}`,
    lineage: process.env.GITHUB_REF!.replace("refs/heads/", ""),
    series,
    measure: "size",
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

const fmt = format(".0f");
function bytesToString(bytes: number) {
  if (bytes < 1024) {
    return fmt(bytes) + "B";
  } else if (bytes < 1024 * 1024) {
    return fmt(bytes / 1024) + "kB";
  } else if (bytes < 1024 * 1024 * 1024) {
    return fmt(bytes / 1024 / 1024) + "MB";
  } else {
    return fmt(bytes / 1024 / 1024 / 1024) + "GB";
  }
}
