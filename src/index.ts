import { info, setFailed } from "@actions/core";
import { context } from "@actions/github";
import { comment } from "./comment";
import * as plugins from "./plugins";

async function run(): Promise<void> {
  const time = Date.now() / 1000;

  try {
    plugins.next({ time });
    plugins.npm({ time });

    info(context.eventName);
    if (context.eventName === "pull_request") {
      await comment(context.payload.pull_request!);
    }
  } catch (error) {
    setFailed(error.message);
  }
}

run();
