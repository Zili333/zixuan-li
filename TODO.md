# Open items

The site is built in direction C (Index). Everything below is missing content or a
decision only Zixuan can make. Nothing here has been invented. Each item shows on
the site as a `[TODO: …]` label until it is filled.

Content lives in `src/content.js`.

## Content to supply

| Where | Missing |
|---|---|
| Product Design → Coded prototypes → Problem | Confirm the wording. It is inferred from the brief ("real input, state, loading, error, failure states"). |
| Product Design → Coded prototypes → My judgment | What I cut |
| Product Design → AI design handoff Skill → Problem | Confirm the wording ("A handoff doc took about 2 hours to write") |
| Product Design → AI design handoff Skill → My judgment | What I cut |
| Product Design → GoContractor, design system and file library | Problem, my decisions, outcome |
| Visual / Art → East Asia Electronic Festival posters | Poster images. Three frames are placeholders; the real count is yours. |
| Visual / Art → Game art 2007—2015 | Images. Six frames are placeholders. |

To add a link, set `href` on the work. To add images, tell Claude where the files are.

## Links to confirm

The three Builds links point at your Vercel production addresses. Check each one opens for a visitor who is not logged in to Vercel.

- Ping Pong Quiz: https://ping-pong-quiz.vercel.app
- Cognitive Universe: https://zixuan-cognitive-universe.vercel.app
- Small Talk Gym: https://small-talk-gym-woad.vercel.app

## Name artwork

- `src/name/glyphs.js` holds a placeholder set in the typeface 临海隶书. Swap in your brush-written 李紫玄 (format in `src/name/README.md`).
- If the placeholder goes live, confirm the 临海隶书 licence covers web use.

## Decisions you can reverse

- Portrait on the home screen is a high-contrast black and white, so vermilion stays the only colour.
- The home screen leads with one sentence about you (`STATEMENT` in `src/content.js`). The four sections sit small at the top right.
- On touch screens the first tap names a planet and the second opens it. The section names at the top open on one tap.
- Each section has its own address (`/product-design`, `/visual-art`, `/builds`, `/video`, `/about`), so browser Back returns to the orbit.
- No contact details or social links are on the site. The brief did not list any.

## Not yet verified

- Lighthouse was run on a machine with no GPU, where the site correctly falls back to the static orbit. Run it once more against the Vercel preview from a real phone to score the three.js path.
