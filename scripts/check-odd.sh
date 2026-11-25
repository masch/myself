#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ODD_DIR="${ROOT}/odd/tasks"

if [ ! -d "${ODD_DIR}" ]; then
	echo "No odd/tasks directory found. Skipping check."
	exit 0
fi

FAILED=0

# A document that declares itself open is legitimate while its work is in
# progress, including across intermediate commits on a feature branch. Only a
# top-level declaration in the document header counts: a quoted example or a
# pasted log inside a fenced block, or an indented line, must not waive the gate
# for the whole document.
declares_open() {
	local file="$1"
	local line=""
	local line_lc=""
	local fence=''
	local cand=''
	local count=0

	while IFS= read -r line; do
		count=$((count + 1))
		if [ "${count}" -gt 20 ]; then
			break
		fi
		case "${line}" in
			'```'* | '~~~'*)
				cand="${line:0:1}"
				if [ -z "${fence}" ]; then
					fence="${cand}"
				elif [ "${cand}" = "${fence}" ]; then
					fence=''
				fi
				continue
				;;
		esac
		if [ -n "${fence}" ]; then
			continue
		fi
		line_lc="${line,,}"
		line_lc="${line_lc%"${line_lc##*[![:space:]]}"}"
		if [ "${line_lc}" = "- **status**: open" ]; then
			return 0
		fi
	done <"$file"

	return 1
}

echo "Verifying ODD task documents in odd/tasks/..."

for file in "${ODD_DIR}"/*.md; do
	[ -e "$file" ] || continue
	filename="$(basename "$file")"
	file_errors=0

	if declares_open "$file"; then
		echo "  ⏳ ${filename} declares 'Status: open'"
		continue
	fi

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
echo "✓ All ODD task documents are completed and closed (documents declaring 'Status: open' are respected)."
exit 0
