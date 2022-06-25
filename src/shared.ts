import * as core from "@actions/core";
import * as https from "https";

interface Observation {
  time: number;
  series: string;
  measure: string;
  lineage: string;
  version: string;
  value: number;
}

/**
 * Upload one observation to via the /ingress API into the database.
 */
export async function upload(obs: Observation) {
  const { time, series, measure, lineage, version, value } = obs;

  if (series.trim() === "") {
    core.warning(`upload: skipping empty series (${JSON.stringify(obs)})`);
    return;
  }

  core.info(`upload: series ${series}, measure ${measure}, value ${value}`);

  const data = JSON.stringify({
    dataSet: `github.com/${process.env.GITHUB_REPOSITORY!}`,
    lineage,
    series,
    measure,
    time,
    version,
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
    core.setFailed("upload");
  });

  req.write(data);
  req.end();
}

export async function* combine<T>(...iterable: AsyncIterable<T>[]) {
  const asyncIterators = iterable.map((o) => o[Symbol.asyncIterator]());
  let count = asyncIterators.length;

  const never = new Promise<never>(() => {});
  const results = [];

  async function getNext(asyncIterator: AsyncIterator<T>, index: number) {
    return { index, result: await asyncIterator.next() };
  }

  const nextPromises = asyncIterators.map(getNext);
  try {
    while (count) {
      const { index, result } = await Promise.race(nextPromises);
      if (result.done) {
        nextPromises[index] = never;
        results[index] = result.value;
        count--;
      } else {
        nextPromises[index] = getNext(asyncIterators[index], index);
        yield result.value;
      }
    }
  } finally {
    for (const [index, iterator] of asyncIterators.entries())
      if (nextPromises[index] != never && iterator.return != null) {
        iterator.return();
      }
    // no await here - see https://github.com/tc39/proposal-async-iteration/issues/126
  }

  return results;
}
