// content.jsx — Eva Li's section content (About, Projects, Experience, Skills, Interests, Contact)

const PROJECTS = [
  {
    n: '01', name: 'Loom', em: 'a safer social platform for artists',
    stack: 'React · Vite · Node · Express · MongoDB · Python ML',
    yr: '2026',
    desc: 'Production-ready full-stack social platform designed to prevent AI web-scraping of artists\' work. Built the React/Vite frontend, Node/Express REST API, and MongoDB schemas for users, posts, communities and activity logs. Wrote a Python ML microservice for bot detection, content tagging, behavioral analysis and personalized recommendations — improving both feed relevance and platform safety. Selected for the Gubernatorial Roundtable at the PA Governor\'s Residence with First Lady Lori Shapiro to discuss AI safety. Top Finisher, Hacking4Humanity.',
  },
  {
    n: '02', name: 'Minecraft Live', em: 'play with your whole body',
    stack: 'Python · MediaPipe · WebSockets · UDP',
    yr: '2026',
    desc: 'Real-time, full-body motion control system for Minecraft. Translates live pose landmarks and head orientation into low-latency hardware-level keyboard/mouse inputs via neural-network inference. A cross-platform mobile companion controller talks to the host over async WebSockets and UDP, with custom signal processing for drift calibration and dead-zone filtering. A configurable state machine handles complex in-game mechanics — sprint toggling, inventory management, interaction sequencing — with safety thresholds against unintended actions.',
  },
  {
    n: '03', name: 'Sparrow', em: 'teaching kids to code',
    stack: 'React · MongoDB · HTML/CSS · Illustrator · After Effects',
    yr: '2024',
    desc: 'A full-stack educational app that teaches children Java through visual block coding and interactive lessons. Designed all character animations, customization systems and site layout in Illustrator and After Effects for a cohesive visual identity. Piloted with elementary and middle-school students; iterated on accessibility and comprehension based on their feedback.',
  },
];

// ─────────────────────────────────────────────────────────────
function About() {
  return (
    <section id="about" className="section" data-screen-label="02 About">
      <Scene
        layers={[
          { src: 'assets/ink-7.png', speed: 0.08, opacity: .28,
            size: '110% auto', width: '110%', left: '-5%', top: '-3%', height: '40%' },
          { src: 'assets/ink-8.png', speed: 0.22, opacity: .35,
            size: 'auto 60%', width: '28%', anchorX: 'right', right: '-8%', bottom: '-8%' },
        ]}
        mistOpacity={1}
        intensity={window.__inkFx?.intensity ?? 1}
        parallaxStrength={window.__inkFx?.parallax ?? 1}
      />
      <div className="section-inner">
        <Reveal>
          <div className="section-head">
            <span className="index">Ⅰ · The Studio</span>
            <h2>Drawn between <em>code & ink.</em></h2>
          </div>
        </Reveal>
        <div className="about-grid">
          <Reveal className="col-left" delay={120}>
            <p className="lede">
              I'm a freshman at Carnegie Mellon studying <em>Computer Science & Information Systems</em> (B.S., expected Dec 2028). I grew up painting before I learned to program — the two have been bleeding into each other ever since.
            </p>
            <p>
              I like building things that feel hand-made: real-time tools that respond to the body, social platforms that protect the people on them, study aids that listen as carefully as a tutor. I care about the seams — how a UI breathes, how a system fails, where the ink pools.
            </p>
            <p>
              When I'm not at a keyboard you'll find me on a soccer pitch, in the kitchen experimenting with a new sauce, in office hours for 15-122, or somewhere with a sketchbook.
            </p>
          </Reveal>
          <Reveal className="col-right" delay={260}>
            <div className="row"><span>Based in</span><span>Pittsburgh, PA</span></div>
            <div className="row"><span>Studying</span><span>CS & IS · CMU</span></div>
            <div className="row"><span>Graduating</span><span>December 2028</span></div>
            <div className="row"><span>GPA</span><span>3.77 · Dean's List</span></div>
            <div className="row"><span>Currently</span><span>SWE Intern @ CTAT</span></div>
            <div className="row"><span>Also</span><span>15-122 TA · RA</span></div>
            <div className="row"><span>Coursework</span><span>DSA, Discrete, Linear Alg, SWD, DBs</span></div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
function Projects() {
  const [open, setOpen] = useState(0);
  return (
    <section id="projects" className="section" data-screen-label="03 Projects">
      <Scene
        layers={[
          { src: 'assets/ink-7.png', speed: 0.05, opacity: .25,
            size: '120% auto', width: '120%', left: '-10%', top: '-4%', height: '38%' },
          { src: 'assets/ink-2.png', speed: 0.24, opacity: .38,
            size: 'auto 75%', width: '26%', anchorX: 'left', left: '-10%', bottom: '-8%' },
          { src: 'assets/ink-1.png', speed: 0.36, opacity: .32,
            size: 'auto 60%', width: '24%', anchorX: 'right', right: '-8%', bottom: '-10%' },
        ]}
        mistOpacity={.85}
        intensity={window.__inkFx?.intensity ?? 1}
        parallaxStrength={window.__inkFx?.parallax ?? 1}
      />
      <div className="section-inner">
        <Reveal>
          <div className="section-head">
            <span className="index">Ⅱ · Selected Works</span>
            <h2>Things I've <em>made</em>.</h2>
            <p style={{margin:0,color:'var(--ink-3)',fontSize:'17px'}}>Projects that taught me something. Click any to expand.</p>
          </div>
        </Reveal>
        <div className="proj-list">
          {PROJECTS.map((p, i) => (
            <Reveal key={p.n} delay={i*80}>
              <div className={`proj ${open === i ? 'open' : ''}`} onClick={() => setOpen(open === i ? -1 : i)}>
                <span className="num">{p.n}</span>
                <span className="name">{p.name} <em>{p.em}</em></span>
                <span className="stack">{p.stack}</span>
                <span className="yr">{p.yr}</span>
              </div>
              <div className={`proj-desc ${open === i ? 'open' : ''}`}
                   style={{ display: open === i ? 'block' : 'none', paddingLeft: 92, paddingBottom: open === i ? 28 : 0 }}>
                <p style={{margin:0}}>{p.desc}</p>
                <p style={{marginTop: 14}}>
                  <a href="#" style={{fontFamily:'var(--mono)',fontSize:11,letterSpacing:'.18em',textTransform:'uppercase',color:'var(--cinnabar)'}}>case study →</a>
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { About, Projects });
