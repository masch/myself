import { NativeModule, requireNativeModule } from 'expo';

declare class DndStatusModule extends NativeModule<{}> {
  isDndActive(): boolean;
  isSupported(): boolean;
}

export default requireNativeModule<DndStatusModule>('DndStatus');
