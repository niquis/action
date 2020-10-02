import { info, setFailed } from "@actions/core";
import { context } from "@actions/github";
import { comment } from "./comment";
import * as plugins from "./plugins";
import { combine, upload } from "./shared";

async function main(): Promise<void> {
  const time = Date.now() / 1000;

  try {
    for await (const obs of combine(plugins.npm(), plugins.next())) {
      await upload({ time, ...obs });
    }

    info(context.eventName);
    if (context.eventName === "pull_request") {
      await comment(context.payload.pull_request!);
    }
  } catch (error) {
    setFailed(error.message);
  }
}

main();
