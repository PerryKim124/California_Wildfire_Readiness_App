import { useEffect, useState, type ReactNode } from "react";
import "./enhancements.css";

type IconName =
  | "grid" | "home" | "flame" | "route" | "check" | "game" | "spark"
  | "chart" | "book" | "file" | "settings" | "bell" | "help" | "pin"
  | "chevron" | "arrow" | "shield" | "clock" | "menu" | "close"
  | "users" | "car" | "pet" | "phone" | "box" | "external" | "download";

const iconPaths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  flame: <path d="M12 22c4 0 7-3 7-7 0-5-4-8-6-12-1 4-5 6-5 10-1-1-2-2-2-3-2 2-2 4-2 6 0 3 3 6 8 6Zm0-3c-2 0-3-1-3-3 0-1 1-3 3-5 0 2 3 3 3 5 0 2-1 3-3 3Z"/>,
  route: <><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M8 17c1-3 7-2 8-5 .6-1.5-.4-2.5-1-3"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  game: <><rect x="3" y="6" width="18" height="13" rx="5"/><path d="M8 11v4M6 13h4M15 12h.01M18 15h.01"/></>,
  spark: <><path d="m12 3 1.2 4.3L17 9l-3.8 1.7L12 15l-1.2-4.3L7 9l3.8-1.7L12 3Z"/><path d="m19 15 .6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15Z"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  book: <><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4Z"/><path d="M7 16h11M8 8h6"/></>,
  file: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.4 3h-4.8l-.4 3a8 8 0 0 0-1.8 1L5 6.1 3 9.5 5.1 11a7 7 0 0 0 0 2L3 14.5 5 18l2.4-1a8 8 0 0 0 1.8 1l.4 3h4.8l.4-3a8 8 0 0 0 1.8-1l2.4 1 2-3.5-2.1-1.5a7 7 0 0 0 .1-1Z"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 1 1 3.4 2.6c-.9.3-.9 1.1-.9 2M12 17h.01"/></>,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
  shield: <><path d="M12 22S20 18 20 11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m8 12 2.5 2.5L16 9"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
  car: <><path d="m5 11 2-5h10l2 5M3 11h18v7H3z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></>,
  pet: <><circle cx="8" cy="7" r="2"/><circle cx="16" cy="7" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M8 18c0-3 2-5 4-5s4 2 4 5c0 2-2 3-4 2-2 1-4 0-4-2Z"/></>,
  phone: <path d="M7 3H4a2 2 0 0 0-2 2c0 9 7 16 16 16a2 2 0 0 0 2-2v-3l-4-1-2 3c-4-2-6-4-8-8l3-2-2-5Z"/>,
  box: <><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></>,
  external: <><path d="M14 3h7v7M21 3l-9 9"/><path d="M18 13v7H4V6h7"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 21h14"/></>,
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

function Button({ children, variant = "primary", icon, onClick, disabled = false }: { children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: IconName; onClick?: () => void; disabled?: boolean }) {
  return <button className={`btn btn-${variant}`} onClick={onClick} disabled={disabled}>{icon && <Icon name={icon} size={16}/>}<span>{children}</span></button>;
}

const nav = [
  ["Dashboard", "grid"], ["My Household", "home"], ["Wildfire Risk", "flame"],
  ["Evacuation", "route"], ["Preparedness Plan", "check"], ["Emergency Decision Game", "game"],
  ["AI Readiness Advisor", "spark"], ["Progress", "chart"], ["Sources & Evidence", "book"],
  ["Preparedness Report", "file"], ["Settings", "settings"],
] as [string, IconName][];

const scoreParts = [
  ["Evacuation Plan", 18, 25], ["Emergency Supplies", 15, 20], ["Transportation", 12, 15],
  ["Communication Plan", 10, 15], ["Household Needs", 8, 10], ["Pets", 4, 5],
  ["Important Documents", 3, 5], ["Training & Knowledge", 2, 5],
] as const;

const recommendations = [
  { title: "Create an evacuation plan", points: 8, time: "20 min", level: "High priority", why: "A shared plan reduces delays when every minute matters.", source: "CAL FIRE" },
  { title: "Prepare a 72-hour emergency kit", points: 6, time: "45 min", level: "Medium effort", why: "Essential supplies support your household during evacuation.", source: "Cal OES" },
  { title: "Add an out-of-area contact", points: 4, time: "5 min", level: "Quick win", why: "Local networks may be unavailable during a major incident.", source: "FEMA" },
  { title: "Create a pet evacuation plan", points: 3, time: "15 min", level: "Quick win", why: "Carriers and medication need to be ready before a warning.", source: "Ready.gov" },
];

function ScoreRing({ score, compact = false }: { score: number; compact?: boolean }) {
  const r = compact ? 42 : 68;
  const c = 2 * Math.PI * r;
  return <div className={`score-ring ${compact ? "compact" : ""}`}>
    <svg viewBox="0 0 180 180">
      <circle className="ring-track" cx="90" cy="90" r={r}/>
      <circle className="ring-value" cx="90" cy="90" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}/>
    </svg>
    <div className="score-center"><strong>{score}</strong><span>/ 100</span></div>
  </div>;
}

function Badge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "orange" | "blue" | "gray" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function App() {
  const [entry, setEntry] = useState<"landing" | "setup" | "app">("landing");
  const [active, setActive] = useState("Dashboard");
  const [score, setScore] = useState(72);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [complete, setComplete] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);

  const completeTask = (title: string, points: number) => {
    if (complete.includes(title)) return;
    setComplete((v) => [...v, title]);
    let current = score;
    const target = Math.min(score + points, 100);
    const timer = window.setInterval(() => {
      current += 1;
      setScore(current);
      if (current >= target) window.clearInterval(timer);
    }, 55);
  };

  const go = (name: string) => { setActive(name); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (entry === "landing") return <Landing onStart={() => setEntry("setup")} onExplore={() => setEntry("app")}/>;
  if (entry === "setup") return <HouseholdSetup onComplete={() => setEntry("app")}/>;

  return <div className="app">
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
      <div className="brand" onClick={() => go("Dashboard")}><div className="brand-mark"><Icon name="flame" size={20}/></div><div><b>ReadyCA</b><small>WILDFIRE READINESS</small></div></div>
      <nav>{nav.map(([label, icon]) => <button key={label} className={active === label ? "active" : ""} onClick={() => go(label)}><Icon name={icon}/><span>{label}</span>{active === label && <i/>}</button>)}</nav>
      <div className="sidebar-foot"><Icon name="shield"/><div><b>Emergency guidance</b><span>Follow official local authority instructions. Call 911 for life-threatening emergencies.</span></div></div>
    </aside>

    <div className="page">
      <header>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"}/></button>
        <div className="location"><Icon name="pin"/><div><small>PREPAREDNESS LOCATION</small><b>San Diego County, CA</b></div><Icon name="chevron" size={14}/></div>
        <div className="header-actions">
          <Badge tone="orange"><span className="status-dot"/> MODERATE RISK</Badge>
          <button className="icon-button" aria-label="Help"><Icon name="help"/></button>
          <button className="icon-button notify" aria-label="Notifications" onClick={() => setNotifications(!notifications)}><Icon name="bell"/><i/></button>
          <div className="avatar">BR</div>
        </div>
        {notifications && <NotificationPanel onClose={() => setNotifications(false)}/>}
      </header>

      <main>
        {active === "Dashboard" && <Dashboard score={score} complete={complete} openScore={() => setScoreOpen(true)} completeTask={completeTask} go={go}/>}
        {active === "My Household" && <Household/>}
        {active === "Wildfire Risk" && <RiskMap go={go}/>}
        {active === "Evacuation" && <Evacuation/>}
        {active === "AI Readiness Advisor" && <Advisor/>}
        {active === "Emergency Decision Game" && <DecisionGame/>}
        {active === "Progress" && <Progress score={score} complete={complete}/>}
        {active === "Sources & Evidence" && <Evidence/>}
        {active === "Preparedness Report" && <Report score={score}/>}
        {active === "Preparedness Plan" && <PreparednessPlan complete={complete} completeTask={completeTask}/>}
        {active === "Settings" && <Settings/>}
      </main>
    </div>
    {scoreOpen && <ScoreModal score={score} complete={complete} close={() => setScoreOpen(false)} completeTask={completeTask}/>}
    {menuOpen && <div className="scrim mobile-only" onClick={() => setMenuOpen(false)}/>}
    <div className="bottom-nav">{[["Dashboard","grid"],["Wildfire Risk","flame"],["Evacuation","route"],["Progress","chart"]] .map(([label,icon])=><button className={active===label?"active":""} onClick={()=>go(label)} key={label}><Icon name={icon as IconName}/><span>{label==="Wildfire Risk"?"Risk":label}</span></button>)}<button onClick={()=>setMenuOpen(true)}><Icon name="menu"/><span>More</span></button></div>
  </div>;
}

