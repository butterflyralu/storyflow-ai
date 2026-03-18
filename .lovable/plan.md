

## Plan: Product Context List + CRUD before Edit

### Current behavior
- Sidebar footer "Edit Context" button sets `step(3)`, which renders `ProductContextSettings` -- immediately opening the edit form for the *current* context.
- "Use Demo Content" button appears in `ContextWizard` (step 1) even when editing existing contexts.

### Proposed changes

**1. Add a new WizardStep value `4`** for the context list view.
- Update `WizardStep` type from `1 | 2 | 3` to `1 | 2 | 3 | 4`.
- "Edit Context" sidebar button will now call `setStep(4)` instead of `setStep(3)`.

**2. Create `ProductContextList` component** (`src/components/ProductContextList.tsx`)
- Displays all user contexts as cards in a list, each showing: product name, industry, platform badge, and updated date.
- Each card has: **Edit** (pencil icon) and **Delete** (trash icon) actions.
- Edit action: sets the selected context as active and navigates to step 3 (existing edit form).
- Delete action: shows an `AlertDialog` confirmation, then deletes from DB and refreshes list.
- A "Create New Product" button at the top navigates to step 1 (the `ContextWizard`).
- "Back to Chat" button returns to step 2.

**3. Update `Wizard.tsx`** to render `ProductContextList` when `step === 4`.

**4. Update `ContextWizard` (step 1)**
- "Use Demo Content" button is already only shown on `screen === 0` inside the wizard, which is only reached when creating a new context. No change needed -- this already only appears for new contexts.

**5. Update `ProductContextSettings` (step 3)**
- Change "Back to Chat" button to go to step 4 (context list) instead of step 2, so users return to the list after editing.

**6. Update `AppSidebar`**
- Change "Edit Context" `onClick` from `setStep(3)` to `setStep(4)`.

**7. Add delete method to `usePersistedContext` hook**
- Add `deleteContext(id: string)` function that deletes from `product_contexts` table.

### Files changed
- `src/types/wizard.ts` -- expand `WizardStep` type
- `src/components/ProductContextList.tsx` -- new component
- `src/components/Wizard.tsx` -- render new step
- `src/components/ProductContextSettings.tsx` -- back button targets step 4
- `src/components/AppSidebar.tsx` -- edit context targets step 4
- `src/hooks/usePersistedContext.ts` -- add `deleteContext`

