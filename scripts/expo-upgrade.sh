#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
MOBILE="${ROOT}/apps/mobile"
APP_VERSION_NAME="${APP_VERSION_NAME:-}"

read -r -p "Minimum release age in days (0 = immediate, default 4): " DAYS
DAYS="${DAYS:-4}"
SECONDS=$(( DAYS * 86400 ))

echo "Checking recommended versions..."
OUTPUT=$(cd "${MOBILE}" && APP_VERSION_NAME="${APP_VERSION_NAME}" bun run expo install --check 2>&1 || true)
PACKAGES=$(echo "${OUTPUT}" | sed -n 's/  \([^ ]*\)@[^ ]* - expected version: ~\?\([^ ]*\)/\1@\2/p')

if [ -n "${PACKAGES}" ]; then
	echo "Upgrading: ${PACKAGES}"
	cd "${MOBILE}" && bun add --minimum-release-age "${SECONDS}" ${PACKAGES}
elif echo "${OUTPUT}" | grep -qE 'ERR_MODULE_NOT_FOUND|command not found'; then
	echo "Packages not installed. Installing from package.json specs..."
	PKGSPECS=$(node -e "const p=require('${ROOT}/apps/mobile/package.json').dependencies; \
		['@expo/ui','expo','expo-font','expo-router'] \
		.forEach(d=>p[d]&&process.stdout.write(d+'@'+p[d]+' '))")
	echo "Installing: ${PKGSPECS}"
	cd "${MOBILE}" && bun add --minimum-release-age "${SECONDS}" ${PKGSPECS}
	echo "Re-checking recommended versions..."
	PACKAGES=$(cd "${MOBILE}" && APP_VERSION_NAME="${APP_VERSION_NAME}" bun run expo install --check 2>&1 | \
		sed -n 's/  \([^ ]*\)@[^ ]* - expected version: ~\?\([^ ]*\)/\1@\2/p')
	if [ -n "${PACKAGES}" ]; then
		echo "Upgrading: ${PACKAGES}"
		cd "${MOBILE}" && bun add --minimum-release-age "${SECONDS}" ${PACKAGES}
	else
		echo "All Expo packages up to date!"
	fi
else
	echo "All Expo packages up to date!"
fi
