# Reflection Program Content & Reader

Extend the "Dicotomía del Control Estoico" program from 1 to 6 daily steps and upgrade the reader that renders a program step: seed integrity guardrails, tappable links, full step context in the answer modal, and per-step multimedia resources.

## Specs

- **S1** — The program "Dicotomía del Control Estoico" (`e2000000-0000-4000-8000-000000000001`) must expose 6 daily steps, each with its own program step content. `targetQuestionCount` must equal the number of seeded steps.
- **S2** — Day 2 step content: video `https://youtu.be/nHsUMRcjBiU?si=CQZYkFaWkiD4NlJa` plus the challenge text containing the verbatim strings `El desafío de hoy es el siguiente`, `¿Qué parte de esta situación estaba bajo tu control y qué parte no lo estaba?`, `no es el hecho, sino mi interpretación lo que me causa sufrimiento`, `¿Qué virtud te estaba pidiendo practicar este momento?`, `Añade la cláusula de reserva estoica` and `Haré todo lo que esté en mi mano para lograr _, si nada lo impide.`
- **S3** — Day 3 step content: video `https://youtu.be/N9aBAJ61xSk?si=WTZ8mZ7by6KD4ZfS` plus text containing `La Vida en Sociedad`, `círculos de Hierocles`, `Y finalmente, toda la humanidad.`, `Elegí un gesto de acercamiento`, the four example gestures and the Marcus Aurelius quote `Se come la vid que produce uvas, y una vez hecho, no busca nada más, sino que pasa a la siguiente`.
- **S4** — Day 4 step content: video `https://youtu.be/uqN5Z9tsacg?si=u_4PfZ_71SlJni8r` plus text containing `La Conexión con la Naturaleza`, `Visión desde arriba`, the audio link `https://drive.google.com/file/d/1NxOoDh5qsLspeujFl5zWChT4y53tRxPq/view?usp=sharing`, the meditation video link `https://www.youtube.com/watch?v=az1IKPZ7N2U`, `¿Qué cambia al mirar tu problema desde esa distancia?`, `¿Qué podrías hacer hoy para vivir más en armonía con la naturaleza o el orden del universo?` and `Compromiso (opcional)`.
- **S5** — Day 5 step content: video `https://youtu.be/e1IoKJjF4vc?si=6k8yO902AYAFyw8O` plus text containing `Deber Estoico y Amor a la Humanidad`, the fill-in template `Hoy el obstáculo es __, y lo usaré para practicar __` rendered literally (never as emphasis), `El Obstáculo es el Camino`, `¿Cómo encontrar la calma en medio del caos?`, `Santuario de la Mente`, `Prosoché`, `Matriz de Obstáculos` and `No son las cosas las que nos perturban, sino las opiniones que tenemos sobre ellas`.
- **S6** — Day 6 step content: video `https://youtu.be/UKfUL6xGHpo?si=7lXiCqxFrSHSXpid` plus text containing `Estoicismo y Relaciones Sociales`, the four steps `Paso 1. Identificá`, `Paso 2. Cuestioná tu interpretación`, `Paso 3. Practicá la empatía estoica`, `Paso 4. Llevalo a la práctica`, `¿Qué hechos conozco realmente y qué cosas estoy suponiendo?`, `¿Qué podría estar viviendo o sintiendo la otra persona que yo desconozco?`, `¿Qué puedo hacer diferente la próxima vez que surja un malentendido?` and `¡Buen fin de semana a todos!`
- **S7** — A test must validate every seeded question and program step content with its Zod schema and reject referential drift: duplicate ids, unknown `categoryId`/`themeId`/`questionId`, non-contiguous `orderIndex` inside a theme, duplicated `orderIndex`, and `targetQuestionCount` different from the seeded step count.
- **S8** — The markdown reader must render `[label](url)` and bare `https://` URLs as tappable links that open with `Linking.openURL`, with `accessibilityRole="link"`, without breaking the existing bold/italic/strikethrough/code spans. Trailing punctuation of a bare URL is not part of the link.
- **S9** — The answer modal must receive the whole program step content of the question being answered (video included), not only `preparatoryText`, so the user can re-watch the lesson while writing the answer.
- **S10** — A program step may carry several multimedia resources beyond its primary lesson video: a table `program_step_resources` (`id`, `step_content_id`, `kind` in `video|audio|link`, `label`, `url`, `order_index`, `created_at`), seeded, read through the reflection repository ordered by `order_index`, and rendered as a tappable list in both the step card and the answer modal. Day 4 must carry the audio meditation (`audio`, Drive link) and the meditation video (`video`, `https://www.youtube.com/watch?v=az1IKPZ7N2U`).

## Tasks

- [x] **T1** (S1-S6) Seed days 2-6 of the program with their step contents — commit `46e01ae`.
- [x] **T2** (S7) Seed integrity guardrails — commit `4f67b76` (guardrail proven to fail on perturbed `targetQuestionCount` and unknown step `questionId`).
- [x] **T3** (S8) Tappable links — commit `e368128`.
- [x] **T4** (S9) Full step context in the answer modal — video player plus consigna rendered inside `ReflectionModalContent`.
- [ ] **T5** (S10) Per-step resources — shared schema + migration `0005_program_step_resources`, seeding, repository port, `StepResources` UI in card and modal.
- [ ] **T6** Quality gates and evidence — `make check` per slice plus the recorded commits.

## Log

- **L1** — 2026-10 request: "en el programa de reflexion de Dicotomía del Control Estoico quiero agregar una segunda pregunta que contenta el siguiente link y texto a reflexionar: https://youtu.be/nHsUMRcjBiU?si=CQZYkFaWkiD4NlJa" plus the Day 2 challenge text (three questions and the Stoic reservation clause). Implemented in T1, spec S2.
- **L2** — Follow-up request: "podemos agregar dia 3: https://youtu.be/N9aBAJ61xSk?si=WTZ8mZ7by6KD4ZfS" with the Hierocles circles exercise and the Marcus Aurelius quote. Spec S3.
- **L3** — Follow-up request: "podemos agregar dia 4: https://youtu.be/uqN5Z9tsacg?si=u_4PfZ_71SlJni8r" with the "Visión desde arriba" visualization, the audio and video meditation links, the two written questions and the optional commitment. Spec S4. Evidence: this is the request that exposed the single-`videoUrl` limitation (S10).
- **L4** — Follow-up requests for days 5 and 6 with videos `https://youtu.be/e1IoKJjF4vc?si=6k8yO902AYAFyw8O` and `https://youtu.be/UKfUL6xGHpo?si=7lXiCqxFrSHSXpid`, including the Day 5 fill-in template and the Day 6 four-step empathy challenge. Specs S5, S6.
- **L5** — Question: "que se podria mejorar el contorl que lee las relfxiones para soportar los temas que mencionaste?" Diagnosis delivered read-only: dead links, single media resource, `__` eaten as bold, modal losing the video, N+1 reads, missing program versioning, single-element seed test.
- **L6** — Authorization: the user selected slices 7 (seed guardrails), 1 (tappable links), 4 (modal with full context) and 2 (multiple resources). Program versioning (slice 6) was not selected and is out of scope.
