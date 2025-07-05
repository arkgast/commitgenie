#!/usr/bin/env -S deno run --allow-run --allow-read

const DEFAULT_MODEL = "deepseek-coder:33b";

const PROMPT_TEMPLATE = `You are an expert software engineer.
Given the following git diff and the initial intent for a commit message,
generate a concise, clear, lowercase, less than 81 words and descriptive commit message in present tense.

Take into account that the commit message must be a "Semantic commit message".

Diff:
{diff}

Intent:
{intent}

Commit message:`;

/**
 */
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
  if (!intent) {
    console.error(
      "Error: --intent is required (initial commit message intent)",
    );
    Deno.exit(1);
  }
  return { model, intent };
}

async function getDiff(): Promise<string> {
  const proc = Deno.run({ cmd: ["git", "diff"], stdout: "piped" });
  const raw = await proc.output();
  await proc.status();
  return new TextDecoder().decode(raw);
}

function buildPrompt(diff: string, intent: string): string {
  return PROMPT_TEMPLATE.replace("{diff}", diff).replace("{intent}", intent);
}

async function runOllama(model: string, prompt: string): Promise<string> {
  const proc = Deno.run({
    cmd: ["ollama", "run", model, prompt],
    stdout: "piped",
    stderr: "inherit",
  });
  const raw = await proc.output();
  const status = await proc.status();
  if (!status.success) {
    console.error("Ollama process failed with code", status.code);
    Deno.exit(status.code);
  }
  return new TextDecoder().decode(raw).trim();
}

async function copyToClipboard(text: string): Promise<void> {
  const proc = Deno.run({ cmd: ["pbcopy"], stdin: "piped" });
  const encoder = new TextEncoder();
  await proc.stdin.write(encoder.encode(text));
  proc.stdin.close();
  const status = await proc.status();
  if (status.success) {
    console.log("✅ Commit message copied to clipboard via pbcopy:");
  } else {
    console.error("pbcopy failed with code", status.code);
    console.log(text);
  }
}

async function main() {
  const { model, intent } = parseArgs();
  const diff = await getDiff();
  const prompt = buildPrompt(diff, intent);
  const message = await runOllama(model, prompt);
  await copyToClipboard(message);
}

main();
