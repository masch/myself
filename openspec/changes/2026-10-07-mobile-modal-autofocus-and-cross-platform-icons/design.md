# Design: Mobile Modal Input Autofocus Lifecycle & Cross-Platform Icons

## 1. System Architecture & Component Design

### 1.1 Modal Lifecycle & Autofocus Flow

```
AppBottomSheetModal
  ├── Native <Modal onShow={...}>
  └── ModalLifecycle Context Provider (emits when shown)
        └── ThemedTextInput (intercepts autoFocus when inside modal)
              └── Waits for onShow event -> calls .focus()
```

#### TypeScript Contracts (`apps/mobile/src/components/bottom-sheet-modal.tsx`)

```ts
export interface ModalLifecycle {
  readonly shown: boolean;
  subscribe: (listener: () => void) => () => void;
  notifyShow: () => void;
}

export const BottomSheetModalContext =
  React.createContext<ModalLifecycle | null>(null);

export function useBottomSheetModalContext(): ModalLifecycle | null;
```

#### Focus Timing Coordination (`apps/mobile/src/components/themed-text-input.tsx`)

- If `modalLifecycle` is present and `autoFocus` is true:
  - `effectiveAutoFocus` passed to native `<TextInput>` is set to `false`.
  - A subscription is registered to `modalLifecycle.subscribe(doFocus)`.
  - A fallback timer (300ms) guarantees focus even if `onShow` fails to emit in test/web runtimes.
- If outside a modal (`modalLifecycle === null`):
  - Standard native `autoFocus` remains untouched.

---

### 1.2 Cross-Platform `AppIcon` Architecture

```
AppIcon ({ name, size, color })
  ├── iOS: <Image source={name} tintColor={color} /> (expo-image native SF Symbols)
  └── Android & Web: <Text style={{ color, fontSize: size }}>{SF_GLYPH_MAP[name]}</Text>
```

#### Glyph Map Coverage (`apps/mobile/src/components/app-icon.tsx` & `app-icon.web.tsx`)

Both modules share a canonical mapping covering:

- Actions: `sf:trash`, `sf:trash.fill`, `sf:pencil`, `sf:plus`, `sf:plus.circle`, `sf:arrow.uturn.backward`, `sf:xmark`
- Indicators: `sf:star`, `sf:star.fill`, `sf:checkmark.circle`, `sf:checkmark.circle.fill`, `sf:exclamationmark.triangle.fill`, `sf:sparkles`
- Navigation & Status: `sf:book.closed`, `sf:bell.fill`, `sf:moon.fill`, `sf:clock.fill`, `sf:info.circle`

---

### 1.3 Reflections Item List Entry (`apps/mobile/src/features/reflections/components/ItemListInput.tsx`)

- `ItemListInputProps` accepts `autoFocusFirstItem?: boolean` (defaults to `true`).
- Row 0 passes `autoFocus={autoFocusFirstItem && index === 0}` to `ThemedTextInput`.
- Delete action renders `<IconButton icon="sf:trash" color={isOnlyItem ? colors.systemGray : colors.systemRed} />`.
- On Android and Web, the trash button renders a clear, red-tinted glyph, alerting users to item deletion capability.
