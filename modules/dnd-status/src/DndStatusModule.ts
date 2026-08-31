import { NativeModule, requireNativeModule } from "expo";

declare class DndStatusModuleType extends NativeModule<{}> {
  isDndActive(): boolean;
  isSupported(): boolean;
  isNotificationPolicyAccessGranted(): boolean;
  setDndActive(active: boolean): boolean;
  openDndSettings(): void;
}

let DndStatusModule: DndStatusModuleType;

try {
  DndStatusModule = requireNativeModule<DndStatusModuleType>("DndStatus");
} catch {
  DndStatusModule = {
    isDndActive: () => false,
    isSupported: () => false,
    isNotificationPolicyAccessGranted: () => false,
    setDndActive: () => false,
    openDndSettings: () => {},
    addListener: () => ({ remove: () => {} }),
    removeListeners: () => {},
  } as unknown as DndStatusModuleType;
}

export default DndStatusModule;
