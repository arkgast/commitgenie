import { parse } from "@std/toml";
import { join } from "@std/path";

const CONFIG_PATH = join(
  Deno.env.get("HOME") || "",
  ".config",
  "commitgenie",
  "config.toml",
);

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
