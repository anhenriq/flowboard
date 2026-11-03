# FlowBoard Design System

This document describes the visual design of FlowBoard as it appears in the Figma file **"FlowBoard Designs (JD) (Copy)"**, page **Base Designs**. It is written in plain language so designers, writers and developers can all use it.

**Where the numbers come from.** The Figma file doesn't define named colors, text styles or spacing variables. Every value below was read from the layers on the six screens on the **Base Designs** page (Log-in, Homepage, Create Project Board, Create Card, Card Created, and the Add Card dialog) and from the master pieces on the **Components** page (Navbar, Button, Logo, Toggle, Input Field, Form, Modal, Project Board, Status Column, TaskCard). If the designers later add named styles in Figma, those names should replace the descriptions here.

**Sizes** are in pixels, as they appear on the Figma canvas.

---

## 1. Colors

### Brand and action colors
| Role | Color | Where it's used |
|---|---|---|
| **Primary blue** | `#0369a1` (a deep ocean blue) | The main buttons ("Sign in", "Save"), links ("Forgot password?"), the FlowBoard logo tile |
| **Highlight purple** | `#8a38f5` (a vivid violet) | The "New Board" button on the homepage. It is also the default fill of the master Button on the Components page (see "Things to settle") |
| **Dark slate** | `#1f2937` (a very dark blue-gray) | The secondary button, which has a GitHub-style icon and is meant for signing in with another service |
| **Avatar indigo** | `#6366f1` (a soft indigo) | The round user avatar in the top bar |

### Text colors
| Role | Color | Where it's used |
|---|---|---|
| **Main text** | `#0a0a0a` (almost black) | Headings, labels, card titles, anything meant to be read first |
| **Quiet text** | `#717182` (a muted gray-violet) | Placeholder text, dates, column counts, "Add card" links, the "3 columns" note, inactive tabs |
| **Text on color** | White | Text sitting on a blue or purple button |
| **Danger text** | `#d4183d` (a strong red) | "Delete card" |

### Surfaces and lines
| Role | Color | Where it's used |
|---|---|---|
| **Page and card surface** | White | The page background, cards, dialogs, the sign-in panel, form fields |
| **Column background** | `#f3f4f6` (a pale cool gray) | Behind each status column, and behind the sign-in tab strip |
| **Highlighted field** | `#e0e7ff` (a pale lavender-blue) | The email field while it's being typed in (the focus state) |
| **Hairline border** | Black at 10% strength (a very light gray line) | Around cards, fields and empty drop zones, and under the top bars |
| **Dialog backdrop** | Black at 50% strength | The dimmed screen behind a dialog |

### Depth (shadows)
- **Sign-in panel:** a soft, medium shadow underneath.
- **Dialogs:** a larger, softer shadow so they clearly float above the dimmed page.
- **Selected tab:** a very slight shadow so it looks raised above the gray tab strip.

---

## 2. Typography

**Typeface:** Inter, throughout. Two weights are used: **Regular** and **Medium**. There is no bold.

Text is set slightly tight: a very small negative letter spacing on most sizes. The exception is small uppercase labels, which are spaced out.

| Level | Size | Line height | Weight | Used for |
|---|---|---|---|---|
| **Page title** | 24 | 36 | Medium | The board name in the second top bar ("new board") |
| **Section heading** | 18 | 28 | Medium | Dialog titles ("Card", "Create board"), board names on the homepage tiles |
| **Body and controls** | 16 | 24 | Regular or Medium | Navigation links, form field text, button labels, the "FlowBoard" wordmark |
| **Label and detail** | 14 | 20 | Regular or Medium | Column titles, card text, field labels, dates on board tiles, "Add card" |
| **Small caption** | 12 | 16 | Regular or Medium | Card counts in columns, the avatar letter |
| **Small uppercase label** | 12 | 16 | Medium, uppercase, slightly spaced out | "DESCRIPTION", "PRIORITY", "DUE DATE" above dialog fields |

**Rules of thumb**
- Medium weight is for things you act on or scan: headings, labels, buttons.
- Regular weight is for content you read: card text, placeholders, counts.
- Quiet gray text is used for anything supporting rather than primary.

---

## 3. Spacing and shape

### The basic rhythm
Spacing moves in steps of **4**: 4, 8, 12, 16, 24, 32. Nearly everything uses 8, 16, 24 or 32.

| Step | Typical use |
|---|---|
| **4** | Padding inside the tab strip around the tabs |
| **8** | Gap between a label and its field; gap between an icon and its text |
| **12** | Space inside text fields on the left and right; gap between dialog buttons |
| **16** | Gap between columns; gap between fields in a form; padding inside a column; gap between board tiles |
| **24** | Padding inside dialogs; padding on each side of the top bar; gap between sections inside the sign-in panel |
| **32** | Page margin on the board screen; padding inside the sign-in panel; side padding of the second top bar |

