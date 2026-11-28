# Auth: the remaining surfaces

The auth feature (`odd/tasks/user-authentication-and-roles.md`) closed with four residuals. This document carries the three that are code, and nothing else: the email vendor stays issue #171 and is explicitly out of scope.

- **Status**: open

## Specs

**S1.** `podemos antes hacer funcionar los que faltan` — the remaining auth surfaces are made to work now; `el envío de email lo dejamos para más adelante`, so `S16`/`#171` is untouched: no vendor, no verification enforcement, and the deployed `RESET_PASSWORD_DISABLED` answer stays exactly as it is.

**S2.** The cookie posture is configuration rather than a decision taken on the human's behalf: `SameSite=Lax` remains the default in every environment, and a deployment that needs a cross-site browser fetch opts in to `SameSite=None; Secure` explicitly. Nothing weakens unless it is asked for, and when it is, the library's origin check is what carries CSRF. The option is validated: `none` without `secure` is a startup error, not a silent cookie the browser drops.

**S3.** On the web target the browser owns the session cookie and no local code can clear it, so the **server revoke is the only thing that ends the session**. When that revoke fails, the app must not present a completed sign-out: the outcome says so, the screen says so, and there is a way to try again.

**S4.** The Google button exists and works, and it is hidden where it cannot work: a platform shows it only when its own client ID is configured, which is the rule `S27` already states for Apple. It exchanges a provider ID token through `signIn.social({ provider: "google", idToken })` (`S8`) and never through a redirect on a native client. The human creates the OAuth clients; nothing ships a button that cannot complete.

**S5.** Every rule above is pinned by a test that fails when the rule stops holding, and the sign-out rule is pinned through the surface a person uses, not only through the sequence function.

## Tasks

- [x] **T1** — **DONE — see L4.** API: the cookie posture as validated configuration (`Lax` default; `None` requires `Secure`; a startup refusal otherwise), wired into the auth instance, with the deployment note. `S2`. Route: one bounded `gentle-ai-worker`.
- [x] **T2** — **DONE — see L5.** Mobile: a sign-out outcome that distinguishes "the server ended the session" from "it could not be reached", surfaced on the settings screen with a retry, and never reported as a clean sign-out. `S3`, `S5`. Route: one bounded `gentle-ai-worker`, plus one follow-up round and one re-run of it for the storage capability. Commit: pending.
- [ ] **T3** — Mobile: the Google button behind a per-platform client ID, exchanging the id token through the existing auth client, with the human-facing instructions for creating the OAuth clients. `S4`. Route: one bounded `gentle-ai-worker` after the Expo/doc check.
- [ ] **T4** — Close this document with its evidence and delivery record. `S5`. Route: inline.

## Log

