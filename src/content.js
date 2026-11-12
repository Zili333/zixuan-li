// Site content. Facts come from the brief. Anything missing carries a `todo`
// and is listed in TODO.md. Do not fill gaps with invented facts or numbers.

export const SECTIONS = [
  {
    id: 'product-design',
    title: 'Product Design',
    kind: 'cases',
    works: [
      {
        title: 'Coded prototypes',
        problem: {
          text: 'Figma prototypes could not carry real input, state, loading, error and failure states into user testing and demos.',
          todo: 'Confirm this wording',
        },
        judgment: {
          text: 'I was the first designer on my team to vibe code. I proposed replacing Figma prototypes with coded ones.',
          todo: 'What I cut',
        },
        result: { text: 'All designers on the team now use this flow.' },
      },
      {
        title: 'AI design handoff Skill',
        problem: { text: 'A handoff doc took about 2 hours to write.', todo: 'Confirm this wording' },
        judgment: {
          text: 'A Skill that generates the detailed spec: State, Trigger, Rules, Edge Cases, Components, Behaviour.',
          todo: 'What I cut',
        },
        result: {
          stat: { from: 120, to: 10, unit: 'min', label: 'per handoff doc, approximately' },
          text: 'The bigger value: it exposes unresolved edge cases in a design.',
        },
      },
      {
        title: 'GoContractor, design system and file library',
        problem: { todo: 'Problem' },
        judgment: { todo: 'My decisions' },
        result: { todo: 'Outcome' },
      },
    ],
  },
  {
    id: 'visual-art',
    title: 'Visual / Art',
    kind: 'gallery',
    works: [
      {
        title: 'East Asia Electronic Festival posters',
        line: 'East Asian traditional symbols mixed with modern elements for strong contrast.',
        frames: { count: 3, ratio: '2 / 3', todo: 'Poster' },
      },
      {
        title: 'Game art',
        years: '2007—2015',
        frames: { count: 6, ratio: '4 / 3', todo: 'Game art' },
      },
    ],
  },
  {
    id: 'builds',
    title: 'Builds',
    kind: 'links',
    works: [
      { title: 'Ping Pong Quiz', line: 'Retro pixel ping-pong vocabulary game for French and Chinese practice.', href: 'https://ping-pong-quiz.vercel.app' },
      { title: 'Cognitive Universe', line: 'Personal knowledge system rendered as 3D galaxies.', href: 'https://zixuan-cognitive-universe.vercel.app' },
      { title: 'Small Talk Gym', line: 'AI-built tool for practising small talk, born from working in Europe.', href: 'https://small-talk-gym-woad.vercel.app' },
    ],
  },
  {
    id: 'video',
    title: 'Video',
    kind: 'links',
    works: [{ title: 'Zi AI Lab', line: 'YouTube channel on AI, design and building in public.', href: 'https://www.youtube.com/channel/UCs_6s2cU4p-K4SpLMRTWBkQ' }],
  },
].map((section) => {
  const n = section.works.length
  const count = String(n).padStart(2, '0')
  return { ...section, count, countLabel: `${count} ${n === 1 ? 'work' : 'works'}` }
})

// The one-sentence introduction on the home screen, split where the lines break.
// Set flush left, with no punctuation beyond the apostrophe.
export const STATEMENT = [
  'Zixuan Li',
  'is a designer and builder',
  'in Dublin with an artist’s eye',
  'and a habit of shipping what he draws',
]

// Existing "Who am I?" copy, unchanged.
export const ABOUT = {
  id: 'about',
  title: 'Who am I?',
  copy: [
    "I'm a product designer with a background in animation and game art, now working on complex enterprise products in Dublin.",
    "I'm drawn to the point where visual craft meets difficult decisions: what to simplify, what to keep, and how to make an idea hold up when real people use it. Outside my day job, I make videos, images, and small tools to explore how creative work is changing.",
  ],
}
