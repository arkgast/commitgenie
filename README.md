# CommitGenie

**CommitGenie** is an AI-powered CLI that crafts Conventional Commit-style messages from your staged Git diffs using Ollama, with an interactive flow to commit or retry.

---

## 🚀 Installation

Install globally with built-in permissions:

```bash
deno install -g --allow-run=git,ollama jsr:@arkgast/commitgenie
```

## 🛠️ Usage

### Basic usage

```bash
commitgenie --intent "fix login redirect"
```

This will:

* Analyze your staged diff.
* Generate a Conventional Commit-style message (e.g. fix: correct login redirect logic).
* Prompt to commit, retry, or abort.

### With custom Ollama model

```bash
commitgenie --model llama2-13b --intent "add validation for email"
```

## ⚙️ How it works

1. Reads git diff --staged.
2. Sends diff + intent to Ollama.
3. Generates a commit message following Conventional Commits.
4. Shows an interactive prompt:
    * commit: runs git commit -m "<message>"
    * retry: generates a new message

## Recommendations

To make your workflow even smoother, add these handy aliases to your ~/.zshrc (or ~/.bashrc) file:

```bash
# Generate a commit message for staged changes
alias gcm='commitgenie --intent --'

# Amend the last commit with a new message
alias gca='commitgenie --amend --intent --'
```

After adding the aliases, reload your shell configuration:

```bash
source ~/.zshrc
```

Now you can commit like a pro:

```bash
$ gcm "add scope validation for authorization"
```

Or amend your last commit with:

```bash
$ gca "fix typo in error message"
```

> These aliases keep your commands short while still launching the interactive AI-assisted commit flow.
