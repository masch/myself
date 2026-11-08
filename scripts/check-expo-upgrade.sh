#!/usr/bin/env bash
# Deterministic checks for the Expo upgrade parsers and exit contract.
#
# The upgrade script reads the wording of two other programs, and it now tells
# its caller "the release-age window held packages back" with a dedicated exit
# status. A silent regression in either turns a real failure into a carried
# forward upgrade, so both are pinned here instead of being verified by a hand
# run against a live release-age block.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source-path=SCRIPTDIR
# shellcheck source=./expo-upgrade-lib.sh
. "${ROOT}/scripts/expo-upgrade-lib.sh"

FAILED=0

# assert_eq <label> <expected> <actual>
assert_eq() {
	local label="$1" expected="$2" actual="$3"
	if [ "${expected}" = "${actual}" ]; then
		printf '  ok   %s\n' "${label}"
		return 0
	fi
	printf '  FAIL %s\n    expected: [%s]\n    actual:   [%s]\n' "${label}" "${expected}" "${actual}"
	FAILED=1
}

# The message bun 1.3.14 prints. The first quoted token is the version the
# request asked for; the package is the specifier after it.
BLOCKED_CAMERA='error: No version matching "~57.0.32" found for specifier "expo-camera@~57.0.32" (blocked by minimum-release-age: 345600 seconds)'
BLOCKED_AV='error: No version matching "~16.0.10" found for specifier "expo-av@~16.0.10" (blocked by minimum-release-age: 345600 seconds)'

echo "is_blocked"
if is_blocked "${BLOCKED_CAMERA}"; then
	assert_eq "recognises the release-age refusal" "yes" "yes"
else
	assert_eq "recognises the release-age refusal" "yes" "no"
fi
if is_blocked "error: No version matching \"1.0.0\" found for specifier \"left-pad@1.0.0\""; then
	assert_eq "ignores an unrelated failure" "no" "yes"
else
	assert_eq "ignores an unrelated failure" "no" "no"
fi

echo "blocked_names"
assert_eq "plain package" "expo-camera" "$(blocked_names "${BLOCKED_CAMERA}")"
assert_eq "scoped package keeps its scope" "@expo/foo" \
	"$(blocked_names 'error: No version matching "~1.2.3" found for specifier "@expo/foo@~1.2.3" (blocked by minimum-release-age: 1 seconds)')"
assert_eq "specifier without a range" "expo-camera" \
	"$(blocked_names 'error: No version matching "1.2.3" found for specifier "expo-camera" (blocked by minimum-release-age: 1 seconds)')"
assert_eq "line wrapped in ANSI escapes" "expo-camera" \
	"$(blocked_names $'\e[31merror: No version matching "~57.0.32" found for specifier "expo-camera@~57.0.32" (blocked by minimum-release-age: 1 seconds)\e[0m')"
assert_eq "two blocked packages are both named" "expo-av
expo-camera" "$(blocked_names "${BLOCKED_CAMERA}"$'\n'"${BLOCKED_AV}")"
assert_eq "never returns the requested version" "expo-camera" \
	"$(blocked_names "${BLOCKED_CAMERA}" | grep -q '~57' && echo wrong || echo expo-camera)"

echo "retry set"
SPECS="expo-camera@~57.0.32 expo-av@~16.0.10"
assert_eq "drops the blocked specifier" "expo-av@~16.0.10" "$(without_names "${SPECS}" "$(blocked_names "${BLOCKED_CAMERA}")")"
assert_eq "drops both blocked specifiers" "" "$(without_names "${SPECS}" "$(blocked_names "${BLOCKED_CAMERA}"$'\n'"${BLOCKED_AV}")")"
assert_eq "keeps everything when nothing matches" "${SPECS}" "$(without_names "${SPECS}" "otro-paquete" | tr '\n' ' ' | sed 's/ *$//')"
assert_eq "reports nothing to attribute" "" "$(with_names "${SPECS}" "otro-paquete")"
assert_eq "reports the matched package" "expo-camera" "$(with_names "${SPECS}" "expo-camera")"

echo "parse_recommended"
assert_eq "keeps Expo's range operator" "expo-camera@~57.0.32" \
	"$(printf '  expo-camera@57.0.0 - expected version: ~57.0.32\n' | parse_recommended)"
assert_eq "ignores unrelated lines" "" \
	"$(printf 'noise\nexpo-camera@57.0.0 - expected version: ~57.0.32\n' | parse_recommended)"

# The weekly caller's exit contract, driven with a stubbed upgrade script.
CALLER_RC=""
CALLER_OUT=""
caller_case() {
	local code="$1" tmp
	tmp="$(mktemp -d)"
	mkdir -p "${tmp}/scripts" "${tmp}/apps/mobile"
	cp "${ROOT}/scripts/ci-weekly-deps.sh" "${tmp}/scripts/"
	{
		printf '#!/usr/bin/env bash\n'
		printf 'echo "Published less than 4 day(s) ago, so held back by the release-age policy:" >&2\n'
		printf 'echo "  - expo-camera" >&2\n'
		printf 'echo "  - @expo/foo" >&2\n'
		printf 'exit %s\n' "${code}"
	} >"${tmp}/scripts/expo-upgrade.sh"
	chmod +x "${tmp}/scripts/"*.sh
	CALLER_RC=0
	(
		cd "${tmp}" || exit 1
		git init -q .
		git -c user.email=t@example.com -c user.name=t commit -q --allow-empty -m init
		bash scripts/ci-weekly-deps.sh
	) >"${tmp}/out.log" 2>&1 || CALLER_RC=$?
	CALLER_OUT="$(cat "${tmp}/out.log")"
	rm -rf "${tmp}"
}

echo "weekly caller"
caller_case 3
assert_eq "continues on a held-back-only outcome" "0" "${CALLER_RC}"
case "${CALLER_OUT}" in
	*"expo-camera"*) assert_eq "names the held-back packages" "yes" "yes" ;;
	*) assert_eq "names the held-back packages" "yes" "no" ;;
esac
caller_case 1
assert_eq "aborts on a real failure" "1" "${CALLER_RC}"

if [ "${FAILED}" -ne 0 ]; then
	echo ""
	echo "✗ expo upgrade checks failed" >&2
	exit 1
fi

echo ""
echo "✓ expo upgrade checks passed"
