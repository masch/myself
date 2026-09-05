# Change Specification: Anchor Generated Native Folders in Gitignore

## 1. Requirements

### REQ-GIT-001: Preserve Local Native Module Directories

The repository `.gitignore` SHALL NOT match native directories located under `apps/mobile/modules/**` (such as `apps/mobile/modules/meditation-session/android/`, `apps/mobile/modules/meditation-session/ios/`, `apps/mobile/modules/dnd-status/android/`, and `apps/mobile/modules/dnd-status/ios/`).

#### Scenario: Local module build scripts not ignored by VCS copy
- **Given** `.gitignore` configuration in repository root
- **When** EAS VCS packaging filter or the `ignore` rule engine evaluates `apps/mobile/modules/meditation-session/android/build.gradle` or any source file in `modules/`
- **Then** the file evaluation SHALL return `ignored == false`.

### REQ-GIT-002: Ignore Generated CNG Native Folders

The repository `.gitignore` SHALL match and ignore auto-generated Continuous Native Generation (CNG) folders at both the workspace and repository root levels (`/android/`, `/ios/`, `/apps/mobile/android/`, `/apps/mobile/ios/`).

#### Scenario: Generated CNG folders ignored
- **Given** `.gitignore` configuration in repository root
- **When** the VCS or ignore engine evaluates `apps/mobile/android/build.gradle` or `/android/build.gradle`
- **Then** the evaluation SHALL return `ignored == true`.

### REQ-MOD-001: Autolinking Discovery and Build Inclusion

Expo modules autolinking SHALL discover and link `meditation-session` and `dnd-status` modules during Android and iOS builds, including local EAS builds and archive packaging.

#### Scenario: Autolinking resolves local modules
- **Given** an EAS shallow copy or archive snapshot of the repository
- **When** `expo-modules-autolinking resolve --platform android` is executed in `apps/mobile`
- **Then** `meditation-session` and `dnd-status` SHALL be present in the resolved modules list with valid `sourceDir`.
