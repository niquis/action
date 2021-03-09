import { info, setFailed } from "@actions/core";
import { context } from "@actions/github";
import { comment } from "./comment";
import * as plugins from "./plugins";
import { combine, upload } from "./shared";
import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";
import { either, pipeable } from "fp-ts";
import { Config } from "./config";

async function main(): Promise<void> {
  const time = Date.now() / 1000;

  /*
   * Load the config from .github/niquis.yml. If the config file doesn't
   * exist, bail.
   */
  const config = await (async (): Promise<undefined | Config> => {
    const workspace = process.env.GITHUB_WORKSPACE!;
    const configPath = path.join(workspace, ".github", "niquis.yml");

    if (!fs.existsSync(configPath)) {
      info("Config file not found.");
      return undefined;
    }

    return pipeable.pipe(
      Config.decode(YAML.parse(fs.readFileSync(configPath, "utf-8"))),
      either.fold<unknown, Config, undefined | Config>(
        () => {
          info("Could not decode config file.");
          return undefined;
        },
        (config) => {
          return config;
        }
      )
    );
  })();

  if (!config) {
    return;
  }

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
