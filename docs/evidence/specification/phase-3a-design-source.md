# Phase 3A verified design source

Date: 2026-08-24

Scope: product-wide visual and interaction direction before frontend code.

## Product input

- Product: agent delegation authorization and least-privilege control.
- Users: principals/security operators, delegating operators, and integration
  developers.
- Platform/stack: responsive web application, React 19.2.x.
- Tone/density: calm, technical, enterprise, moderately dense.
- Required routes: `/`, `/grants`, `/grants/new`, `/grants/:grantId`,
  `/grants/:grantId/delegate`, `/checks`, `/activity`, `/integrate`, `/help`.

## Design-system search

Initial command:

```powershell
python ".agents\skills\ui-ux-pro-max\scripts\search.py" "agent authorization security calm dense" --design-system -p "GrantLattice" --persist --output-dir "grantlattice"
```

The result returned relevant pattern/style matches (`Hero + Features + CTA` and
`Minimalism & Swiss Style`) but its top typography match was `Lora / Raleway`
with a wellness/spa profile. That typography result was off-topic and was not
retained. The generated unverified master file was removed before the one
allowed narrower retry.

Narrower retry:

```powershell
python ".agents\skills\ui-ux-pro-max\scripts\search.py" "enterprise agent authorization technical" --design-system -p "GrantLattice" --persist --output-dir "grantlattice"
```

Verified result:

- Returned category: `General`; applicable product fit is established by the
  enterprise-app/SaaS/professional-tool style profile rather than the broad
  category label alone.
- Top pattern: `Hero + Features + CTA`.
- Top style: `Minimalism & Swiss Style`.
- Palette reasoning: trust blue with a high-salience orange action color.
- Typography: `Outfit / Work Sans`, described as geometric, modern, clean, and
  balanced. This fits an enterprise authorization product.
- Effects: low-cost subtle hover, 200-250 ms shared transitions, sharp or
  restrained shadows, clear type hierarchy, and no essential motion.
- Persisted source: `design-system/grantlattice/MASTER.md`.

## Focused interaction search

Command:

```powershell
python ".agents\skills\ui-ux-pro-max\scripts\search.py" "keyboard focus wallet modal" --domain ux
```

Verified top result:

- Domain/source: `ux` / `ux-guidelines.csv`.
- Category/issue: `Interaction` / `Focus States`.
- Guidance: every modal control requires a visible keyboard focus ring; never
  remove the native outline without an equivalent visible replacement.
- Supporting results: sticky UI must not obscure focus, including the WCAG 2.2
  minimum requirement.

## React stack search

Command:

```powershell
python ".agents\skills\ui-ux-pro-max\scripts\search.py" "responsive app navigation" --stack react
```

Verified top result:

- Stack/source: `react` / `stacks/react.csv`.
- Category: `Accessibility`.
- Guidance: use semantic `nav`, `button`, and other native elements rather than
  generic containers with click handlers.
- Compatibility: React 19.2.x; source row verified 2026-08-13.
- Supporting results require an application error boundary and reserve Context
  for genuinely app-wide state rather than individual form fields.

## Applied source-of-truth decisions

- Semantic colors come from the persisted token table: primary `#2563EB`,
  accent `#EA580C`, background `#F8FAFC`, foreground `#1E293B`, card `#FFFFFF`,
  border `#E2E8F0`, destructive `#DC2626`, and focus ring `#2563EB`.
- The token table's `On Accent/CTA: #000000` wins over the generated button
  example's inconsistent white text. Every actual pair will be contrast-tested.
- Cards use the token table's white card surface, not the component example's
  page-background value.
- Heading/body families are Outfit and Work Sans with `font-display: swap`.
- Spacing follows the generated 4/8-based scale: 4, 8, 16, 24, 32, 48, 64 px.
- Phosphor is the single icon family, following the skill Quick Reference;
  decorative icons are hidden from accessibility APIs and icon controls have
  accessible names.
- Primary actions are visually singular per page. Dangerous revocation remains
  spatially and semantically separate from the normal primary action.
- Motion uses opacity/color/shadow transitions only where they express state.
  No correctness depends on animation completion.

## Required checks carried into implementation

- Persistent navigation across every route; no contract-explorer surface.
- Centered deliberate wallet picker with focus trap, Escape close, focus return,
  and no automatic provider selection/account request.
- Visible 3 px focus indicator with adequate state contrast.
- Native semantic controls, visible labels, field-local errors, and an error
  summary for multi-field failures.
- Minimum 44 px web touch targets and at least 8 px separation.
- Body copy at least 16 px on mobile; readable 60-75 character desktop measure.
- No horizontal overflow; verify 360, 375, 768, 1024, and 1440 px plus mobile
  landscape.
- No color-only status, emoji structural icons, hover-only actions, or hidden
  keyboard route.
- `prefers-reduced-motion` disables non-essential transitions and renders the
  final static state.
- Light and dark contrast are tested independently if dark mode is exposed. V1
  will not expose an unverified dark-mode toggle merely because the source style
  supports one.
- Async content reserves space; long IDs/URLs use `overflow-wrap: anywhere`;
  no `word-break: break-all` on prose.
- Missing canonical reads fail closed and show an explicit recovery action.

## Scope restraint

The design system styles a complete operator product. It does not add validator
internals, raw storage, scoring, simulated wallet data, metrics without a user
decision, or external protocol execution not present in v1.
