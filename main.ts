#!/usr/bin/env -S deno run --allow-run --allow-read

const DEFAULT_MODEL = "deepseek-coder:33b";

const PROMPT_TEMPLATE = `You are an expert software engineer.
Given the following git diff and the initial intent for a commit message,
generate a concise, clear, lowercase, less than 81 words and descriptive commit message in present tense.

Take into account that the commit message should be a "Semantic commit message".

Diff:
{diff}

Intent:
{intent}

Commit message:`;

// Parse CLI arguments: --model <name> --intent "..."
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
  console.error("Error: --intent is required (initial commit message intent)");
  Deno.exit(1);
}

async function getDiff(): Promise<string> {
  const proc = Deno.run({ cmd: ["git", "diff"], stdout: "piped" });
  const output = await proc.output();
  await proc.status();
  return new TextDecoder().decode(output);
}

async function enhance() {
  const diff = await getDiff();
  const prompt = PROMPT_TEMPLATE.replace("{diff}", diff).replace(
    "{intent}",
    intent,
  );

  const p = Deno.run({
    cmd: ["ollama", "run", model, prompt],
    stdout: "piped",
    stdin: "null",
  });

  const raw = await p.output();
  const status = await p.status();
  if (!status.success) {
    console.error("Ollama process failed");
    Deno.exit(status.code);
  }

  const message = new TextDecoder().decode(raw).trim();

  try {
    const pb = Deno.run({ cmd: ["pbcopy"], stdin: "piped" });
    const encoder = new TextEncoder();
    await pb.stdin.write(encoder.encode(message));
    pb.stdin.close();
    const pbStatus = await pb.status();
    if (pbStatus.success) {
      console.log("✅ Commit message copied to clipboard via pbcopy:");
    } else {
      console.error("pbcopy failed with code", pbStatus.code);
      console.log(message);
    }
  } catch (e) {
    console.error("Failed to launch pbcopy:", e);
    console.log(message);
  }
}

enhance();
