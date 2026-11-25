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
# progress, including across intermediate commits on a feature branch (S19).
#
# Only a top-level declaration in the document header counts. The header ends at
# the first `## ` section heading, so a `## Log` entry quoting the marker cannot
# waive the gate for the whole document, and no line-count heuristic is used.
#
# Fenced blocks are skipped with CommonMark's fence rules: a fence line may be
# indented by up to three spaces, and it only closes on the same character, at a
# length at least equal to the opener, with nothing but whitespace after it. Any
# other fence-looking line stays inside the open fence.
FENCE_RE='^ {0,3}(`{3,}|~{3,})(.*)$'
FENCE_TAIL_RE='^[[:space:]]*$'

declares_open() {
	local file="$1"
	local line=""
	local line_lc=""
	local fence_char=''
	local fence_len=0
	local seq=''
	local rest=''
	local cand=''
	local len=0

	while IFS= read -r line; do
		# The declaration must live in the document header.
		case "${line}" in
			'## '*) break ;;
		esac

		if [[ "${line}" =~ ${FENCE_RE} ]]; then
			seq="${BASH_REMATCH[1]}"
			rest="${BASH_REMATCH[2]}"
			cand="${seq:0:1}"
			len="${#seq}"
			if [ -z "${fence_char}" ]; then
				fence_char="${cand}"
				fence_len="${len}"
			elif [ "${cand}" = "${fence_char}" ] &&
				[ "${len}" -ge "${fence_len}" ] &&
				[[ "${rest}" =~ ${FENCE_TAIL_RE} ]]; then
				fence_char=''
				fence_len=0
			fi
			continue
		fi

		if [ -n "${fence_char}" ]; then
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