function Landing({onStart,onExplore}:{onStart:()=>void;onExplore:()=>void}) {
  return <div className="landing">
    <header className="landing-header"><div className="brand"><div className="brand-mark"><Icon name="flame"/></div><div><b>ReadyCA</b><small>WILDFIRE READINESS</small></div></div><div><button className="text-button">How it works</button><button className="text-button">Preparedness resources</button><Button variant="secondary" onClick={onExplore}>Sign in</Button></div></header>
    <main className="landing-main"><section className="landing-copy"><Badge tone="orange"><span className="status-dot"/> BUILT FOR CALIFORNIA HOUSEHOLDS</Badge><h1>Be ready before wildfire conditions change.</h1><p>Understand your household's readiness, build a clear evacuation plan, and take the next best step with guidance grounded in trusted emergency sources.</p><div className="landing-actions"><Button onClick={onStart}>Build my readiness plan <Icon name="arrow"/></Button><Button variant="secondary" onClick={onExplore}>Explore the dashboard</Button></div><div className="trust-row"><span><Icon name="shield"/> Evidence-grounded</span><span><Icon name="check"/> Transparent scoring</span><span><Icon name="pin"/> Location-aware</span></div></section>
    <section className="landing-preview"><div className="preview-alert"><span><Icon name="flame"/></span><div><small>LOCAL WILDFIRE RISK</small><b>Moderate</b><p>No active evacuation order near your location.</p></div></div><div className="preview-score"><ScoreRing score={72}/><div><Badge>GOOD PREPAREDNESS</Badge><h2>Your household has a good start.</h2><p>Complete your evacuation plan to improve your score by 8 points.</p><div className="progress"><i style={{width:"72%"}}/></div></div></div><div className="preview-actions"><span><Icon name="route"/> Create evacuation plan <b>+8</b></span><span><Icon name="box"/> Prepare 72-hour kit <b>+6</b></span></div></section></main>
    <footer className="landing-footer"><span><Icon name="shield"/> In an emergency, follow official local instructions. Call 911 for life-threatening emergencies.</span><span>Guidance informed by CAL FIRE · Cal OES · FEMA · Ready.gov</span></footer>
  </div>;
}

function HouseholdSetup({onComplete}:{onComplete:()=>void}) {
  const [step,setStep]=useState(0);
  const steps=[["Your household","Tell us who you are preparing for.",["2 adults","1 child","1 older adult","Accessibility needs"]],["Pets & transportation","Plan for everyone and every way out.",["1 dog","Pet carrier ready","2 vehicles","Fuel above half"]],["Communication","Make sure your household can reconnect.",["Primary phone added","Emergency contact","Out-of-area contact","Text alerts preferred"]]] as const;
  const [selected,setSelected]=useState<string[]>(["2 adults","1 child","1 dog","2 vehicles"]);
  const current=steps[step];
  return <div className="setup-page"><header><div className="brand"><div className="brand-mark"><Icon name="flame"/></div><div><b>ReadyCA</b><small>HOUSEHOLD SETUP</small></div></div><button className="text-button" onClick={onComplete}>Save & finish later</button></header><main><div className="setup-progress"><span>STEP {step+1} OF {steps.length}</span><div>{steps.map((_,i)=><i className={i<=step?"active":""} key={i}/>)}</div></div><Badge tone="blue">USER-PROVIDED INFORMATION</Badge><h1>{current[0]}</h1><p>{current[1]} You can update these details at any time.</p><div className="setup-options">{current[2].map((x,i)=><button className={selected.includes(x)?"selected":""} onClick={()=>setSelected(v=>v.includes(x)?v.filter(y=>y!==x):[...v,x])} key={x}><span><Icon name={(["users","users","pet","car"] as IconName[])[i]}/></span><b>{x}</b><i>{selected.includes(x)&&<Icon name="check"/>}</i></button>)}</div><div className="setup-insight"><Icon name="spark"/><div><b>Why we ask</b><span>These details shape your evacuation timing, supply list, transportation plan, and priority recommendations. ReadyCA does not infer sensitive characteristics.</span></div></div><div className="setup-actions"><Button variant="secondary" onClick={()=>setStep(Math.max(0,step-1))} disabled={step===0}>Back</Button><Button onClick={()=>step<steps.length-1?setStep(step+1):onComplete()}>{step===steps.length-1?"View my readiness dashboard":"Continue"} <Icon name="arrow"/></Button></div></main></div>;
}

function Dashboard({ score, complete, openScore, completeTask, go }: { score: number; complete: string[]; openScore: () => void; completeTask: (t: string, p: number) => void; go: (n: string) => void }) {
  return <div className="dashboard">
    <section className="welcome"><div><div className="eyebrow">MONDAY, SEPTEMBER 23</div><h1>Good evening, Brinda.</h1><p>Here's your household's wildfire readiness at a glance.</p></div><Button variant="secondary" icon="pin">San Diego County</Button></section>
    <section className="risk-banner"><div className="risk-icon"><Icon name="flame"/></div><div><Badge tone="orange">LOCAL RISK · MODERATE</Badge><b>No active evacuation order near your selected location</b><span>Conditions can change quickly. Last checked 8 minutes ago.</span></div><Button variant="secondary" onClick={() => go("Wildfire Risk")}>View local risk <Icon name="arrow"/></Button></section>

    <div className="dashboard-grid">
      <section className="card readiness-card">
        <div className="card-heading"><div><span className="kicker">PERSONAL READINESS</span><h2>Your household readiness</h2></div><Badge>GOOD PREPAREDNESS</Badge></div>
        <div className="readiness-main"><ScoreRing score={score}/><div className="readiness-copy"><div className="score-large">{score}<span>/ 100</span></div><p>{score > 72 ? "Nice work — your readiness plan is getting stronger." : "Good start — but there are a few important gaps to address."}</p><Button variant="secondary" onClick={openScore}>Why is my score {score}%? <Icon name="arrow"/></Button></div></div>
        <div className="readiness-footer"><span><Icon name="chart" size={16}/> <b>+8 points</b> in the last 30 days</span><span>Profile strength <b>78%</b></span></div>
      </section>

      <section className="card priority-card">
        <div className="card-heading"><div><span className="kicker">NEXT BEST ACTION</span><h2>Priority for your household</h2></div><span className="number-chip">+8 pts</span></div>
        <div className="priority-art"><div className="route-line"/><div className="route-node home-node"><Icon name="home"/></div><div className="route-node safe-node"><Icon name="shield"/></div></div>
        <Badge tone="orange">HIGH PRIORITY</Badge>
        <h3>Create your evacuation plan</h3>
        <p>Choose a meeting point and make sure everyone knows two ways out.</p>
        {complete.includes(recommendations[0].title) ? <div className="completed-state"><Icon name="check"/> Task completed — score updated</div> : <Button onClick={() => completeTask(recommendations[0].title, 8)}>Start 20-minute plan <Icon name="arrow"/></Button>}
      </section>
    </div>

    <section className="section-head"><div><span className="kicker">YOUR ACTION PLAN</span><h2>Fastest ways to improve your score</h2><p>Recommended from your household profile and preparedness gaps.</p></div><Button variant="ghost" onClick={() => go("Preparedness Plan")}>View full plan <Icon name="arrow"/></Button></section>
    <div className="recommendation-grid">{recommendations.slice(0, 3).map((r, i) => <Recommendation key={r.title} item={r} index={i} done={complete.includes(r.title)} onComplete={() => completeTask(r.title, r.points)}/>)}</div>

    <div className="lower-grid">
      <section className="card local-card">
        <div className="card-heading"><div><span className="kicker">AROUND YOUR LOCATION</span><h2>Local wildfire overview</h2></div><span className="updated">Updated 8 min ago</span></div>
        <MiniMap/>
        <div className="map-stats"><div><span>Nearest active fire</span><b>Border 2 Fire</b></div><div><span>Distance</span><b>42 miles SE</b></div><div><span>Evacuation zone</span><b className="safe-text">Clear</b></div></div>
        <Button variant="secondary" onClick={() => go("Wildfire Risk")}>Open interactive risk map</Button>
      </section>
      <section className="card progress-card">
        <div className="card-heading"><div><span className="kicker">SEPTEMBER GOAL</span><h2>Build your evacuation plan</h2></div><b>3 / 5</b></div>
        <div className="progress"><i style={{width:"60%"}}/></div>
        {["Choose two exit routes", "Identify a meeting point", "Save a nearby shelter", "Practice the primary route", "Share plan with family"].map((x,i)=><div className={`task-row ${i < 3 ? "done" : ""}`} key={x}><span>{i < 3 && <Icon name="check" size={14}/>}</span><div><b>{x}</b><small>{i < 3 ? "Completed" : i === 3 ? "Recommended next" : "Not started"}</small></div></div>)}
        <Button variant="ghost" onClick={() => go("Progress")}>See all progress <Icon name="arrow"/></Button>
      </section>
    </div>
  </div>;
}

