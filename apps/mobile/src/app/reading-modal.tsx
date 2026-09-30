import {
  ChipButton,
  HeaderButton,
  MeditationText,
  ThemedText,
  Card,
  FormRow,
  Divider,
} from "@/components";
import { useReadingForm } from "@/hooks/use-reading-form";
import { colors } from "@/theme";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

export default function ReadingModalScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    authorId?: string;
    title?: string;
    content?: string;
  }>();

  const {
    isEditing,
    authors,
    activeAuthorId,
    setSelectedAuthorId,
    activeTabLocale,
    setActiveTabLocale,
    currentTranslation,
    updateTranslationField,
    isPreviewMode,
    setIsPreviewMode,
    isAddingNewAuthor,
    setIsAddingNewAuthor,
    newAuthorName,
    setNewAuthorName,
    newAuthorBio,
    setNewAuthorBio,
    handleSave,
  } = useReadingForm({
    id: params.id,
    initialAuthorId: params.authorId,
    initialTitle: params.title,
    initialContent: params.content,
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.systemBackground }]}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen
        options={{
          title: isEditing ? "Edit Reading" : "New Reading",
          presentation: "modal",
          headerLeft: () => (
            <HeaderButton
              title="Cancel"
              variant="cancel"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/readings");
                }
              }}
            />
          ),
          headerRight: () => (
            <HeaderButton title="Save" variant="primary" onPress={handleSave} />
          ),
        }}
      />

      {/* Author Selection Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText
            variant="caption1"
            color={colors.secondaryLabel}
            style={styles.sectionTitle}
          >
            AUTHOR / PHILOSOPHER
          </ThemedText>
          <ChipButton
            title={isAddingNewAuthor ? "Choose existing" : "+ New author"}
            variant="purple"
            onPress={() => setIsAddingNewAuthor(!isAddingNewAuthor)}
          />
        </View>

        {!isAddingNewAuthor ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.authorsRow}
          >
            {authors.map((author) => {
              const isSelected = author.id === activeAuthorId;
              return (
                <ChipButton
                  key={author.id}
                  title={author.name}
                  icon="sf:person.circle.fill"
                  variant={isSelected ? "purple" : "secondary"}
                  onPress={() => setSelectedAuthorId(author.id)}
                />
              );
            })}
          </ScrollView>
        ) : (
          <Card variant="subdued" padding="none" style={styles.card}>
            <FormRow>
              <FormRow.Leading>
                <Image
                  source="sf:person.fill"
                  style={[styles.inputIcon, { tintColor: colors.systemPurple }]}
                />
              </FormRow.Leading>
              <FormRow.Input
                placeholder="Author name (e.g. Marcus Aurelius)"
                value={newAuthorName}
                onChangeText={setNewAuthorName}
                autoFocus
              />
            </FormRow>

            <Divider style={styles.divider} />

            <FormRow>
              <FormRow.Leading>
                <Image
                  source="sf:info.circle"
                  style={[
                    styles.inputIcon,
                    { tintColor: colors.secondaryLabel },
                  ]}
                />
              </FormRow.Leading>
              <FormRow.Input
                placeholder="Short bio / era (optional)"
                value={newAuthorBio}
                onChangeText={setNewAuthorBio}
              />
            </FormRow>
          </Card>
        )}
      </View>

      {/* Language Selector Section */}
      <View style={styles.section}>
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.sectionTitle}
        >
          LANGUAGE / IDIOMA
        </ThemedText>
        <View style={styles.localeRow}>
          <ChipButton
            title="🇪🇸 Castellano (Requerido)"
            variant={activeTabLocale === "es" ? "purple" : "secondary"}
            onPress={() => setActiveTabLocale("es")}
          />
          <ChipButton
            title="🇬🇧 English (Opcional)"
            variant={activeTabLocale === "en" ? "purple" : "secondary"}
            onPress={() => setActiveTabLocale("en")}
          />
        </View>
      </View>

      {/* Title Input Card */}
      <View style={styles.section}>
        <ThemedText
          variant="caption1"
          color={colors.secondaryLabel}
          style={styles.sectionTitle}
        >
          {activeTabLocale === "es"
            ? "TITLE (CASTELLANO - REQUERIDO)"
            : "TITLE (ENGLISH - OPTIONAL)"}
        </ThemedText>
        <Card variant="subdued" padding="none" style={styles.card}>
          <FormRow>
            <FormRow.Leading>
              <Image
                source="sf:text.quote"
                style={[styles.inputIcon, { tintColor: colors.systemPurple }]}
              />
            </FormRow.Leading>
            <FormRow.Input
              placeholder={
                activeTabLocale === "es"
                  ? "Ej: Poder sobre la Mente, Anam Cara..."
                  : "E.g., Power over the Mind, The Bridge of Breathing..."
              }
              value={currentTranslation.title}
              onChangeText={(text) => updateTranslationField("title", text)}
            />
          </FormRow>
        </Card>
      </View>

      {/* Reading Passage Input Card */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText
            variant="caption1"
            color={colors.secondaryLabel}
            style={styles.sectionTitle}
          >
            {activeTabLocale === "es"
              ? "PASSAGE / POETRY (CASTELLANO)"
              : "PASSAGE / POETRY (ENGLISH)"}
          </ThemedText>
          <ChipButton
            title={isPreviewMode ? "Edit Markdown" : "Live Preview"}
            icon={isPreviewMode ? "sf:pencil" : "sf:eye.fill"}
            variant="purple"
            onPress={() => setIsPreviewMode((prev) => !prev)}
          />
        </View>

        <Card variant="subdued" padding="none" style={styles.card}>
          {isPreviewMode ? (
            <View style={styles.previewWrapper}>
              {currentTranslation.content.trim() ? (
                <MeditationText
                  content={currentTranslation.content}
                  baseFontSize={16}
                  baseLineHeight={24}
                  textColor={colors.label}
                  accentColor={colors.systemPurple}
                />
              ) : (
                <ThemedText
                  variant="callout"
                  color={colors.secondaryLabel}
                  style={styles.emptyPreviewText}
                >
                  Write some verses above to preview formatting.
                </ThemedText>
              )}
            </View>
          ) : (
            <FormRow style={styles.quoteInputWrapper}>
              <FormRow.Leading>
                <ThemedText
                  variant="title1"
                  color={colors.systemPurple}
                  style={styles.quoteSign}
                >
                  “
                </ThemedText>
              </FormRow.Leading>
              <FormRow.Input
                placeholder={
                  activeTabLocale === "es"
                    ? "Escribe el texto o poema para leer y reflexionar..."
                    : "Write the passage or quote in English (optional)..."
                }
                value={currentTranslation.content}
                onChangeText={(text) => updateTranslationField("content", text)}
                style={styles.contentInput}
                multiline
                numberOfLines={6}
              />
            </FormRow>
          )}
        </Card>

        <ThemedText
          variant="caption2"
          color={colors.secondaryLabel}
          style={styles.formatHelpText}
        >
          ✨ Supports Markdown: *italic*, **bold**, &gt; reflection stanza, and
          verse indentation.
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
  authorsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  localeRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderCurve: "continuous",
  },
  inputIcon: {
    width: 22,
    height: 22,
  },
  quoteInputWrapper: {
    paddingVertical: 8,
  },
  quoteSign: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: -4,
  },
  contentInput: {
    minHeight: 120,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  divider: {
    marginLeft: 34,
  },
  previewWrapper: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    minHeight: 120,
  },
  emptyPreviewText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
  formatHelpText: {
    fontSize: 12,
    fontStyle: "italic",
    paddingHorizontal: 4,
    lineHeight: 16,
  },
});
