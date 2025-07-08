import { parse } from "@std/toml";
import { dirname, join } from "@std/path";

const homeDir = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE");
if (!homeDir) {
  console.error(
    "Error: Could not determine the user's home directory. Please ensure the $HOME (or %USERPROFILE% on Windows) environment variable is set.",
  );
  Deno.exit(1);
}

const CONFIG_PATH = join(homeDir, ".config", "commitgenie", "config.toml");

export async function initDefaultConfig(): Promise<void> {
  const configDir = dirname(CONFIG_PATH);
  await Deno.mkdir(configDir, { recursive: true });

  const defaultToml = `
model = "qwen3:1.7b"

prompt_template = """
You are an expert software engineer and commit message specialist.

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

Commit message:
"""
`.trim();

  await Deno.writeTextFile(CONFIG_PATH, defaultToml);

  console.log(`✅ Default config file created at ${CONFIG_PATH}`);
}

export async function loadConfig(): Promise<Record<string, unknown>> {
  try {
    const configText = await Deno.readTextFile(CONFIG_PATH);
    return parse(configText);
  } catch {
    return {}; // fallback if config doesn't exist
  }
}

export function parseArgs(config: Record<string, unknown>): {
  model: string;
  promptTemplate: string;
  intent: string;
  amend: boolean;
} {
  const args = new Map<string, string>();
  for (let i = 0; i < Deno.args.length; i++) {
    if (Deno.args[i].startsWith("--")) {
      const key = Deno.args[i].substring(2);
      const val = Deno.args[i + 1];
      args.set(key, val);
      i++;
    }
  }

  const model = args.get("model") || (config.model as string);
  const promptTemplate = config.prompt_template as string;
  const intent = args.get("intent");
  const amend = args.get("amend")?.toLowerCase() === "true";

  if (!intent) {
    console.error(
      "Error: --intent is required (initial commit message intent)",
    );
    Deno.exit(1);
  }

  return { model, promptTemplate, intent, amend };
}
