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
    build.onLoad({ filter: /@rn-primitives.*\.m?js$/ }, async (args) => {
      const text = await Bun.file(args.path).text();
      return {
        contents: text,
        loader: "jsx",
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
  getAllScheduledNotificationsAsync: mock(async () => []),
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
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: "timeInterval",
    DAILY: "daily",
    CALENDAR: "calendar",
  },
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
  getAllScheduledNotificationsAsync: () =>
    mockNotifications.getAllScheduledNotificationsAsync(),
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

mock.module("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 48, bottom: 34, left: 10, right: 12 }),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  initialWindowMetrics: {
    insets: { top: 48, bottom: 34, left: 10, right: 12 },
    frame: { x: 0, y: 0, width: 390, height: 844 },
  },
}));

mock.module("expo-image", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  const { View } = ReactNativeWeb;

  const Image = ({ style, ...props }: any) =>
    React.createElement(View, { style, ...props });
  Image.displayName = "Image";

  return {
    Image,
  };
});

mock.module("@expo/ui", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  const { View, Text, Switch: RNSwitch, Pressable } = ReactNativeWeb;

  const Host = ({ children, style, ...props }: any) =>
    React.createElement(View, { style, ...props }, children);
  Host.displayName = "Host";

  const Column = ({ children, style, ...props }: any) =>
    React.createElement(View, { style, ...props }, children);
  Column.displayName = "Column";

  const Row = ({ children, style, ...props }: any) =>
    React.createElement(
      View,
      { style: [{ flexDirection: "row" }, style], ...props },
      children,
    );
  Row.displayName = "Row";

  const Switch = ({ value, onValueChange, disabled, style, ...props }: any) =>
    React.createElement(RNSwitch, {
      value,
      onValueChange,
      disabled,
      style,
      ...props,
    });
  Switch.displayName = "Switch";

  const Slider = ({ style, ...props }: any) =>
    React.createElement(View, { style, ...props });
  Slider.displayName = "Slider";

  const Picker = ({ children, ...props }: any) =>
    React.createElement(View, { ...props }, children);
  Picker.displayName = "Picker";

  const FieldGroup = Object.assign(
    ({ children, ...props }: any) => React.createElement(View, props, children),
    {
      Section: ({ children, title, ...props }: any) =>
        React.createElement(
          View,
          props,
          title ? React.createElement(Text, null, title) : null,
          children,
        ),
    },
  );

  const ListItem = ({
    children,
    leading,
    trailing,
    supportingText,
    ...props
  }: any) =>
    React.createElement(
      View,
      props,
      leading,
      React.createElement(Text, null, children),
      supportingText ? React.createElement(Text, null, supportingText) : null,
      trailing,
    );

  const BottomSheet = ({ children, isPresented, ...props }: any) =>
    isPresented ? React.createElement(View, props, children) : null;

  return {
    Host,
    Column,
    Row,
    Switch,
    Slider,
    Picker,
    FieldGroup,
    ListItem,
    BottomSheet,
    Button: ({ children, onPress, ...props }: any) =>
      React.createElement(Pressable, { onPress, ...props }, children),
    Text: ({ children, ...props }: any) =>
      React.createElement(Text, props, children),
  };
});
