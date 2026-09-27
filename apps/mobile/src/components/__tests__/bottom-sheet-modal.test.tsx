import { describe, expect, it } from "bun:test";
import React from "react";
import { Platform } from "react-native";
import { AppBottomSheetModal } from "../bottom-sheet-modal";

describe("AppBottomSheetModal component", () => {
  it("returns null when visible is false", () => {
    const element = AppBottomSheetModal({
      visible: false,
      onClose: () => {},
      children: <span key="1">Modal Body</span>,
    });

    expect(element).toBeNull();
  });

  it("configures Modal with slide animation, statusBarTranslucent and correct keyboard avoidance behavior", () => {
    const element = AppBottomSheetModal({
      visible: true,
      onClose: () => {},
      children: <span key="2">Modal Body Visible</span>,
    });

    expect(element).not.toBeNull();
    expect(element?.props.visible).toBe(true);
    expect(element?.props.animationType).toBe("slide");
    expect(element?.props.statusBarTranslucent).toBe(true);

    const keyboardAvoidingView = element?.props.children;
    expect(keyboardAvoidingView).toBeDefined();
    expect(keyboardAvoidingView.props.behavior).toBe(
      Platform.OS === "ios" ? "padding" : "height",
    );
  });

  it("renders ScrollView with keyboardShouldPersistTaps handled when scrollable is true", () => {
    const element = AppBottomSheetModal({
      visible: true,
      scrollable: true,
      onClose: () => {},
      children: <span key="3">Scrollable Content</span>,
    });

    expect(element).not.toBeNull();
    const keyboardAvoidingView = element?.props.children;
    const sheetView = keyboardAvoidingView.props.children[1];
    const scrollView = sheetView.props.children[1];

    expect(scrollView.props.keyboardShouldPersistTaps).toBe("handled");
    expect(scrollView.props.automaticallyAdjustKeyboardInsets).toBeFalsy();
  });

  it("renders non-scrollable View when scrollable is false", () => {
    const element = AppBottomSheetModal({
      visible: true,
      scrollable: false,
      onClose: () => {},
      children: <span key="4">Static Content</span>,
    });

    expect(element).not.toBeNull();
    const keyboardAvoidingView = element?.props.children;
    const sheetView = keyboardAvoidingView.props.children[1];
    const nonScrollView = sheetView.props.children[1];

    expect(nonScrollView.props.children).toBeDefined();
  });

  it("renders ScrollView via AppBottomSheetModal.Scroll compound component", () => {
    const element = AppBottomSheetModal.Scroll({
      visible: true,
      onClose: () => {},
      children: <span key="5">Scrollable Compound Content</span>,
    });

    expect(element).not.toBeNull();
    const keyboardAvoidingView = element?.props.children;
    const sheetView = keyboardAvoidingView.props.children[1];
    const scrollView = sheetView.props.children[1];

    expect(scrollView.props.keyboardShouldPersistTaps).toBe("handled");
  });
});
