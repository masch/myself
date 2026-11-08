# Expo Upgrade Under the Release-Age Window

Let `make expo-upgrade` install what the release-age window allows instead of losing the whole batch to one too-new package, and let the weekly dependency job carry that partial result into a pull request.

## Specs

- **S1** — When one requested package sits inside the `--minimum-release-age` window, the packages the window allows must still be installed. Today `bun add` is handed the whole batch, so one blocked member fails every member.
- **S2** — A blocked package must be identified by its **name**, taken from the quoted token bun prints after `found for specifier`, never from the first quoted token, which carries the requested version. A scoped package keeps its scope, and a dependency blocked but not requested must still reach the diagnostics.
- **S3** — "Some packages were held back, everything else is installed" must be distinguishable from an installation failure by the process exit status. A local `make expo-upgrade` keeps reporting the wait with a non-zero status; a genuine `bun add` failure keeps propagating its own status.
- **S4** — `scripts/ci-weekly-deps.sh` must commit and open its pull request when only the release-age window held packages back, naming them in the pull-request body, and must still abort on any other non-zero status.
- **S5** — Versions written to `apps/mobile/package.json` keep the range operator Expo prints (`~57.0.32`), not an exact pin. `DAYS=0` opts out of the wait and the `make expo-upgrade` help text documents it.
- **S6** — The widened behaviour is proven deterministically: blocked-name extraction over the message bun actually prints (plain, scoped, rangeless, ANSI-prefixed), the exclusion of the blocked specifier from the retry set, and both exit-status paths of the weekly caller.

## Tasks

- [x] **T1** (S1, S5) Rewrite `scripts/expo-upgrade.sh` around a single `bun_add()` helper, `is_blocked()` / `blocked_names()`, a per-package retry of the remaining specifiers, `~` range preservation and `DAYS=0`. — `89e74dc`
- [x] **T2** (S2, S6) Fix `blocked_names()` to read the specifier and strip its range, keeping a scoped package intact and dropping the `^error: ` anchor that an ANSI prefix defeats. — `738975c`
- [x] **T3** (S3, S6) Replace the bare `exit 1` on the held-back path with `HELD_BACK_EXIT=3`. — `738975c`
- [x] **T4** (S4, S6) Make `scripts/ci-weekly-deps.sh` tolerate status 3, capture the held-back names from its stderr and add them to the pull-request body. — `738975c`
- [x] **T5** (S6) This document, and the verification record below.

## Log

- **L1** — The user asked to open an issue and a pull request for the recovered `scripts/expo-upgrade.sh` fix.
- **L2** — The user asked to review CodeRabbit's findings. Both were checked against the code: the exit-status one is a real defect, the `blocked_names` one was plausible but unproven at that point.
- **L3** — The user asked to verify the first finding. Bun 1.3.14 compiles the message `No version matching "" found for specifier "" (blocked by minimum-release-age: N seconds)`, so the first quoted token is the version. The original `blocked_names()` therefore collected ranges, `REMAINING` equalled `SPECS` and the retry re-sent the identical batch.
- **L4** — The user approved fixing both findings.

## Evidence & Verification

- The command that failed and the reason: `make check-odd-doc` measured this branch at 170 authored lines against `origin/main` with no ODD document, which is what this file answers. The documented `ODD_DOC_SKIP=1` escape hatch was **not** used.
- Blocked-name extraction, run against the message template taken from the bun 1.3.14 binary:
  - `expo-camera@~57.0.32` → `expo-camera`
  - `@expo/foo@~1.2.3` → `@expo/foo`
  - `expo-camera` (no range) → `expo-camera`
  - the same line wrapped in ANSI escapes → `expo-camera`
  - before the fix the same input produced `~57.0.32`.
- The retry set with `SPECS="expo-camera@~57.0.32 expo-av@~16.0.10"` and `expo-camera` blocked becomes ` expo-av@~16.0.10`, so the blocked specifier is no longer re-sent.
- The weekly caller was driven end to end against a stub in a scratch git repository: status 3 reaches the "held back" report and exits 0, status 1 aborts with 1.
- `bash -n` is clean on both scripts, and the pre-commit `check-format-staged` and `check-affected` hooks pass.
- **Not verified**: a live `bun add` against a package genuinely inside the window, which needs network and mutates installed dependencies, and `shellcheck`, which is neither installed in the development environment nor run by this repository's CI.

- **Completion & Delivery**: Complete on branch `chore/expo-upgrade-minimum-release-age`, tracking issue #140 and pull request #141, in three work-unit commits: the recovered script and Makefile help (`89e74dc`), the two review findings (`738975c`), and this document. Deliberately not delivered here: the merge, which still needs the repository's approval comment, and any claim that the script survives a live `bun add` — no run against a real blocked package was made.
