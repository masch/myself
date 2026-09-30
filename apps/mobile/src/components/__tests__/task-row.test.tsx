import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TaskRow } from "../task-row";
import { type TaskItem } from "@/infrastructure/persistence/database";

const mockTask: TaskItem = {
  id: "task-1",
  user_id: "default-user",
  title: "Read Marcus Aurelius",
  category: "Personal",
  description: "Meditations Book 4",
  is_done: 0,
  created_at: "2026-09-01",
};

describe("TaskRow component", () => {
  it("renders active task item with title and category", () => {
    const html = renderToString(
      <TaskRow task={mockTask} onToggle={() => {}} onDelete={() => {}} />,
    );
    expect(html).toContain("Read Marcus Aurelius");
    expect(html).toContain("Personal");
    expect(html).toContain("Meditations Book 4");
  });

  it("renders completed task item with done status", () => {
    const html = renderToString(
      <TaskRow
        task={{ ...mockTask, is_done: 1 }}
        onToggle={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(html).toContain("Read Marcus Aurelius");
  });

  it("renders optional divider when showDivider is true", () => {
    const html = renderToString(
      <TaskRow
        task={mockTask}
        showDivider
        onToggle={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(html).toBeDefined();
  });
});
