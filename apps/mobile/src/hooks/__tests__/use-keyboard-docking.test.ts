import { describe, expect, it } from "bun:test";
import {
  createKeyboardDockingController,
  type DockableInput,
  type DockingList,
  type KeyboardDockingControllerOptions,
} from "../use-keyboard-docking";

/**
 * The docking rules are what decides whether a focused field ends up above the
 * software keyboard, and they used to live inside the hook, where no test could
 * reach them: this repo has no React renderer. They are now a controller driven
 * by fakes instead of a real list, a real input and a real timer.
 *
 * Every test asserts what a user would see — the offset the list is scrolled to,
 * how many docks were scheduled and cancelled — never what the controller keeps
 * in private.
 */

/** Sentinel the list hands out as its scroll node; the dock only passes it back. */
const SCROLL_NODE = { kind: "scrollNode" };

/** Default dock line: `spacing.md` below the top of the list. */
const DOCK_LINE = 16;

type MeasureOutcome = "success" | "fail" | "throw";

/**
 * A measured view: `measureLayout` reports `top`, reports a failure the way the
 * platform does when the input unmounted, or throws for the same reason.
 */
function createInput(
  top = 0,
  outcome: MeasureOutcome = "success",
): DockableInput {
  return {
    measureLayout(_relativeTo, onSuccess, onFail) {
      if (outcome === "throw") throw new Error("the input unmounted");

      if (outcome === "fail") {
        onFail?.();
        return;
      }

      onSuccess(0, top, 120, 48);
    },
  };
}

interface FakeListOptions {
  /** What `getScrollableNode` answers. `() => undefined` means "not mounted yet". */
  getScrollableNode?: () => unknown;
  /** `false` builds a list with no `getScrollableNode` at all, like a plain one. */
  withScrollableNode?: boolean;
}

function createList({
  getScrollableNode = () => SCROLL_NODE,
  withScrollableNode = true,
}: FakeListOptions = {}) {
  const offsets: { offset: number; animated?: boolean }[] = [];
  const list: DockingList = {
    ...(withScrollableNode ? { getScrollableNode } : {}),
    scrollToOffset: (params) => offsets.push(params),
  };

  return { list, offsets };
}

/**
 * Stand-in for the dock delay: records the callback instead of waiting for it,
 * and counts how often the controller scheduled and cancelled a dock.
 */
function createSchedule() {
  const pending = new Set<() => void>();
  const state = { scheduled: 0, cancelled: 0 };

  const schedule = (run: () => void) => {
    state.scheduled += 1;
    pending.add(run);

    return () => {
      state.cancelled += 1;
      pending.delete(run);
    };
  };

  return {
    schedule,
    state,
    /** Run whatever is still pending, as the timer would when it fires. */
    run() {
      const runs = [...pending];
      pending.clear();
      for (const run of runs) run();
    },
    pendingCount: () => pending.size,
  };
}

interface HarnessOptions extends Partial<KeyboardDockingControllerOptions> {
  listOptions?: FakeListOptions;
}

/**
 * A controller wired to fakes. `readFocusedInput` returns `null` by default,
 * which is what `TextInput.State` answers on react-native-web.
 */
function createHarness({ listOptions = {}, ...options }: HarnessOptions = {}) {
  const fake = createList(listOptions);
  const timer = createSchedule();
  const controller = createKeyboardDockingController({
    list: () => fake.list,
    readFocusedInput: () => null,
    schedule: timer.schedule,
    viewportRelative: true,
    ...options,
  });

  return { controller, offsets: fake.offsets, timer };
}

