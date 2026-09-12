import { mock } from "bun:test";
import { plugin } from "bun";
// @ts-expect-error react-native-web untyped in test harness
import * as ReactNativeWeb from "react-native-web";

plugin({
  name: "sql-loader",
  setup(build) {
    build.onLoad({ filter: /\.sql$/ }, async (args) => {
      const text = await Bun.file(args.path).text();
      return {
        contents: `export default ${JSON.stringify(text)};`,
        loader: "js",
      };
    });
  },
});

process.env.EXPO_OS = "android";
process.env.NODE_ENV = "test";
(globalThis as any).__DEV__ = false;
(globalThis as any).window = globalThis;
(globalThis as any).window.location = {
  protocol: "http:",
  host: "localhost:8081",
  search: "?platform=android",
};

class MockEventEmitter {
  addListener() {
    return { remove: () => {} };
  }
  removeAllListeners() {}
  emit() {}
}

class MockNativeModule {
  addListener() {
    return { remove: () => {} };
  }
  removeListener() {}
  removeAllListeners() {}
  emit() {}
}

export const mockMeditationSession = {
  startSession: mock((_opts?: any) => true),
  stopSession: mock(() => true),
  isSessionActive: mock(() => true),
  playAlarmSound: mock((_uri: string, _volume?: number) => true),
  stopAlarmSound: mock(() => true),
  addListener: mock((_event: string, _cb: any) => ({ remove: () => {} })),
  removeListeners: mock(() => {}),
};

(globalThis as any).expo = {
  EventEmitter: MockEventEmitter,
  NativeModule: MockNativeModule,
  modules: {
    ExpoAsset: {},
    ExponentConstants: {},
    MeditationSession: mockMeditationSession,
  },
};

mock.module("react-native", () => ({
  ...ReactNativeWeb,
  AppState: {
    ...ReactNativeWeb.AppState,
    addEventListener: () => ({ remove: () => {} }),
  },
  Platform: {
    ...ReactNativeWeb.Platform,
    OS: "android",
    select: (obj: Record<string, any>) => obj.android ?? obj.default,
  },
  TurboModuleRegistry: {
    get: () => null,
    getEnforcing: () => null,
  },
  NativeModules: {},
}));

mock.module("expo-router", () => ({
  Color: {
    ios: {
      systemBackground: "#000000",
      secondarySystemBackground: "#1C1C1E",
      label: "#FFFFFF",
      secondaryLabel: "#8E8E93",
      systemBlue: "#007AFF",
      systemPurple: "#AF52DE",
      systemGreen: "#34C759",
      systemRed: "#FF3B30",
      systemOrange: "#FF9500",
      systemGray: "#8E8E93",
    },
    android: {
      dynamic: {
        surface: "#000000",
        surfaceVariant: "#1C1C1E",
        onSurface: "#FFFFFF",
        onSurfaceVariant: "#8E8E93",
        primary: "#007AFF",
        tertiary: "#AF52DE",
        error: "#FF3B30",
      },
    },
  },
  useRouter: () => ({ push: () => {}, back: () => {}, replace: () => {} }),
  useLocalSearchParams: () => ({}),
}));

mock.module("expo-asset", () => ({
  Asset: {
    fromModule: () => ({
      uri: "file:///mock-sound.m4a",
      localUri: "file:///mock-sound.m4a",
      downloadAsync: async () => {},
    }),
    loadAsync: async () => {},
  },
}));

mock.module("expo-constants", () => ({
  default: {
    expoConfig: {},
  },
}));

mock.module("expo-keep-awake", () => ({
  useKeepAwake: () => {},
  activateKeepAwakeAsync: async () => {},
  deactivateKeepAwake: () => {},
}));

mock.module("expo-audio", () => ({
  useAudioPlayer: () => ({
    play: () => {},
    pause: () => {},
    seekTo: async () => {},
  }),
  setAudioModeAsync: async () => {},
}));

mock.module("@/constants/sounds", () => ({
  MEDITATION_SOUNDS: {
    SINGLE_GONG: 1,
    TRIPLE_GONG: 2,
  },
}));

export const mockNotifications = {
  getPermissionsAsync: mock(async () => ({ status: "granted" })),
  requestPermissionsAsync: mock(async () => ({ status: "granted" })),
  scheduleNotificationAsync: mock(async (_req: any) => "mock-notif-id"),
  cancelAllScheduledNotificationsAsync: mock(async () => {}),
  cancelScheduledNotificationAsync: mock(async (_id: any) => {}),
  setNotificationChannelAsync: mock(async (_id: any, _config: any) => {}),
  addNotificationReceivedListener: mock((_cb: any) => ({
    remove: mock(() => {}),
  })),
  addNotificationResponseReceivedListener: mock((_cb: any) => ({
    remove: mock(() => {}),
  })),
};

mock.module("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  AndroidNotificationPriority: { HIGH: "high" },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
  setNotificationHandler: () => {},
  setNotificationChannelAsync: (id: any, config: any) =>
    mockNotifications.setNotificationChannelAsync(id, config),
  getPermissionsAsync: () => mockNotifications.getPermissionsAsync(),
  requestPermissionsAsync: () => mockNotifications.requestPermissionsAsync(),
  scheduleNotificationAsync: (req: any) =>
    mockNotifications.scheduleNotificationAsync(req),
  cancelAllScheduledNotificationsAsync: () =>
    mockNotifications.cancelAllScheduledNotificationsAsync(),
  cancelScheduledNotificationAsync: (id: any) =>
    mockNotifications.cancelScheduledNotificationAsync(id),
  addNotificationReceivedListener: (cb: any) =>
    mockNotifications.addNotificationReceivedListener(cb),
  addNotificationResponseReceivedListener: (cb: any) =>
    mockNotifications.addNotificationResponseReceivedListener(cb),
}));

const mockNetInfo = {
  addEventListener: () => () => {},
  fetch: async () => ({
    isConnected: true,
    isInternetReachable: true,
  }),
};

mock.module("@react-native-community/netinfo", () => ({
  default: mockNetInfo,
  ...mockNetInfo,
}));

mock.module("expo-crypto", () => ({
  randomUUID: () => "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
    if (array) {
      const bytes = new Uint8Array(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = (Math.random() * 256) | 0;
      }
    }
    return array;
  },
}));
