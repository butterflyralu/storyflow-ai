## Regenerate traces export

The previous `traces_export.json` appears to be inaccessible for download. I'll regenerate it fresh from the current database with the same comprehensive scope.

### What will be exported

A single JSON file `traces_export_v2.json` written to `/mnt/documents/`, containing for **all users**:

- **All product contexts** (mission, persona, strategy, north star, objectives, AC format, product details)
- **All epics** (title, description, original asA/iWant/soThat, parent context)
- **All generated stories** with:
  - Full story fields: `title`, `asA`, `iWant`, `soThat`, `description`, `acceptance_criteria`, `metadata`
  - Full evaluation: `evaluation_result`, `evaluation_scorecard`, `evaluation_improved_story`, `evaluation_learning_insight`
  - `is_likely_epic` flag and parent `epic_id` (with embedded epic info)
  - Linked `context_id` and `session_id`
- **All chat sessions** with their full message history (role, content, options, timestamps)

### Structure

Top-level keys: `exported_at`, `product_contexts[]`, `epics[]`, `stories[]`, `sessions[]` (each session contains its `messages[]`). Stories embed their parent epic and context inline for easy traversal, and also keep raw IDs for relational use.

### Delivery

After generation I'll emit a `<lov-artifact>` tag pointing at `traces_export_v2.json` so it shows up as a fresh download in your Files panel.

### Technical approach

- Use `psql` via `code--exec` to run a single aggregation query producing nested JSON (same pattern as last time)
- Write directly to `/mnt/documents/traces_export_v2.json`
- Verify file size and record counts before handing off
