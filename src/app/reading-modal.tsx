import { useState } from "react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  Alert,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { useReadings } from "@/hooks/use-readings";
import { useAuthors } from "@/hooks/use-authors";
import { HeaderButton, ChipButton } from "@/components";
import { colors } from "@/theme/colors";

export default function ReadingModalScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    authorId?: string;
    content?: string;
  }>();

  const isEditing = Boolean(params.id);

  const { addReading, updateReading } = useReadings();
  const { authors, addAuthor } = useAuthors();

  const [selectedAuthorId, setSelectedAuthorId] = useState<string>(
    params.authorId ?? "",
  );
  const [content, setContent] = useState<string>(params.content ?? "");
  const [isAddingNewAuthor, setIsAddingNewAuthor] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorBio, setNewAuthorBio] = useState("");

  const activeAuthorId =
    selectedAuthorId || (authors.length > 0 ? authors[0].id : "");

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert("Text required", "Please enter the meditation text to read.");
      return;
    }

    let finalAuthorId = activeAuthorId;

    if (isAddingNewAuthor) {
      if (!newAuthorName.trim()) {
        Alert.alert("Author required", "Please enter the new author's name.");
        return;
      }

      try {
        finalAuthorId = await addAuthor({
          name: newAuthorName.trim(),
          bio: newAuthorBio.trim(),
        });
      } catch (error) {
        console.error("Failed to create author:", error);
        Alert.alert(
          "Error",
          "Could not create author. The name might already exist.",
        );
        return;
      }
    }

    if (!finalAuthorId) {
      Alert.alert("Author required", "Please select or create an author.");
      return;
    }

    try {
      if (isEditing && params.id) {
        await updateReading({
          id: params.id,
          authorId: finalAuthorId,
          content: content.trim(),
        });
      } else {
        await addReading({
          authorId: finalAuthorId,
          content: content.trim(),
        });
      }
      router.back();
    } catch (error) {
      console.error("Failed to save reading:", error);
      Alert.alert("Error", "Could not save reading text.");
    }
  };

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
              onPress={() => router.back()}
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
          <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
            AUTHOR / PHILOSOPHER
          </Text>
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
          <View
            style={[
              styles.card,
              { backgroundColor: colors.secondarySystemBackground },
            ]}
          >
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
          </View>
        )}
      </View>

      {/* Reading Passage Input Card */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
          PASSAGE / QUOTE
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.secondarySystemBackground },
          ]}
        >
          <View style={styles.quoteInputWrapper}>
            <Text style={[styles.quoteSign, { color: colors.systemPurple }]}>
              “
            </Text>
            <TextInput
              placeholder="Write the passage or quote to read and reflect on before meditating..."
              placeholderTextColor={colors.secondaryLabel}
              value={content}
              onChangeText={setContent}
              style={[
                styles.input,
                styles.contentInput,
                { color: colors.label },
              ]}
              multiline
              numberOfLines={6}
            />
          </View>
        </View>
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
});
