import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  TextInput,
  StyleSheet,
  Platform,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type NativeSyntheticEvent,
  type TargetedEvent,
  type TextInputKeyPressEvent,
} from "react-native";
import {
  colors,
  spacing,
  radius,
  typography,
  type TypographyVariant,
} from "@/theme";
import { useScrollContainer } from "./screen-container";
import { useBottomSheetModalContext } from "./bottom-sheet-modal";

export interface ThemedTextInputProps extends TextInputProps {
  variant?: TypographyVariant;
  style?: StyleProp<TextStyle>;
  onSubmitShortcut?: () => void;
}

export const ThemedTextInput = forwardRef<TextInput, ThemedTextInputProps>(
  function ThemedTextInput(
    {
      variant = "body",
      placeholderTextColor = colors.secondaryLabel,
      style,
      multiline,
      onFocus,
      autoFocus,
      onSubmitShortcut,
      onKeyPress,
      ...props
    },
    ref,
  ) {
    const typeStyle = typography[variant] ?? typography.body;
    const internalRef = useRef<TextInput>(null);
    const scrollContainer = useScrollContainer();
    const modalLifecycle = useBottomSheetModalContext();
    const [isFocused, setIsFocused] = useState(false);

    useImperativeHandle(ref, () => internalRef.current as TextInput);

    useEffect(() => {
      if (!autoFocus || !modalLifecycle) {
        return;
      }

      let isFocused = false;
      const doFocus = () => {
        if (isFocused) return;
        isFocused = true;
        internalRef.current?.focus();
      };

      const unsubscribe = modalLifecycle.subscribe(doFocus);
      const timer = setTimeout(doFocus, 300);

      return () => {
        unsubscribe();
        clearTimeout(timer);
      };
    }, [autoFocus, modalLifecycle]);

    const handleFocus = (e: NativeSyntheticEvent<TargetedEvent>) => {
      setIsFocused(true);
      onFocus?.(e as any);
      if (scrollContainer && internalRef.current) {
        scrollContainer.scrollToFocusedInput(internalRef.current);
      }
    };

    const handleBlur = (e: NativeSyntheticEvent<TargetedEvent>) => {
      setIsFocused(false);
      props.onBlur?.(e as any);
    };

    const handleKeyPress = (e: TextInputKeyPressEvent) => {
      const nativeEvt = e?.nativeEvent as any;
      if (nativeEvt?.isComposing || nativeEvt?.keyCode === 229) {
        return;
      }
      if (
        onSubmitShortcut &&
        (nativeEvt?.key === "Enter" || nativeEvt?.keyCode === 13) &&
        (nativeEvt?.ctrlKey || nativeEvt?.metaKey)
      ) {
        nativeEvt?.preventDefault?.();
        onSubmitShortcut();
        return;
      }
      onKeyPress?.(e);
    };

    const handleKeyDown = (e: any) => {
      if (e?.isComposing || e?.keyCode === 229) {
        return;
      }
      if (
        onSubmitShortcut &&
        (e?.key === "Enter" || e?.keyCode === 13) &&
        (e?.ctrlKey || e?.metaKey)
      ) {
        e?.preventDefault?.();
        onSubmitShortcut();
        return;
      }
      (props as any).onKeyDown?.(e);
    };

    const finalAccessibilityLabel =
      props.accessibilityLabel ??
      (typeof props.placeholder === "string" ? props.placeholder : undefined);

    const effectiveAutoFocus = modalLifecycle ? false : autoFocus;

    const focusStyle = isFocused
      ? {
          borderColor: colors.systemGreen,
          ...(Platform.OS === "web"
            ? ({
                outlineStyle: "none",
                boxShadow: `0 0 0 1px ${String(colors.systemGreen)}`,
              } as any)
            : {}),
        }
      : Platform.OS === "web"
        ? ({ outlineStyle: "none" } as any)
        : undefined;

    return (
      <TextInput
        ref={internalRef}
        placeholderTextColor={placeholderTextColor}
        multiline={multiline}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoFocus={effectiveAutoFocus}
        accessibilityLabel={finalAccessibilityLabel}
        onKeyPress={handleKeyPress}
        {...({ onKeyDown: handleKeyDown } as any)}
        style={[
          styles.input,
          typeStyle,
          multiline && styles.multiline,
          style,
          focusStyle,
        ]}
        {...props}
      />
    );
  },
);

const styles = StyleSheet.create({
  input: {
    color: colors.label,
    backgroundColor: colors.systemBackground,
    borderWidth: 1,
    borderColor: colors.separator,
    borderRadius: radius.md,
    borderCurve: "continuous",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2, // 10px baseline
    minHeight: 44, // standard accessible touch/input target
  },
  multiline: {
    minHeight: 88,
    paddingTop: spacing.sm + 2,
    textAlignVertical: "top",
  },
});
