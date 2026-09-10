import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useReadings } from "./use-readings";
import { useAuthors } from "./use-authors";
import { type EntityId, type SupportedLocale } from "@myself/shared";

export interface TranslationFormState {
  title: string;
  content: string;
}

export interface UseReadingFormProps {
  id?: string;
  initialAuthorId?: string;
  initialTitle?: string;
  initialContent?: string;
}

export function useReadingForm({
  id,
  initialAuthorId,
  initialTitle,
  initialContent,
}: UseReadingFormProps) {
  const isEditing = Boolean(id);
  const { addReading, updateReading, getTranslations } = useReadings();
  const { authors, addAuthor } = useAuthors();

  const [selectedAuthorId, setSelectedAuthorId] = useState<string>(
    initialAuthorId ?? "",
  );
  const [activeTabLocale, setActiveTabLocale] = useState<SupportedLocale>("es");
  const [translations, setTranslations] = useState<
    Record<SupportedLocale, TranslationFormState>
  >({
    es: { title: initialTitle ?? "", content: initialContent ?? "" },
    en: { title: "", content: "" },
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isAddingNewAuthor, setIsAddingNewAuthor] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorBio, setNewAuthorBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeAuthorId =
    selectedAuthorId || (authors.length > 0 ? authors[0].id : "");

  // Load existing translations if editing
  useEffect(() => {
    if (isEditing && id) {
      void getTranslations(id)
        .then((savedTranslations) => {
          const es = savedTranslations.find((t) => t.locale === "es");
          const en = savedTranslations.find((t) => t.locale === "en");
          setTranslations({
            es: {
              title: es?.title ?? initialTitle ?? "",
              content: es?.content ?? initialContent ?? "",
            },
            en: {
              title: en?.title ?? "",
              content: en?.content ?? "",
            },
          });
        })
        .catch(() => {});
    }
  }, [isEditing, id, getTranslations, initialTitle, initialContent]);

  const updateTranslationField = useCallback(
    (field: keyof TranslationFormState, value: string) => {
      setTranslations((prev) => ({
        ...prev,
        [activeTabLocale]: {
          ...prev[activeTabLocale],
          [field]: value,
        },
      }));
    },
    [activeTabLocale],
  );

  const handleSave = async () => {
    const esTitle = translations.es.title.trim();
    const esContent = translations.es.content.trim();

    if (!esTitle) {
      Alert.alert(
        "Spanish title required",
        "Please enter a title in Spanish (Castellano) for the meditation reading.",
      );
      return;
    }

    if (!esContent) {
      Alert.alert(
        "Spanish text required",
        "Please enter the meditation text in Spanish (Castellano).",
      );
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

    const enTitle = translations.en.title.trim();
    const enContent = translations.en.content.trim();

    const translationsPayload = {
      es: {
        title: esTitle,
        content: esContent,
      },
      en:
        enTitle || enContent
          ? {
              title: enTitle || esTitle,
              content: enContent || esContent,
            }
          : undefined,
    };

    try {
      setIsSubmitting(true);
      if (isEditing && id) {
        await updateReading({
          id: id as EntityId,
          authorId: finalAuthorId as EntityId,
          translations: translationsPayload,
        });
      } else {
        await addReading({
          authorId: finalAuthorId as EntityId,
          translations: translationsPayload,
        });
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/readings");
      }
    } catch (error) {
      console.error("Failed to save reading:", error);
      Alert.alert("Error", "Could not save reading text.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isEditing,
    authors,
    activeAuthorId,
    selectedAuthorId,
    setSelectedAuthorId,
    activeTabLocale,
    setActiveTabLocale,
    currentTranslation: translations[activeTabLocale],
    updateTranslationField,
    isPreviewMode,
    setIsPreviewMode,
    isAddingNewAuthor,
    setIsAddingNewAuthor,
    newAuthorName,
    setNewAuthorName,
    newAuthorBio,
    setNewAuthorBio,
    isSubmitting,
    handleSave,
  };
}
