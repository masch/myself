import { describe, expect, it, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ToastBanner } from "../toast-banner";
import { ToastProvider, useToast } from "../toast-context";
import type { ToastOptions } from "../types";

describe("Toast System Components", () => {
  it("renders ToastBanner with assertive live region when toast is provided", () => {
    const toast: ToastOptions = {
      message: "Pregunta dada de baja",
      variant: "default",
    };
    const html = renderToString(
      <ToastBanner toast={toast} onDismiss={() => {}} />,
    );
    expect(html).toContain("Pregunta dada de baja");
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
  });

  it("returns null when toast is null", () => {
    const html = renderToString(
      <ToastBanner toast={null} onDismiss={() => {}} />,
    );
    expect(html).toBe("");
  });

  it("renders action button with label and accessible role", () => {
    const handleUndo = mock(() => {});
    const toast: ToastOptions = {
      message: "Elemento eliminado",
      action: {
        label: "Deshacer",
        onPress: handleUndo,
      },
    };
    const html = renderToString(
      <ToastBanner toast={toast} onDismiss={() => {}} />,
    );
    expect(html).toContain("Elemento eliminado");
    expect(html).toContain("Deshacer");
    expect(html).toContain('role="button"');
  });

  it("renders ToastProvider and renders its children", () => {
    const html = renderToString(
      <ToastProvider>
        <div data-testid="child">Child App</div>
      </ToastProvider>,
    );
    expect(html).toContain("Child App");
  });

  it("throws error when useToast is used outside of ToastProvider", () => {
    function InvalidConsumer() {
      useToast();
      return null;
    }
    expect(() => renderToString(<InvalidConsumer />)).toThrow(
      "useToast must be used within a ToastProvider",
    );
  });

  it("exposes semantic helper methods (success, error, undo) via useToast", () => {
    let capturedContext: ReturnType<typeof useToast> | undefined;
    function Consumer() {
      capturedContext = useToast();
      return null;
    }

    renderToString(
      <ToastProvider>
        <Consumer />
      </ToastProvider>,
    );

    expect(capturedContext).toBeDefined();
    if (capturedContext) {
      expect(typeof capturedContext.success).toBe("function");
      expect(typeof capturedContext.error).toBe("function");
      expect(typeof capturedContext.undo).toBe("function");
    }
  });
});
