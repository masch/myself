import { Platform } from "react-native";

/** Session key that remembers this tab's simulation role while it navigates. */
export const SIMULATION_TAB_STORAGE_KEY = "p2p_barter_simulation_tab";

/**
 * Whether this tab is a barter producer simulation, opened as one of the two
 * tabs the POC uses to simulate two producers (`?producerId=` or `?producer=`).
 *
 * The answer is remembered for the tab: in-app navigation drops the query
 * param, and re-deciding mid-session would swap the whole provider tree under
 * the router, remounting the app and jumping back to the initial route. On
 * native this is always false.
 */
export function isBarterSimulationTab(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);

  if (params.has("producerId") || params.has("producer")) {
    try {
      window.sessionStorage.setItem(SIMULATION_TAB_STORAGE_KEY, "1");
    } catch {
      // Storage can be denied; the URL of this load is enough.
    }

    return true;
  }

  try {
    const remembered = window.sessionStorage.getItem(
      SIMULATION_TAB_STORAGE_KEY,
    );

    if (remembered !== null) {
      return remembered === "1";
    }

    window.sessionStorage.setItem(SIMULATION_TAB_STORAGE_KEY, "0");
  } catch {
    // Storage can be denied; fall back to what this load asked for.
  }

  return false;
}