### Corner roundness
- **10:** buttons, text fields, columns, cards, board tiles, empty drop zones. This is the standard corner.
- **8:** the individual tabs inside the sign-in tab strip.
- **16:** dialogs and the sign-in panel (the larger surfaces).
- **Fully round:** the avatar and the small count badge in each column.

### Standard sizes
- **Buttons:** 44 tall. 16 of padding on each side.
- **Text fields:** about 46 tall, with 12 of padding on the sides.
- **Multi-line text box:** about 80 tall.
- **Dropdown:** about 38 tall.
- **Top bar:** 65 tall. **Second top bar** (breadcrumb row): 69 tall.
- **Logo tile:** a blue rounded square holding a three-column board icon. It comes in two sizes. The small one is 32 by 32 with 10 rounded corners and a 20 icon, used in the top bar. The large one is 48 by 48 with 14 rounded corners and a 24 icon, used on the sign-in screen.
- **Avatar:** 24 across.
- **Icons:** 16 next to "Add card", 18 on the "New Board" button, 20 for the dialog close icon, 24 in empty drop zones.

### Page layouts
- **Board screen:** content starts 32 in from the left edge and 24 below the second top bar. Columns sit side by side with a 16 gap. In the design every column is roughly 320 wide and 224 tall.
- **Homepage:** content sits in a centered area about 1280 wide. The "My Boards" heading and "New Board" button share a row, and board tiles sit below with a 16 gap.
- **Sign-in screen:** a centered stack: logo tile, the "FlowBoard" title, a one-line tagline ("Sign in to manage your boards"), then the sign-in panel, which is 448 wide.
- **Dialogs:** centered on the dimmed page. The board-creation dialog is 448 wide. The card dialog is 512 wide.

---

## 4. Component patterns

### Column
A column is one stage of work (the design shows **To Do**, **In Progress** and **Done**).

- A pale gray rounded panel with 16 of padding all around, and 16 between its parts.
- **Header row:** the column title on the left in 14 Medium, and a small white pill on the right showing how many cards it holds, in 12 quiet gray.
- **Card area:** the cards stacked in the middle.
- **Add card:** at the bottom, a plus icon and the words "Add card" in 14 Medium quiet gray. It looks like a plain text link rather than a filled button.
- **Empty column:** the card area becomes a white box with a **dashed** light border, a small upload-style icon, and the message "Drop a card here or add one below" in quiet gray. This tells people the column accepts dragged cards.

### Card (task card)
- A white rounded rectangle with a hairline border and **no shadow**, sitting on the gray column.
- Padding is about 13 on all sides, so it measures about 46 tall with a single line of text.
- The design shows only the card **title**, in 14 Regular main text. It doesn't show assignee, due date or priority on the card face. Those appear in the dialog.
- Cards fill the full width of the column and stack with the same small gap.

### Board tile (homepage)
- A white rounded rectangle, about 308 wide by 105 tall, with a hairline border and generous padding (about 25).
- **Title** in 18 Medium main text, with the **creation date** under it in 14 Medium quiet gray.
- Tiles sit in a row with a 16 gap.

### Card dialog ("Add card" and "Edit card")
- Centered on a half-dark backdrop. White, 16 rounded corners, large soft shadow, 24 padding, 512 wide.
- **Title row:** the heading "Card" on the left and a small close (X) icon on the right.
- **Fields, top to bottom:**
  1. **Name:** label in 14 Medium main text, then a text field with the placeholder "Enter card name…".
  2. **Description:** small uppercase label, then a multi-line box with the placeholder "Add a description…".
  3. **Priority and Due Date:** side by side, each half the width, with small uppercase labels.
- **Footer:** separated from the form by a hairline line. **Delete card** sits on the left in red 14 Medium. **Cancel** (plain text) and **Save** (filled primary blue) sit on the right with a 12 gap.

### Board dialog ("Create board")
- Same look as the card dialog but narrower (448 wide).
- One field: **Board name**, with the placeholder "e.g. Product Roadmap".
- Footer buttons: **Cancel** and **Create**, aligned to the right.

### Sign-in panel
- A white 16-rounded panel, 448 wide, 32 of padding, with a medium shadow.
- **Tab strip** at the top: three options (**Password**, **Magic link**, **Sign up**) inside a pale gray rounded strip. The selected tab is a white raised pill with main text. The unselected tabs are quiet gray with no background.
- **Fields:** Email address and Password, each with a 14 Medium label above. Field text is 16, placeholders are quiet gray.
- **Focus state:** the field being typed in turns pale lavender-blue (`#e0e7ff`) and its border disappears.
- **"Forgot password?"** link, right-aligned, in primary blue.
- **Sign in** button: full width, primary blue, white 16 Medium text.

