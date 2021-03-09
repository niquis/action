import { info } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { WebhookPayload } from "@actions/github/lib/interfaces";
import { format } from "d3-format";
import fetch from "node-fetch";

export async function comment(pr: NonNullable<WebhookPayload["pull_request"]>): Promise<void> {
  const base = pr!.base.sha;
  const head = process.env.GITHUB_SHA;

  const dataSet = `github.com/${process.env.GITHUB_REPOSITORY!}`;

  /*
   * Wait a bit to allow the DB to reach eventual consistency.
   */
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
      variables: { dataSet, base, head },
    }),
  }).then((res) => res.json());

  info(JSON.stringify(res));

  const octokit = getOctokit(process.env.GITHUB_TOKEN!);
  await octokit.issues.createComment({
    owner: context.payload.repository!.owner.login,
    repo: context.payload.repository!.name,
    issue_number: pr.number,
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
