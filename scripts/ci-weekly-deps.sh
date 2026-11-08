#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$(mktemp)"
trap 'rm -f "${LOG}"' EXIT

echo "Checking and updating Expo dependencies with 4-day release age..."
RC=0
DAYS=4 "${ROOT}/scripts/expo-upgrade.sh" 2>"${LOG}" || RC=$?
cat "${LOG}" >&2

# 3 means the release-age window held packages back while every other package
# was installed. Those updates belong in the PR, so only a real failure stops
# this job.
if [ "${RC}" -ne 0 ] && [ "${RC}" -ne 3 ]; then
	exit "${RC}"
fi

HELD_BACK=""
if [ "${RC}" -eq 3 ]; then
	HELD_BACK="$(sed -n 's/^  - //p' "${LOG}" | tr '\n' ' ' | sed 's/ *$//')"
fi

if [ -n "$(git status --porcelain "${ROOT}/apps/mobile/package.json" "${ROOT}/bun.lock")" ]; then
	echo "Detected updated dependencies."

	# Check if an open weekly dependency update PR already exists
	EXISTING_PR="$(gh pr list --search "chore(deps): weekly expo dependencies update in:title" --state open --json number --jq '.[0].number // empty' 2>/dev/null || true)"
	if [ -n "${EXISTING_PR}" ]; then
		echo "An open weekly dependency update PR already exists (#${EXISTING_PR}). Skipping creation."
		exit 0
	fi

	echo "Preparing branch and committing updates..."
	BRANCH="chore/weekly-expo-deps-$(date +%Y%m%d-%H%M%S)"
	git config user.name "$(git config --get user.name 2>/dev/null || echo 'github-actions[bot]')"
	git config user.email "$(git config --get user.email 2>/dev/null || echo '41898282+github-actions[bot]@users.noreply.github.com')"
	git checkout -B "${BRANCH}"
	git add "${ROOT}/apps/mobile/package.json" "${ROOT}/bun.lock"
	git commit -m "chore(deps): align expo dependencies with SDK recommendations"
	git push -u origin "${BRANCH}"

	echo "Creating pull request..."
	BODY="Automated weekly Expo dependency update executed by CI via \`make ci-weekly-deps\`."
	if [ -n "${HELD_BACK}" ]; then
		BODY="${BODY}

Held back by the 4-day release-age window, so this update does not carry them: ${HELD_BACK}"
	fi

	gh pr create \
		--base main \
		--head "${BRANCH}" \
		--title "chore(deps): weekly expo dependencies update ($(date +%Y-%m-%d))" \
		--body "${BODY}"
else
	if [ -n "${HELD_BACK}" ]; then
		echo "No installable updates right now. Held back by the release-age window: ${HELD_BACK}"
	else
		echo "No Expo dependency updates required. Everything is up to date."
	fi
fi
