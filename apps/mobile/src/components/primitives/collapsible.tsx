import React from "react";
import { StyleSheet } from "react-native";

import * as CollapsiblePrimitive from "@rn-primitives/collapsible";
import { spacing } from "@/theme";

export type CollapsibleProps = CollapsiblePrimitive.RootProps;

export function CollapsibleRoot({
  children,
  style,
  ...props
}: CollapsibleProps) {
  return (
    <CollapsiblePrimitive.Root style={style} {...props}>
      {children}
    </CollapsiblePrimitive.Root>
  );
}

export type CollapsibleTriggerProps = CollapsiblePrimitive.TriggerProps;

export function CollapsibleTrigger({
  children,
  style,
  ...props
}: CollapsibleTriggerProps) {
  return (
    <CollapsiblePrimitive.Trigger
      style={(state) => [
        styles.trigger,
        state.pressed && styles.triggerPressed,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.Trigger>
  );
}

export type CollapsibleContentProps = CollapsiblePrimitive.ContentProps;

export function CollapsibleContent({
  children,
  style,
  ...props
}: CollapsibleContentProps) {
  return (
    <CollapsiblePrimitive.Content style={[styles.content, style]} {...props}>
      {children}
    </CollapsiblePrimitive.Content>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 44,
    justifyContent: "center",
  },
  triggerPressed: {
    opacity: 0.7,
  },
  content: {
    overflow: "hidden",
    paddingTop: spacing.xs,
  },
});

export const Collapsible = Object.assign(CollapsibleRoot, {
  Trigger: CollapsibleTrigger,
  Content: CollapsibleContent,
});
