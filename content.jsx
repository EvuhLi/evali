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

const EXPERIENCE = [
  {
    when: 'Jan 2026 — Present', where: 'CTAT · Pittsburgh',
    role: 'Software Engineering Intern',
    org: '— Cognitive Tutoring Authoring Tools',
    body: 'Designing and shipping 20+ end-to-end features for CTAT, a web-based intelligent tutoring system used in university research environments. Refactored the HTML lesson editor\'s application logic to improve robustness and accessibility for 1,000+ users.',
    tags: ['Vue', 'JavaScript', 'HTML', 'CSS'],
  },
  {
    when: 'Jan 2026 — Present', where: 'CMU SCS · Pittsburgh',
    role: '15-122 Teaching Assistant',
    org: '— Principles of Imperative Computation',
    body: 'TA for 400+ students in data structures, algorithms, and correctness/safety proofs using C and C0. Lead weekly precepts and host office hours, mentoring students through the course\'s hardest material.',
    tags: ['C', 'C0', 'Algorithms', 'Pedagogy'],
  },
  {
    when: 'Jan 2026 — Present', where: 'CMU Housing · Pittsburgh',
    role: 'Resident Assistant',
    org: '',
    body: 'Collaborate with a 16-person RA staff to mediate resident conflicts and mental-health crises affecting 700+ students. Execute emergency-preparedness plans during high-stress situations, coordinating with emergency services and providing calm reassurance to affected residents.',
    tags: ['Crisis response', 'Mediation', 'Mentorship'],
  },
  {
    when: 'May 2024 — Aug 2025', where: 'Code Ninjas · Katy, TX',
    role: 'Lead Sensei',
    org: '',
    body: 'Led week-long intensive coding bootcamps for 40+ students ages 5–17, taking them from zero to a deployed personal web project in JavaScript, HTML and CSS. Provided 1-on-1 weekly mentorship in web development and debugging — measurable lift in project completion and code quality.',
    tags: ['JavaScript', 'HTML', 'CSS', 'Teaching'],
  },
];

const SKILLS = {
  Languages: ['Java', 'Python', 'C++', 'C#', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'SQL'],
  'Frameworks & Libraries': ['React', 'Node.js', 'Express', '.NET', 'Vue', 'Vite', 'MediaPipe', 'OpenAI API', 'Three.js'],
  'Tools & Platforms': ['WebSockets', 'UDP', 'MongoDB', 'Git', 'GitHub', 'REST APIs', 'Figma', 'Adobe Illustrator', 'After Effects'],
  Certifications: ['AWS Cloud Practitioner'],
};

const AWARDS = [
  { name: 'Hacking4Humanity — Top Finisher (Loom)', yr: '2026' },
  { name: 'Dean\'s List, Carnegie Mellon University', yr: '2025' },
  { name: 'CyFair Hackathon — Winner', yr: '2024' },
  { name: 'Scholastic Art & Writing — National Gold Medal, Drawing & Illustration', yr: '2023' },
  { name: 'National Merit Finalist', yr: '2023' },
  { name: 'AP Scholar with Distinction', yr: '2023' },
  { name: 'Texas High School Coaches Assn. — Academic Elite All-State', yr: '2023' },
  { name: 'UIL Texas 6A State Semifinalists, Girls Soccer', yr: '2023' },
];

