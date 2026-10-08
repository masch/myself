# Personal Reflections Specification Extension

## Purpose

Ensures seamless and friction-free reflection responses by enabling automatic initial input focus and visible row deletion actions across all reflection modal types.

## Requirements

### Requirement: Initial Row Autofocus in Item List Reflections

The system MUST automatically focus the first input row when presenting an `item_list` reflection prompt to allow instant keyboard typing.

#### Scenario: Automatically focus first row upon opening item_list modal

- GIVEN a reflection question of type `item_list`
- WHEN the user opens the answer modal via `handleOpenAnswer`
- THEN the first input row (`index === 0`) in `ItemListInput` MUST have autofocus enabled
- AND the keyboard MUST open automatically once the modal is presented

### Requirement: Visible Delete Action in Item List Reflections

The system MUST display a visible and styled delete icon alongside each removable item row in `ItemListInput`.

#### Scenario: Render visible trash icon for row deletion

- GIVEN an `item_list` question with more than one item
- WHEN the user views any removable item row
- THEN the delete button al costado MUST display a visible trash/delete icon styled with `colors.systemRed`
- AND WHEN tapped, the system MUST remove the row and present the undo banner
