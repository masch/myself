#!/usr/bin/env bash
# Static analysis for the shell scripts and the git hooks.
#
# Runs with whatever `shellcheck` is on PATH and falls back to the upstream
# container when it is missing, because shellcheck is not installed on every
# development machine here. GitHub's ubuntu runners ship it, so CI takes the
# first branch and the container is only a local convenience.
#
# `--severity=warning` is the gate: errors and warnings fail, notes do not.
# `-x` follows the `source` directives so `expo-upgrade-lib.sh` is analysed
# through the script that uses it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

TARGETS=(scripts/*.sh .githooks/pre-commit .githooks/pre-push)
ARGS=(-x --severity=warning)
IMAGE="docker.io/koalaman/shellcheck:v0.11.0"

if command -v shellcheck >/dev/null 2>&1; then
	exec shellcheck "${ARGS[@]}" "${TARGETS[@]}"
fi

if command -v podman >/dev/null 2>&1; then
	echo "shellcheck is not on PATH; running ${IMAGE} through podman." >&2
	exec podman run --rm \
		--security-opt label=disable \
		-v "${ROOT}:/mnt:ro" \
		-w /mnt \
		"${IMAGE}" "${ARGS[@]}" "${TARGETS[@]}"
fi

echo "shellcheck is not installed and podman is unavailable." >&2
echo "Install shellcheck, or install podman to run the upstream container." >&2
exit 1