const INTERESTS = [
  { t: 4, name: 'Soccer' },
  { t: 2, name: 'Futsal' },
  { t: 5, name: 'Painting' },
  { t: 3, name: 'Cooking' },
  { t: 4, name: 'Teaching' },
  { t: 2, name: 'Dancing' },
  { t: 5, name: 'Drawing' },
  { t: 3, name: 'Music' },
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

// ─────────────────────────────────────────────────────────────
function Experience() {
  return (
    <section id="experience" className="section" data-screen-label="04 Experience">
      <Scene
        layers={[
          { src: 'assets/ink-7.png', speed: 0.06, opacity: .28,
            size: '115% auto', width: '115%', left: '-7%', top: '-3%', height: '40%' },
          { src: 'assets/ink-4.png', speed: 0.22, opacity: .32,
            size: 'auto 70%', width: '28%', anchorX: 'right', right: '-8%', bottom: '-8%' },
        ]}
        mistOpacity={1}
        intensity={window.__inkFx?.intensity ?? 1}
        parallaxStrength={window.__inkFx?.parallax ?? 1}
      />
      <div className="section-inner">
        <Reveal>
          <div className="section-head">
            <span className="index">Ⅲ · The Path</span>
            <h2>Where I've <em>worked & learned</em>.</h2>
          </div>
        </Reveal>
        {EXPERIENCE.map((x, i) => (
          <Reveal key={i} delay={i * 80}>
            <div className="xp">
              <div>
                <div className="when">{x.when}</div>
                <div className="where">{x.where}</div>
              </div>
              <div>
                <div className="role"><b>{x.role}</b> {x.org && <span style={{color:'var(--ink-3)',fontStyle:'italic'}}>{x.org}</span>}</div>
                <div className="body">{x.body}</div>
                <div className="tags">{x.tags.map((t) => <span key={t}>{t}</span>)}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
function Skills() {
  return (
    <section id="skills" className="section" data-screen-label="05 Skills">
      <Scene
        layers={[
          { src: 'assets/ink-7.png', speed: 0.04, opacity: .2,
            size: '120% auto', width: '120%', left: '-10%', top: '-3%', height: '38%' },
          { src: 'assets/ink-6.png', speed: 0.18, opacity: .25,
            size: 'auto 70%', width: '30%', anchorX: 'left', left: '-12%', bottom: '-10%' },
        ]}
        mistOpacity={.9}
        intensity={window.__inkFx?.intensity ?? 1}
        parallaxStrength={window.__inkFx?.parallax ?? 1}
      />
      <div className="section-inner">
        <Reveal>
          <div className="section-head">
            <span className="index">Ⅳ · Tools of the Trade</span>
            <h2>Skills, <em>practiced</em>.</h2>
          </div>
        </Reveal>
        <div className="skills-grid">
          {Object.entries(SKILLS).map(([group, list], i) => (
            <Reveal key={group} delay={i*100}>
              <div className="skill-group">
                <h4><span className="num">{['ⅰ','ⅱ','ⅲ','ⅳ'][i]}</span> {group}</h4>
                <div className="skill-list">
                  {list.map((s) => <span key={s} className="skill">{s}</span>)}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={400}>
          <h4 style={{
            fontFamily:'var(--mono)',fontSize:11,letterSpacing:'.22em',
            textTransform:'uppercase',color:'var(--ink-3)',
            marginTop:80, marginBottom: 18,
            display:'flex',alignItems:'center',gap:14,
          }}><span style={{color:'var(--cinnabar)',fontFamily:'var(--serif-display)',fontStyle:'italic',fontSize:18,letterSpacing:0,textTransform:'none'}}>ⅴ</span> Honors</h4>
          <div className="awards">
            {AWARDS.map((a, i) => (
              <div key={i} className="award">
                <span className="mark">◆</span>
                <span className="name">{a.name}</span>
                <span className="yr">{a.yr}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
function Interests() {
  return (
    <section id="interests" className="section" data-screen-label="06 Interests">
      <Scene
        layers={[
          { src: 'assets/ink-7.png', speed: 0.06, opacity: .25,
            size: '115% auto', width: '115%', left: '-7%', top: '-3%', height: '40%' },
          { src: 'assets/ink-3.png', speed: 0.24, opacity: .35,
            size: 'auto 75%', width: '26%', anchorX: 'right', right: '-10%', bottom: '-8%' },
          { src: 'assets/ink-5.png', speed: 0.36, opacity: .28,
            size: 'auto 50%', width: '22%', anchorX: 'left', left: '-5%', bottom: '-6%' },
        ]}
        mistOpacity={1}
        intensity={window.__inkFx?.intensity ?? 1}
        parallaxStrength={window.__inkFx?.parallax ?? 1}
      />
      <div className="section-inner">
        <Reveal>
          <div className="section-head">
            <span className="index">Ⅴ · Beyond the Screen</span>
            <h2>Other <em>currents</em>.</h2>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <div className="interests-cloud">
            {INTERESTS.map((it, i) => (
              <span key={it.name} className={`interest t-${it.t}`}>{it.name}</span>
            ))}
          </div>
        </Reveal>
        <Reveal delay={300}>
          <div className="interest-blurb">
            <p>I serve as <em>Secretary of CMU Club Soccer</em> — coordinating travel, lineups and the perpetual hunt for cleats. Before college I helped my high school reach the <em>UIL Texas 6A state semifinals.</em></p>
            <p>Outside athletics I paint — mostly ink and watercolor — and I cook a lot. I find the disciplines rhyme: composition, balance, restraint, knowing when to stop adding things.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
function Contact() {
  return (
    <section id="contact" className="section" data-screen-label="07 Contact">
      <Scene
        layers={[
          { src: 'assets/ink-7.png', speed: 0.05, opacity: .25,
            size: '120% auto', width: '120%', left: '-10%', top: '-3%', height: '40%' },
          { src: 'assets/ink-1.png', speed: 0.2, opacity: .35,
            size: 'auto 70%', width: '24%', anchorX: 'left', left: '-6%', bottom: '-8%' },
          { src: 'assets/ink-4.png', speed: 0.32, opacity: .28,
            size: 'auto 60%', width: '24%', anchorX: 'right', right: '-8%', bottom: '-8%' },
        ]}
        mistOpacity={1}
        intensity={window.__inkFx?.intensity ?? 1}
        parallaxStrength={window.__inkFx?.parallax ?? 1}
      />
      <div className="section-inner">
        <Reveal>
          <div className="section-head">
            <span className="index">Ⅵ · Send Word</span>
            <h2>Let's <em>build</em> something.</h2>
          </div>
        </Reveal>
        <div className="contact-wrap">
          <Reveal delay={100}>
            <p className="lede" style={{maxWidth:'52ch'}}>
              I'm currently looking for <em>Summer 2026 software engineering internships.</em> Always happy to talk about ink, soccer, real-time systems, or how to make a UI feel quiet.
            </p>
            <div className="contact-links">
              <a href="mailto:lievayifan@gmail.com">lievayifan@gmail.com <span className="arrow">↗</span></a>
              <a href="tel:+18323775464">(832) 377-5464 <span className="arrow">↗</span></a>
              <a href="https://github.com/EvuhLi" target="_blank" rel="noreferrer">github.com/EvuhLi <span className="arrow">↗</span></a>
              <a href="https://www.linkedin.com/in/evangeline-li-85704619a/" target="_blank" rel="noreferrer">linkedin / evangeline-li <span className="arrow">↗</span></a>
              <a href="assets/Eva Li Resume.pdf" target="_blank" rel="noreferrer">resume.pdf <span className="arrow">↗</span></a>
            </div>
          </Reveal>
          <Reveal delay={300}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:18}}>
              <span className="seal">李</span>
              <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--ink-3)',textAlign:'right',lineHeight:1.7}}>
                signed in ink<br/>Pittsburgh · MMXXVI
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { About, Projects, Experience, Skills, Interests, Contact });
