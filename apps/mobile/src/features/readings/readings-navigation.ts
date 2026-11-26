/**
 * The navigation surface the readings screen uses.
 *
 * Re-exported from `expo-router` so the screen's tests can supply it. The test preload
 * mocks `expo-router` with only what the existing component tests need (`Color`,
 * `useRouter`, `useLocalSearchParams`), and Bun cannot add a named export to a mocked
 * module namespace another test file already created — so a screen-level test that imports
 * the screen directly cannot resolve `router`, `Stack` or `useFocusEffect`. This module is
 * the seam: the screen imports those three from here, and the test replaces this module.
 */
export { Stack, router, useFocusEffect } from "expo-router";
