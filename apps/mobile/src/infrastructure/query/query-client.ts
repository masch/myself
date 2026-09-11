import {
  QueryClient,
  QueryCache,
  MutationCache,
  onlineManager,
} from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { Platform } from "react-native";
import { appErrorHandler } from "../errors/mobile-error-handler";

// Configure TanStack Query onlineManager with React Native NetInfo
if (Platform.OS !== "web") {
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(
        Boolean(state.isConnected && state.isInternetReachable !== false),
      );
    });
  });
}

/**
 * Global QueryClient instance for mobile runtime.
 * Integrates QueryCache and MutationCache global error handling via MobileErrorHandler.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      appErrorHandler.handle(error, { queryKey: query.queryKey });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      appErrorHandler.handle(error, {
        mutationKey: mutation.options.mutationKey,
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 2,
      refetchOnWindowFocus: Platform.OS === "web",
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
