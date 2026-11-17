#!/usr/bin/env bash
# Builds the auto-heal agent's prompt: the instructions, the Jest failure log, the
# source files the log points at, and the PR diff that introduced the failure.
# Usage: auto-heal-context.sh <test-results.log> <base-branch> <output-file>
set -euo pipefail

log_file="$1"
base_ref="$2"
out_file="$3"
repo_root="$(git rev-parse --show-toplevel)"

{
  cat "$repo_root/.github/prompts/auto-heal.md"

  echo
  echo '## Jest failure log (test-results.log)'
  echo
  echo '```text'
  # Jest colours its output in some environments; the agent needs plain text.
  sed -E 's/\x1B\[[0-9;]*[A-Za-z]//g' "$log_file" | tail -n 400
  echo '```'

  echo
  echo '## Source files referenced by the failure log'
  echo
  grep -oE 'src/[A-Za-z0-9_./-]+\.ts' "$log_file" | sort -u | sed 's/^/- campushub-backend\//' || true

  # Full current contents of the non-test source files this PR changed, so the agent
  # sees each suspect file whole, not only the diff hunks.
  echo
  echo '## Source files changed by this PR (current contents)'
  git -C "$repo_root" diff --name-only "origin/${base_ref}...HEAD" -- \
    'Lab/lab8/campushub-backend/src/*.ts' |
    grep -vE '/__tests__/|/src/test/' |
    while read -r file; do
      [ -f "$repo_root/$file" ] || continue
      echo
      echo "### ${file#Lab/lab8/}"
      echo
      echo '```ts'
      cat "$repo_root/$file"
      echo '```'
    done

  echo
  echo "## PR diff against origin/${base_ref} (Lab/lab8)"
  echo
  echo '```diff'
  git -C "$repo_root" diff "origin/${base_ref}...HEAD" -- Lab/lab8 ':(exclude)*package-lock.json'
  echo '```'
} > "$out_file"

echo "Wrote $(wc -c < "$out_file") bytes of agent context to $out_file"
