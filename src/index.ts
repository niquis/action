import { info, setFailed } from "@actions/core";
import { context } from "@actions/github";
import { comment } from "./comment";
import { collectors } from "./collectors";
import { combine, upload } from "./shared";
import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";
import { either, pipeable } from "fp-ts";
import { Config } from "./config";

async function loadConfig(): Promise<undefined | Config> {
  const workspace = process.env.GITHUB_WORKSPACE!;
  const configPath = path.join(workspace, ".github", "niquis.yml");

  if (!fs.existsSync(configPath)) {
    info("Config file not found.");
    return undefined;
  }

  return pipeable.pipe(
    Config.decode(YAML.parse(fs.readFileSync(configPath, "utf-8"))),
    either.getOrElseW(() => {
      info("Could not decode config file.");
      return undefined;
    })
  );
}

async function main(): Promise<void> {
  const time = Date.now() / 1000;

  /*
   * Load the config file. If it doesn't exist then bail.
   */
  const config = await loadConfig();
  if (!config) {
    return;
  }

  try {
    const iterables = config.collect.flatMap((spec) => {
      if (spec.type in collectors) {
        const { Config, default: collect } = collectors[spec.type as keyof typeof collectors];

        return pipeable.pipe(
          Config.decode(spec),
          either.fold<unknown, any, AsyncGenerator<any>[]>(
            () => [],
            (config) => [collect(config)]
          )
        );
      } else {
        return [];
      }
    });

    for await (const obs of combine(...iterables)) {
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
