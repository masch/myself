import React, { type ReactElement, type ReactNode } from "react";

/**
 * A minimal hooks runtime for the provider tests (T6c `M3`).
 *
 * Why this exists: the session lifecycle lives in `useEffect` + `useState`, and this
 * repository has no renderer that runs them. `react-test-renderer` and the DOM testing
 * libraries are not dependencies, the existing component tests render to static markup
 * (which never runs an effect), and this task may not add a dependency. Calling the
 * component functions with a dispatcher installed on React's client internals runs the
 * real `SessionProvider` — its state, its effects, its cleanup and its context value —
 * instead of a copy of it.
 *
 * Deliberately narrow: function components, fragments, host elements and context
 * providers, one instance per component type, and only the hooks the session provider
 * uses. An unsupported hook throws instead of returning `undefined`, and the dispatcher
 * slot is React's private one, so a React upgrade that renames it fails these tests with
 * an explicit message rather than passing silently.
 */

interface ClientInternals {
  H: HookDispatcher | null;
}

const CLIENT_INTERNALS_KEY =
  "__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE";

const CONTEXT_TYPE = "Symbol(react.context)";

type SetState<T> = (next: T | ((previous: T) => T)) => void;

interface StateSlot {
  kind: "state";
  value: unknown;
}

interface EffectSlot {
  kind: "effect";
  /** Deps of the previous render, what the change is measured against. */
  previousDeps: readonly unknown[] | undefined;
  run: () => void | (() => void);
  cleanup: (() => void) | undefined;
}

interface MemoSlot {
  kind: "memo";
  deps: readonly unknown[] | undefined;
  value: unknown;
}

interface RefSlot {
  kind: "ref";
  current: unknown;
}

type Slot = StateSlot | EffectSlot | MemoSlot | RefSlot;

interface ComponentState {
  slots: Slot[];
}

interface HookDispatcher {
  useState<T>(initial: T | (() => T)): [T, SetState<T>];
  useEffect(run: () => void | (() => void), deps?: readonly unknown[]): void;
  useCallback<T>(callback: T, deps?: readonly unknown[]): T;
  useMemo<T>(factory: () => T, deps?: readonly unknown[]): T;
  useRef<T>(initial: T): { current: T };
  useContext<T>(context: { _currentValue?: T }): T;
}

export interface HookHarness {
  /** Renders `element` and runs the effects the render scheduled. */
  render(element: ReactElement): void;
  /** Runs every effect cleanup, as unmounting the tree does. */
  unmount(): void;
  /** Drains pending state updates, re-rendering until nothing changes. */
  flush(): Promise<void>;
  /** How many render passes happened; lets a test prove nothing rendered after unmount. */
  renderCount(): number;
}

function requireClientInternals(): ClientInternals {
  const internals = (React as unknown as Record<string, unknown>)[
    CLIENT_INTERNALS_KEY
  ] as ClientInternals | undefined;
  if (!internals) {
    throw new Error(
      `React no longer exposes ${CLIENT_INTERNALS_KEY}: the hook harness cannot install its dispatcher, so the session-provider tests must be rewritten against a real renderer.`,
    );
  }
  return internals;
}

function sameDeps(
  previous: readonly unknown[] | undefined,
  next: readonly unknown[] | undefined,
): boolean {
  if (!previous || !next || previous.length !== next.length) return false;
  return next.every((value, index) => Object.is(value, previous[index]));
}

