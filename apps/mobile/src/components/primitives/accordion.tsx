import React from "react";
import { StyleSheet } from "react-native";
import * as AccordionPrimitive from "@rn-primitives/accordion";
import { colors, spacing } from "@/theme";

export type AccordionProps = AccordionPrimitive.RootProps;

export function AccordionRoot({ children, style, ...props }: AccordionProps) {
  return (
    <AccordionPrimitive.Root style={[styles.root, style]} {...props}>
      {children}
    </AccordionPrimitive.Root>
  );
}

export type AccordionItemProps = AccordionPrimitive.ItemProps;

export function AccordionItem({
  children,
  style,
  ...props
}: AccordionItemProps) {
  return (
    <AccordionPrimitive.Item style={[styles.item, style]} {...props}>
      {children}
    </AccordionPrimitive.Item>
  );
}

export type AccordionHeaderProps = AccordionPrimitive.HeaderProps;

export function AccordionHeader({
  children,
  style,
  ...props
}: AccordionHeaderProps) {
  return (
    <AccordionPrimitive.Header style={[styles.header, style]} {...props}>
      {children}
    </AccordionPrimitive.Header>
  );
}

export type AccordionTriggerProps = AccordionPrimitive.TriggerProps;

export function AccordionTrigger({
  children,
  style,
  ...props
}: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Trigger
      style={(state) => [
        styles.trigger,
        state.pressed && styles.triggerPressed,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {children}
    </AccordionPrimitive.Trigger>
  );
}

export type AccordionContentProps = AccordionPrimitive.ContentProps;

export function AccordionContent({
  children,
  style,
  ...props
}: AccordionContentProps) {
  return (
    <AccordionPrimitive.Content style={[styles.content, style]} {...props}>
      {children}
    </AccordionPrimitive.Content>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  item: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  header: {
    width: "100%",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  triggerPressed: {
    opacity: 0.7,
  },
  content: {
    overflow: "hidden",
    paddingBottom: spacing.md,
  },
});

export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Header: AccordionHeader,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});
