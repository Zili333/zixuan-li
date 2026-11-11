# The name artwork

`LishuName.jsx` draws 李紫玄 from the data in `glyphs.js`. To replace the
placeholder with your own brush-written name, edit `glyphs.js` only.

Each character is one object:

| Field     | What it is |
|-----------|------------|
| `char`    | The character, used as a key. |
| `viewBox` | `[x, y, width, height]` of the artwork. |
| `outline` | One SVG path (`d` string) with the filled shape of the character. In Figma or Illustrator: outline the brush stroke, flatten to a single compound path, export SVG, copy the `d` attribute. |
| `strokes` | Optional. The order and direction the brush travels, one entry per stroke: `d` is a centre line drawn from where the brush lands to where it lifts, `w` is how wide the brush is there (glyph units). These are not visible. They reveal the outline in order. |

If `strokes` is left out, the character wipes in from the left instead.

The placeholder outlines come from the typeface 临海隶书. Check its licence
before launch, or replace it with your own writing, which removes the question.
