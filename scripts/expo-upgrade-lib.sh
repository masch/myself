#!/usr/bin/env bash
# Parsers for scripts/expo-upgrade.sh.
#
# They live apart from the command that uses them because reading what
# `expo install --check` and `bun add` print is the brittle part of this
# upgrade: it depends on the exact wording of another program. Keeping them here
# lets scripts/check-expo-upgrade.sh exercise them directly, instead of the
# wording only ever being tested by a hand run against a real release-age block.
#
# Every function is pure: it reads its arguments, writes to stdout and never
# touches the repository.

# `bun add` refusing a request because a version is newer than the window.
is_blocked() {
	printf '%s\n' "$1" | grep -qE 'blocked by minimum-release-age'
}

# The packages the window blocked, by name, one per line.
#
# bun prints:
#   error: No version matching "<version>" found for specifier "<name@range>"
#   (blocked by minimum-release-age: N seconds)
#
# The first quoted token is the version the request asked for, so taking it
# would collect ranges instead of packages. The range is cut from the end, which
# keeps the scope of a package like `@expo/foo`.
blocked_names() {
	local spec
	printf '%s\n' "$1" |
		sed -n 's/.*found for specifier "\([^"]*\)".*blocked by minimum-release-age.*/\1/p' |
		while IFS= read -r spec; do
			printf '%s\n' "${spec%@*}"
		done |
		sort -u
}

# The package a specifier asks for, without its range.
spec_name() {
	printf '%s\n' "${1%@*}"
}

# The specifiers whose package name is absent from a newline-separated name list.
without_names() {
	local specs="$1" names="$2" spec lookup
	lookup=" $(printf '%s' "${names}" | tr '\n' ' ') "
	for spec in ${specs}; do
		case "${lookup}" in
			*" ${spec%@*} "*) continue ;;
		esac
		printf '%s\n' "${spec}"
	done
}

# The package names from a specifier list that appear in a name list, one per line.
with_names() {
	local specs="$1" names="$2" spec lookup
	lookup=" $(printf '%s' "${names}" | tr '\n' ' ') "
	for spec in ${specs}; do
		case "${lookup}" in
			*" ${spec%@*} "*) spec_name "${spec}" ;;
		esac
	done
}

# `expo install --check` prints `  <name>@<current> - expected version: <version>`.
#
# The expected version keeps whatever range operator Expo printed (`~57.0.32`),
# because pinning an exact version is what this script exists to avoid.
parse_recommended() {
	sed -n 's/^  \([^ ]*\)@[^ ]* - expected version: \([^ ]*\)$/\1@\2/p'
}
