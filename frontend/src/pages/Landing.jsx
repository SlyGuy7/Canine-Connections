// Public homepage. All numbers shown (dogs available, shelters, states) are live counts
// from the backend, never hard-coded marketing figures.
import React, { useEffect, useEffectEvent, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowRight, BadgeCheck, CircleCheck, HeartHandshake, MapPin, MessageCircle, Plus,
  Search, ShieldCheck, Stethoscope, Wallet,
} from "lucide-react"
import PublicLayout from "../site/PublicLayout"
import DogCard, { DogCardSkeleton } from "../site/DogCard"
import { useAuthModal } from "../site/authModal"
import { FAQS, PHOTOS, STEPS } from "../site/content"
import { useDataCache } from "../context/dataCache"
import { sendMessage } from "../services/messaging"
import { hasUserSession } from "../services/auth"

const SIZE_TILES = [
  { key: "small",  label: "Small dogs",  text: "Under 25 lb" },
  { key: "medium", label: "Medium dogs", text: "25–60 lb" },
  { key: "large",  label: "Large dogs",  text: "60 lb and up" },
  { key: "puppy",  label: "Puppies",     text: "Up to a year old" },
]

const WHY = [
  { icon: Wallet,         title: "Free to use",           text: "No fees to browse, message shelters or apply. Shelters set their own adoption fees." },
  { icon: Stethoscope,    title: "Health-checked dogs",    text: "Listed dogs are vaccinated and vet-checked by their shelter before they go home." },
  { icon: ShieldCheck,    title: "Verified adopters",      text: "ID verification and a single application process give shelters confidence to say yes." },
  { icon: HeartHandshake, title: "Support after adoption", text: "A journal for your dog's milestones and care guides for the first weeks at home." },
]

