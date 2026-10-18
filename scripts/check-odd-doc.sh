#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

BASE="${ODD_DOC_BASE:-origin/main}"
THRESHOLD="${ODD_DOC_THRESHOLD:-150}"

if [ "${ODD_DOC_SKIP:-0}" = "1" ]; then
	echo "✓ ODD document gate skipped (ODD_DOC_SKIP=1). State the exemption in the pull request."
	exit 0
fi

if ! git rev-parse --verify --quiet "${BASE}" >/dev/null; then
	echo "✓ ODD document gate skipped: base '${BASE}' is unknown (detached head, shallow clone or missing branch)."
	exit 0
fi

echo "Verifying that a change above ${THRESHOLD} authored lines carries an ODD task document..."

TOTAL=0
TOUCHES_DOC=0

while IFS=$'\t' read -r added removed path; do
	[ -n "${path:-}" ] || continue

	# The ODD documents themselves are the requirement, never part of the measurement.
	case "${path}" in
		odd/tasks/*.md)
			TOUCHES_DOC=1
			continue
			;;
	esac

	# Documents, lockfiles, build output and installed dependencies are not authored code.
	case "${path}" in
		*.md | *.lock | bun.lock | package-lock.json | dist/* | .expo/* | node_modules/* | */node_modules/*)
			continue
			;;
	esac

	# Binary entries print '-' instead of a line count.
	[ "${added}" != "-" ] || continue

	TOTAL=$((TOTAL + added + removed))
done < <(git diff --numstat "${BASE}"...HEAD)

if [ "${TOTAL}" -lt "${THRESHOLD}" ]; then
	echo "✓ ODD document gate passed: ${TOTAL} authored lines is below the ${THRESHOLD}-line threshold."
	exit 0
fi

if [ "${TOUCHES_DOC}" -eq 1 ]; then
	echo "✓ ODD document gate passed: ${TOTAL} authored lines with an odd/tasks document in the change."
	exit 0
fi

echo ""
echo "❌ ODD document gate failed: this change is ${TOTAL} authored lines (threshold ${THRESHOLD}) and touches no ODD task document."
echo ""
echo "Create one at:"
echo ""
echo "  odd/tasks/<feature-name>.md"
echo ""
echo "with the headings '## Specs', '## Tasks' and '## Log'."
echo ""
echo "If this change genuinely does not need a document, state the exemption in the pull"
echo "request and re-run with ODD_DOC_SKIP=1."
exit 1