export function createHookHarness(): HookHarness {
  const components = new Map<unknown, ComponentState>();
  const contextStack: { context: unknown; value: unknown }[] = [];
  const scheduled: { slot: EffectSlot; state: ComponentState }[] = [];

  let element: ReactElement | null = null;
  let current: ComponentState | null = null;
  let cursor = 0;
  let dirty = false;
  let unmounted = false;
  let renders = 0;

  /**
   * Reserves the next slot of the component being rendered.
   *
   * An existing slot of the same kind is kept, because that is where the previous value
   * (and, for an effect, the previous deps) lives; `create` only runs for a new slot.
   */
  function reserve<T extends Slot>(
    kind: Slot["kind"],
    create: () => T,
  ): { state: ComponentState; slot: T } {
    if (!current)
      throw new Error("A hook was called outside a component render");
    const state = current;
    const index = cursor++;
    const existing = state.slots[index];
    if (!existing || existing.kind !== kind) {
      state.slots[index] = create();
    }
    return { state, slot: state.slots[index] as T };
  }

  const dispatcher: HookDispatcher = {
    useState<T>(initial: T | (() => T)) {
      const { slot: holder } = reserve<StateSlot>("state", () => ({
        kind: "state",
        value: typeof initial === "function" ? (initial as () => T)() : initial,
      }));
      const setState: SetState<T> = (next) => {
        holder.value =
          typeof next === "function"
            ? (next as (previous: T) => T)(holder.value as T)
            : next;
        dirty = true;
      };
      return [holder.value as T, setState];
    },

    useEffect(run, deps) {
      const { state, slot } = reserve<EffectSlot>("effect", () => ({
        kind: "effect",
        previousDeps: undefined,
        run,
        cleanup: undefined,
      }));
      const changed = !sameDeps(slot.previousDeps, deps);
      slot.previousDeps = deps;
      slot.run = run;
      if (changed) scheduled.push({ slot, state });
    },

    useCallback<T>(callback: T, deps?: readonly unknown[]): T {
      return dispatcher.useMemo(() => callback, deps);
    },

    useMemo<T>(factory: () => T, deps?: readonly unknown[]): T {
      const { slot } = reserve<MemoSlot>("memo", () => ({
        kind: "memo",
        deps: undefined,
        value: undefined,
      }));
      if (!sameDeps(slot.deps, deps)) {
        slot.deps = deps;
        slot.value = factory();
      }
      return slot.value as T;
    },

    useRef<T>(initial: T): { current: T } {
      const { slot } = reserve<RefSlot>("ref", () => ({
        kind: "ref",
        current: initial,
      }));
      return slot as unknown as { current: T };
    },

    useContext<T>(context: { _currentValue?: T }): T {
      for (let index = contextStack.length - 1; index >= 0; index -= 1) {
        if (contextStack[index].context === context) {
          return contextStack[index].value as T;
        }
      }
      return context._currentValue as T;
    },
  };

  function runScheduledEffects(): void {
    const toRun = scheduled.splice(0, scheduled.length);
    for (const { slot } of toRun) {
      const cleanup = slot.cleanup;
      slot.cleanup = undefined;
      if (cleanup) cleanup();
      const result = slot.run();
      if (typeof result === "function") slot.cleanup = result;
    }
  }

  function renderComponent(
    type: (props: Record<string, unknown>) => ReactNode,
    props: Record<string, unknown>,
  ): void {
    const state = components.get(type) ?? { slots: [] };
    components.set(type, state);

    const previousState = current;
    const previousCursor = cursor;
    current = state;
    cursor = 0;
    try {
      renderNode(type(props));
    } finally {
      current = previousState;
      cursor = previousCursor;
    }
  }

  function renderNode(node: ReactNode): void {
    if (
      node === null ||
      node === undefined ||
      typeof node === "boolean" ||
      typeof node === "string" ||
      typeof node === "number"
    ) {
      return;
    }

    if (Array.isArray(node)) {
      for (const child of node) renderNode(child);
      return;
    }

    if (!React.isValidElement(node)) {
      throw new Error(
        `The hook harness cannot render ${typeof node}: pass elements, not raw values.`,
      );
    }

    const child = node as ReactElement<Record<string, unknown>>;
    const type = child.type as unknown;

    if (type === React.Fragment) {
      renderNode(child.props.children as ReactNode);
      return;
    }

    if (
      type &&
      typeof type === "object" &&
      String((type as { $$typeof?: symbol }).$$typeof) === CONTEXT_TYPE
    ) {
      contextStack.push({ context: type, value: child.props.value });
      try {
        renderNode(child.props.children as ReactNode);
      } finally {
        contextStack.pop();
      }
      return;
    }

    if (typeof type === "string") {
      renderNode(child.props.children as ReactNode);
      return;
    }

    if (typeof type === "function") {
      renderComponent(
        type as (props: Record<string, unknown>) => ReactNode,
        child.props,
      );
      return;
    }

    throw new Error(
      `The hook harness does not support the element type ${String(type)}.`,
    );
  }

  function renderPass(): void {
    if (!element || unmounted) return;
    renders += 1;
    contextStack.length = 0;
    const internals = requireClientInternals();
    const previousDispatcher = internals.H;
    internals.H = dispatcher;
    try {
      renderNode(element);
    } finally {
      internals.H = previousDispatcher;
    }
    runScheduledEffects();
  }

  return {
    render(next) {
      unmounted = false;
      element = next;
      dirty = false;
      renderPass();
    },

    unmount() {
      unmounted = true;
      element = null;
      for (const state of components.values()) {
        for (const slot of state.slots) {
          if (slot.kind !== "effect" || !slot.cleanup) continue;
          const cleanup = slot.cleanup;
          slot.cleanup = undefined;
          cleanup();
        }
      }
    },

    async flush() {
      // A state update is applied by the setter and painted on the next pass, as React
      // does, so the loop alternates microtask drains with renders until nothing is dirty.
      for (let tick = 0; tick < 20; tick += 1) {
        await Promise.resolve();
        if (!dirty || unmounted) continue;
        dirty = false;
        renderPass();
      }
    },

    renderCount() {
      return renders;
    },
  };
}
