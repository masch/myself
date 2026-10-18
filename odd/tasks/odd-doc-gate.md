# ODD Document Gate

Fail the local checks and the pull-request workflow when a change is large enough to need an ODD task document but touches none, so the discipline stops depending on memory.

## Specs

- **S1** — A change whose authored diff exceeds **150** lines must add or modify at least one document under `odd/tasks/`, or the gate fails with a message that names the measured size and says what to create.
- **S2** — The measurement counts added plus removed lines of code. It ignores Markdown, lockfiles, build output and `node_modules`, and it never counts the ODD documents themselves as code.
- **S3** — The gate runs in three places: `make check`, the `pre-push` hook, and the pull-request CI workflow. All three use the same script, so there is one definition of the rule.
- **S4** — The gate fails open. When the base revision cannot be resolved (detached head, shallow clone, unknown branch) it prints that it skipped and exits successfully, because a gate that blocks without measuring is worse than no gate.
- **S5** — There is one documented escape hatch, `ODD_DOC_SKIP=1`, which prints that it was skipped. A legitimate exemption is stated in the pull request; the gate is not to be bypassed with `--no-verify`.
- **S6** — `shellcheck` reports no findings on the script, and the behaviour is proven against controlled git states: a large change without a document fails, the same change with one passes, a small change passes, and an unresolvable base passes.

## Tasks

- [x] **T1** (S1, S2, S4, S5) `scripts/check-odd-doc.sh` in the style of `scripts/check-odd.sh`: resolve the base from `ODD_DOC_BASE` (default `origin/main`), measure `git diff --numstat` against the merge base, apply the 150-line threshold from `ODD_DOC_THRESHOLD`, honour `ODD_DOC_SKIP`, and fail open when the base is missing.
- [x] **T2** (S3) Wire it into the `Makefile` as `check-odd-doc` and make `check` depend on it, into `.githooks/pre-push` after the existing ODD check, and as a step in `.github/workflows/ci.yml` for pull requests using the PR base SHA.
- [x] **T3** (S6) Prove the behaviour against controlled git states and run `shellcheck` on the script.
- [x] **T4** Quality gates and evidence.

## Log

- **L1** — The user asked whether the design-token validation could be added after noticing that four follow-up units (#96, #98, #99, #90) shipped without an ODD document because `make check-odd` only verifies that existing documents are closed, never that a large change carries one.
- **L2** — Decisions, verbatim: threshold **150 líneas**, and the gate runs in **CI + pre-push + make check**.

## Evidence & Verification

- The five controlled git states behave as specified: a 160-line change without a document fails with exit 1 and a message naming the count and the path to create; the same change with an `odd/tasks/*.md` document passes; a 5-line change passes; an unknown base skips with exit 0; `ODD_DOC_SKIP=1` skips with exit 0.
- The exclusion rules hold in a second fixture set: 200 Markdown lines count zero, `dist/`, `node_modules/` and lockfiles count zero, a NUL-byte binary is excluded, and a nested `apps/mobile/node_modules/` path counts zero.
- `make check-odd-doc` reports the measured line count in the worktree, and `make -n check` shows `check` now depends on it.
- `make check-format check-lint check-types check-tests`: shared 89, api 106, mobile 503 pass, 0 failures; format, lint and typecheck clean.
- Not verified: `shellcheck` is not installed on this machine, so the script was checked with `bash -n` and `sh -n` only. The findings-free claim rests on review, not on the tool, and that is a real gap until someone runs it where shellcheck exists.
- **Completion & Delivery**: all four tasks implemented and verified on branch `chore/odd-doc-gate`. Push, pull request and merge remain the user's decision.
