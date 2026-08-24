# Phase 3A — Responsive and interaction evidence

Date: 2026-08-24
Scope: frontend baseline before contract implementation
Status: PASS

## Verified design source

The project-local `ui-ux-pro-max` skill was invoked before frontend code was written. The verified database matches and the one rejected match are recorded in `docs/evidence/specification/phase-3a-design-source.md`.

Applied baseline:

- Hero + Features + CTA product structure.
- Minimal / Swiss visual language.
- Outfit headings and Work Sans body copy.
- Blue trust/navigation color, orange primary-action color, light neutral surfaces.
- Phosphor icons only; no emoji controls.
- Semantic landmarks, visible focus, 44px minimum controls, keyboard modal behavior, and reduced-motion fallback.

## Automated responsive and accessibility proof

Command:

```powershell
cd frontend
npm test -- src/accessibility.test.tsx src/responsive.test.tsx
```

Real output:

```text
Test Files  2 passed (2)
Tests       12 passed (12)
```

The nine product routes passed automated axe checks. Color contrast was excluded from jsdom axe because jsdom cannot calculate rendered contrast; rendered colors were inspected in the browser instead. Static responsive tests prove the collapsed mobile navigation, absence of horizontal-scroll navigation, compact menu trigger, visible-focus rule, and reduced-motion rule.

## Browser-local layout proof

The documented npm forwarding form was attempted first:

```powershell
npm run dev -- --host 127.0.0.1 --port 4173
```

On this Windows npm runtime it exited `1` with `CACError: Unused args: 4173`. The equivalent direct Vite invocation then succeeded:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173
```

Real output:

```text
VITE v8.2.2 ready in 293 ms
Local: http://127.0.0.1:4173/
```

The in-app browser inspected all nine routes at 360, 768, 1024, and 1440 CSS pixels: 36 route-width combinations total.

| Width | Routes checked | Horizontal overflow | Hidden primary action | Result |
|---:|---:|---:|---:|---|
| 360 | 9 | 0 | 0 | PASS |
| 768 | 9 | 0 | 0 | PASS |
| 1024 | 9 | 0 | 0 | PASS |
| 1440 | 9 | 0 | 0 | PASS |

Selected measured evidence:

- 360 home: viewport `360x900`, document `scrollWidth=345`, `clientWidth=345`, overflow `false`; collapsed navigation `display:none`; menu trigger `display:flex`; wallet action width `313px`.
- 360 open menu: navigation `display:flex`, overflow `false`.
- 360 wallet modal: bounding box `left=16`, `right=344`, `width=328`, overflow `false`; initial focus was `Close wallet selection`; Escape removed the dialog and restored focus to `Connect wallet`.
- 768 root form: overflow `false`, menu trigger visible at the inclusive 48rem breakpoint, submit action visible and disabled while no wallet/contract write path exists.
- 1024 grant detail with unconfigured contract: overflow `false`, desktop menu trigger `display:none`, level-one title `Authority could not be verified`.
- 1440 integration page: overflow `false`, desktop menu trigger `display:none`, three integration-pattern cards visible.
- Browser console warning/error query: `[]`.

## Verified fixes discovered by browser inspection

The first browser pass found two issues that the initial DOM tests did not expose:

1. `.button` overrode the menu trigger's base `display:none`, so the mobile-menu button appeared at desktop widths.
2. The fail-closed grant-detail state used only an `h2`, leaving the route without a level-one page title.

Failing tests were added for both. The CSS now uses `.button.menu-trigger` at the base and mobile breakpoint, and `PageState` supports an explicit level-one title for full-page detail states. Focused verification passed `5/5`, and the browser then measured `menuDisplay:none`, `h1:Authority could not be verified`, and `overflow:false` at 1024px.

## Honest limits at this checkpoint

- The production adapter is intentionally unconfigured, so local product reads fail closed rather than showing fixture authority.
- No compatible wallet extension was present in the in-app browser; the modal honestly showed `No compatible browser wallet was detected`.
- Browser-CORS proof for the real IC RPC and real wallet transaction lifecycle belongs to Tasks 11–13 and is not claimed here.
