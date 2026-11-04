import "./tabs-web.css";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { SimulationTabNotice } from "@/features/barter/components/simulation-tab-notice";
import { isBarterSimulationTab } from "@/features/barter/simulation-tab";

export default function TabLayout() {
  // A simulation tab has no local database by design, so every screen that needs
  // one explains the situation instead of throwing out of the SQLite context.
  if (isBarterSimulationTab()) {
    return <SimulationTabNotice />;
  }

  return (
    <NativeTabs labelStyle={{ fontSize: 11 }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="meditation">
        <NativeTabs.Trigger.Icon sf="sparkles" md="self_improvement" />
        <NativeTabs.Trigger.Label>Meditación</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="readings">
        <NativeTabs.Trigger.Icon sf="book.closed.fill" md="menu_book" />
        <NativeTabs.Trigger.Label>Lecturas</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reflections">
        <NativeTabs.Trigger.Icon sf="text.bubble.fill" md="psychology" />
        <NativeTabs.Trigger.Label>Reflexiones</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
