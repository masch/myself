import { registerWebModule, NativeModule } from 'expo';

class DndStatusModule extends NativeModule<{}> {
  isDndActive(): boolean {
    return false;
  }
  isSupported(): boolean {
    return false;
  }
}

export default registerWebModule(DndStatusModule, 'DndStatus');
