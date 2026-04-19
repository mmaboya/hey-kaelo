import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  const [activeToggle, setActiveToggle] = useState('booking');
  const navigate = useNavigate();

  return (
    <div className="lp">
      {/* NAV */}
      <div className="wrap">
        <nav className="nav">
          <div className="logo">
            <span className="logo-mark">K</span>
            HeyKaelo<span className="logo-dot">.</span>
          </div>
          <div className="nav-links">
            <a href="#categories">EXPLORE</a>
            <a href="#categories">CATEGORIES</a>
            <a href="#how">HOW IT WORKS</a>
            <a href="#wedge">PRICING</a>
          </div>
          <div className="nav-right">
            <a href="/login">LOGIN</a>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              Get Started <span>→</span>
            </button>
          </div>
        </nav>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="wrap">
          <div className="toggle">
            <div className="toggle-inner">
              <div
                className={`toggle-pill${activeToggle === 'booking' ? ' active' : ''}`}
                onClick={() => setActiveToggle('booking')}
              >
                <span>👋</span> I'm booking
              </div>
              <div
                className={`toggle-pill${activeToggle === 'business' ? ' active' : ''}`}
                onClick={() => setActiveToggle('business')}
              >
                <span>🧺</span> I run a business
              </div>
            </div>
          </div>

          <div className="hero-grid">
            <div>
              <span className="eyebrow">Kasi commerce, on WhatsApp</span>
              <h1 className="h1">The marketplace for everyone you'd book in the kasi.</h1>
              <p className="lede">
                Barbers, tailors, caterers, creatives, and local guides — one operating layer for
                small-business commerce, running on the chat you already use.
              </p>
              <div className="hero-ctas">
                <button className="btn btn-mint" onClick={() => navigate('/login')}>Find Someone to Book</button>
                <button className="btn btn-outline" onClick={() => navigate('/login')}>List My Business</button>
              </div>
              <div className="chip-row">
                <span><span className="dot"></span>One chat, every category</span>
                <span><span className="dot"></span>No app required</span>
              </div>
            </div>

            <div className="phone-wrap">
              <div className="phone">
                <div className="phone-screen">
                  <div className="phone-top">
                    <div className="avatar">HK</div>
                    <div>
                      <div className="name">HeyKaelo</div>
                      <div className="sub-text">Your bookings · Saturday</div>
                    </div>
                  </div>
                  <div className="chat">
                    <div className="bubble b-in">
                      <span className="bubble-tag">Hair</span>
                      10am — Tumi's Cuts confirmed your haircut.
                      <span className="time">10:45 AM</span>
                    </div>
                    <div className="bubble b-out">
                      Thanks 🙏 Can you also book Thabo's Alex experience at 2pm?
                      <span className="time">10:46 AM</span>
                    </div>
                    <div className="bubble b-in">
                      <span className="bubble-tag">Experiences</span>
                      Holding 2pm for 3 guests with Thabo M. — R720 pp. Reply 'Yes' to confirm.
                      <span className="time">10:46 AM</span>
                    </div>
                    <div className="bubble b-out">
                      Yes<span className="time">10:47 AM</span>
                    </div>
                    <div className="bubble b-in">
                      <span className="bubble-tag">Food</span>
                      Booked. Also — Zonke's has a table at 8pm. Want me to hold it?
                      <span className="time">10:47 AM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="cats" id="categories">
        <div className="wrap">
          <div className="cats-head">
            <span className="pill-light">🪶 What lives on HeyKaelo</span>
            <h2 className="h2" style={{ marginTop: '18px' }}>Everyday services. Creatives. Experiences.</h2>
            <p className="sub">All bookable the same way, from the same chat. Supply grows, the way the kasi already works.</p>
          </div>
          <div className="cats-grid">
            <div className="cat">
              <div className="cat-icon i-hair">💈</div>
              <h3>Hair &amp; Beauty</h3>
              <p>Barbers, stylists, locs, nails, makeup artists.</p>
            </div>
            <div className="cat">
              <div className="cat-icon i-food">🍲</div>
              <h3>Food &amp; Caterers</h3>
              <p>Shisanyamas, takeaways, private chefs, caterers.</p>
            </div>
            <div className="cat">
              <div className="cat-icon i-home">🧰</div>
              <h3>Home Services</h3>
              <p>Tailors, mechanics, cleaners, plumbers, movers.</p>
            </div>
            <div className="cat">
              <span className="tag-new">New</span>
              <div className="cat-icon i-exp">🌍</div>
              <h3>Experiences</h3>
              <p>Local guides by archetype — the connector, the foodie, the music head.</p>
            </div>
            <div className="cat">
              <div className="cat-icon i-well">🌿</div>
              <h3>Health &amp; Wellness</h3>
              <p>Therapists, fitness, traditional healers.</p>
            </div>
            <div className="cat">
              <div className="cat-icon i-create">🎨</div>
              <h3>Creatives &amp; Events</h3>
              <p>DJs, photographers, MCs, decor, event hire.</p>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE FEED */}
      <section className="feed">
        <div className="wrap">
          <div className="feed-head">
            <div>
              <span className="eyebrow">This weekend · Alex</span>
              <h2 className="h2">What's bookable right now.</h2>
              <p className="sub">One feed, many categories. Pick, chat, book.</p>
            </div>
            <button className="btn btn-outline">See all listings →</button>
          </div>
          <div className="feed-grid">
            <article className="listing">
              <div className="listing-img img-hair"><span className="listing-cat">Hair</span></div>
              <div className="listing-body">
                <h4>Fade + line-up</h4>
                <div className="who">Tumi's Cuts · 2nd Ave</div>
                <div className="listing-foot"><span className="slot">Sat · 10:00</span><span className="price">R180</span></div>
              </div>
            </article>
            <article className="listing">
              <div className="listing-img img-exp"><span className="listing-cat">Experience</span></div>
              <div className="listing-body">
                <h4>Alex House &amp; Kasi Flava</h4>
                <div className="who">Thabo M. · The Connector</div>
                <div className="listing-foot"><span className="slot">Sat · 14:00</span><span className="price">R720 pp</span></div>
              </div>
            </article>
            <article className="listing">
              <div className="listing-img img-food"><span className="listing-cat">Food</span></div>
              <div className="listing-body">
                <h4>Saturday dinner table</h4>
                <div className="who">Zonke's Shisanyama · 8 seats</div>
                <div className="listing-foot"><span className="slot">Sat · 20:00</span><span className="price">from R250</span></div>
              </div>
            </article>
            <article className="listing">
              <div className="listing-img img-home"><span className="listing-cat">Home</span></div>
              <div className="listing-body">
                <h4>Traditional fitting</h4>
                <div className="who">Vuyo's Tailors · 1st St</div>
                <div className="listing-foot"><span className="slot">Sun · 11:00</span><span className="price">R350</span></div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div className="wrap">
          <div className="how-head">
            <span className="pill-light">⚙ How it works</span>
            <h2 className="h2" style={{ marginTop: '18px' }}>Two sides. Same chat.</h2>
            <p className="sub">Demand and supply run on the same WhatsApp rails. No apps to install, no dashboards to learn — just the chat you already live in.</p>
          </div>

          <div className="how-grid">
            <div className="side">
              <span className="side-label">👋 If you're booking</span>
              <h3>Find someone. Chat. Show up.</h3>
              <div className="step">
                <div className="step-n">1</div>
                <div className="step-body">
                  <strong>Search or post a brief</strong>
                  <p>Browse a category, or describe what you want — a haircut, a tailor, a Saturday in Alex.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-n">2</div>
                <div className="step-body">
                  <strong>Chat before you book</strong>
                  <p>Test chemistry with a barber or a guide. Confirm the scope and the price.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-n">3</div>
                <div className="step-body">
                  <strong>Pay, get reminded, show up</strong>
                  <p>Reminders the night before. Your regulars remembered for next time.</p>
                </div>
              </div>
            </div>

            <div className="side">
              <span className="side-label">🧺 If you run the business</span>
              <h3>Get found. Get booked. Build regulars.</h3>
              <div className="step">
                <div className="step-n">1</div>
                <div className="step-body">
                  <strong>List your service or experience</strong>
                  <p>Fixed scope, fixed price — or open slots. Same listing format, any category.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-n">2</div>
                <div className="step-body">
                  <strong>Get bookings in WhatsApp</strong>
                  <p>HeyKaelo checks your calendar, asks you to approve, sends the reminder.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-n">3</div>
                <div className="step-body">
                  <strong>Keep your regulars close</strong>
                  <p>Client file built automatically — no spreadsheet, no secretary.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rails">
            One operating layer · <strong>HeyKaelo</strong> · running on WhatsApp
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="trust">
        <div className="wrap">
          <div className="trust-head">
            <span className="pill">🤝 Trust</span>
            <h2 className="h2-lg-light">Built the way we already vouch for each other.</h2>
            <p>Verification, video intros, and community endorsement — whether you're booking a barber, a caterer, or a guide. Closer to how aunties pass on a good hairdresser than to a star rating.</p>
          </div>
          <div className="trust-row">
            <div className="trust-item">
              <span className="trust-ico">🆔</span>
              <div><strong>ID verified</strong><p>Every supplier confirmed before they list.</p></div>
            </div>
            <div className="trust-item">
              <span className="trust-ico">🎥</span>
              <div><strong>Video intro</strong><p>See the voice and vibe before booking.</p></div>
            </div>
            <div className="trust-item">
              <span className="trust-ico">✋</span>
              <div><strong>Community vouch</strong><p>An established local endorses newcomers.</p></div>
            </div>
            <div className="trust-item">
              <span className="trust-ico">💬</span>
              <div><strong>Pre-booking chat</strong><p>Test chemistry before money moves.</p></div>
            </div>
            <div className="trust-item">
              <span className="trust-ico">📍</span>
              <div><strong>Live location share</strong><p>For the group and the supplier's people.</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* FLYWHEEL */}
      <section className="flywheel">
        <div className="wrap">
          <div className="fly-grid">
            <div>
              <span className="eyebrow">The flywheel</span>
              <h2 className="h2">Your regulars, remembered — across the whole kasi.</h2>
              <p className="sub">
                The barber knows your usual. The guide remembers your cousin is visiting. The shisanyama holds your
                Saturday table. One relationship layer, working across every category. Every booking strengthens the
                loop — demand pulls supply, supply creates new demand, the operating system keeps the thread.
              </p>
            </div>
            <div className="fly-diagram">
              <div className="node node-demand">Demand<small>customers &amp; visitors</small></div>
              <div className="node node-supply">Supply<small>barbers, guides, caterers</small></div>
              <div className="node node-os"><strong>HeyKaelo OS</strong><small>bookings · payments · regulars</small></div>
            </div>
          </div>
        </div>
      </section>

      {/* REGULARS */}
      <section className="regulars">
        <div className="wrap center">
          <span className="pill-light">♾ The regulars layer</span>
          <h2 className="h2" style={{ marginTop: '18px' }}>One relationship, many touchpoints.</h2>
          <p className="sub">
            A customer doesn't live in a single category. HeyKaelo sees them as one person — and gives every
            supplier the context to treat them that way.
          </p>
          <div className="reg-row">
            <div className="reg-card">
              <div className="reg-avatar">SJ</div>
              <span className="reg-tag">Hair · Monthly</span>
              <strong>Sarah J.</strong>
              <p>"Usual fade with Tumi. Prefers 10am Saturdays." 6 bookings in 5 months — gets a reminder the night before, every time.</p>
            </div>
            <div className="reg-card">
              <div className="reg-avatar">KM</div>
              <span className="reg-tag">Experiences · Returnee</span>
              <strong>Kagiso M.</strong>
              <p>Came back from London, booked Thabo's Alex tour. Next visit, HeyKaelo nudges Thabo: "Kagiso's back in December."</p>
            </div>
            <div className="reg-card">
              <div className="reg-avatar">NZ</div>
              <span className="reg-tag">Food · Friday</span>
              <strong>Nomsa Z.</strong>
              <p>Every second Friday at Zonke's, table of four. She doesn't call — she just replies "yes" when the reminder comes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* LAUNCH WEDGE */}
      <section className="wedge" id="wedge">
        <div className="wrap">
          <span className="pill-light">🌍 Launch wedge</span>
          <h2 className="h2">Starting in Alex. Deep.</h2>
          <p className="sub">
            Every barber, every shisanyama, every tailor, every guide — in one neighbourhood before we template.
            A liquid small market beats an empty country. Then Orlando West. Then Mamelodi. Then KwaMashu.
          </p>
          <div className="wedge-grid">
            <div className="wedge-stat"><strong>80+</strong><span>Founding merchants</span></div>
            <div className="wedge-stat"><strong>12</strong><span>Founding guides</span></div>
            <div className="wedge-stat"><strong>6</strong><span>Categories live</span></div>
            <div className="wedge-stat"><strong>1</strong><span>Neighbourhood, deep</span></div>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          One marketplace, one chat · Kasi commerce on WhatsApp · Built for the kasi
        </div>
      </footer>
    </div>
  );
}
