#!/usr/bin/env bash
# Static analysis for the shell scripts and the git hooks.
#
# Requires shellcheck on PATH. It is not installed on every development machine
# here, and this script deliberately does not install it, download it or run it
# through a container: it reports what is missing and exits.
#
# `--severity=warning` is the gate: errors and warnings fail, notes do not.
# `-x` follows the `source` directives so `expo-upgrade-lib.sh` is analysed
# through the script that uses it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

if ! command -v shellcheck >/dev/null 2>&1; then
	echo "shellcheck is not installed, so the shell scripts are not verified." >&2
	echo "On Fedora Silverblue: rpm-ostree install ShellCheck, then reboot." >&2
	exit 1
fi

exec shellcheck -x --severity=warning scripts/*.sh .githooks/pre-commit .githooks/pre-push
