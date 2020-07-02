import * as core from "@actions/core";
import * as github from "@actions/github";
import { format } from "d3-format";
import fetch from "node-fetch";
import * as plugins from "./plugins";

async function run(): Promise<void> {
  const time = Date.now() / 1000;

  try {
    const context = github.context;
    // core.info(context.eventName);
    // core.info(JSON.stringify(context.payload));

    plugins.next({ time });
    plugins.npm({ time });

    core.info(context.eventName);
    if (context.eventName === "pull_request") {
      const { pull_request } = context.payload;

      const base = pull_request!.base.sha;
      const head = process.env.GITHUB_SHA;

      // core.info(JSON.stringify({ base, head, GITHUB_SHA: process.env.GITHUB_SHA });

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

      const octokit = github.getOctokit(process.env.GITHUB_TOKEN!);
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

    const sign = { [-1]: "", [0]: "", [1]: "+" }[Math.sign(pct) as -1 | 0 | 1];
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

const fmt = format(".0f");
function bytesToString(bytes: number) {
  if (bytes < 1024) {
    return fmt(bytes) + "";
  } else if (bytes < 1024 * 1024) {
    return fmt(bytes / 1024) + "k";
  } else if (bytes < 1024 * 1024 * 1024) {
    return fmt(bytes / 1024 / 1024) + "M";
  } else {
    return fmt(bytes / 1024 / 1024 / 1024) + "G";
  }
}