**L1** (the user's request, verbatim): `podemos antes hacer funcionar los que faltan? el envío de email lo dejamos para más adelante`

**L2** (the user, verbatim, on the cookie): `no se que es mejoe`. Read as: the topology decision is not made, so the code must not make it. Rewritten as S2 — configurable, `Lax` default, `None` only on request and only with `Secure`.

**L3** (the user, verbatim, on Google): `no tengo los clientes, pero quiero crearlo`. Rewritten as S4 — the client path lands hidden until a client ID exists, and the document carries the steps to create them.

**L4** (T1 — `S2`. The cookie posture is configuration with a safe default, and the unsafe combination is refused at startup rather than handed to the browser.)

**Where the default lives and why it must not move.** `AUTH_COOKIE_SAME_SITE` (`lax|strict|none`, default `lax`) resolves through `resolveCookieConfig(environment, bindings)` into `{ sameSite, secure, httpOnly: true, path: "/" }`, and `createAuth` passes that object as `advanced.defaultCookieAttributes` — read out of the installed library, not remembered: `better-auth/dist/cookies/index.mjs:34-40` spreads `defaultCookieAttributes` **after** its own defaults, so ours wins, and `context/create-context.mjs:96` → `helpers.mjs:141` re-resolves it on the instance, which is what the test asserts against (`(await auth.$context).authCookies.sessionToken.attributes`) instead of against the constant we passed.

**The two refusals are the point.** `none` without `Secure` is refused at configuration resolution — `AppConfig.from` — with a message naming the environment and the reason ("a browser drops SameSite=None without Secure — the web session would silently stop working"), because a cookie the browser silently discards is a session that fails with no error anywhere. A value outside the closed set is refused the same way. `secure` is derived from `DEPLOYED_ENVIRONMENTS` rather than configured separately: only a deployed Worker is https, so only there is the cookie `Secure`, and `none` is reachable only there. Opting in is therefore a deliberate deployment act, and `.dev.vars.example` says what it costs: with `None` the library's origin check (`trustedOrigins` = `CORS_ALLOWED_ORIGINS`) is what carries CSRF.

**Evidence.** RED, `auth.test.ts` **37 pass / 2 fail**: `expect(received).toMatchObject(expected)` with `{ httpOnly: true, - "sameSite": "none", + "sameSite": "lax", "secure": true, … }` — the binding was ignored and the library default reached the instance. A second RED is structural: the config suite failed to load on the missing export. GREEN: `config.test.ts` + `auth.test.ts` **67 pass / 0 fail, 107 `expect()` calls**, additions only (no existing assertion edited). Both refusal messages were printed from a real `AppConfig` construction and are quoted in the resolver's tests.

Checks: `make check-types` 3/3; `make check-lint` 3/3, 0 errors, the same 16 pre-existing mobile warnings; `make check-format` clean after formatting one test file; `make check-tests` **shared 108 / api 237 / mobile 986, 0 fail**.

**L5** (T2 — `S3`, `S5`. A sign-out that did not reach the server is no longer reported as a sign-out, and the decision to stay signed in belongs to the store, not to the platform.)

**The second axis.** `SessionService.signOut()` clears the device credential first (unchanged) and now resolves `SessionRevoke = { revoke: "revoked" | "unreachable", revokeError? }` instead of swallowing the attempt; `signOutAndClearCache` carries it as `revoke?`/`revokeError?` and still drops the cache on every path, because the cache belongs to the identity that is leaving. `local` and `cache` keep their exact meanings, and a throwing `signOut` still means `local: "failed"` — which is why the revoke reports rather than throws.

**The decision the first pass got wrong, and the capability that fixed it.** The first version kept the signed-in identity whenever the revoke was `unreachable`. Right on the web, where nothing local was cleared and the browser cookie may still be live; wrong on native, where the credential is gone and the app would render a session it cannot prove while every request answers 401. The first follow-up was refused by the worker because the fix needed files outside its allowed surfaces — correctly, and it said so instead of widening them. The capability now lives on the storage contract: `endsSessionOnClear?: boolean`, native `true`, web `false`, **and its absence means "this store cannot say"**, read as the session possibly still being live for the _notice_ but never as a reason to keep the identity. `SessionProvider.signOut` therefore keeps the identity only on `revoke === "unreachable" && endsSessionOnClear === false`; everything else, absence included, drops it. No `Platform.OS` appears anywhere in the decision.

**Evidence.** RED across six files **61 pass / 8 fail**, the meaningful one being `expect(received).toBeNull()` / `Received: { id: …, name: "My self", … }` for the native shape — the identity kept when the device had already lost the credential. Two of the new cases were green before the change and are recorded as pins, not RED: the web shape behaved correctly already, and the settings notice existed already. GREEN **74 pass / 0 fail** across the same six files, +12 cases.

One rule could not hold literally and is recorded rather than smoothed: two pre-existing cases in `session-context.test.tsx` scripted an `unreachable` revoke **without** the capability and assert the identity is kept, which is exactly what absence now forbids. Their scripted inputs gained `endsSessionOnClear: false` — no assertion, name or scenario touched — which is what keeps them true statements about web-shaped storage. Any other reading would have deleted their intent.

Checks: `make check-types` 3/3; `make check-lint` 3/3, 0 errors, the same 16 pre-existing mobile warnings; `make check-format` clean; `make check-tests` **shared 108 / api 237 / mobile 986, 0 fail**.
