"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
async function run() {
    try {
        const ms = core.getInput("milliseconds");
        core.debug(`Waiting ${ms} milliseconds ...`);
        core.debug(new Date().toTimeString());
        core.debug(new Date().toTimeString());
        core.setOutput("time", new Date().toTimeString());
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
