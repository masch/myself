#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE="${ROOT}/apps/mobile"
APP_VERSION_NAME="${APP_VERSION_NAME:-}"
DRY_RUN="${DRY_RUN:-}"

if [ -t 0 ] && [ -z "${DAYS:-}" ]; then
	read -r -p "Minimum release age in days (0 = immediate, default 4): " DAYS
fi
DAYS="${DAYS:-4}"
MIN_AGE_SECONDS=$(( DAYS * 86400 ))

# Exit status meaning "the release-age window held some packages back, and every
# other package is installed". Distinct from 1 so a caller like the weekly
# dependency job can carry the partial upgrade forward instead of discarding it.
HELD_BACK_EXIT=3

BUN_ADD_ARGS=(--minimum-release-age "${MIN_AGE_SECONDS}")
[ -n "${DRY_RUN}" ] && BUN_ADD_ARGS+=(--dry-run)

# `expo install --check` exits non-zero when versions are outdated, which is the
# normal case here, so its exit status never decides the outcome. Only the parsed
# output does.
expo_check() {
	(cd "${MOBILE}" && APP_VERSION_NAME="${APP_VERSION_NAME}" bun run expo install --check 2>&1) || true
}

# Keep the range operator Expo prints (`~57.0.32`), not a pinned exact version.
parse_recommended() {
	sed -n 's/^  \([^ ]*\)@[^ ]* - expected version: \([^ ]*\)$/\1@\2/p'
}

bun_add() {
	(cd "${MOBILE}" && bun add "${BUN_ADD_ARGS[@]}" "$@")
}

is_blocked() {
	printf '%s\n' "$1" | grep -qE 'blocked by minimum-release-age'
}

# The released specifier is the second quoted token bun prints
# (`… found for specifier "expo-camera@~57.0.32" …`); the first one is the
# version the request asked for, so taking it would collect ranges instead of
# package names. The `@range` suffix is stripped from the end, which keeps the
# scope of a package like `@expo/foo`.
blocked_names() {
	local spec
	printf '%s\n' "$1" |
		sed -n 's/.*found for specifier "\([^"]*\)".*blocked by minimum-release-age.*/\1/p' |
		while IFS= read -r spec; do
			printf '%s\n' "${spec%@*}"
		done |
		sort -u
}

echo "Checking recommended versions..."
OUTPUT="$(expo_check)"
PACKAGES="$(printf '%s\n' "${OUTPUT}" | parse_recommended)"

if printf '%s\n' "${OUTPUT}" | grep -qE 'ERR_MODULE_NOT_FOUND|command not found'; then
	echo "Dependencies are not installed. Restoring them from the lockfile..."
	(cd "${MOBILE}" && bun install)
	echo "Re-checking recommended versions..."
	OUTPUT="$(expo_check)"
	PACKAGES="$(printf '%s\n' "${OUTPUT}" | parse_recommended)"
fi

if [ -z "${PACKAGES}" ]; then
	if printf '%s\n' "${OUTPUT}" | grep -qE 'should be updated|Found outdated dependencies'; then
		echo "Expo reports outdated packages, but their recommended versions could not be parsed." >&2
		printf '%s\n' "${OUTPUT}" >&2
		exit 1
	fi
	if printf '%s\n' "${OUTPUT}" | grep -qE '^error|ERR_'; then
		echo "Could not read the recommended versions from expo:" >&2
		printf '%s\n' "${OUTPUT}" >&2
		exit 1
	fi
	echo "All Expo packages up to date!"
	exit 0
fi

# shellcheck disable=SC2086 # package specs are space-separated by design
SPECS=${PACKAGES}

echo "Upgrading: ${SPECS}"
RC=0
RESULT="$(bun_add ${SPECS} 2>&1)" || RC=$?
printf '%s\n' "${RESULT}"

if [ "${RC}" -ne 0 ]; then
	if ! is_blocked "${RESULT}"; then
		echo "Upgrade failed. Nothing else to try." >&2
		exit "${RC}"
	fi

	BLOCKED="$(blocked_names "${RESULT}")"
	BLOCKED_LOOKUP=" $(printf '%s' "${BLOCKED}" | tr '\n' ' ') "
	echo "Published less than ${DAYS} day(s) ago, so held back by the release-age policy:"
	printf '%s\n' "${BLOCKED}" | sed 's/^/  - /'

	REMAINING=""
	for spec in ${SPECS}; do
		case "${BLOCKED_LOOKUP}" in
			*" ${spec%@*} "*) continue ;;
		esac
		REMAINING="${REMAINING} ${spec}"
	done

	if [ -n "${REMAINING}" ]; then
		echo "Upgrading the rest:${REMAINING}"
		# shellcheck disable=SC2086
		RC=0
		RESULT="$(bun_add ${REMAINING} 2>&1)" || RC=$?
		printf '%s\n' "${RESULT}"
		[ "${RC}" -ne 0 ] && exit "${RC}"
	fi

	echo "Held back: $(printf '%s\n' "${BLOCKED}" | tr '\n' ' ')" >&2
	echo "These are newer than the ${DAYS} day release-age window. Re-run with" >&2
	echo "DAYS=0 when you are ready to take them now." >&2
	exit "${HELD_BACK_EXIT}"
fi

echo "Done."
