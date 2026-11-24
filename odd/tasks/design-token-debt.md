# Design-token debt in `apps/mobile/src/app/**`

Close #101: the `no-restricted-syntax` rule from #99 must cover the screens, and
the literals it flags there must be paid **value-identically**. This is the unit
that lets us delete the stopgap test added in #164.

## Specs

S1. The `no-restricted-syntax` block in `apps/mobile/eslint.config.js` must apply to `apps/mobile/src/app/**` as well as the component globs it already covers. Test files stay excluded.

S2. No `fontSize`, `lineHeight`, `letterSpacing`, `opacity`, `fontWeight` literal and no hex/rgb/hsl color literal may remain in `apps/mobile/src/app/**`, tests excluded, per #101's acceptance criteria.

S3. Every substitution is **value-identical**: each token must resolve to the exact value it replaced. "#101: No rendered value changed, proven by the property-by-property differential." When no existing token matches a literal exactly, add a token to `apps/mobile/src/theme/tokens/` with that exact value — never move the rendered value.

S4. Delete `apps/mobile/src/theme/__tests__/token-usage.test.ts`. It covers only `fontSize`/`lineHeight`, nothing else #101 lists, and it exists solely as a stopgap for the rule not reaching `src/app` yet.

S5. `make check-lint`, `make check-types`, `make check-tests` and `make check-format` are green, and `make check-e2e-web` stays green.

## Tasks

| ID  | Specs  | Route  | Commit |
| --- | ------ | ------ | ------ |
| T1  | S1, S4 | worker | —      |
| T2  | S2, S3 | worker | —      |
| T3  | S5     | parent | —      |

## Log

L1. User: "hacerlo ahora" — authorizing the unit proposed after the #164 review: fix R2-001 and R2-003, then advance #101 so the guard becomes the rule instead of the test.

L2. R2-001 and R2-003 were fixed and committed as `27ba57d` (`docs(mobile): state the fontSizes ladder truthfully and pin the reflections rank`).

L3. This unit is delegated because the session is past the 150k context backstop.

L4. T1-T3 delivered in `311a0d5` on `feat/compact-type-scale`: the rule covers `src/app/**`, 51 literals paid value-identically (44 `fontWeight`, 6 `letterSpacing`, 1 rgba), 6 tokens added with the exact values they replaced, `token-usage.test.ts` deleted. Checks: lint 0 errors under the widened rule, types green, 805 mobile + 106 api tests, format green, 48 e2e. Review assess over the committed range reports `reviewDue: false` (`under_budget`, medium).

## Delivery

- **Completion & Delivery**: T1-T3 landed in `311a0d5` on `feat/compact-type-scale`, with the evidence recorded in `b91b13d`. The rule covers `src/app/**` with colocated tests excluded, 51 literals paid value-identically (44 `fontWeight`, 6 `letterSpacing`, 1 rgba) after adding 6 tokens with the exact values they replaced, and `token-usage.test.ts` deleted. Checks: lint 0 errors under the widened rule, types green, 805 mobile + 106 api tests, format green, 48 e2e. Review assess over the committed range reported `reviewDue: false` (`under_budget`, medium). The commit carries `Closes #101`.