### Buttons
| Kind | Look | Used for |
|---|---|---|
| **Primary** | Filled primary blue, white text, centered label | Sign in, Save, Create (see "Things to settle" about the master being violet) |
| **Action** | Filled violet, white text, plus-sign icon before the label | New Board (homepage) |
| **Secondary** | Filled dark slate, white text, GitHub-style icon before the label, full width | Signing in with another service (defined in the components but not used on any screen) |
| **Plain** | No fill, main text | Cancel |
| **Text link** | No fill, quiet gray, small | Add card |
| **Danger link** | No fill, red text | Delete card |

All filled buttons are 44 tall, with 10-radius corners and 16 Medium text. Primary and Secondary buttons can stretch to the full width of a form (384 on the sign-in panel). Action buttons are only as wide as their content.

### Tabs (toggle)
- A pale gray strip, 44 tall with 10 rounded corners and 4 of padding, holding the options.
- Each option is a pill with 8 rounded corners, 24 of side padding and 14 Medium text.
- **Active:** white pill, main text, slight shadow. **Inactive:** gray pill matching the strip, quiet gray text.
- Used for the sign-in options: Password, Magic link, Sign up.

### Top bars
- **Main bar** (65 tall, white, hairline underneath): on the left the blue logo tile, the word "FlowBoard" and a "Boards" link. On the right, the round avatar and "Sign out".
- **Second bar** (69 tall, on board screens): a breadcrumb reading "Boards / board name", with the board name large (24 Medium) and a quiet note such as "3 columns" beside it.

---

## 5. How the app applies this

The app follows the screens (blue primary, white page, gray columns, Inter, the standard 10 corner). Where the design left a choice open, or clashed with accessibility or the app's features, these are the decisions made:

- **Primary color:** blue (`#0369a1`) everywhere. Violet is not used.
- **Quiet gray text:** a slightly darker shade (`#6a6a7c` instead of `#717182`) so it stays above the 4.5:1 contrast target on the gray columns.
- **Avatar color:** a slightly deeper indigo (`#5457e6`) so the white initial is readable.
- **Cards:** the app keeps its priority badge, due date and assignee under the title.
- **Labels in the card dialog:** the first field uses the 14 Medium style. The rest are small uppercase captions.
- **Dark mode:** the design has none, so the app keeps its existing dark palette and uses the same shapes and spacing.
- **Not built:** multiple boards, the "Magic link" tab, the dark slate GitHub-style button and the Priority-as-dropdown design, because the app has no matching features.

---

## 6. Things to settle

These came up while reading the file. They are worth a quick decision so the design stays consistent.

1. **Two action colors.** On the screens, blue is the main action color everywhere except the homepage "New Board" button, which is violet. On the Components page the master Button is violet for both Primary and Action, so the blue buttons on the screens are overrides. The "Create" and "Save" buttons in the master Modal also show violet with a placeholder "Button Label". Decide whether violet or blue is the real primary, then update the master Button so screens don't need overrides.
2. **Cards show less than the app does.** The design's card face shows only a title. The current FlowBoard app also shows details such as the assignee and due date on the card. Decide which is right.
3. **Boards versus a single board.** The design has a homepage of boards ("My Boards", "New Board") and a sign-in with Password, Magic link and Sign up tabs. The current app has one board and a simple email-and-password form with no tabs.
4. **Priority.** The dialog design includes a Priority dropdown, but its options aren't filled in. The app has no priority field today.
5. **Empty dropdown and date field.** In the dialog, the Priority and Due Date fields are drawn as empty boxes with no placeholder text or icons.
6. **Dialog titles differ.** The master Modal is titled "Create Task" (and "Create board"), while the screen uses "Card". Its Cancel button also has 12 of padding on all sides in the master, but sits flush in the screen. Pick one wording and spacing.
7. **Unused pieces.** The Secondary (dark slate, GitHub-style) button and the "Magic link" tab are drawn but nothing in the app uses them yet.
8. **Text size in dialogs.** Field labels vary: the Name label is 14 Medium in dark text, while Description, Priority and Due Date are small uppercase labels in quiet gray. Pick one label style for forms.
9. **Contrast.** Quiet gray (`#717182`) on the pale gray column (`#f3f4f6`) is a little under the 4.5:1 target for small text. Quiet gray on white is fine. Worth checking against FlowBoard's accessibility goals.