function HomeContent() {
  const navigate = useNavigate()
  const { openAuth } = useAuthModal()
  const loggedIn = hasUserSession()
  const { getDogs, getShelters } = useDataCache()
  const [dogs, setDogs] = useState(null)
  const [shelters, setShelters] = useState([])
  const [stories, setStories] = useState([])
  const [resources, setResources] = useState([])
  const [search, setSearch] = useState({ size: "All", age: "All", good: "" })

  const load = useEffectEvent(async () => {
    // Each section degrades on its own if the backend is unreachable.
    const [d, s, st, r] = (await Promise.allSettled([
      getDogs(), getShelters(),
      sendMessage("request.stories.list", { limit: 3 }),
      sendMessage("request.resources.list", { limit: 3 }),
    ])).map(p => p.value)
    setDogs(d || [])
    setShelters(s || [])
    setStories(st?.stories || [])
    setResources((r?.resources || []).slice(0, 3))
  })
  useEffect(() => { load() }, [])

  const featured = useMemo(() => (dogs || []).slice(0, 8), [dogs])
  const states = useMemo(() => new Set(shelters.map(s => s.state).filter(Boolean)).size, [shelters])
  // One photo per size tile, never reusing a dog already shown on another tile.
  const tilePhotos = useMemo(() => {
    const used = new Set()
    const pick = (test) => {
      const dog = (dogs || []).find(d => d.image && !used.has(d.dog_id) && test(d))
      if (dog) used.add(dog.dog_id)
      return dog?.image || null
    }
    const puppy = pick(d => Number(d.age_years) <= 1)
    return { puppy, small: pick(d => d.size === "small"), medium: pick(d => d.size === "medium"), large: pick(d => d.size === "large" || d.size === "extra_large") }
  }, [dogs])
  const tilePhoto = (key) => tilePhotos[key]

  function submitSearch(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search.size !== "All") params.set("size", search.size)
    if (search.age !== "All") params.set("age", search.age)
    if (search.good) params.set("compat", search.good)
    navigate(`/browse-dogs${params.size ? `?${params}` : ""}`)
  }

  const startQuiz = () => (loggedIn ? navigate("/quiz") : openAuth("register"))

  return (
    <>
      {/* ── Hero ── */}
      <section className="s-hero">
        <div className="s-container s-hero__grid">
          <div>
            <span className="s-eyebrow">Rescue dog adoption</span>
            <h1 className="s-h1">Find the dog that fits your life.</h1>
            <p className="s-lead">
              Every adoptable dog from our partner shelters, in one place. Search by what matters to
              you, take a two-minute match quiz, and apply online for free.
            </p>

            <form className="s-search" onSubmit={submitSearch} aria-label="Search dogs">
              <div className="s-search__row">
                <div className="s-field">
                  <label htmlFor="q-size">Size</label>
                  <select id="q-size" className="s-select" value={search.size} onChange={e => setSearch(s => ({ ...s, size: e.target.value }))}>
                    <option value="All">Any size</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="extra_large">Extra large</option>
                  </select>
                </div>
                <div className="s-field">
                  <label htmlFor="q-age">Age</label>
                  <select id="q-age" className="s-select" value={search.age} onChange={e => setSearch(s => ({ ...s, age: e.target.value }))}>
                    <option value="All">Any age</option>
                    <option value="Puppy">Puppy</option>
                    <option value="Young">Young</option>
                    <option value="Adult">Adult</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
                <div className="s-field">
                  <label htmlFor="q-good">Good with</label>
                  <select id="q-good" className="s-select" value={search.good} onChange={e => setSearch(s => ({ ...s, good: e.target.value }))}>
                    <option value="">Anyone</option>
                    <option value="kids">Children</option>
                    <option value="dogs">Other dogs</option>
                    <option value="cats">Cats</option>
                    <option value="apartment">Apartment living</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-lg"><Search size={18} /> Search</button>
              </div>
              <p className="s-search__hint">Not sure what you're looking for? <button type="button" onClick={startQuiz} className="s-link" style={{ background: "none", border: 0, padding: 0, fontSize: 13 }}>Take the match quiz</button></p>
            </form>

            <div className="s-trust">
              <span className="s-trust__item"><BadgeCheck size={18} /> Free to apply</span>
              <span className="s-trust__item"><ShieldCheck size={18} /> Verified shelters</span>
              <span className="s-trust__item"><MessageCircle size={18} /> Message shelters directly</span>
            </div>
          </div>

          <div className="s-hero__media">
            <img className="s-hero__photo" src={PHOTOS.hero} alt="A corgi and a terrier running down a trail at sunset" />
            {dogs && dogs.length > 0 && (
              <div className="s-hero__badge">
                <span className="s-hero__badge-icon"><HeartHandshake size={22} /></span>
                <div><strong>{dogs.length} dogs</strong><span>looking for a home right now</span></div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Live numbers ── */}
      <section className="s-section--tight" style={{ paddingTop: 0 }}>
        <div className="s-container">
          <div className="s-stats">
            <div className="s-stat"><div className="s-stat__value">{dogs ? dogs.length : "—"}</div><div className="s-stat__label">Dogs available now</div></div>
            <div className="s-stat"><div className="s-stat__value">{shelters.length || "—"}</div><div className="s-stat__label">Partner shelters</div></div>
            <div className="s-stat"><div className="s-stat__value">{states || "—"}</div><div className="s-stat__label">States covered</div></div>
            <div className="s-stat"><div className="s-stat__value">$0</div><div className="s-stat__label">To browse and apply</div></div>
          </div>
        </div>
      </section>

      {/* ── Featured dogs ── */}
      <section className="s-section" style={{ paddingTop: 48 }}>
        <div className="s-container">
          <div className="s-section-head">
            <div>
              <span className="s-eyebrow">Available now</span>
              <h2 className="s-h2">Meet some of our dogs</h2>
              <p className="s-lead">Each one is waiting at a partner shelter near you.</p>
            </div>
            <Link to="/browse-dogs" className="s-link">View all {dogs?.length || ""} dogs <ArrowRight size={16} /></Link>
          </div>
          <div className="s-grid s-grid--4">
            {dogs === null
              ? Array.from({ length: 8 }, (_, i) => <DogCardSkeleton key={i} />)
              : featured.map(dog => <DogCard key={dog.dog_id} dog={dog} />)}
          </div>
        </div>
      </section>

      {/* ── Browse by size ── */}
      <section className="s-section s-section--tint">
        <div className="s-container">
          <div className="s-section-head">
            <div>
              <span className="s-eyebrow">Browse</span>
              <h2 className="s-h2">Start with the right size</h2>
            </div>
          </div>
          <div className="s-grid s-grid--4">
            {SIZE_TILES.map(tile => (
              <Link key={tile.key} className="s-tile" to={tile.key === "puppy" ? "/browse-dogs?age=Puppy" : `/browse-dogs?size=${tile.key}`}>
                {tilePhoto(tile.key) ? <img src={tilePhoto(tile.key)} alt="" loading="lazy" /> : <div className="s-skeleton" style={{ width: "100%", height: "100%" }} />}
                <div className="s-tile__label"><strong>{tile.label}</strong><span>{tile.text}</span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="s-section" id="how-it-works">
        <div className="s-container">
          <div className="s-section-head">
            <div>
              <span className="s-eyebrow">How it works</span>
              <h2 className="s-h2">From first look to forever home</h2>
            </div>
            <Link to="/how-it-works" className="s-link">Learn more <ArrowRight size={16} /></Link>
          </div>
          <div className="s-steps">
            {STEPS.map((step, i) => (
              <div className="s-step" key={step.title}>
                <div className="s-step__num">{i + 1}</div>
                <h3 className="s-h3">{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Match quiz ── */}
      <section className="s-section s-section--tint">
        <div className="s-container s-split">
          <div className="s-split__media"><img src={PHOTOS.quiz} alt="An Australian Shepherd looking at the camera on a beach" loading="lazy" /></div>
          <div>
            <span className="s-eyebrow">Match quiz</span>
            <h2 className="s-h2">Not sure where to start? Let us suggest a few dogs.</h2>
            <p className="s-lead">Five questions about your home, schedule and household. We compare your answers with every available dog and show you the best fits.</p>
            <ul className="s-checklist">
              <li><CircleCheck size={20} /> Takes about two minutes</li>
              <li><CircleCheck size={20} /> Matches on energy, size, space and who you live with</li>
              <li><CircleCheck size={20} /> Save your matches and compare them later</li>
            </ul>
            <button className="btn btn-dark btn-lg" onClick={startQuiz}>Take the quiz <ArrowRight size={18} /></button>
          </div>
        </div>
      </section>

      {/* ── Why ── */}
      <section className="s-section">
        <div className="s-container">
          <div className="s-section-head">
            <div>
              <span className="s-eyebrow">Why Canine Connections</span>
              <h2 className="s-h2">Adoption, without the runaround</h2>
            </div>
          </div>
          <div className="s-grid s-grid--2" style={{ gap: 40 }}>
            {WHY.map(item => (
              <div className="s-feature" key={item.title}>
                <span className="s-feature__icon"><item.icon size={22} /></span>
                <div><h3 className="s-h3">{item.title}</h3><p>{item.text}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stories ── */}
      {stories.length > 0 && (
        <section className="s-section s-section--tint">
          <div className="s-container">
            <div className="s-section-head">
              <div>
                <span className="s-eyebrow">Success stories</span>
                <h2 className="s-h2">Families who found their match</h2>
              </div>
              <Link to="/success-stories" className="s-link">Read more stories <ArrowRight size={16} /></Link>
            </div>
            <div className="s-grid s-grid--3">
              {stories.map(story => {
                const name = [story.first_name, story.last_name].filter(Boolean).join(" ") || "Adopter"
                return (
                  <figure className="s-quote" key={story.story_id} style={{ margin: 0 }}>
                    <h3 className="s-h3" style={{ margin: 0 }}>{story.title}</h3>
                    <blockquote>“{story.story}”</blockquote>
                    <figcaption className="s-quote__who">
                      <span className="s-avatar">{name.charAt(0)}</span>
                      <div><strong>{name}</strong><span>Adopted through Canine Connections</span></div>
                    </figcaption>
                  </figure>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Shelters ── */}
      {shelters.length > 0 && (
        <section className="s-section">
          <div className="s-container">
            <div className="s-section-head">
              <div>
                <span className="s-eyebrow">Partner shelters</span>
                <h2 className="s-h2">The rescues behind every listing</h2>
                <p className="s-lead">Independent shelters and foster networks across {states} states.</p>
              </div>
              <Link to="/shelters" className="s-link">See all shelters <ArrowRight size={16} /></Link>
            </div>
            <div className="s-grid s-grid--3">
              {shelters.slice(0, 6).map(s => (
                <Link key={s.shelter_id} to={`/shelters/${s.shelter_id}`} className="s-card">
                  <div className="s-card__body">
                    <h3 className="s-h3" style={{ marginBottom: 2 }}>{s.name}</h3>
                    <span className="s-muted" style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><MapPin size={14} /> {[s.city, s.state].filter(Boolean).join(", ")}</span>
                    {s.description && <p className="s-muted" style={{ margin: "10px 0 0", fontSize: 14.5, lineHeight: 1.6 }}>{s.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Resources ── */}
      {resources.length > 0 && (
        <section className="s-section s-section--tint">
          <div className="s-container">
            <div className="s-section-head">
              <div>
                <span className="s-eyebrow">Care guides</span>
                <h2 className="s-h2">Get ready for day one</h2>
              </div>
              <Link to="/resources" className="s-link">All guides <ArrowRight size={16} /></Link>
            </div>
            <div className="s-grid s-grid--3">
              {resources.map(r => (
                <a key={r.resource_id} href={r.url} target="_blank" rel="noreferrer" className="s-card">
                  <div className="s-card__body">
                    <span className="s-chip" style={{ alignSelf: "flex-start", textTransform: "capitalize" }}>{r.category}</span>
                    <h3 className="s-h3" style={{ marginTop: 8 }}>{r.title}</h3>
                    <p className="s-muted" style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>{r.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section className="s-section">
        <div className="s-container s-container--narrow">
          <div className="s-section-head s-section-head--center">
            <span className="s-eyebrow">FAQ</span>
            <h2 className="s-h2">Questions, answered</h2>
          </div>
          <div className="s-faq">
            {FAQS.slice(0, 5).map(item => (
              <details key={item.q}>
                <summary>{item.q}<Plus size={20} /></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 28 }}><Link to="/faq" className="s-link">See all questions <ArrowRight size={16} /></Link></p>
        </div>
      </section>

      {/* ── Call to action ── */}
      <section className="s-section" style={{ paddingTop: 0 }}>
        <div className="s-container">
          <div className="s-cta">
            <div>
              <h2 className="s-h2">Ready to meet your match?</h2>
              <p>Create a free account to save dogs, take the quiz and apply in minutes.</p>
            </div>
            <div className="s-cta__actions">
              {loggedIn ? (
                <button className="btn btn-light btn-lg" onClick={() => navigate("/dashboard")}>Go to my dashboard</button>
              ) : (
                <button className="btn btn-light btn-lg" onClick={() => openAuth("register")}>Create free account</button>
              )}
              <button className="btn btn-outline-light btn-lg" onClick={() => navigate("/browse-dogs")}>Browse dogs</button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default function Landing() {
  return (
    <PublicLayout>
      <HomeContent />
    </PublicLayout>
  )
}
