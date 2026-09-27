#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ODD_DIR="${ROOT}/odd/tasks"

if [ ! -d "${ODD_DIR}" ]; then
	echo "No odd/tasks directory found. Skipping check."
	exit 0
fi

FAILED=0

echo "Verifying ODD task documents in odd/tasks/..."

for file in "${ODD_DIR}"/*.md; do
	[ -e "$file" ] || continue
	filename="$(basename "$file")"
	file_errors=0

	# 1. Check for pending tasks (- [ ])
	if grep -En "^[[:space:]]*- \[ \]" "$file" >/dev/null 2>&1; then
		echo "::error file=odd/tasks/${filename}::${filename} has pending uncompleted tasks:"
		grep -En "^[[:space:]]*- \[ \]" "$file" | while read -r line; do
			echo "  line ${line}"
		done
		file_errors=1
	fi

	# 2. Check for Completion & Delivery tag
	if ! grep -Eq "^[[:space:]]*-[[:space:]]*\*\*Completion & Delivery\*\*:" "$file"; then
		echo "::error file=odd/tasks/${filename}::${filename} is missing required '- **Completion & Delivery**:' section"
		file_errors=1
	fi

	if [ "$file_errors" -eq 1 ]; then
		FAILED=1
	else
		echo "  ✓ ${filename} is completed and closed"
	fi
done

if [ "$FAILED" -ne 0 ]; then
	echo ""
	echo "❌ ODD validation failed: one or more task documents in odd/tasks/ are open or missing completion delivery."
	exit 1
fi

echo ""
echo "✓ All ODD task documents are completed and closed."
exit 0
