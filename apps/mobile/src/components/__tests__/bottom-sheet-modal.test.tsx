import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  AppBottomSheetModal,
  BottomSheetModalContent,
  createModalLifecycle,
  getBottomSheetSafeAreaEdges,
  useBottomSheetModalKeyboard,
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

  describe("ModalLifecycle & onShow propagation", () => {
    it("subscribes and notifies listener when notifyShow is called", () => {
      const lifecycle = createModalLifecycle();
      expect(lifecycle.shown).toBe(false);

      let called = false;
      const unsubscribe = lifecycle.subscribe(() => {
        called = true;
      });

      expect(called).toBe(false);
      lifecycle.notifyShow();
      expect(called).toBe(true);
      expect(lifecycle.shown).toBe(true);

      unsubscribe();
    });

    it("immediately triggers callback if subscribed after shown", () => {
      const lifecycle = createModalLifecycle();
      lifecycle.notifyShow();

      let calledImmediately = false;
      lifecycle.subscribe(() => {
        calledImmediately = true;
      });

      expect(calledImmediately).toBe(true);
    });

    it("properly propagates onShow via Modal props", () => {
      let customOnShowCalled = false;
      const element = AppBottomSheetModal({
        visible: true,
        onClose: () => {},
        onShow: () => {
          customOnShowCalled = true;
        },
        children: <span>Content</span>,
      });

      expect(element?.props.onShow).toBeDefined();
      element?.props.onShow();
      expect(customOnShowCalled).toBe(true);
    });

    it("provides isKeyboardVisible in context value and via useBottomSheetModalKeyboard", () => {
      let observedKeyboardVisible = false;
      function TestChild() {
        observedKeyboardVisible = useBottomSheetModalKeyboard();
        return <span>Child</span>;
      }

      renderToString(
        <BottomSheetModalContent
          onClose={() => {}}
          innerContent={<TestChild />}
          isKeyboardVisible={true}
        />,
      );

      expect(observedKeyboardVisible).toBe(true);
    });
  });
});
