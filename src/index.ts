import { info, setFailed } from "@actions/core";
import { context } from "@actions/github";
import { comment } from "./comment";
import * as plugins from "./plugins";

async function main(): Promise<void> {
  const time = Date.now() / 1000;
  const env = { time };

  try {
    await plugins.next(env);
    await plugins.npm(env);

    info(context.eventName);
    if (context.eventName === "pull_request") {
      await comment(context.payload.pull_request!);
    }
  } catch (error) {
    setFailed(error.message);
  }
}

main();
