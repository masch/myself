import { router } from "expo-router";
import { AppButton, EmptyState } from "@/components";
import { colors, spacing } from "@/theme";

/**
 * Shown instead of a screen that needs the local database, in a tab that is
 * simulating a barter producer.
 *
 * A simulation tab renders the app shell without the SQLite providers on
 * purpose: OPFS gives the database file to one tab of the origin at a time, and
 * the POC needs two tabs of one origin to simulate two producers. The isolation
 * stays; what this screen removes is the crash plus the dead end, by naming the
 * reason and offering the gondola back.
 */
export function SimulationTabNotice() {
  return (
    <EmptyState
      testID="simulation-tab-notice"
      icon="sf:info.circle.fill"
      iconColor={colors.systemBlue}
      iconSize={48}
      title="Esta pestaña está simulando un productor"
      description="El resto de la app necesita la base local, y una base local se puede usar desde una sola pestaña a la vez. Volvé a la góndola para seguir operando, o abrí la app en una pestaña normal para ver las demás pantallas."
      action={
        <AppButton
          title="Volver a la góndola"
          variant="primary"
          onPress={() => router.replace("/barter")}
        />
      }
      style={{
        flex: 1,
        backgroundColor: colors.systemBackground,
        padding: spacing.xl,
        justifyContent: "center",
      }}
    />
  );
}
