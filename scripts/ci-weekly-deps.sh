#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Checking and updating Expo dependencies with 4-day release age..."
DAYS=4 "${ROOT}/scripts/expo-upgrade.sh"

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
	gh pr create \
		--base main \
		--head "${BRANCH}" \
		--title "chore(deps): weekly expo dependencies update ($(date +%Y-%m-%d))" \
		--body "Automated weekly Expo dependency update executed by CI via \`make ci-weekly-deps\`."
else
	echo "No Expo dependency updates required. Everything is up to date."
fi
