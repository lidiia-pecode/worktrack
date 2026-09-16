---
description: Write the PR body for the current branch into .pr-body.md
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(git merge-base:*), Write
---

# /pr — write the PR body for this branch

Fills the two sections of `.github/pull_request_template.md` and saves the
result to `.pr-body.md`. The user copies it into the GitHub PR form and opens
the PR themselves.

## 1. Read the branch

```bash
git rev-parse --abbrev-ref HEAD
git status --short
BASE=$(git merge-base origin/main HEAD)
git log --format='%s%n%b' "$BASE"..HEAD
git diff --stat "$BASE"
git diff "$BASE"
```

All read-only. Compare against the merge base, never against `origin/main`
itself: on a branch that is behind, everything `main` gained since would show up
as if this branch had deleted it. Nothing is fetched here, so if `origin/main`
looks stale, say so and let the user run `git fetch` themselves.

**The diff is the source of truth, not the commit list.** A branch that was
squash-merged, or one carrying fixup commits, lists commits whose content is no
longer part of the change. The diff includes uncommitted work in tracked files;
check `git status --short` for untracked files that belong to the change and
describe those too.

## 2. Write the two sections

Keep it very short. The reviewer opens the diff for detail; the body only says
what this is and why it was worth doing.

**## What changed** — one to three short sentences. What the change does, not how
it is built. Never a list of commits; GitHub already shows those.

**## Why** — one to two short sentences. The problem it solves.

What to leave out, because the pull will always be to add more:

- anything already obvious from the diff;
- how a command or tool works internally, unless the change is about that;
- remarks on GitHub, `gh`, attribution or other safeguards, unless the change is
  about them;
- corporate register, padding, and bullet lists standing in for sentences.

Write the finished body to `.pr-body.md` in the repository root, overwriting it.
That file is already ignored by the `*.md` rule in `.gitignore`.

## 3. Report back

In the reply, print:

- a suggested PR title as a Conventional Commit line, using the same prefix as
  the branch name;
- the branch and the commit range the body came from, so it is obvious whether
  `.pr-body.md` is current.

## Never

- run `gh`, or create, edit or otherwise touch a PR;
- commit, push, stage, checkout or change Git state in any way;
- add a `Co-Authored-By` trailer or a "Generated with Claude Code" footer.
