export default function About({ entered, settled, onReturn }) {
  return (
    <section className={entered ? (settled ? 'about is-in is-settled' : 'about is-in') : 'about'} aria-label="Who am I?">
      <p className="about-kicker">Who am I?</p>
      <button type="button" className="about-photo" onClick={onReturn} aria-label="Back">
        <img src="/about-portrait.jpg" alt="Portrait of Zixuan Li" />
      </button>
      <div className="about-copy">
        <h1>Zixuan Li</h1>
        <div className="about-bio">
          <p>
            I'm a product designer with a background in animation and game art, now working on
            complex enterprise products in Dublin.
          </p>
          <p>
            I'm drawn to the point where visual craft meets difficult decisions: what to simplify,
            what to keep, and how to make an idea hold up when real people use it. Outside my day
            job, I make videos, images, and small tools to explore how creative work is changing.
          </p>
        </div>
      </div>
      <div className="about-rule about-rule-v" />
      <div className="about-rule about-rule-h about-rule-top" />
      <div className="about-rule about-rule-h about-rule-bottom" />
    </section>
  )
}
