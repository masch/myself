import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  AppBottomSheetModal,
  BottomSheetModalContent,
  getBottomSheetSafeAreaEdges,
} from "../bottom-sheet-modal";

describe("AppBottomSheetModal component", () => {
  it("returns null when visible is false", () => {
    const element = AppBottomSheetModal({
      visible: false,
      onClose: () => {},
      children: <span key="1">Modal Body</span>,
    });

    expect(element).toBeNull();
  });

  it("configures Modal with slide animation, statusBarTranslucent, navigationBarTranslucent and renders BottomSheetModalContent", () => {
    const element = AppBottomSheetModal({
      visible: true,
      onClose: () => {},
      children: <span key="2">Modal Body Visible</span>,
    });

    expect(element).not.toBeNull();
    expect(element?.props.visible).toBe(true);
    expect(element?.props.animationType).toBe("slide");
    expect(element?.props.statusBarTranslucent).toBe(true);
    expect(element?.props.navigationBarTranslucent).toBe(true);

    const provider = element?.props.children;
    expect(provider).toBeDefined();

    const content = provider.props.children;
    expect(content).toBeDefined();
    expect(content.type).toBe(BottomSheetModalContent);
    expect(content.props.onClose).toBeDefined();
  });

  it("renders ScrollView with keyboardShouldPersistTaps handled when scrollable is true", () => {
    const element = AppBottomSheetModal({
      visible: true,
      scrollable: true,
      onClose: () => {},
      children: <span key="3">Scrollable Content</span>,
    });

    expect(element).not.toBeNull();
    const provider = element?.props.children;
    const content = provider.props.children;
    const scrollView = content.props.innerContent;

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
    const provider = element?.props.children;
    const content = provider.props.children;
    const nonScrollView = content.props.innerContent;

    expect(nonScrollView.props.children).toBeDefined();
  });

  it("renders ScrollView via AppBottomSheetModal.Scroll compound component", () => {
    const element = AppBottomSheetModal.Scroll({
      visible: true,
      onClose: () => {},
      children: <span key="5">Scrollable Compound Content</span>,
    });

    expect(element).not.toBeNull();
    const provider = element?.props.children;
    const content = provider.props.children;
    const scrollView = content.props.innerContent;

    expect(scrollView.props.keyboardShouldPersistTaps).toBe("handled");
  });

  describe("BottomSheetModalContent structure & keyboard edge calculations", () => {
    it("returns bottom edge when keyboard is closed", () => {
      expect(getBottomSheetSafeAreaEdges(false)).toEqual(["bottom"]);
    });

    it("returns empty edges when keyboard is open to avoid redundant gap", () => {
      expect(getBottomSheetSafeAreaEdges(true)).toEqual([]);
    });

    it("renders children cleanly within BottomSheetModalContent via renderToString", () => {
      const html = renderToString(
        <BottomSheetModalContent
          onClose={() => {}}
          innerContent={<span>Body Text</span>}
          isKeyboardVisible={false}
        />,
      );
      expect(html).toContain("Body Text");
    });

    it("renders cleanly when isKeyboardVisible is true", () => {
      const html = renderToString(
        <BottomSheetModalContent
          onClose={() => {}}
          innerContent={<span>Active Keyboard Content</span>}
          isKeyboardVisible={true}
        />,
      );
      expect(html).toContain("Active Keyboard Content");
    });
  });
});
