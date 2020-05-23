import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import * as https from "https";
import fetch from "node-fetch";
import * as path from "path";
import * as glob from 'glob';

async function run(): Promise<void> {
  const time = Date.now() / 1000;

  try {
    const context = github.context;
    // core.info(context.eventName);
    // core.info(JSON.stringify(context.payload));

    const octokit = new github.GitHub(process.env.GITHUB_TOKEN!);

    const workspace = process.env.GITHUB_WORKSPACE!;
    core.info(workspace);
    core.info(`${workspace}/.next/static/*/pages/**/*.js`);

    const entries = glob.sync(`${workspace}/.next/static/*/pages/**/*.js`);
    core.info(JSON.stringify(entries));
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
    const d = Math.round(obs.diff.relative * 10) / 10;
    return ` - **${obs.series.name}**: ${d}%`;
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
    series,
    version: process.env.GITHUB_SHA!,
    measure: "size",
    time,
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
