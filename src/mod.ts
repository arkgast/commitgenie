#!/usr/bin/env -S deno run --allow-run --allow-read

import { Select } from "@cliffy/prompt";
import { initDefaultConfig, loadConfig, parseArgs } from "./config.ts";

async function getDiff(): Promise<string> {
  const proc = new Deno.Command("git", {
    args: ["diff", "--staged"],
    stdout: "piped",
  });
  const { stdout } = await proc.output();
  return new TextDecoder().decode(stdout);
}

function buildPrompt(
  promptTemplate: string,
  diff: string,
  intent: string,
): string {
  return promptTemplate.replace("{diff}", diff).replace("{intent}", intent);
}

async function runOllama(model: string, prompt: string): Promise<string> {
  const proc = new Deno.Command("ollama", {
    args: ["run", model, prompt, "--think=false"],
    stdout: "piped",
    stderr: "inherit",
  });
  const { code, stdout } = await proc.output();
  if (code !== 0) {
    console.error("Ollama process failed with code", code);
    Deno.exit(code);
  }
  return new TextDecoder().decode(stdout).trim();
}

async function interactiveCommitFlow(
  model: string,
  promptText: string,
  amend: boolean,
) {
  while (true) {
    const message = await runOllama(model, promptText);
    console.log(`\n💡 Generated commit message:\n${message}\n`);
    const action = await Select.prompt({
      message: "What would you like to do?",
      search: true,
      options: ["commit", "retry"],
    });

    if (action === "commit") {
      console.log(`\nExecuting: git commit -m "${message}"\n`);
      const commitFlag = amend ? "-am" : "-m";
      const proc = new Deno.Command("git", {
        args: ["commit", commitFlag, message],
        stdout: "inherit",
        stderr: "inherit",
      });
      const { code } = await proc.output();
      if (code !== 0) {
        console.error("git commit failed with code", code);
        Deno.exit(code);
      }
      break;
    } else if (action === "retry") {
      console.log("Regenerating commit message...");
      continue;
    }
  }
}

async function main() {
  if (Deno.args.includes("--init")) {
    await initDefaultConfig();
    Deno.exit(0);
  }

  const config = await loadConfig();
  const { model, promptTemplate, intent, amend } = parseArgs(config);
  const diff = await getDiff();
  const prompt = buildPrompt(promptTemplate, diff, intent);
  await interactiveCommitFlow(model, prompt, amend);
}

main();
