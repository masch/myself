#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=./expo-upgrade-lib.sh
. "${ROOT}/scripts/expo-upgrade-lib.sh"
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

bun_add() {
	(cd "${MOBILE}" && bun add "${BUN_ADD_ARGS[@]}" "$@")
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

# Each round re-sends only the packages the window has not blocked yet, so a
# batch holding several too-new packages still installs the rest instead of
# losing the whole set to the first one bun refuses.
ALL_BLOCKED=""
ANY_BLOCKED=0
PENDING="${SPECS}"

while [ -n "${PENDING// /}" ]; do
	# shellcheck disable=SC2086 # package specs are space-separated by design
	RC=0
	RESULT="$(bun_add ${PENDING} 2>&1)" || RC=$?
	printf '%s\n' "${RESULT}"

	[ "${RC}" -eq 0 ] && break

	if ! is_blocked "${RESULT}"; then
		echo "Upgrade failed. Nothing else to try." >&2
		exit "${RC}"
	fi

	ROUND_BLOCKED="$(blocked_names "${RESULT}")"
	NEW_BLOCKED="$(with_names "${PENDING}" "${ROUND_BLOCKED}")"

	# A blocked message this run cannot attribute to a requested package is a
	# real failure, never a held-back success: exiting 3 here would tell the
	# weekly job to carry forward an upgrade that never happened.
	if [ -z "${NEW_BLOCKED}" ]; then
		echo "The release-age policy refused this upgrade, but the blocked package could not be matched to a requested one:" >&2
		printf '%s\n' "${ROUND_BLOCKED}" >&2
		exit "${RC}"
	fi

	ALL_BLOCKED="${ALL_BLOCKED}${NEW_BLOCKED}"$'\n'
	ANY_BLOCKED=1
	PENDING="$(without_names "${PENDING}" "${NEW_BLOCKED}" | tr '\n' ' ')"
done

if [ "${ANY_BLOCKED}" -eq 1 ]; then
	# The whole report goes to stderr: it is the only stream the weekly caller
	# captures, and it is how the caller names the packages it left out.
	{
		echo "Published less than ${DAYS} day(s) ago, so held back by the release-age policy:"
		printf '%s\n' "${ALL_BLOCKED}" | sed '/^[[:space:]]*$/d; s/^/  - /'
		echo "These are newer than the ${DAYS} day release-age window. Re-run with"
		echo "DAYS=0 when you are ready to take them now."
	} >&2
	exit "${HELD_BACK_EXIT}"
fi

echo "Done."