describe("createKeyboardDockingController", () => {
  describe("when the keyboard is not up", () => {
    it("docks nothing before any inset has been reported, even after a focus", () => {
      const harness = createHarness();

      harness.controller.reportFocus(createInput(528));

      expect(harness.offsets).toEqual([]);
      expect(harness.timer.state.scheduled).toBe(0);
    });

    it("docks nothing while the reported inset is zero", () => {
      const harness = createHarness();

      harness.controller.reportInset(0);
      harness.controller.reportFocus(createInput(528));
      harness.timer.run();

      expect(harness.offsets).toEqual([]);
      expect(harness.timer.state.scheduled).toBe(0);
    });

    it("cancels the pending dock when the keyboard closes", () => {
      const harness = createHarness();
      harness.controller.reportInset(300);

      harness.controller.reportInset(0);
      harness.timer.run();

      expect(harness.timer.state).toEqual({ scheduled: 1, cancelled: 1 });
      expect(harness.timer.pendingCount()).toBe(0);
      expect(harness.offsets).toEqual([]);
    });
  });

  describe("while the keyboard is up", () => {
    it("docks a focused input immediately, without waiting for the scheduled dock", () => {
      const harness = createHarness();
      harness.controller.reportInset(300);

      harness.controller.reportFocus(createInput(528));

      expect(harness.offsets).toEqual([
        { offset: 528 - DOCK_LINE, animated: true },
      ]);
      // The inset still has its own attempt pending; the focus did not consume it.
      expect(harness.timer.pendingCount()).toBe(1);
    });

    it("docks the input reported by focus when no live input is available", () => {
      const harness = createHarness({ readFocusedInput: () => null });
      harness.controller.reportFocus(createInput(528));

      harness.controller.reportInset(300);
      harness.timer.run();

      expect(harness.offsets).toEqual([
        { offset: 528 - DOCK_LINE, animated: true },
      ]);
    });

    it("prefers the input the platform reports as focused over the one reported earlier", () => {
      const live = createInput(228);
      const harness = createHarness({ readFocusedInput: () => live });
      harness.controller.reportFocus(createInput(528));

      harness.controller.reportInset(300);
      harness.timer.run();

      expect(harness.offsets).toEqual([
        { offset: 228 - DOCK_LINE, animated: true },
      ]);
    });

    it("leaves an input that already sits on the dock line alone", () => {
      const harness = createHarness();

      harness.controller.reportInset(300);
      harness.controller.reportFocus(createInput(DOCK_LINE));

      expect(harness.offsets).toEqual([]);
    });

    it("keeps the gap it is given between the input and the top of the list", () => {
      const harness = createHarness({ topSpacing: 40 });

      harness.controller.reportInset(300);
      harness.controller.reportFocus(createInput(528));

      expect(harness.offsets).toEqual([{ offset: 528 - 40, animated: true }]);
    });
  });

  describe("when nothing can be measured", () => {
    it("docks nothing when the input has no measureLayout", () => {
      const harness = createHarness();

      harness.controller.reportInset(300);
      harness.controller.reportFocus({});
      harness.timer.run();

      expect(harness.offsets).toEqual([]);
    });

    it("docks nothing when the list is not mounted yet", () => {
      const harness = createHarness({ list: () => null });

      harness.controller.reportInset(300);
      harness.controller.reportFocus(createInput(528));

      expect(harness.offsets).toEqual([]);
    });

    it("docks nothing when the list reports no scrollable node", () => {
      const unmounted = createHarness({
        listOptions: { getScrollableNode: () => undefined },
      });
      const plainList = createHarness({
        listOptions: { withScrollableNode: false },
      });

      for (const harness of [unmounted, plainList]) {
        harness.controller.reportInset(300);
        harness.controller.reportFocus(createInput(528));
        harness.timer.run();
      }

      expect(unmounted.offsets).toEqual([]);
      expect(plainList.offsets).toEqual([]);
    });

    it("docks nothing when the measurement fails", () => {
      const harness = createHarness();

      harness.controller.reportInset(300);
      harness.controller.reportFocus(createInput(528, "fail"));

      expect(() => harness.timer.run()).not.toThrow();
      expect(harness.offsets).toEqual([]);
    });

    it("swallows a measurement that throws, because the input can unmount mid-focus", () => {
      const harness = createHarness();

      harness.controller.reportInset(300);
      harness.controller.reportFocus(createInput(528, "throw"));

      expect(() => harness.timer.run()).not.toThrow();
      expect(harness.offsets).toEqual([]);
    });
  });

  describe("the debounced dock", () => {
    it("schedules exactly one dock per inset and cancels the previous one", () => {
      const harness = createHarness();

      harness.controller.reportInset(300);
      expect(harness.timer.state).toEqual({ scheduled: 1, cancelled: 0 });

      harness.controller.reportInset(260);
      expect(harness.timer.state).toEqual({ scheduled: 2, cancelled: 1 });
      expect(harness.timer.pendingCount()).toBe(1);
    });

    it("docks once when several insets arrive before the delay elapses", () => {
      const harness = createHarness();

      // Reported while the keyboard is still closed, so only the inset docks.
      harness.controller.reportFocus(createInput(528));

      harness.controller.reportInset(300);
      harness.controller.reportInset(280);
      harness.controller.reportInset(260);
      harness.timer.run();

      expect(harness.offsets).toEqual([
        { offset: 528 - DOCK_LINE, animated: true },
      ]);
    });

    it("cancels the pending dock on dispose", () => {
      const harness = createHarness();
      harness.controller.reportInset(300);

      harness.controller.dispose();
      harness.timer.run();

      expect(harness.timer.state).toEqual({ scheduled: 1, cancelled: 1 });
      expect(harness.timer.pendingCount()).toBe(0);
      expect(harness.offsets).toEqual([]);
    });

    it("docks twice when the keyboard opens, closes and opens again", () => {
      const harness = createHarness();
      harness.controller.reportFocus(createInput(528));

      harness.controller.reportInset(300);
      harness.timer.run();
      harness.controller.reportInset(0);
      harness.controller.reportInset(300);
      harness.timer.run();

      expect(harness.offsets).toEqual([
        { offset: 528 - DOCK_LINE, animated: true },
        { offset: 528 - DOCK_LINE, animated: true },
      ]);
    });
  });

  describe("the scroll offset the list already had", () => {
    it("adds the dock to it on the web, where the measurement is viewport relative", () => {
      const harness = createHarness();
      harness.controller.reportFocus(createInput(528));

      harness.controller.reportScroll(100);
      harness.controller.reportInset(300);
      harness.timer.run();

      // 100px already scrolled plus the 528px the field sits below the top of the
      // visible band, minus the dock line.
      expect(harness.offsets).toEqual([{ offset: 612, animated: true }]);
    });

    it("does not add it twice on native, where the measurement is content relative", () => {
      const harness = createHarness({ viewportRelative: false });
      harness.controller.reportFocus(createInput(628));

      harness.controller.reportScroll(100);
      harness.controller.reportInset(300);
      harness.timer.run();

      expect(harness.offsets).toEqual([{ offset: 612, animated: true }]);
    });
  });
});