function Recommendation({ item, index, done, onComplete }: { item: typeof recommendations[number]; index: number; done: boolean; onComplete: () => void }) {
  return <article className={`card rec-card ${done ? "is-done" : ""}`}><div className={`rec-icon rec-${index}`}><Icon name={index === 0 ? "route" : index === 1 ? "box" : "phone"}/></div><span className="point-label">+{item.points} POINTS</span><h3>{item.title}</h3><p>{item.why}</p><div className="meta"><span><Icon name="clock" size={14}/>{item.time}</span><span>{item.level}</span></div><div className="source"><Icon name="shield" size={14}/> Verified · {item.source}</div><Button variant={done ? "secondary" : "primary"} onClick={onComplete} disabled={done}>{done ? <><Icon name="check"/> Completed</> : "Complete this task"}</Button></article>;
}

function MiniMap({ interactive = false }: { interactive?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  return <div className={`map ${interactive ? "map-large" : ""}`}>
    <div className="terrain t1"/><div className="terrain t2"/><div className="road r1"/><div className="road r2"/><div className="road r3"/>
    <span className="map-label la">ESCONDIDO</span><span className="map-label lb">SAN DIEGO</span><span className="map-label lc">CHULA VISTA</span><span className="ocean">PACIFIC OCEAN</span>
    <button className="map-pin user-pin" onClick={() => setSelected("Your selected location")}><span/><i/></button>
    <button className="map-pin fire-pin" onClick={() => setSelected("Border 2 Fire · 18% contained")}><Icon name="flame" size={13}/></button>
    {interactive && <><button className="map-pin shelter-pin" onClick={() => setSelected("Canyon Hills Shelter · Open")}><Icon name="home" size={13}/></button><div className="fire-area"/></>}
    {selected && <div className="map-pop"><b>{selected}</b><span>Updated 8 minutes ago</span><button onClick={()=>setSelected(null)}><Icon name="close" size={13}/></button></div>}
  </div>;
}

function ScoreModal({ score, complete, close, completeTask }: { score: number; complete: string[]; close: () => void; completeTask: (t:string,p:number)=>void }) {
  const [weights, setWeights] = useState(false);
  return <div className="modal-wrap"><div className="scrim" onClick={close}/><div className="modal">
    <div className="modal-head"><div><span className="kicker">TRANSPARENT SCORING</span><h2>How your readiness score is calculated</h2><p>Your score is generated from a transparent weighted rules engine.</p></div><button className="icon-button" onClick={close}><Icon name="close"/></button></div>
    <div className="score-summary"><ScoreRing score={score} compact/><div><Badge>GOOD PREPAREDNESS</Badge><b>Your current score</b><p>Strong transportation readiness, with gaps in evacuation planning and training.</p></div></div>
    <div className="rule-note"><Icon name="shield"/><div><b>Rules-based, not a black box</b><span>Your score is calculated from household preparedness factors — not from an opaque AI model.</span></div></div>
    <div className="score-breakdown">{scoreParts.map(([name,val,max])=><div className="score-row" key={name}><div><b>{name}</b><span>{val} / {max}</span></div><div className="progress"><i style={{width:`${val/max*100}%`}}/></div></div>)}</div>
    <button className="accordion" onClick={()=>setWeights(!weights)}><span>How are these weights determined?</span><Icon name="chevron"/></button>
    {weights && <div className="accordion-copy">Weights use predefined preparedness rules derived from CAL FIRE, Cal OES, FEMA, Ready.gov and local emergency management guidance. Higher weights reflect actions that most directly improve safe evacuation and household continuity.</div>}
    <div className="modal-recs"><h3>The fastest ways to improve your score</h3>{recommendations.slice(0,2).map(r=><div className="modal-rec" key={r.title}><div><b>{r.title}</b><span>{r.time} · {r.level} · Verified by {r.source}</span></div><strong>+{r.points}</strong><Button variant={complete.includes(r.title)?"secondary":"primary"} disabled={complete.includes(r.title)} onClick={()=>completeTask(r.title,r.points)}>{complete.includes(r.title)?"Completed":"Complete task"}</Button></div>)}</div>
  </div></div>;
}

function RiskMap({ go }: { go:(n:string)=>void }) {
  const [layer,setLayer]=useState("Risk");
  return <div><PageTitle kicker="LIVE SITUATIONAL AWARENESS" title="Wildfire Risk" copy="Monitor local incidents, evacuation zones, shelters, and road conditions."/>
    <div className="map-layout"><section className="card map-panel"><div className="map-controls">{["Risk","Active Fires","Evacuation Zones","Shelters","Roads"].map(x=><button className={layer===x?"active":""} onClick={()=>setLayer(x)} key={x}>{x}</button>)}</div><MiniMap interactive/><div className="map-disclaimer"><Icon name="shield"/> Emergency information can change rapidly. Always follow official evacuation orders and instructions from local authorities.</div></section>
    <aside className="card risk-side"><span className="kicker">CURRENT LOCAL RISK</span><div className="risk-level"><span>MODERATE</span><i>3</i></div><p>No active evacuation order detected near your selected location.</p><hr/><Info label="Nearest active wildfire" value="Border 2 Fire"/><Info label="Distance" value="42 miles southeast"/><Info label="Fire status" value="18% contained"/><Info label="Last updated" value="8 minutes ago"/><Info label="Evacuation zone" value="No current order"/><Info label="Nearby shelter" value="Canyon Hills · Open"/><Button onClick={()=>go("Evacuation")}>Plan evacuation route <Icon name="arrow"/></Button><div className="verified"><Icon name="shield"/> Verified incident sources</div></aside></div>
  </div>;
}

function Evacuation() {
  const [route,setRoute]=useState("Primary");
  const [saved,setSaved]=useState(false);
  return <div><PageTitle kicker="HOUSEHOLD PLAN" title="Your Evacuation Plan" copy="Review two ways out and keep a destination ready before conditions change."/>
    <div className="route-tabs"><button className={route==="Primary"?"active":""} onClick={()=>setRoute("Primary")}>Primary Evacuation Route</button><button className={route==="Backup"?"active":""} onClick={()=>setRoute("Backup")}>Backup Evacuation Route</button></div>
    <div className="map-layout"><section className="card route-map"><MiniMap interactive/><div className={`route-overlay ${route==="Backup"?"backup":""}`}><i/><i/><i/><i/></div></section>
    <aside className="card risk-side"><Badge tone={route==="Primary"?"green":"blue"}>{route.toUpperCase()} ROUTE</Badge><h2>Home → {route==="Primary"?"Canyon Hills Shelter":"Poway Community Center"}</h2><div className="route-metrics"><div><b>{route==="Primary"?"24":"31"} min</b><span>Estimated time</span></div><div><b>{route==="Primary"?"13.2":"18.7"} mi</b><span>Distance</span></div></div><Info label="Major roads" value={route==="Primary"?"I-15 N → CA-56":"Scripps Poway Pkwy"}/><Info label="Potential hazards" value={route==="Primary"?"1 narrow segment":"Heavy school traffic"}/><Info label="Road closures" value="None reported"/><div className="button-stack"><Button onClick={()=>setSaved(true)}>{saved?<><Icon name="check"/> Plan saved</>:"Save Evacuation Plan"}</Button><Button variant="secondary">Practice This Route</Button></div></aside></div>
    <section className="section-head"><div><span className="kicker">SAFE DESTINATIONS</span><h2>Nearby emergency shelters</h2></div></section>
    <div className="shelters">{["Canyon Hills Recreation Center","Poway Community Center","Mira Mesa Senior Center"].map((x,i)=><div className="card shelter" key={x}><div className="shelter-icon"><Icon name="home"/></div><div><h3>{x}</h3><p>{[4.8,7.2,9.1][i]} miles · <span className="safe-text">Open</span></p><span className="amenity">Pet-friendly</span><span className="amenity">Accessible</span></div><Icon name="chevron"/></div>)}</div>
  </div>;
}

type ResourceStatus = "ready" | "attention" | "missing";
type ResourceItem = {
  name: string;
  status: ResourceStatus;
  quantity: string;
  detail: string;
  meta: string;
  impact?: number;
  why?: string;
};

const resourceCategories: { name: string; icon: IconName; items: ResourceItem[] }[] = [
  {
    name: "Safety Equipment",
    icon: "shield",
    items: [
      { name: "Fire extinguisher", status: "ready", quantity: "1", detail: "Garage cabinet", meta: "Inspected 18 days ago" },
      { name: "Smoke alarms", status: "ready", quantity: "4", detail: "Throughout home", meta: "Tested September 12" },
      { name: "Carbon monoxide detector", status: "ready", quantity: "2", detail: "Hallways", meta: "Batteries replaced August 3" },
      { name: "N95 masks", status: "missing", quantity: "0", detail: "Not in inventory", meta: "Add one per household member", impact: 2, why: "Helps reduce smoke-particle exposure during evacuation." },
    ],
  },
  {
    name: "Emergency Supplies",
    icon: "box",
    items: [
      { name: "72-hour emergency kit", status: "ready", quantity: "1", detail: "Garage emergency shelf", meta: "Updated 18 days ago" },
      { name: "Water storage", status: "attention", quantity: "6 gal", detail: "Garage emergency shelf", meta: "Needs 3 more gallons · expires in 7 months", impact: 2, why: "Your current supply is below the three-day target for four people." },
      { name: "Food supply", status: "ready", quantity: "12 meals", detail: "Kitchen pantry", meta: "Expires April 2026" },
      { name: "First aid kit", status: "ready", quantity: "1", detail: "Hall closet", meta: "Inspected September 12" },
    ],
  },
  {
    name: "Power & Lighting",
    icon: "spark",
    items: [
      { name: "Flashlights", status: "ready", quantity: "3", detail: "Emergency shelf", meta: "Batteries tested this month" },
      { name: "Spare batteries", status: "ready", quantity: "16", detail: "Emergency shelf", meta: "Updated 18 days ago" },
      { name: "Solar charger", status: "ready", quantity: "1", detail: "Go-bag", meta: "Charge tested September 1" },
      { name: "Power banks", status: "ready", quantity: "2", detail: "Go-bag", meta: "Both fully charged" },
    ],
  },
  {
    name: "Communication Tools",
    icon: "phone",
    items: [
      { name: "Battery radio", status: "missing", quantity: "0", detail: "Not in inventory", meta: "Recommended for power outages", impact: 2, why: "A battery radio provides official updates if mobile service fails." },
      { name: "Emergency contacts", status: "ready", quantity: "5", detail: "Phones + printed card", meta: "Reviewed September 12" },
      { name: "Printed plans", status: "ready", quantity: "2", detail: "Go-bag and vehicle", meta: "Routes updated this month" },
      { name: "Backup phone charging", status: "ready", quantity: "2", detail: "Go-bag", meta: "Cables and car adapter ready" },
    ],
  },
  {
    name: "Important Documents",
    icon: "file",
    items: [
      { name: "Identification copies", status: "ready", quantity: "4", detail: "Waterproof document pouch", meta: "Updated June 2024" },
      { name: "Insurance documents", status: "ready", quantity: "1 set", detail: "Document pouch + cloud", meta: "Policy current" },
      { name: "Medical information", status: "missing", quantity: "0", detail: "Not in document pouch", meta: "Add medications and provider details", impact: 1, why: "A printed medical summary supports continuity of care during displacement." },
      { name: "Property documents", status: "ready", quantity: "1 set", detail: "Encrypted cloud folder", meta: "Updated August 2024" },
    ],
  },
];

function HouseholdOverview() {
  const [simulation,setSimulation]=useState(false);
  const readiness=[["People",86,"users"],["Pets",72,"pet"],["Transportation",91,"car"],["Communication",68,"phone"],["Resources",84,"box"]] as [string,number,IconName][];
  return <div className="household-overview">
    <div className="household-scoreboard">{readiness.map(([label,value,icon])=><article key={label}><span><Icon name={icon}/></span><div><small>{label.toUpperCase()}</small><b>{value}%</b></div><div className="progress"><i style={{width:`${value}%`}}/></div></article>)}</div>
    <div className="twin-grid">
      <section className="twin-radar"><div><span className="kicker">DYNAMIC HOUSEHOLD MODEL</span><h3>Readiness balance</h3><p>Your strongest systems support evacuation, while communication and pet planning create the most exposure.</p></div><div className="household-radar"><svg viewBox="0 0 220 190"><g className="radar-grid"><polygon points="110,18 190,60 190,138 110,178 30,138 30,60"/><polygon points="110,46 163,74 163,124 110,150 57,124 57,74"/><line x1="110" y1="18" x2="110" y2="98"/><line x1="190" y1="60" x2="110" y2="98"/><line x1="190" y1="138" x2="110" y2="98"/><line x1="110" y1="178" x2="110" y2="98"/><line x1="30" y1="138" x2="110" y2="98"/><line x1="30" y1="60" x2="110" y2="98"/></g><polygon className="radar-value" points="110,29 183,63 168,127 110,153 52,127 42,66"/></svg><span className="radar-l r-people">People</span><span className="radar-l r-pets">Pets</span><span className="radar-l r-transport">Transport</span><span className="radar-l r-resources">Supplies</span><span className="radar-l r-communication">Communication</span><span className="radar-l r-evacuation">Evacuation</span></div></section>
      <aside className="command-insights"><span className="kicker">AI READINESS INSIGHTS</span><h3>Three ways to strengthen your household</h3>{[
        ["Communication is your biggest vulnerability","Add an out-of-area contact to create a reliable fallback.","+4 pts"],
        ["Pet transportation needs a backup","Confirm a second carrier for Luna and Milo.","+3 pts"],
        ["Transportation readiness is strong","Both routes are compatible with your primary vehicle.","91%"],
      ].map(([title,copy,impact],i)=><article key={title}><span className={`insight-rank rank-${i}`}>{i+1}</span><div><b>{title}</b><p>{copy}</p></div><strong>{impact}</strong></article>)}</aside>
    </div>
    <section className={`evac-simulation ${simulation?"has-result":""}`}><div className="simulation-copy"><span className="simulation-icon"><Icon name="route"/></span><div><span className="kicker">HOUSEHOLD IMPACT SIMULATION</span><h3>How prepared are we if evacuation happens right now?</h3><p>Test your current people, pet, communication, vehicle, and supply readiness together.</p></div></div><Button onClick={()=>setSimulation(!simulation)}>{simulation?"Close results":"Run Evacuation Simulation"} <Icon name="arrow"/></Button>
      {simulation&&<div className="simulation-result"><div className="success-gauge"><strong>78%</strong><span>estimated evacuation success</span></div><div className="simulation-checks">{[["People readiness","Ready","green"],["Pet readiness","Limited","orange"],["Communication reliability","Needs backup","orange"],["Vehicle availability","Ready","green"],["Resource coverage","84%","green"]].map(([label,value,tone])=><div key={label}><span className={`sim-dot ${tone}`}/><b>{label}</b><strong>{value}</strong></div>)}</div><div className="simulation-verdict"><Icon name="spark"/><p><b>Primary constraint: communication reliability.</b> Add an out-of-area contact and print emergency contact cards for children to improve the result.</p></div></div>}
    </section>
  </div>;
}

function PeopleModule() {
  const [members,setMembers]=useState([
    {name:"Brinda",initials:"BR",role:"Primary decision maker",need:"Emergency plan owner",score:90,tone:"green"},
    {name:"Robert",initials:"RO",role:"Older adult",need:"Mobility assistance required",score:65,tone:"orange"},
    {name:"Maya",initials:"MA",role:"Child · age 9",need:"Child safety plan",score:74,tone:"blue"},
  ]);
  const [assignments,setAssignments]=useState<Record<string,string>>({"Emergency Contact Manager":"Brinda","Pet Coordinator":"Maya","Supply Manager":"Robert","Vehicle Coordinator":"Brinda"});
  const [draggedRole,setDraggedRole]=useState("");
  const roles=["Emergency Contact Manager","Pet Coordinator","Supply Manager","Vehicle Coordinator","Child Safety Lead"];
  const assign=(role:string,person:string)=>setAssignments(current=>({...current,[role]:person}));
  const addPerson=()=>{if(members.some(member=>member.name==="Noah"))return;setMembers(current=>[...current,{name:"Noah",initials:"NO",role:"Child · age 6",need:"Requires emergency contact card",score:58,tone:"orange"}])};
  return <div className="people-module">
    <div className="module-toolbar"><div><span className="kicker">HOUSEHOLD MAP</span><h3>{members.length} people in this preparedness plan</h3><p>Each person has an individual role, support profile, and evacuation readiness status.</p></div><Button onClick={addPerson} disabled={members.some(member=>member.name==="Noah")}>{members.some(member=>member.name==="Noah")?"Person added":"Add Person"}</Button></div>
    {members.some(member=>member.name==="Noah")&&<div className="impact-update"><Icon name="spark"/><div><b>Household model updated</b><span>Adding a child created 3 new recommendations for contact cards, comfort supplies, and reunification planning.</span></div><strong>−2 current pts</strong></div>}
    <div className="person-grid">{members.map(member=><article className="person-card" key={member.name} onDragOver={event=>event.preventDefault()} onDrop={()=>{if(draggedRole)assign(draggedRole,member.name);setDraggedRole("")}}><div className={`person-avatar avatar-${member.tone}`}>{member.initials}</div><div className="person-title"><div><h4>{member.name}</h4><span>{member.role}</span></div><Badge tone={member.score<70?"orange":"green"}>{member.score<70?"NEEDS SUPPORT":"READY"}</Badge></div><div className="person-need"><Icon name={member.score<70?"help":"shield"} size={15}/><span>{member.need}</span></div><div className="person-readiness"><div><span>Evacuation readiness</span><b>{member.score}%</b></div><div className="progress"><i style={{width:`${member.score}%`}}/></div></div><div className="person-actions"><button>Edit profile</button><button>Set support needs</button></div></article>)}</div>
    <section className="role-board"><div className="role-board-head"><div><span className="kicker">EMERGENCY RESPONSIBILITIES</span><h3>Role coverage</h3><p>Drag a responsibility onto a household member card, or select an unassigned role to assign it to Brinda.</p></div><div className="coverage-score"><b>{Object.keys(assignments).length}/5</b><span>complete</span></div></div><div className="role-list">{roles.map(role=><button draggable onDragStart={()=>setDraggedRole(role)} onClick={()=>{if(!assignments[role])assign(role,"Brinda")}} className={assignments[role]?"assigned":""} key={role}><span className="drag-handle">••</span><div><b>{role}</b><small>{assignments[role]?`Assigned to ${assignments[role]}`:"Unassigned · drag to a person"}</small></div>{assignments[role]?<Icon name="check"/>:<Icon name="chevron"/>}</button>)}</div></section>
  </div>;
}

function PetsModule() {
  const [simulation,setSimulation]=useState(false);
  const [carrierReady,setCarrierReady]=useState(false);
  const score=carrierReady?92:72;
  return <div className="pets-module"><div className="module-toolbar"><div><span className="kicker">PET EVACUATION PROFILES</span><h3>Every pet needs a way out</h3><p>Track transportation, medical records, supplies, and a verified emergency contact for each animal.</p></div><Button variant="secondary">Add Pet</Button></div>
    <div className="pet-grid"><article className="pet-card"><div className="pet-portrait pet-dog"><Icon name="pet" size={32}/></div><div className="pet-card-head"><div><h4>Luna</h4><span>Dog · 6 years</span></div><strong>{score}%</strong></div><div className="progress"><i style={{width:`${score}%`}}/></div><div className="pet-checks"><span className={carrierReady?"done":"missing"}><Icon name={carrierReady?"check":"close"} size={13}/> Carrier</span><span className="done"><Icon name="check" size={13}/> Medications</span><span className="done"><Icon name="check" size={13}/> Emergency contact</span></div><Button variant={carrierReady?"secondary":"primary"} onClick={()=>setCarrierReady(!carrierReady)}>{carrierReady?"Carrier confirmed":"Confirm carrier"}</Button></article>
    <article className="pet-card"><div className="pet-portrait pet-cat"><Icon name="pet" size={32}/></div><div className="pet-card-head"><div><h4>Milo</h4><span>Cat · 3 years</span></div><strong>68%</strong></div><div className="progress"><i style={{width:"68%"}}/></div><div className="pet-checks"><span className="done"><Icon name="check" size={13}/> Carrier</span><span className="missing"><Icon name="close" size={13}/> Vaccination records</span><span className="missing"><Icon name="close" size={13}/> Pet supply kit</span></div><Button variant="secondary">Complete profile</Button></article></div>
    <section className="pet-simulator"><div><span className="kicker">PET EVACUATION SIMULATOR</span><h3>What happens if evacuation occurs today?</h3></div><Button onClick={()=>setSimulation(!simulation)}>{simulation?"Reset simulation":"Run readiness check"} <Icon name="arrow"/></Button>{simulation&&<div className="pet-sim-result">{[["Family members",true],["Household supplies",true],["Pet supplies",false],["Pet transportation",carrierReady]].map(([label,ready])=><div className={ready?"ready":"blocked"} key={label as string}><Icon name={ready?"check":"close"}/><span>{label as string}</span><b>{ready?"Ready":"Not ready"}</b></div>)}<p><Icon name="help"/><span><b>Evacuation readiness is limited by pet transportation.</b> Confirm Luna's carrier and complete Milo's supply kit before the next high-risk day.</span></p></div>}</section>
  </div>;
}

function TransportationModule() {
  const [primaryUnavailable,setPrimaryUnavailable]=useState(false);
  const capacity=primaryUnavailable?5:10;
  const score=primaryUnavailable?67:91;
  return <div className="transport-module"><div className="vehicle-summary"><div><span className="kicker">VEHICLE READINESS</span><b>{score}%</b><p>{primaryUnavailable?"Backup vehicle can carry everyone, but battery range creates less flexibility.":"Both vehicles are available and your household has sufficient evacuation capacity."}</p></div><div className="capacity-visual"><span>CAPACITY REQUIRED</span><div><b>6</b><i>/</i><strong>{capacity}</strong><small>people + pets / seats</small></div><Badge tone={capacity>=6?"green":"orange"}>{capacity>=6?"CAPACITY SUFFICIENT":"CAPACITY RISK"}</Badge></div></div>
    <div className="vehicle-grid"><article className={`vehicle-card ${primaryUnavailable?"unavailable":""}`}><div className="vehicle-art"><Icon name="car" size={34}/><Badge tone={primaryUnavailable?"gray":"green"}>{primaryUnavailable?"UNAVAILABLE":"EVACUATION READY"}</Badge></div><h4>Honda CR-V</h4><span>Primary vehicle · 5 seats</span><div className="energy-row"><div><span>FUEL LEVEL</span><b>{primaryUnavailable?"—":"70%"}</b></div><div className="fuel-meter"><i style={{width:primaryUnavailable?"0%":"70%"}}/></div></div><div className="vehicle-stats"><span><b>310 mi</b>Estimated range</span><span><b>✓</b>Primary route</span><span><b>✓</b>Backup route</span></div></article>
    <article className="vehicle-card warning"><div className="vehicle-art"><Icon name="car" size={34}/><Badge tone="orange">CHARGE RECOMMENDED</Badge></div><h4>Tesla Model Y</h4><span>Backup vehicle · 5 seats</span><div className="energy-row"><div><span>BATTERY LEVEL</span><b>42%</b></div><div className="fuel-meter"><i style={{width:"42%"}}/></div></div><div className="vehicle-stats"><span><b>128 mi</b>Estimated range</span><span><b>✓</b>Primary route</span><span><b>!</b>Potential range risk</span></div></article></div>
    <section className="what-if"><div><span className="kicker">WHAT-IF SIMULATION</span><h3>What if the primary vehicle is unavailable?</h3><p>ReadyCA recalculates capacity, route options, and household readiness in real time.</p></div><button className={`simulation-toggle ${primaryUnavailable?"on":""}`} onClick={()=>setPrimaryUnavailable(!primaryUnavailable)}><i/><span>{primaryUnavailable?"Primary unavailable":"Primary available"}</span></button>{primaryUnavailable&&<div className="recalculation"><span><b>+11 min</b> evacuation time</span><span><b>5 seats</b> available capacity</span><span><b>−24 pts</b> vehicle readiness</span><strong>Backup route still compatible</strong></div>}</section>
  </div>;
}

function CommunicationModule() {
  const [stress,setStress]=useState(false);
  const [outOfArea,setOutOfArea]=useState(false);
  const score=outOfArea?(stress?78:88):(stress?61:76);
  return <div className="communication-module"><div className="comm-summary"><div><span className="kicker">COMMUNICATION READINESS</span><b>{score}%</b><p>{stress?"Cell service outage simulated. Radio and messaging backups remain available.":"Your primary network is connected, but one critical fallback contact is missing."}</p></div><div className="comm-checklist">{[["Primary contact",true],["Backup contact",true],["Out-of-area contact",outOfArea],["Emergency meeting point",true]].map(([label,ready])=><span className={ready?"ready":"missing"} key={label as string}><Icon name={ready?"check":"close"} size={13}/>{label as string}</span>)}</div></div>
    <section className="network-builder"><div className="network-head"><div><span className="kicker">COMMUNICATION TREE</span><h3>Your emergency contact network</h3></div><Button variant="secondary">Add Contact</Button></div><div className="network-canvas"><div className="network-lines"/><div className="network-node root-node"><span>BR</span><b>Brinda</b><small>Plan owner</small></div><div className="network-node node-a"><span>EC</span><b>Emergency contact</b><small>Robert · verified</small></div><div className={`network-node node-b ${outOfArea?"":"node-missing"}`}><span>{outOfArea?"OA":"+"}</span><b>{outOfArea?"Out-of-area contact":"Contact missing"}</b><small>{outOfArea?"Lisa · Arizona":"Recommended fallback"}</small></div><div className="network-node node-c"><span>CH</span><b>Child contact</b><small>School card ready</small></div><div className="network-node node-d"><span>NB</span><b>Neighbor</b><small>Mutual support</small></div></div></section>
    {!outOfArea&&<div className="comm-gap"><span><Icon name="help"/></span><div><b>No out-of-area emergency contact</b><p>Local networks may be congested or unavailable during a regional emergency.</p></div><strong>+4 pts</strong><Button onClick={()=>setOutOfArea(true)}>Quick fix</Button></div>}
    <section className="stress-test"><div><span className="kicker">COMMUNICATION STRESS TEST</span><h3>Cell service unavailable</h3><p>See which contact methods remain reliable when normal voice service fails.</p></div><button className={`simulation-toggle ${stress?"on":""}`} onClick={()=>setStress(!stress)}><i/><span>{stress?"Outage active":"Run stress test"}</span></button>{stress&&<div className="method-results">{[["Text message",true],["WhatsApp",true],["Emergency radio",true],["Voice call",false]].map(([method,works])=><span className={works?"works":"fails"} key={method as string}><Icon name={works?"check":"close"}/><b>{method as string}</b><small>{works?"Available":"Unavailable"}</small></span>)}</div>}</section>
  </div>;
}

function Household() {
  const [section,setSection]=useState("Overview");
  const [resourceStatus,setResourceStatus]=useState<Record<string,ResourceStatus>>(() => Object.fromEntries(resourceCategories.flatMap(category => category.items.map(item => [item.name,item.status]))));
  const [expandedCategory,setExpandedCategory]=useState("Safety Equipment");
  const groups:Record<string,[string,IconName,string[]]>={
    Overview:["Command center","grid",[]],
    People:["People","users",["Adults","Children","Older adults","Accessibility assistance"]],
    Pets:["Pets","pet",["Dogs","Cats","Other animals","Pet carriers"]],
    Transportation:["Transportation","car",["Vehicles","Accessible vehicles","Fuel ready","EV charging"]],
    Communication:["Communication","phone",["Primary phone","Emergency contact","Out-of-area contact","Alert method"]],
    Resources:["Household resources","box",["Water supply","Food supply","First aid kit","Backup power"]],
  };
  const allResources=resourceCategories.flatMap(category=>category.items);
  const readyCount=allResources.filter(item=>resourceStatus[item.name]!=="missing").length;
  const completion=Math.round(readyCount/allResources.length*100);
  const resolvedGaps=allResources.filter(item=>item.status==="missing"&&resourceStatus[item.name]==="ready").length;
  const resourceScore=18+resolvedGaps;
  const gaps=allResources.filter(item=>resourceStatus[item.name]!=="ready");
  const markReady=(name:string)=>setResourceStatus(current=>({...current,[name]:current[name]==="ready"?"missing":"ready"}));
  return <div><PageTitle kicker="PERSONALIZATION" title="Tell us about your household" copy="Your household profile helps ReadyCA personalize evacuation recommendations and identify preparedness gaps."/>
    <div className="profile-progress card"><div><b>Your household profile is 78% complete</b><span>Complete 4 more details to improve your recommendations.</span></div><div className="progress"><i style={{width:"78%"}}/></div></div>
    <div className="profile-layout"><aside className="profile-nav">{Object.entries(groups).map(([key,[label,icon]])=><button className={section===key?"active":""} onClick={()=>setSection(key)} key={key}><Icon name={icon}/><span>{label}</span><Icon name="chevron" size={14}/></button>)}</aside>
    <section className={`card form-card ${section==="Resources"?"resource-inventory-card":""} ${section!=="Resources"?"household-module-card":""}`}><div className="card-heading"><div><Badge tone="blue">{section==="Resources"?"READINESS INVENTORY":section==="Overview"?"DIGITAL HOUSEHOLD TWIN":"INTERACTIVE HOUSEHOLD MODEL"}</Badge><h2>{groups[section][0]}</h2><p>{section==="Resources"?"Track what is ready, what needs attention, and where critical supplies are stored.":section==="Overview"?"A live model of the people, pets, vehicles, communication systems, and resources your household depends on.":"Update readiness visually and see how each change affects your evacuation plan."}</p></div><Icon name={groups[section][1]} size={28}/></div>
      {section==="Resources"?<div className="resource-inventory">
        <div className="inventory-summary">
          <div className="inventory-completion"><div className="inventory-ring" style={{"--inventory-progress":`${completion*3.6}deg`} as React.CSSProperties}><strong>{completion}%</strong><span>complete</span></div><div><span className="kicker">HOUSEHOLD RESOURCE READINESS</span><h3>Your essential supplies are nearly ready</h3><p>{readyCount} of {allResources.length} tracked resources are available. Review the priority gaps below to strengthen your plan.</p></div></div>
          <div className="resource-score"><span>RESOURCE READINESS</span><div><b>{resourceScore}</b><small>/ 25</small></div><p>Contributes directly to your overall readiness score.</p><button onClick={()=>setExpandedCategory("Emergency Supplies")}>View score contribution <Icon name="arrow" size={14}/></button></div>
        </div>

        <div className="inventory-toolbar"><div><span className="kicker">INVENTORY BY CATEGORY</span><h3>Preparedness inventory</h3></div><div className="inventory-legend"><span><i className="ready"/>Ready</span><span><i className="attention"/>Needs attention</span><span><i className="missing"/>Missing</span></div></div>
        <div className="inventory-categories">{resourceCategories.map(category=>{
          const open=expandedCategory===category.name;
          const categoryReady=category.items.filter(item=>resourceStatus[item.name]==="ready").length;
          return <section className={`inventory-category ${open?"open":""}`} key={category.name}>
            <button className="inventory-category-head" onClick={()=>setExpandedCategory(open?"":category.name)}>
              <span className="category-icon"><Icon name={category.icon}/></span><span><b>{category.name}</b><small>{categoryReady} of {category.items.length} ready</small></span><div className="mini-completion"><i style={{width:`${categoryReady/category.items.length*100}%`}}/></div><Icon name="chevron" size={16}/>
            </button>
            {open&&<div className="inventory-items">{category.items.map(item=>{
              const status=resourceStatus[item.name];
              return <article className={`inventory-item status-${status}`} key={item.name}>
                <span className="inventory-status">{status==="ready"?<Icon name="check" size={14}/>:status==="attention"?<Icon name="clock" size={14}/>:<Icon name="close" size={14}/>}</span>
                <div className="inventory-item-main"><div><b>{item.name}</b><span className={`status-label ${status}`}>{status==="ready"?"Ready":status==="attention"?"Needs attention":"Missing"}</span></div><p><Icon name="pin" size={13}/>{item.detail}</p><small><Icon name="clock" size={12}/>{item.meta}</small></div>
                <div className="inventory-quantity"><span>QUANTITY</span><b>{status==="missing"?"—":item.quantity}</b></div>
                <button className={status==="ready"?"inventory-more":"inventory-fix"} onClick={()=>markReady(item.name)}>{status==="ready"?"Update":"Mark ready"}</button>
              </article>;
            })}</div>}
          </section>;
        })}</div>

        <section className="gap-analysis"><div className="gap-heading"><div><span className="kicker">AUTOMATED GAP ANALYSIS</span><h3>{gaps.length} resource gaps need your attention</h3><p>Prioritized using your household size, location, and current inventory.</p></div><span className="ai-grounded"><Icon name="spark" size={15}/> Profile-informed</span></div>
          <div className="gap-grid">{gaps.slice(0,3).map(item=><article className={`gap-card ${resourceStatus[item.name]}`} key={item.name}><div><span className="gap-icon"><Icon name={resourceStatus[item.name]==="attention"?"clock":"box"}/></span><Badge tone="orange">{resourceStatus[item.name]==="attention"?"CHECK QUANTITY":"MISSING ITEM"}</Badge></div><h4>{item.name}</h4><p>{item.why}</p><div className="gap-impact"><span>Readiness impact</span><b>+{item.impact||1} pts</b></div><Button variant="secondary" onClick={()=>markReady(item.name)}>{resourceStatus[item.name]==="attention"?"Update supply":"Add to inventory"} <Icon name="arrow" size={14}/></Button></article>)}</div>
          {gaps.length===0&&<div className="all-ready"><Icon name="check"/><div><b>Your tracked resources are ready</b><span>Continue checking expiration dates and inspecting supplies every six months.</span></div></div>}
        </section>
      </div>:section==="Overview"?<HouseholdOverview/>:section==="People"?<PeopleModule/>:section==="Pets"?<PetsModule/>:section==="Transportation"?<TransportationModule/>:<CommunicationModule/>}
      {section==="Resources"&&<div className="insight"><Icon name="spark"/><div><b>Inventory insights improve your plan</b><span>ReadyCA uses your resource status to surface missing supplies, expiration risks, and score opportunities.</span></div></div>}
      <div className="form-actions"><Button variant="secondary">Save & continue later</Button><Button>Save and continue <Icon name="arrow"/></Button></div>
    </section></div>
  </div>;
}

const advisorResponses:Record<string,string>={
  "What should I do first?":"Based on your household profile, your biggest preparedness gaps are evacuation planning and pet transportation. Complete these before lower-priority tasks.",
  "Why is my score low?":"Your transportation readiness is strong, but your evacuation plan and emergency communication details are incomplete. Together, these account for 12 available points.",
  "How can I prepare my children?":"Give each child an age-appropriate role, pack familiar comfort items, and practice your two exit routes together without creating alarm.",
  "How do I prepare my pets?":"Keep carriers, leashes, medications, food, and identification together. Confirm that your planned shelter accepts pets before an emergency.",
  "What should I pack before evacuation?":"Start with water, medications, identification, chargers, N95 masks, clothing, important documents, and supplies for children and pets.",
};
function Advisor() {
  const [question,setQuestion]=useState("What should I do first?");
  return <div><PageTitle kicker="EVIDENCE-GROUNDED GUIDANCE" title="AI Readiness Advisor" copy="Personalized wildfire preparedness guidance based on your household profile, readiness score, and trusted emergency-preparedness sources."/>
    <div className="grounded"><Icon name="shield"/> Grounded in your household profile + verified sources</div>
    <div className="advisor-layout"><section className="card chat"><div className="advisor-intro"><div className="ai-mark"><Icon name="spark"/></div><div><b>ReadyCA Advisor</b><span>AI-assisted recommendation</span></div></div>
      <div className="message user-message">{question}</div><div className="message ai-message"><p>{advisorResponses[question]}</p><div className="citation"><Icon name="shield" size={14}/> Sources: CAL FIRE, Ready.gov, San Diego County OES</div></div>
      <div className="suggestions"><span>Ask a suggested question</span>{Object.keys(advisorResponses).map(q=><button className={q===question?"active":""} onClick={()=>setQuestion(q)} key={q}>{q}</button>)}</div>
      <div className="chat-input"><span>Ask about your readiness plan...</span><button><Icon name="arrow"/></button></div>
    </section><aside className="advisor-recs"><span className="kicker">RECOMMENDED FOR YOU</span><h2>Turn guidance into action</h2>{recommendations.slice(0,2).map(r=><article className="card advisor-card" key={r.title}><Badge tone="orange">{r.level.toUpperCase()}</Badge><h3>{r.title}</h3><div><span>Why this matters</span><p>{r.why}</p></div><div className="impact"><span>Estimated effort <b>{r.time}</b></span><span>Readiness impact <b>+{r.points} pts</b></span></div><div className="source"><Icon name="shield" size={14}/> Verified · {r.source}</div></article>)}</aside></div>
    <div className="ai-disclaimer"><b>AI guidance is not an emergency alert.</b> ReadyCA uses AI to explain verified preparedness guidance, not to issue evacuation orders. Follow local authorities during an emergency.</div>
  </div>;
}

function DecisionGame() {
  const scenarios=[
    {q:"A wildfire is spreading rapidly nearby. Local authorities issue an evacuation warning. What do you do first?", opts:["Wait until you can see smoke","Begin preparing and monitor official alerts","Drive toward the fire to see how close it is","Wait for neighbors to tell you"],correct:1,why:"An evacuation warning means prepare to leave now. Gathering your household, go-kit, and monitoring official updates reduces delay if an order follows."},
    {q:"Smoke is reducing visibility and your primary route is congested. What is your safest next step?",opts:["Use your pre-planned backup route if officials say it is open","Take an unmarked dirt road","Stop to photograph the fire","Ignore official road closures"],correct:0,why:"A practiced backup route gives you a safer alternative, but you should still follow official traffic controls and closure information."},
    {q:"Your family is separated when an evacuation order arrives. How should you reconnect?",opts:["Everyone returns home","Post your location publicly","Use your out-of-area contact and planned meeting point","Wait for cellular service to improve"],correct:2,why:"A shared meeting point and out-of-area contact reduce confusion when local networks are overloaded."},
  ];
  const [step,setStep]=useState(0), [selected,setSelected]=useState<number|null>(null), [points,setPoints]=useState(0);
  const [timed,setTimed]=useState(false),[seconds,setSeconds]=useState(30);
  useEffect(()=>{if(!timed||selected!==null)return;const timer=window.setInterval(()=>setSeconds(s=>{if(s<=1){window.clearInterval(timer);setSelected(-1);return 0}return s-1}),1000);return()=>window.clearInterval(timer)},[timed,selected,step]);
  const pick=(i:number)=>{if(selected!==null)return;setSelected(i);if(i===scenarios[step].correct)setPoints(p=>p+1)};
  const next=()=>{setSeconds(30);if(step<scenarios.length-1){setStep(s=>s+1);setSelected(null)}else{setStep(0);setSelected(null);setPoints(0)}};
  const s=scenarios[step];
  return <div className="game-page"><PageTitle kicker="PRACTICE UNDER PRESSURE" title="Wildfire Ready: Emergency Decision Game" copy="A wildfire is approaching your community. What would you do?"/>
    <section className={`card game-card pressure-${Math.ceil(seconds/10)}`}><div className="smoke-layer"/><div className="game-top"><div><Badge tone="orange">SCENARIO {String(step+1).padStart(2,"0")}</Badge><Badge tone="gray">{step===0?"FOUNDATION":step===1?"INTERMEDIATE":"ADVANCED"}</Badge></div><div className="timer-control"><button className={timed?"on":""} onClick={()=>{setTimed(!timed);setSeconds(30)}}><Icon name="clock" size={14}/> Time pressure {timed?"on":"off"}</button>{timed&&<span className={seconds<=10?"urgent":""}>{seconds}s</span>}<span>Score: <b>{points} / {step+(selected!==null?1:0)}</b></span></div></div><div className="scenario-map"><div className="scenario-fire"><Icon name="flame"/><i/></div><div className="scenario-home"><Icon name="home"/></div><div className="scenario-road"/></div><div className="scenario-progress">{scenarios.map((_,i)=><i className={i<=step?"active":""} key={i}/>)}</div><h2>{s.q}</h2><div className="answers">{s.opts.map((o,i)=><button className={selected===null?"":i===s.correct?"correct":i===selected?"wrong":"dim"} onClick={()=>pick(i)} key={o}><span>{String.fromCharCode(65+i)}</span><b>{o}</b>{selected!==null&&i===s.correct&&<Icon name="check"/>}</button>)}</div>
      {selected!==null&&<div className={`explanation ${selected===s.correct?"correct":"review"}`}><div><Icon name={selected===s.correct?"check":"help"}/></div><div><b>{selected===s.correct?"Correct":selected===-1?"Time expired — review the safest action":"Good practice — review this choice"}</b><h3>Preparedness principle</h3><p>{s.why}</p><div className="source"><Icon name="shield" size={14}/> Verified principle · CAL FIRE Ready for Wildfire</div></div></div>}
      <div className="game-actions"><span>Preparedness level: <b>{points>=2?"Strong":"Building"}</b></span><Button onClick={next} disabled={selected===null}>{step===scenarios.length-1?"See final score":"Next scenario"} <Icon name="arrow"/></Button></div>
    </section>
  </div>;
}

function Progress({score,complete}:{score:number;complete:string[]}) {
  const categories=[["Evacuation",80],["Emergency Supplies",65],["Communication",55],["Pets",40],["Transportation",90],["Household Needs",75]];
  return <div><PageTitle kicker="READINESS OVER TIME" title="Your Preparedness Progress" copy="See how small completed actions are making your household more ready."/>
    <div className="metric-grid"><div className="card big-metric"><span>OVERALL COMPLETION</span><b>{Math.min(68+complete.length*4,100)}%</b><small>+8% this month</small></div><div className="card big-metric"><span>READINESS SCORE</span><b>{score}<em>/100</em></b><small>Good preparedness</small></div><div className="card big-metric"><span>TASKS COMPLETED</span><b>{12+complete.length}</b><small>of 21 recommended</small></div></div>
    <div className="progress-layout"><section className="card chart-card"><div className="card-heading"><div><span className="kicker">SCORE HISTORY</span><h2>Your readiness is trending up</h2></div><Badge>+24 POINTS</Badge></div><div className="line-chart"><div className="y-labels"><span>80</span><span>60</span><span>40</span></div><svg viewBox="0 0 600 220" preserveAspectRatio="none"><path className="chart-area" d="M20 175 L160 145 L300 112 L440 78 L580 42 L580 210 L20 210Z"/><path className="chart-line" d="M20 175 L160 145 L300 112 L440 78 L580 42"/>{[[20,175],[160,145],[300,112],[440,78],[580,42]].map(([x,y])=><circle key={x} cx={x} cy={y} r="5"/>)}</svg><div className="x-labels"><span>June<b>48</b></span><span>July<b>57</b></span><span>August<b>64</b></span><span>September<b>72</b></span><span>Now<b>{score}</b></span></div></div></section>
    <section className="card category-card"><span className="kicker">CATEGORY PROGRESS</span><h2>Where you're strongest</h2>{categories.map(([n,v])=><div className="category-row" key={n}><div><span>{n}</span><b>{v}%</b></div><div className="progress"><i style={{width:`${v}%`}}/></div></div>)}</section></div>
  </div>;
}

function Evidence() {
  const sources=[
    ["Keep an emergency kit ready for evacuation.","California Governor's Office of Emergency Services","Emergency Preparedness Guide","Updated March 2024","Emergency supplies"],
    ["Know at least two ways out of your neighborhood.","CAL FIRE","Ready for Wildfire: Go! Guide","Updated May 2024","Evacuation planning"],
    ["Choose an out-of-area household contact.","Federal Emergency Management Agency","Make a Family Emergency Plan","Reviewed January 2024","Communication"],
    ["Include pets in your emergency plan.","Ready.gov","Pets and Animals Preparedness","Updated February 2024","Pet readiness"],
  ];
  return <div><PageTitle kicker="TRUST & TRANSPARENCY" title="Sources & Evidence" copy="See exactly where ReadyCA's preparedness recommendations come from."/>
    <div className="evidence-note"><Icon name="shield"/><div><b>Every recommendation is traceable</b><span>ReadyCA prioritizes current guidance from official emergency management and public safety organizations.</span></div></div>
    <div className="filter-row"><button className="active">All sources</button><button>CAL FIRE</button><button>Cal OES</button><button>FEMA</button><button>Ready.gov</button></div>
    <div className="source-grid">{sources.map((s,i)=><article className="card source-card" key={s[0]}><div className="source-logo">{["CA","CF","F","R"][i]}</div><Badge tone="blue">✓ VERIFIED SOURCE</Badge><span className="source-topic">{s[4]}</span><h3>{s[0]}</h3><div className="evidence-copy"><span>Source organization</span><b>{s[1]}</b><span>Publication</span><b>{s[2]}</b><small>{s[3]}</small></div><p><b>Evidence</b> Official guidance recommends this action as part of household emergency planning and safe evacuation readiness.</p><Button variant="secondary">View Source <Icon name="external" size={15}/></Button></article>)}</div>
  </div>;
}

function Report({score}:{score:number}) {
  const [generated,setGenerated]=useState(false),[loading,setLoading]=useState(false);
  const generate=()=>{setLoading(true);window.setTimeout(()=>{setLoading(false);setGenerated(true)},1200)};
  if(!generated)return <div><PageTitle kicker="PERSONALIZED SUMMARY" title="Your Family Preparedness Report" copy="Turn your profile and readiness progress into a clear, shareable household action plan."/><section className="card report-hero"><div className="report-illustration"><Icon name="file" size={48}/><i/></div><Badge tone="blue">AI-ASSISTED · EVIDENCE-GROUNDED</Badge><h2>A practical plan your whole family can use</h2><p>Your report summarizes strengths, priority gaps, evacuation planning, household needs, and next steps — with a verified source for every recommendation.</p><div className="report-features"><span><Icon name="check"/> Household-specific</span><span><Icon name="check"/> Source-linked</span><span><Icon name="check"/> Easy to share</span></div><Button onClick={generate} disabled={loading}>{loading?<><span className="spinner"/> Generating your report...</>:"Generate Report"}</Button><small>Uses your 78% complete household profile. You can update it anytime.</small></section></div>;
  return <div><PageTitle kicker="GENERATED JUST NOW" title="Your Family Preparedness Report" copy="Personalized for Brinda's household · San Diego County"/>
    <div className="report-actions"><Button variant="secondary" icon="download">Download Report</Button><Button variant="secondary">Share Report</Button><Button>Update My Plan</Button></div>
    <section className="report-doc"><div className="report-cover"><div className="brand"><div className="brand-mark"><Icon name="flame"/></div><b>ReadyCA</b></div><span>HOUSEHOLD READINESS</span><div className="report-score">{score}<small>/ 100</small></div><Badge>GOOD PREPAREDNESS</Badge><p>Prepared for Brinda's household<br/>San Diego County, California</p></div>
    <div className="report-body"><h2>Executive Summary</h2><p>Your household has strong transportation preparedness but several gaps remain in evacuation planning, emergency communication, and pet preparedness.</p><div className="report-cols"><div><span className="kicker">STRENGTHS</span>{["Multiple transportation options","Emergency supplies partially complete","Strong vehicle readiness"].map(x=><p key={x}><Icon name="check" size={16}/>{x}</p>)}</div><div><span className="kicker">PRIORITY GAPS</span>{["No documented meeting point","Pet evacuation plan incomplete","Communication tree incomplete"].map(x=><p key={x}><i/> {x}</p>)}</div></div>
    <h2>Household Readiness Analytics</h2><div className="report-analytics"><div className="radar-card"><svg viewBox="0 0 180 160"><g className="radar-grid"><polygon points="90,12 160,55 135,140 45,140 20,55"/><polygon points="90,36 137,65 120,120 60,120 43,65"/><line x1="90" y1="12" x2="90" y2="82"/><line x1="160" y1="55" x2="90" y2="82"/><line x1="135" y1="140" x2="90" y2="82"/><line x1="45" y1="140" x2="90" y2="82"/><line x1="20" y1="55" x2="90" y2="82"/></g><polygon className="radar-value" points="90,27 147,60 126,126 65,112 38,62"/><g className="radar-points">{[[90,27],[147,60],[126,126],[65,112],[38,62]].map(([x,y])=><circle cx={x} cy={y} r="3" key={x}/>)}</g></svg><div className="radar-labels"><span>Evacuation</span><span>Transport</span><span>Supplies</span><span>Pets</span><span>Communication</span></div></div><div className="projection-card"><span className="kicker">PROJECTED READINESS</span><div><b>{score}</b><Icon name="arrow"/><strong>93</strong></div><p>Complete your top three recommended actions to gain a projected <b>+21 points.</b></p><div className="mini-trend"><i/><i/><i/><i/><i/></div></div><div className="resource-matrix"><span className="kicker">RESOURCE COMPLETENESS</span>{[["Safety",67],["Supplies",75],["Power",50],["Tools",50],["Information",40]].map(([n,v])=><div key={n}><span>{n}</span><div className="progress"><i style={{width:`${v}%`}}/></div><b>{v}%</b></div>)}</div><div className="exposure-card"><span className="kicker">LOCAL RISK EXPOSURE</span><div className="exposure-map"><i/><span>HOME</span><b>MODERATE</b></div><small>No active evacuation order · San Diego County</small></div></div>
    <h2>Top 3 actions for fastest improvement</h2><div className="top-actions">{recommendations.slice(0,3).map((r,i)=><span key={r.title}><i>{i+1}</i>{r.title}<b>+{r.points}</b></span>)}</div><h2>Recommended Action Plan</h2>{recommendations.map((r,i)=><div className="action-line" key={r.title}><span>{i+1}</span><div><b>{r.title}</b><small>{r.level} · {r.time} · Supporting source: {r.source}</small></div><strong>+{r.points} pts</strong></div>)}</div></section>
  </div>;
}

function PreparednessPlan({complete,completeTask}:{complete:string[];completeTask:(t:string,p:number)=>void}) {
  return <div><PageTitle kicker="YOUR ACTION PLAN" title="Preparedness Plan" copy="A prioritized checklist built from your household needs and readiness gaps."/><div className="plan-list">{recommendations.map((r,i)=><div className={`card plan-row ${complete.includes(r.title)?"is-done":""}`} key={r.title}><span className="plan-number">{complete.includes(r.title)?<Icon name="check"/>:i+1}</span><div><Badge tone={i===0?"orange":"blue"}>{r.level.toUpperCase()}</Badge><h3>{r.title}</h3><p>{r.why}</p><div className="source"><Icon name="shield" size={14}/> {r.source} · {r.time}</div></div><strong>+{r.points} pts</strong><Button disabled={complete.includes(r.title)} onClick={()=>completeTask(r.title,r.points)}>{complete.includes(r.title)?"Completed":"Complete task"}</Button></div>)}</div></div>;
}

function Settings(){return <div><PageTitle kicker="ACCOUNT & PREFERENCES" title="Settings" copy="Manage your preparedness location, alerts, privacy, and household access."/><section className="card settings-card">{["Preparedness location","Emergency notifications","Household members","Data & privacy","Accessibility"].map((x,i)=><button key={x}><span className="settings-icon"><Icon name={(["pin","bell","users","shield","help"] as IconName[])[i]}/></span><div><b>{x}</b><small>{i===0?"San Diego County, California":i===1?"Critical and action alerts enabled":"Review and manage"}</small></div><Icon name="chevron"/></button>)}</section></div>}

function NotificationPanel({onClose}:{onClose:()=>void}) {
  return <div className="notification-panel"><div className="panel-head"><div><b>Notifications</b><span>3 new updates</span></div><button onClick={onClose}><Icon name="close"/></button></div>{[
    ["flame","Wildfire Alert","Elevated fire activity detected near your selected location.","Critical"],
    ["help","Preparedness Reminder","Your emergency communication plan is incomplete.","Action"],
    ["check","Progress Update","You increased your readiness score from 64 to 72.","Information"],
  ].map(([icon,title,copy,type])=><div className="notification" key={title}><span className={`notification-icon ${type.toLowerCase()}`}><Icon name={icon as IconName}/></span><div><small>{type.toUpperCase()}</small><b>{title}</b><p>{copy}</p><time>12 minutes ago</time></div></div>)}</div>;
}

function PageTitle({kicker,title,copy}:{kicker:string;title:string;copy:string}){return <section className="page-title"><span className="kicker">{kicker}</span><h1>{title}</h1><p>{copy}</p></section>}
function Info({label,value}:{label:string;value:string}){return <div className="info-row"><span>{label}</span><b>{value}</b></div>}

export default App;
