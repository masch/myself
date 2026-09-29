import {
  ChipButton,
  HeaderButton,
  MeditationText,
  ThemedText,
  Card,
} from "@/components";
import { useReadingForm } from "@/hooks/use-reading-form";
import { colors } from "@/theme";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";

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
            <View style={styles.inputRow}>
              <Image
                source="sf:person.fill"
                style={[styles.inputIcon, { tintColor: colors.systemPurple }]}
              />
              <TextInput
                placeholder="Author name (e.g. Marcus Aurelius)"
                placeholderTextColor={colors.secondaryLabel}
                value={newAuthorName}
                onChangeText={setNewAuthorName}
                style={[styles.input, { color: colors.label }]}
                autoFocus
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.inputRow}>
              <Image
                source="sf:info.circle"
                style={[styles.inputIcon, { tintColor: colors.secondaryLabel }]}
              />
              <TextInput
                placeholder="Short bio / era (optional)"
                placeholderTextColor={colors.secondaryLabel}
                value={newAuthorBio}
                onChangeText={setNewAuthorBio}
                style={[styles.input, { color: colors.label }]}
              />
            </View>
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
          <View style={styles.inputRow}>
            <Image
              source="sf:text.quote"
              style={[styles.inputIcon, { tintColor: colors.systemPurple }]}
            />
            <TextInput
              placeholder={
                activeTabLocale === "es"
                  ? "Ej: Poder sobre la Mente, Anam Cara..."
                  : "E.g., Power over the Mind, The Bridge of Breathing..."
              }
              placeholderTextColor={colors.secondaryLabel}
              value={currentTranslation.title}
              onChangeText={(text) => updateTranslationField("title", text)}
              style={[styles.input, { color: colors.label }]}
            />
          </View>
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
            <View style={styles.quoteInputWrapper}>
              <ThemedText
                variant="title1"
                color={colors.systemPurple}
                style={styles.quoteSign}
              >
                “
              </ThemedText>
              <TextInput
                placeholder={
                  activeTabLocale === "es"
                    ? "Escribe el texto o poema para leer y reflexionar..."
                    : "Write the passage or quote in English (optional)..."
                }
                placeholderTextColor={colors.secondaryLabel}
                value={currentTranslation.content}
                onChangeText={(text) => updateTranslationField("content", text)}
                style={[
                  styles.input,
                  styles.contentInput,
                  { color: colors.label },
                ]}
                multiline
                numberOfLines={6}
              />
            </View>
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  inputIcon: {
    width: 22,
    height: 22,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
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
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(142, 142, 147, 0.2)",
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
