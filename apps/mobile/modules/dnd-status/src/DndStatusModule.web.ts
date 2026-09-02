import { registerWebModule, NativeModule } from "expo";

class DndStatusModule extends NativeModule<{}> {
  isDndActive(): boolean {
    return false;
  }
  isSupported(): boolean {
    return false;
  }
  isNotificationPolicyAccessGranted(): boolean {
    return false;
  }
  setDndActive(_active: boolean): boolean {
    return false;
  }
  openDndSettings(): void {}
}

export default registerWebModule(DndStatusModule, "DndStatus");
