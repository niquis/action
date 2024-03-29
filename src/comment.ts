import { context, getOctokit } from "@actions/github";
import { WebhookPayload } from "@actions/github/lib/interfaces";
import { format } from "d3-format";
import fetch from "node-fetch";
import { array, ord } from "fp-ts";
import * as base58 from "./base58";

export async function comment(pr: NonNullable<WebhookPayload["pull_request"]>): Promise<void> {
  const base = pr.base.sha;
  const head = pr.head.sha;

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
  }).then((res) => res.json() as any);

  // info(JSON.stringify(res));

  const octokit = getOctokit(process.env.GITHUB_TOKEN!);

  const comments = await octokit.rest.issues.listComments({
    owner: context.payload.repository!.owner.login,
    repo: context.payload.repository!.name,
    issue_number: pr.number,
  });

  // info(JSON.stringify(comments));

  const body = makeCommentBody(dataSet, base, head, res.data.comparison.observations);

  const comment = comments.data.find((x) => x.user?.login === "github-actions[bot]");

  try {
    if (!comment) {
      await octokit.rest.issues.createComment({
        owner: context.payload.repository!.owner.login,
        repo: context.payload.repository!.name,
        issue_number: pr.number,
        body,
      });
    } else {
      await octokit.rest.issues.updateComment({
        owner: context.payload.repository!.owner.login,
        repo: context.payload.repository!.name,
        comment_id: comment.id,
        body,
      });
    }
  } catch {
    /*
     * Creating or updating the comment may fail if the provided GITHUB_TOKEN
     * doesn't have write permissions to the repository (such as when the workflow
     * is run from a forked repo, or triggered by dependabot).
     */
  }
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

function makeCommentBody(dataSet: string, base: string, head: string, observations: any[]): string {
  /*
   * Sort observations by relative difference (descending)
   */
  const ordByRelativeDiff = ord.getDualOrd(ord.contramap<number, any>((obs) => obs.diff.relative)(ord.ordNumber));
  const sortedObservations = array.sortBy([ordByRelativeDiff])(observations);

  return `
**👋 Hi there!** Here are details how metrics have changed (either increased or decreased). Metrics for which there is no difference between baseline and this pull request are omitted. 

| series | base | value | diff | % |
| ------ | ---- | ----- | ---- | - |
${sortedObservations
  .filter((obs) => Math.abs(obs.diff.absolute) > 0)
  .map((obs) => {
    const abs = bytesToString(obs.diff.absolute);
    const pct = Math.round(obs.diff.relative * 10) / 10;

    const sign = { [-1]: "", [0]: "", [1]: "+" }[Math.sign(pct) as -1 | 0 | 1];
    return `| ${obs.series.name} | ${bytesToString(obs.diff.base.value)} | ${bytesToString(
      obs.value
    )} | ${sign}${abs} | ${sign}${pct}% |`;
  })
  .join("\n")}

A detailed report is available [here](https://app.niquis.im/ds/${base58.encode(dataSet)}/compare/${base}..${head}).
`;
}
