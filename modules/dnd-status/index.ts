import DndStatusModule from "./src/DndStatusModule";

export function isDndActive(): boolean {
  try {
    return DndStatusModule.isDndActive();
  } catch {
    return false;
  }
}

export function isDndCheckSupported(): boolean {
  try {
    return DndStatusModule.isSupported();
  } catch {
    return false;
  }
}

export function openDndSettings(): void {
  try {
    DndStatusModule.openDndSettings();
  } catch {}
}
