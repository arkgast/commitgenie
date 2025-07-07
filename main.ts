#!/usr/bin/env -S deno run --allow-run --allow-read

import { Select } from "@cliffy/prompt";

const DEFAULT_MODEL = "deepseek-coder:33b";

const PROMPT_TEMPLATE = `You are an expert software engineer and commit message specialist.

Your task is to write a concise, lowercase, present-tense commit message based on:
1. A provided git diff
2. An explicit intent that describes the purpose of the change

Guidelines:
- Use the "Conventional Commits" format with types like: feat, fix, refactor, docs, style, chore, test, perf, ci, build.
- Make the message informative but no longer than 81 characters.
- Avoid capital letters, ending periods, or unnecessary words.

Examples:
- feat: add user authentication hook
- fix: correct null pointer dereference in user parser
- refactor: extract response builder into utility module

Diff:
{diff}

Intent:
{intent}

Commit message:`;

function parseArgs(): { model: string; intent: string } {
  const args = new Map<string, string>();
  for (let i = 0; i < Deno.args.length; i++) {
    if (Deno.args[i].startsWith("--")) {
      const key = Deno.args[i].substring(2);
      const val = Deno.args[i + 1];
      args.set(key, val);
      i++;
    }
  }
  const model = args.get("model") || DEFAULT_MODEL;
  const intent = args.get("intent") || "";
  const amendStr = args.get("amend");
  const amend = amendStr && amendStr.toLowerCase() === "true";

  if (!intent) {
    console.error(
      "Error: --intent is required (initial commit message intent)",
    );
    Deno.exit(1);
  }
  return { model, intent, amend };
}

async function getDiff(): Promise<string> {
  const proc = new Deno.Command("git", {
    args: ["diff", "--staged"],
    stdout: "piped",
  });
  const { stdout } = await proc.output();
  return new TextDecoder().decode(stdout);
}

function buildPrompt(diff: string, intent: string): string {
  return PROMPT_TEMPLATE.replace("{diff}", diff).replace("{intent}", intent);
}

async function runOllama(model: string, prompt: string): Promise<string> {
  const proc = new Deno.Command("ollama", {
    args: ["run", model, prompt],
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

async function interactiveCommitFlow(model: string, promptText: string) {
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
      const proc = new Deno.Command("git", {
        args: ["git", "commit", "-m", message],
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
  const { model, intent, amend } = parseArgs();
  const diff = await getDiff();
  const prompt = buildPrompt(diff, intent);
  await interactiveCommitFlow(model, prompt);
}

main();
