

## Plan: Add Logo and Adapt Styling to Blue Gradient Theme

The uploaded image is a blue-gradient logo for StoryFlow AI. Two things to do: use it as favicon + header logo, and shift the color palette from purple to blue to match.

### Steps

1. **Copy logo to public directory** — Copy `user-uploads://storyflowAI.jpeg` to `public/logo.jpeg` for favicon and to `src/assets/logo.jpeg` for component use

2. **Update `index.html`** — Add favicon link pointing to `/logo.jpeg`

3. **Update `src/components/Wizard.tsx`** — Replace the "S" placeholder div with an `<img>` tag using the imported logo asset

4. **Update `src/index.css`** — Shift the color palette from purple (258°) to blue (210-220°) to match the logo's gradient:
   - `--primary`: purple → blue (e.g., `210 80% 50%`)
   - `--accent`: purple-tinted → blue-tinted
   - `--ring`: match primary
   - All `--purple`, `--violet`, `--indigo` custom vars → blue range
   - `--panel-dark` → dark navy
   - Both light and dark mode vars updated

5. **Update `tailwind.config.ts`** — No structural changes needed (colors reference CSS vars), but update shadow hue references from `258` to `210`

| File | Change |
|------|--------|
| `public/logo.jpeg` | Copy uploaded logo |
| `src/assets/logo.jpeg` | Copy uploaded logo for imports |
| `index.html` | Add `<link rel="icon">` |
| `src/components/Wizard.tsx` | Replace placeholder with logo image |
| `src/index.css` | Shift palette from purple to blue |
| `tailwind.config.ts` | Update shadow hue values |

