```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:06285878a1b56e01a0960bd7c8e2ada10e328929a8f728d8eaf26068f68e3de7
verdict: pass
blockers: 0
critical_findings: 0
requirements: 3/3
scenarios: 3/3
test_command: make check
test_exit_code: 0
test_output_hash: sha256:5a1cb4fdc3f5c4e3d726e97b7fff92772b1a68240e57dbd7127ae72bb8dfef2f
build_command: bun run build
build_exit_code: 0
build_output_hash: sha256:9d6431497251b0667114eb74841965fc97e613949c44ffd1af7cdf9959ea8d23
```

# Verification Report: Anchor Generated Native Folders in Gitignore

## 1. Automated Verification & Diagnostics

- **Ignore Rule Matching & Build Packaging Isolation**:
  - Validated `.gitignore` patterns with npm `ignore` engine (matching EAS VCS packager `makeShallowCopyAsync`).
  - Status: PASSED.
  - Evidence: `apps/mobile/modules/**` paths (`build.gradle`, `.kt`, `.swift`) evaluate to `ignored == false`. Generated CNG directories (`apps/mobile/android/`, `apps/mobile/ios/`) evaluate to `ignored == true`.
- **Expo Autolinking Resolution**:
  - Command: `cd apps/mobile && bunx expo-modules-autolinking resolve -p android`
  - Status: PASSED.
  - Evidence: Local native modules `meditation-session` and `dnd-status` are discovered and resolved with valid source directories.
- **Monorepo Suite Diagnostics (`make check`)**:
  - Command: `turbo run lint typecheck test`
  - Status: PASSED (9/9 Turbo tasks successful, 0 errors, 28 unit tests passing across 4 files).
- **Monorepo Build Verification (`bun run build`)**:
  - Command: `bun run build`
  - Status: PASSED (all workspace builds succeeded).

## 2. Requirements Compliance Matrix

| Requirement   | Scenario                                  | Evidence / Verification Target                                                                                  | Result       |
| ------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------ |
| `REQ-GIT-001` | Preserve Local Native Module Directories  | EAS VCS packager does not ignore `apps/mobile/modules/**` native sources                                        | ✅ COMPLIANT |
| `REQ-GIT-002` | Ignore Generated CNG Native Folders       | Continuous Native Generation folders `/android/`, `/ios/`, `/apps/mobile/android/`, `/apps/mobile/ios/` ignored | ✅ COMPLIANT |
| `REQ-MOD-001` | Autolinking Discovery and Build Inclusion | `expo-modules-autolinking` detects `meditation-session` & `dnd-status` projects                                 | ✅ COMPLIANT |

## 3. Final Verification Conclusion

Root `.gitignore` anchored paths resolve the packaging regression introduced in `28f43cd`. Native module sources are protected from omission during EAS build shallow copying, restoring `MeditationForegroundService` and `WakeLock` capabilities for Android background sessions.
