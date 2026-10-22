import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, loadProgress, saveProgress } from "./lib/supabase";
import { CurrentUserContext, FALLBACK_NAME, possessive, useCurrentUser, userFromSession } from "./lib/currentUser";
import {
  ALL_RESOURCES, CA_COUNTIES, CONTACT_KINDS, HouseholdContext, MEMBER_TYPES, OWNER_ID, PET_CHECKS, PET_SPECIES, RESOURCE_CATALOG, ROLES, VEHICLE_POWER,
  analyzeHousehold, countyLabel, demoProfile, emptyProfile, initials, loadHousehold, locationLong, locationShort, memberLabel, newId, newPet, petScore, plural, saveHousehold, useHousehold,
  type Contact, type ContactKind, type HouseholdProfile, type MapPlace, type Member, type MemberType, type Pet, type ResourceStatus, type SaveState, type SavedRoute, type Vehicle,
} from "./lib/household";
import { ADVISOR_QUESTIONS, QUESTION_BY_ID, matchQuestion, type AdvisorAnswer, type AdvisorQuestion } from "./lib/advisor";
import { ALERTS, EVACUATION_STEPS, MYTHS, SCENARIOS, bagItems, shuffle } from "./lib/games";
import logo from "./assets/CAReady128x.png";
import Auth from "./Auth";
import FireMap from "./FireMap";
import FireHistoryPanel from "./FireHistory";
import EvacuationMap, { type PickTarget } from "./EvacuationMap";
import LocalFireMap from "./LocalFireMap";
import MapBoundary from "./MapBoundary";
import { getCaliforniaFires, type FireDetection } from "./lib/firms";
import { describePoint, directionTo, directionsUrl, milesBetween, nearestFireToLine, planRoutes, searchPlaces, simplifyLine, toMiles, type Route, type RoutePlan } from "./lib/geo";
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

// ReadyCA logo. Decorative: it always sits next to the "ReadyCA" wordmark.
function BrandMark() {
  return <img className="brand-mark brand-logo" src={logo} alt="" width={38} height={38}/>;
}

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

const DEFAULT_SCORE = 72;

function App() {
  const [entry, setEntry] = useState<"landing" | "auth" | "setup" | "app">("landing");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [session, setSession] = useState<Session | null>(null);
  const userId = session?.user.id;
  const user = useMemo(() => userFromSession(session), [session]);
  const [active, setActive] = useState("Dashboard");
  const [score, setScore] = useState(DEFAULT_SCORE);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [complete, setComplete] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  // The score the ring is animating toward, so rapid task completions add up correctly.
  const scoreTarget = useRef(DEFAULT_SCORE);
  const scoreTimer = useRef<number | undefined>(undefined);
  const previousUserId = useRef<string | undefined>(undefined);

  // Household profile: the guest demo until someone signs in, then that account's own data.
  const [household, setHousehold] = useState<HouseholdProfile>(demoProfile);
  const [saveState, setSaveState] = useState<SaveState>("local");
  const [saveError, setSaveError] = useState<string | null>(null);
  const householdOwner = useRef<string | undefined>(undefined); // account the loaded profile belongs to; saving is only allowed for it
  const householdDirty = useRef(false);
  const pendingSave = useRef<{ userId: string; profile: HouseholdProfile } | null>(null);
  const updateHousehold = useCallback((change: (p: HouseholdProfile) => HouseholdProfile) => { householdDirty.current = true; setHousehold(change); }, []);

  const flushHousehold = async () => {
    const pending = pendingSave.current;
    if (!pending) return;
    pendingSave.current = null;
    const error = await saveHousehold(pending.userId, pending.profile);
    if (householdOwner.current === pending.userId) { setSaveError(error); setSaveState(error ? "error" : "saved"); }
  };

  // Save household edits shortly after they happen (debounced so typing doesn't spam the database).
  useEffect(() => {
    if (!householdDirty.current || !userId || householdOwner.current !== userId) return;
    pendingSave.current = { userId, profile: household };
    setSaveState("saving");
    const timer = window.setTimeout(flushHousehold, 600);
    return () => window.clearTimeout(timer);
  }, [household, userId]);

  const showGuestHousehold = () => {
    householdOwner.current = undefined; householdDirty.current = false; pendingSave.current = null;
    setHousehold(demoProfile()); setSaveState("local"); setSaveError(null);
  };

  const resetProgress = (nextScore = DEFAULT_SCORE, nextComplete: string[] = []) => {
    window.clearInterval(scoreTimer.current);
    scoreTarget.current = nextScore;
    setScore(nextScore);
    setComplete(nextComplete);
  };

  // Keep the session in sync with Supabase (sign in, sign out, name changes, page reloads).
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // When the account changes, load that account's progress and household.
  // Accounts without a household profile yet go through household setup.
  useEffect(() => {
    const signedOut = previousUserId.current && !userId;
    previousUserId.current = userId;
    if (signedOut) { resetProgress(); showGuestHousehold(); setActive("Dashboard"); setEntry("landing"); return; }
    if (!userId) return;
    // Never show (or save) the previous account's household while this one loads.
    householdOwner.current = undefined; householdDirty.current = false; pendingSave.current = null;
    setHousehold(emptyProfile()); setSaveState("idle"); setSaveError(null);
    let cancelled = false;
    Promise.all([loadProgress(userId), loadHousehold(userId)]).then(([saved, loaded]) => {
      if (cancelled) return;
      setActive("Dashboard");
      resetProgress(saved?.score, saved?.completed_tasks);
      householdDirty.current = false;
      setHousehold(loaded.profile ?? emptyProfile());
      if (loaded.error) {
        // Don't risk overwriting a household we couldn't read: keep edits local and say so.
        setSaveState("error"); setSaveError(`Couldn't load your household (${loaded.error}). Changes won't be saved.`);
        setEntry(saved ? "app" : "setup");
        return;
      }
      householdOwner.current = userId;
      setEntry(saved && loaded.profile ? "app" : "setup");
    });
    return () => { cancelled = true; };
  }, [userId]);

  const signOut = async () => {
    await flushHousehold();
    await supabase?.auth.signOut();
    resetProgress(); showGuestHousehold(); setActive("Dashboard"); setEntry("landing");
  };

  const finishSetup = async () => {
    if (userId) {
      saveProgress(userId, { score: scoreTarget.current, completed_tasks: complete });
      // Save even if nothing was edited, so the account counts as set up next time.
      if (householdOwner.current === userId) { pendingSave.current = { userId, profile: household }; setSaveState("saving"); flushHousehold(); }
    }
    setEntry("app");
  };

  const completeTask = (title: string, points: number) => {
    if (complete.includes(title)) return;
    setComplete((v) => [...v, title]);
    const target = Math.min(scoreTarget.current + points, 100);
    scoreTarget.current = target;
    if (userId) saveProgress(userId, { score: target, completed_tasks: [...complete, title] });
    window.clearInterval(scoreTimer.current);
    scoreTimer.current = window.setInterval(() => {
      setScore((s) => {
        if (s >= target) { window.clearInterval(scoreTimer.current); return s; }
        return s + 1;
      });
    }, 55);
  };

  const go = (name: string) => { setActive(name); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const openAuth = (mode: "signin" | "signup") => { setAuthMode(mode); setEntry("auth"); };

  const householdContext = { profile: household, update: updateHousehold, saveState, saveError };
  const withContext = (content: ReactNode) => <CurrentUserContext.Provider value={user}><HouseholdContext.Provider value={householdContext}>{content}</HouseholdContext.Provider></CurrentUserContext.Provider>;

  if (entry === "landing") return <Landing onStart={() => userId ? setEntry("setup") : openAuth("signup")} onSignIn={() => userId ? setEntry("app") : openAuth("signin")} onExplore={() => setEntry("app")}/>;
  if (entry === "auth") return <Auth initialMode={authMode} onBack={() => setEntry("landing")}/>;
  if (entry === "setup") return withContext(<HouseholdSetup onComplete={finishSetup}/>);

  return withContext(<div className="app">
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
      <div className="brand" onClick={() => go("Dashboard")}><BrandMark/><div><b>ReadyCA</b><small>WILDFIRE READINESS</small></div></div>
      <nav>{nav.map(([label, icon]) => <button key={label} className={active === label ? "active" : ""} onClick={() => go(label)}><Icon name={icon}/><span>{label}</span>{active === label && <i/>}</button>)}</nav>
      <div className="sidebar-foot"><Icon name="shield"/><div><b>Emergency guidance</b><span>Follow official local authority instructions. Call 911 for life-threatening emergencies.</span></div></div>
    </aside>

    <div className="page">
      <header>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"}/></button>
        <button className="location" onClick={() => go("Settings")} aria-label="Change preparedness location"><Icon name="pin"/><div><small>PREPAREDNESS LOCATION</small><b>{locationShort(household)}</b></div><Icon name="chevron" size={14}/></button>
        <div className="header-actions">
          <Badge tone="orange"><span className="status-dot"/> MODERATE RISK</Badge>
          <button className="icon-button" aria-label="Help"><Icon name="help"/></button>
          <button className="icon-button notify" aria-label="Notifications" onClick={() => setNotifications(!notifications)}><Icon name="bell"/><i/></button>
          {user.signedIn
            ? <><button className="avatar" title={`${user.name}${user.email ? ` · ${user.email}` : ""}`} aria-label={`Account settings for ${user.name}`} onClick={() => go("Settings")}>{user.initials}</button><button className="text-button" onClick={signOut}>Sign out</button></>
            : <button className="text-button" onClick={() => openAuth("signin")}>Sign in</button>}
        </div>
        {notifications && <NotificationPanel onClose={() => setNotifications(false)}/>}
      </header>

      <main>
        {active === "Dashboard" && <Dashboard score={score} complete={complete} openScore={() => setScoreOpen(true)} completeTask={completeTask} go={go}/>}
        {active === "My Household" && <Household onSignIn={() => openAuth("signin")}/>}
        {active === "Wildfire Risk" && <RiskMap go={go}/>}
        {active === "Evacuation" && <Evacuation/>}
        {active === "AI Readiness Advisor" && <Advisor score={score}/>}
        {active === "Emergency Decision Game" && <DecisionGame/>}
        {active === "Progress" && <Progress score={score} complete={complete}/>}
        {active === "Sources & Evidence" && <Evidence/>}
        {active === "Preparedness Report" && <Report score={score}/>}
        {active === "Preparedness Plan" && <PreparednessPlan complete={complete} completeTask={completeTask}/>}
        {active === "Settings" && <Settings onSignIn={() => openAuth("signin")} go={go}/>}
      </main>
    </div>
    {scoreOpen && <ScoreModal score={score} complete={complete} close={() => setScoreOpen(false)} completeTask={completeTask}/>}
    {menuOpen && <div className="scrim mobile-only" onClick={() => setMenuOpen(false)}/>}
    <div className="bottom-nav">{[["Dashboard","grid"],["Wildfire Risk","flame"],["Evacuation","route"],["Progress","chart"]] .map(([label,icon])=><button className={active===label?"active":""} onClick={()=>go(label)} key={label}><Icon name={icon as IconName}/><span>{label==="Wildfire Risk"?"Risk":label}</span></button>)}<button onClick={()=>setMenuOpen(true)}><Icon name="menu"/><span>More</span></button></div>
  </div>);
}

function Landing({onStart,onSignIn,onExplore}:{onStart:()=>void;onSignIn:()=>void;onExplore:()=>void}) {
  return <div className="landing">
    <header className="landing-header"><div className="brand"><BrandMark/><div><b>ReadyCA</b><small>WILDFIRE READINESS</small></div></div><div><button className="text-button">How it works</button><button className="text-button">Preparedness resources</button><Button variant="secondary" onClick={onSignIn}>Sign in</Button></div></header>
    <main className="landing-main"><section className="landing-copy"><Badge tone="orange"><span className="status-dot"/> BUILT FOR CALIFORNIA HOUSEHOLDS</Badge><h1>Be ready before wildfire conditions change.</h1><p>Understand your household's readiness, build a clear evacuation plan, and take the next best step with guidance grounded in trusted emergency sources.</p><div className="landing-actions"><Button onClick={onStart}>Build my readiness plan <Icon name="arrow"/></Button><Button variant="secondary" onClick={onExplore}>Explore the dashboard</Button></div><div className="trust-row"><span><Icon name="shield"/> Evidence-grounded</span><span><Icon name="check"/> Transparent scoring</span><span><Icon name="pin"/> Location-aware</span></div></section>
    <section className="landing-preview"><div className="preview-alert"><span><Icon name="flame"/></span><div><small>LOCAL WILDFIRE RISK</small><b>Moderate</b><p>No active evacuation order near your location.</p></div></div><div className="preview-score"><ScoreRing score={72}/><div><Badge>GOOD PREPAREDNESS</Badge><h2>Your household has a good start.</h2><p>Complete your evacuation plan to improve your score by 8 points.</p><div className="progress"><i style={{width:"72%"}}/></div></div></div><div className="preview-actions"><span><Icon name="route"/> Create evacuation plan <b>+8</b></span><span><Icon name="box"/> Prepare 72-hour kit <b>+6</b></span></div></section></main>
    <footer className="landing-footer"><span><Icon name="shield"/> In an emergency, follow official local instructions. Call 911 for life-threatening emergencies.</span><span>Guidance informed by CAL FIRE · Cal OES · FEMA · Ready.gov</span></footer>
  </div>;
}

function HouseholdSetup({onComplete}:{onComplete:()=>void}) {
  const user = useCurrentUser();
  const { profile, update } = useHousehold();
  const [step,setStep]=useState(0);
  const steps:[string,string,string][]=[
    ["Where do you live?","Your county shapes local risk, alerts, and evacuation guidance.","Location is used to personalize risk and evacuation guidance. ReadyCA never shares it."],
    ["Who's in your household?","Add everyone you're preparing for, including anyone who needs extra help.","Support needs shape evacuation timing and supply recommendations. ReadyCA does not infer sensitive characteristics."],
    ["Pets & transportation","Plan for every animal and every way out.","Vehicles and pets determine seating capacity and what to pack."],
    ["Stay connected","Make sure your household can reconnect if you're separated.","An out-of-area contact and a meeting point are two of the most important parts of a plan."],
  ];
  const [title,copy,why]=steps[step];
  const removeFrom=<K extends "members"|"pets"|"vehicles"|"contacts">(key:K,id:string)=>update(p=>({...p,[key]:(p[key] as {id:string}[]).filter(x=>x.id!==id)}));
  const listItem=(id:string,label:string,sub:string,key:"members"|"pets"|"vehicles"|"contacts")=><li key={id}><span className="hh-list-initials">{initials(label)}</span><div><b>{label}</b><small>{sub}</small></div><RemoveButton label={`Remove ${label}`} onClick={()=>removeFrom(key,id)}/></li>;
  const [meetingPoint,setMeetingPoint]=useState(profile.meetingPoint);
  const next=()=>{
    if(step===3)update(p=>({...p,meetingPoint:tidy(meetingPoint)}));
    if(step<steps.length-1)setStep(step+1); else onComplete();
  };
  return <div className="setup-page"><header><div className="brand"><BrandMark/><div><b>ReadyCA</b><small>HOUSEHOLD SETUP</small></div></div><button className="text-button" onClick={()=>{if(step===3)update(p=>({...p,meetingPoint:tidy(meetingPoint)}));onComplete()}}>Save & finish later</button></header><main><div className="setup-progress"><span>STEP {step+1} OF {steps.length}</span><div>{steps.map((_,i)=><i className={i<=step?"active":""} key={i}/>)}</div></div><Badge tone="blue">USER-PROVIDED INFORMATION</Badge><h1>{title}</h1><p>{copy} You can update these details at any time.</p>
    <div className="setup-body">
      {step===0&&<LocationForm autoSave/>}
      {step===1&&<>
        <h3>You</h3>
        <form className="hh-form" onSubmit={e=>e.preventDefault()}><label>Name<input value={user.name} disabled title="Change your name in Settings"/></label><label>Type<select value={profile.owner.type} onChange={e=>{const type=e.target.value as MemberType;update(p=>({...p,owner:{...p.owner,type}}))}}>{MEMBER_TYPES.map(t=><option key={t}>{t}</option>)}</select></label><label className="hh-wide">Your support needs<input value={profile.owner.supportNeeds} maxLength={120} placeholder="Optional" onChange={e=>{const supportNeeds=e.target.value;update(p=>({...p,owner:{...p.owner,supportNeeds}}))}}/></label></form>
        <h3>Others in your household</h3>
        {profile.members.length>0&&<ul className="hh-list">{profile.members.map(m=>listItem(m.id,m.name,`${memberLabel(m)}${m.supportNeeds?` · ${m.supportNeeds}`:""}`,"members"))}</ul>}
        <MemberForm submitLabel="Add person" onSave={m=>update(p=>({...p,members:[...p.members,m]}))}/>
      </>}
      {step===2&&<>
        <h3>Pets</h3>
        {profile.pets.length>0&&<ul className="hh-list">{profile.pets.map(pet=>listItem(pet.id,pet.name,`${pet.species}${pet.age!=null?` · ${plural(pet.age,"year")}`:""}`,"pets"))}</ul>}
        <PetForm submitLabel="Add pet" onSave={pet=>update(p=>({...p,pets:[...p.pets,pet]}))}/>
        <h3>Vehicles</h3>
        {profile.vehicles.length>0&&<ul className="hh-list">{profile.vehicles.map((v,i)=>listItem(v.id,v.name,`${i===0?"Primary":"Backup"} · ${plural(v.seats,"seat")} · ${v.power}`,"vehicles"))}</ul>}
        <VehicleForm submitLabel="Add vehicle" onSave={v=>update(p=>({...p,vehicles:[...p.vehicles,v]}))}/>
      </>}
      {step===3&&<>
        <h3>Emergency contacts</h3>
        {profile.contacts.length>0&&<ul className="hh-list">{profile.contacts.map(c=>listItem(c.id,c.name,`${c.kind}${c.detail?` · ${c.detail}`:""}`,"contacts"))}</ul>}
        <ContactForm submitLabel="Add contact" kind={profile.contacts.some(c=>c.kind==="Out-of-area contact")?"Emergency contact":"Out-of-area contact"} key={profile.contacts.length} onSave={c=>update(p=>({...p,contacts:[...p.contacts,c]}))}/>
        <h3>Meeting point</h3>
        <form className="hh-form" onSubmit={e=>e.preventDefault()}><label className="hh-wide">Where will everyone meet if separated?<input value={meetingPoint} maxLength={80} placeholder="e.g. Library parking lot on Main St" onChange={e=>setMeetingPoint(e.target.value)}/></label></form>
      </>}
    </div>
    <div className="setup-insight"><Icon name="spark"/><div><b>Why we ask</b><span>{why}</span></div></div><div className="setup-actions"><Button variant="secondary" onClick={()=>setStep(Math.max(0,step-1))} disabled={step===0}>Back</Button><Button onClick={next}>{step===steps.length-1?"View my readiness dashboard":step===0&&!profile.location.county?"Skip for now":"Continue"} <Icon name="arrow"/></Button></div></main></div>;
}

function greetingFor(date: Date) {
  const hour = date.getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function Dashboard({ score, complete, openScore, completeTask, go }: { score: number; complete: string[]; openScore: () => void; completeTask: (t: string, p: number) => void; go: (n: string) => void }) {
  const user = useCurrentUser();
  const household = useHousehold().profile;
  const now = new Date();
  const today = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
  return <div className="dashboard">
    <section className="welcome"><div><div className="eyebrow">{today}</div><h1>{greetingFor(now)}, {user.firstName}.</h1><p>Here's your household's wildfire readiness at a glance.</p></div><Button variant="secondary" icon="pin" onClick={() => go("Settings")}>{countyLabel(household) || "Set your location"}</Button></section>
    <section className="risk-banner"><div className="risk-icon"><Icon name="flame"/></div><div><Badge tone="orange">LOCAL RISK · MODERATE</Badge><b>No active evacuation order near your selected location</b><span>Conditions can change quickly. Last checked 8 minutes ago.</span></div><Button variant="secondary" onClick={() => go("Wildfire Risk")}>View local risk <Icon name="arrow"/></Button></section>

    <div className="dashboard-grid">
      <section className="card readiness-card">
        <div className="card-heading"><div><span className="kicker">PERSONAL READINESS</span><h2>Your household readiness</h2></div><Badge>GOOD PREPAREDNESS</Badge></div>
        <div className="readiness-main"><ScoreRing score={score}/><div className="readiness-copy"><div className="score-large">{score}<span>/ 100</span></div><p>{score > 72 ? "Nice work — your readiness plan is getting stronger." : "Good start — but there are a few important gaps to address."}</p><Button variant="secondary" onClick={openScore}>Why is my score {score}%? <Icon name="arrow"/></Button></div></div>
        <div className="readiness-footer"><span><Icon name="chart" size={16}/> <b>+8 points</b> in the last 30 days</span><span>Profile strength <b>{analyzeHousehold(household).completeness}%</b></span></div>
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
      <LocalOverview go={go}/>
      <section className="card progress-card">
        <div className="card-heading"><div><span className="kicker">{now.toLocaleDateString("en-US", { month: "long" }).toUpperCase()} GOAL</span><h2>Build your evacuation plan</h2></div><b>3 / 5</b></div>
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

// Incident, route, and shelter details on these pages are San Diego County examples
// until a live data source is connected; say so when the household lives elsewhere.
function SampleDataNote({ go, examples = "The map, incidents, and shelters below are" }: { go:(n:string)=>void; examples?: string }) {
  const { profile } = useHousehold();
  if (profile.location.county === "San Diego") return null;
  return <div className="sample-note"><Icon name="help"/><span>{profile.location.county?`Live incident and route data for ${countyLabel(profile)} isn't connected yet. ${examples} San Diego County examples.`:`Set your location to personalize this page. ${examples} San Diego County examples.`}</span><button className="text-button" onClick={()=>go("Settings")}>{profile.location.county?"Change location":"Set location"}</button></div>;
}

function RiskMap({ go }: { go:(n:string)=>void }) {
  return <div><PageTitle kicker="LIVE SITUATIONAL AWARENESS" title="Wildfire Risk" copy="Monitor local incidents, evacuation zones, shelters, and road conditions."/>
    <SampleDataNote go={go} examples="The fire map shows live NASA satellite detections; the incident and shelter details beside it are"/>
    <div className="map-layout"><section className="card map-panel"><FireMap/><div className="map-disclaimer"><Icon name="shield"/> Emergency information can change rapidly. Always follow official evacuation orders and instructions from local authorities.</div></section>
    <aside className="card risk-side"><span className="kicker">CURRENT LOCAL RISK</span><div className="risk-level"><span>MODERATE</span><i>3</i></div><p>No active evacuation order detected near your selected location.</p><hr/><Info label="Nearest active wildfire" value="Border 2 Fire"/><Info label="Distance" value="42 miles southeast"/><Info label="Fire status" value="18% contained"/><Info label="Last updated" value="8 minutes ago"/><Info label="Evacuation zone" value="No current order"/><Info label="Nearby shelter" value="Canyon Hills · Open"/><Button onClick={()=>go("Evacuation")}>Plan evacuation route <Icon name="arrow"/></Button><div className="verified"><Icon name="shield"/> Verified incident sources</div></aside></div>
    <FireHistoryPanel/>
  </div>;
}

// ---- evacuation planning -------------------------------------------------------

/** "24 min" or "1 hr 5 min". */
function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
}

/** "just now", "12 min ago", "3 hrs ago". */
function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

/** Shrinks a planned route to what the household profile stores (and the dashboard draws). */
const toSavedRoute = (r: Route): SavedRoute => ({ miles: +toMiles(r.meters).toFixed(1), minutes: Math.round(r.seconds / 60), roads: r.roads, line: simplifyLine(r.coords) });

// Where the household's home is on the map: the exact pin from the Evacuation page if set,
// otherwise the center of their city (or county) from address search, marked approximate.
function useHomePlace(profile: HouseholdProfile, ignoreExact = false): { place: MapPlace | null; approximate: boolean; loading: boolean } {
  const exact = ignoreExact ? null : profile.evacuation.home;
  const { city, county } = profile.location;
  const query = county ? `${city ? `${city}, ` : ""}${county} County, California` : "";
  const [found, setFound] = useState<{ query: string; place: MapPlace | null } | null>(null);
  useEffect(() => {
    if (exact || !query) return;
    const controller = new AbortController();
    searchPlaces(query, controller.signal).then((results) => setFound({ query, place: results[0] ?? null }), () => { if (!controller.signal.aborted) setFound({ query, place: null }); });
    return () => controller.abort();
  }, [exact, query]);
  if (exact) return { place: exact, approximate: false, loading: false };
  if (!query) return { place: null, approximate: false, loading: false };
  const current = found?.query === query ? found : null;
  return { place: current?.place ?? null, approximate: true, loading: !current };
}

// Live NASA FIRMS detections for California, shared between the dashboard and evacuation map.
function useFires() {
  const [state, setState] = useState<{ fires: FireDetection[]; retrievedAt: string | null; error: string | null; loading: boolean }>({ fires: [], retrievedAt: null, error: null, loading: true });
  useEffect(() => {
    let cancelled = false;
    getCaliforniaFires().then(
      (r) => { if (!cancelled) setState({ fires: r.detections, retrievedAt: r.retrievedAt, error: null, loading: false }); },
      (e: unknown) => { if (!cancelled) setState({ fires: [], retrievedAt: null, error: e instanceof Error ? e.message : "Fire data is unavailable.", loading: false }); },
    );
    return () => { cancelled = true; };
  }, []);
  return state;
}

// One place (home or destination). Searches run only when submitted, per the address
// service's usage policy; matches appear as a short list to choose from.
function PlaceSearch({ label, hint, place, onChange, picking, onPickOnMap, children }: { label: string; hint: string; place: MapPlace | null; onChange: (p: MapPlace) => void; picking: boolean; onPickOnMap: () => void; children?: ReactNode }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapPlace[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = label.toLowerCase().replace(/\W+/g, "-");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true); setError(null); setResults(null);
    try {
      const found = await searchPlaces(query);
      if (found.length) setResults(found); else setError("No matches in California. Try adding a city or ZIP code.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Address search failed.");
    } finally { setBusy(false); }
  };
  const choose = (p: MapPlace) => { onChange(p); setResults(null); setQuery(""); };
  return <div className="place-search">
    <div className="place-search-head"><label htmlFor={id}>{label}</label><span className={place ? "place-current" : "place-current unset"} title={place?.label}>{place ? place.label : "Not set"}</span></div>
    <form onSubmit={submit} className="place-search-form">
      <input id={id} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={hint} autoComplete="off"/>
      <button className="btn btn-secondary" disabled={busy || !query.trim()}>{busy ? "Searching…" : "Search"}</button>
    </form>
    <div className="place-search-actions">
      <button type="button" className={`text-button ${picking ? "is-active" : ""}`} onClick={onPickOnMap} aria-pressed={picking}><Icon name="pin" size={14}/> {picking ? "Cancel map pick" : "Pick on map"}</button>
      {children}
    </div>
    {error && <p className="place-search-error" role="alert">{error}</p>}
    {results && <ul className="place-results" aria-label={`${label} matches`}>{results.map((r) => <li key={`${r.lat},${r.lng}`}><button type="button" onClick={() => choose(r)}><Icon name="pin" size={14}/>{r.label}</button></li>)}</ul>}
  </div>;
}

// How close the selected route comes to a satellite fire detection. MODIS pixels are about
// 1 km across and detections are up to 24 hours old, so this is a warning sign to check
// official sources, not a statement that a road is open or closed.
function RouteFireCheck({ route, fires, firesError }: { route: Route; fires: FireDetection[]; firesError: string | null }) {
  if (firesError) return <div className="route-check unknown"><Icon name="help"/><span>Fire detections are unavailable, so this route couldn't be checked.</span></div>;
  const nearest = nearestFireToLine(route.coords, fires);
  if (!nearest) return <div className="route-check clear"><Icon name="shield"/><span><b>No satellite fire detections</b> in California in the last 24 hours.</span></div>;
  const miles = nearest.miles < 10 ? nearest.miles.toFixed(1) : Math.round(nearest.miles).toLocaleString();
  const near = nearest.fire.nearest ? ` near ${nearest.fire.nearest.name}` : "";
  if (nearest.miles < 5) return <div className="route-check danger" role="alert"><Icon name="flame"/><span><b>Fire detected {miles} mi from this route</b>{near}. Check official evacuation orders and road closures before using it.</span></div>;
  if (nearest.miles < 15) return <div className="route-check caution"><Icon name="flame"/><span><b>Fire detected {miles} mi from this route</b>{near}. Keep an eye on official updates.</span></div>;
  return <div className="route-check clear"><Icon name="shield"/><span><b>Nearest fire detection is {miles} mi away</b>{near}.</span></div>;
}

function Evacuation() {
  const { profile, update } = useHousehold();
  const { home, destination } = profile.evacuation;
  const cityCenter = useHomePlace(profile, true); // where to center the map before a home is set
  const { fires, error: firesError, retrievedAt } = useFires();
  const [active, setActive] = useState<"primary" | "backup">("primary");
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState<PickTarget | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const saved = profile.evacuationPlanSaved;
  // Keep the map's fallback center stable between renders so it doesn't re-frame needlessly.
  const fallbackCenter = useMemo<[number, number] | null>(() => (cityCenter.place ? [cityCenter.place.lat, cityCenter.place.lng] : null), [cityCenter.place?.lat, cityCenter.place?.lng]);

  // Re-plan whenever both places are set and either one moves. Keyed on coordinates, not
  // object identity, so reloading the same profile doesn't trigger new routing requests.
  useEffect(() => {
    if (!home || !destination) { setPlan(null); setPlanError(null); return; }
    const controller = new AbortController();
    // Drop the old routes right away so the sidebar never shows them under the new place names.
    setPlan(null); setPlanning(true); setPlanError(null);
    planRoutes(home, destination, controller.signal).then(
      (p) => { setPlan(p); if (!p.backup) setActive("primary"); },
      (e: unknown) => { if (!controller.signal.aborted) { setPlan(null); setPlanError(e instanceof Error ? e.message : "Couldn't plan a route."); } },
    ).finally(() => { if (!controller.signal.aborted) setPlanning(false); });
    return () => controller.abort();
  }, [home?.lat, home?.lng, destination?.lat, destination?.lng]);

  // Changing either place invalidates the saved routes, so the plan needs saving again.
  const setPlace = (target: PickTarget, place: MapPlace) => update((p) => {
    const old = p.evacuation[target];
    const moved = !old || old.lat !== place.lat || old.lng !== place.lng;
    return { ...p, evacuationPlanSaved: moved ? false : p.evacuationPlanSaved, evacuation: { ...p.evacuation, [target]: place, ...(moved ? { primary: null, backup: null } : {}) } };
  });

  // A clicked, dragged, or device-located point is placed right away with its coordinates,
  // then relabeled with the nearest address once the lookup returns.
  const placePoint = (target: PickTarget, lat: number, lng: number) => {
    setPickMode(null);
    const point = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
    setPlace(target, { label: `Dropped pin (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`, ...point });
    describePoint(point.lat, point.lng).then((label) => update((p) => {
      const current = p.evacuation[target];
      return current && current.lat === point.lat && current.lng === point.lng ? { ...p, evacuation: { ...p.evacuation, [target]: { ...current, label } } } : p;
    }));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setLocateError("This browser can't share its location."); return; }
    setLocating(true); setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); placePoint("home", pos.coords.latitude, pos.coords.longitude); },
      (err) => { setLocating(false); setLocateError(err.code === err.PERMISSION_DENIED ? "Location permission was denied. Search for your address instead." : "Couldn't get your location. Search for your address instead."); },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  const route = active === "backup" ? plan?.backup ?? null : plan?.primary ?? null;
  // Saving stores the routes with the plan so the dashboard can show them; clicking again un-saves.
  const savePlan = () => update((p) => saved
    ? { ...p, evacuationPlanSaved: false }
    : { ...p, evacuationPlanSaved: true, evacuation: { ...p.evacuation, primary: plan ? toSavedRoute(plan.primary) : null, backup: plan?.backup ? toSavedRoute(plan.backup) : null } });

  return <div><PageTitle kicker="HOUSEHOLD PLAN" title="Your Evacuation Plan" copy="Set where you'll leave from and where you'll go. ReadyCA plans two ways out and checks them against live fire detections."/>

    <section className="card evac-setup">
      <PlaceSearch label="Home (start)" hint="Street address, city, or ZIP" place={home} onChange={(p) => setPlace("home", p)} picking={pickMode === "home"} onPickOnMap={() => setPickMode(pickMode === "home" ? null : "home")}>
        <button type="button" className="text-button" onClick={useMyLocation} disabled={locating}><Icon name="route" size={14}/> {locating ? "Locating…" : "Use my location"}</button>
      </PlaceSearch>
      <PlaceSearch label="Destination" hint="A relative's home, hotel, or evacuation center" place={destination} onChange={(p) => setPlace("destination", p)} picking={pickMode === "destination"} onPickOnMap={() => setPickMode(pickMode === "destination" ? null : "destination")}/>
      <p className="evac-setup-tip"><Icon name="help" size={14}/> Choose a destination outside your immediate area, ideally away from where fires usually come from. Officials may open specific evacuation centers during a fire; follow their instructions.</p>
      {locateError && <p className="place-search-error" role="alert">{locateError}</p>}
    </section>

    <div className="route-tabs" role="tablist" aria-label="Evacuation routes">
      <button role="tab" aria-selected={active === "primary"} className={active === "primary" ? "active" : ""} onClick={() => setActive("primary")}>Primary Evacuation Route</button>
      <button role="tab" aria-selected={active === "backup"} className={active === "backup" ? "active" : ""} onClick={() => setActive("backup")} disabled={!plan?.backup}>Backup Evacuation Route</button>
    </div>

    <div className="map-layout">
      <section className="card route-map">
        <MapBoundary className="evac-map-frame"><EvacuationMap home={home} destination={destination} plan={plan} active={active} fires={fires} pickMode={pickMode} onPick={placePoint} fallbackCenter={fallbackCenter}/></MapBoundary>
        {planning && <div className="evac-status" role="status">Planning routes…</div>}
        <div className="map-disclaimer"><Icon name="shield"/> Routes come from OpenStreetMap road data and don't know about closures or traffic. Always follow official evacuation orders and directions from local authorities.</div>
      </section>

      <aside className="card risk-side evac-side">
        {!home || !destination ? <>
          <Badge tone="gray">NO ROUTE YET</Badge>
          <h2>Set your home and destination</h2>
          <p className="evac-empty">Search for an address, use your device's location, or pick points on the map. ReadyCA will plan a primary route and a backup that avoids it where roads allow.</p>
        </> : planError ? <>
          <Badge tone="orange">ROUTE UNAVAILABLE</Badge>
          <h2>Couldn't plan this trip</h2>
          <p className="evac-empty" role="alert">{planError}</p>
        </> : !route ? <>
          <Badge tone="gray">{planning ? "PLANNING" : "NO ROUTE"}</Badge>
          <h2>{planning ? "Planning your routes…" : "No route found"}</h2>
        </> : <>
          <Badge tone={active === "primary" ? "green" : "blue"}>{active.toUpperCase()} ROUTE</Badge>
          <h2>Home → {destination.label.split(",")[0]}</h2>
          <div className="route-metrics"><div><b>{formatDuration(route.seconds)}</b><span>Estimated time (no traffic)</span></div><div><b>{toMiles(route.meters).toFixed(1)} mi</b><span>Distance</span></div></div>
          <RouteFireCheck route={route} fires={fires} firesError={firesError}/>
          <Info label="Main roads" value={route.roads.join(", ") || "Local streets"}/>
          {active === "backup" && plan?.backupOverlap != null && <Info label="Shared with primary route" value={`${Math.round(plan.backupOverlap * 100)}% of roads`}/>}
          {active === "primary" && !plan?.backup && <Info label="Backup route" value="None found that avoids this road"/>}
          <Info label="Household meeting point" value={profile.meetingPoint||"Not set"}/>
          <Info label="Evacuating" value={`${plural(1+profile.members.length,"person")} · ${plural(profile.pets.length,"pet")}`}/>
          <div className="button-stack">
            <Button onClick={savePlan} disabled={!plan}>{saved?<><Icon name="check"/> Plan saved</>:"Save Evacuation Plan"}</Button>
            <a className="btn btn-secondary" href={directionsUrl(home, destination, route.via)} target="_blank" rel="noreferrer"><Icon name="external" size={16}/><span>Practice in Google Maps</span></a>
          </div>
          {retrievedAt && <p className="evac-fires-time">Fire detections from NASA FIRMS, retrieved {timeAgo(retrievedAt)}.</p>}
        </>}
      </aside>
    </div>

    <section className="section-head"><div><span className="kicker">DURING AN EVACUATION</span><h2>Find official shelters and orders</h2><p>Shelters open only during an emergency, and where they open depends on the fire. Check these official sources when an evacuation is ordered.</p></div></section>
    <div className="shelters">{([
      ["Find an open shelter", "American Red Cross shelter map, updated during disasters.", "https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html", "home"],
      ["Evacuation orders & zones", "Look up your evacuation zone and live orders on Genasys Protect, used by most California counties.", "https://protect.genasys.com/", "route"],
      ["CAL FIRE Go! evacuation guide", "What to do when you're told to leave, and what to take.", "https://www.readyforwildfire.org/prepare-for-wildfire/go-evacuation-guide/", "book"],
    ] as [string, string, string, IconName][]).map(([title, copy, href, icon]) => <a className="card shelter shelter-link" key={title} href={href} target="_blank" rel="noreferrer"><div className="shelter-icon"><Icon name={icon}/></div><div><h3>{title}</h3><p>{copy}</p></div><Icon name="external"/></a>)}</div>
  </div>;
}

// Dashboard card: live fire detections around the household's home, the nearest one, and
// the saved evacuation route. Uses the exact home pin when set, otherwise the city center.
const NEARBY_MILES = 50;
function LocalOverview({ go }: { go:(n:string)=>void }) {
  const { profile } = useHousehold();
  const home = useHomePlace(profile);
  const { fires, retrievedAt, error, loading } = useFires();
  const saved = profile.evacuationPlanSaved ? profile.evacuation.primary : null;
  const at: [number, number] | null = home.place ? [home.place.lat, home.place.lng] : null;
  // Distance from home to each detection, nearest first.
  const ranked = at ? fires.map((f) => ({ f, miles: milesBetween(at, [f.latitude, f.longitude]) })).sort((a, b) => a.miles - b.miles) : [];
  const nearest = ranked[0];
  const nearby = ranked.filter((r) => r.miles <= NEARBY_MILES).length;
  const pending = loading || (!at && home.loading);
  return <section className="card local-card">
    <div className="card-heading"><div><span className="kicker">AROUND YOUR LOCATION</span><h2>Local wildfire overview</h2></div><span className="updated">{retrievedAt ? `Updated ${timeAgo(retrievedAt)}` : loading ? "Loading…" : "Not available"}</span></div>
    {home.place
      ? <MapBoundary className="local-map"><LocalFireMap home={home.place} approximate={home.approximate} destination={saved ? profile.evacuation.destination : null} route={saved} fires={fires} radiusMiles={NEARBY_MILES}/></MapBoundary>
      : <div className="local-map local-map-empty">{home.loading ? "Finding your location…" : <><b>Set your location to see nearby fires</b><Button variant="secondary" icon="pin" onClick={() => go("Settings")}>Set location</Button></>}</div>}
    <div className="map-stats">
      <div><span>Nearest fire detection</span><b className={nearest && nearest.miles <= NEARBY_MILES ? "warn-text" : ""}>{error ? "Unavailable" : pending || !at ? "—" : nearest ? `${Math.round(nearest.miles)} mi ${directionTo(at, [nearest.f.latitude, nearest.f.longitude])}` : "None in CA"}</b>{nearest?.f.nearest && <small>near {nearest.f.nearest.name}</small>}</div>
      <div><span>Within {NEARBY_MILES} miles</span><b className={!at || error || pending ? "" : nearby ? "warn-text" : "safe-text"}>{error || pending || !at ? "—" : nearby ? plural(nearby, "detection") : "None"}</b><small>last 24 hours</small></div>
      <div><span>Evacuation route</span>{saved ? <><b>{saved.miles} mi · {formatDuration(saved.minutes * 60)}</b><small>to {profile.evacuation.destination?.label.split(",")[0]}</small></> : <><b>Not saved</b><small><button className="link-button" onClick={() => go("Evacuation")}>Plan your route</button></small></>}</div>
    </div>
    {home.approximate && home.place && <p className="local-note">Centered on {profile.location.city || `${profile.location.county} County`}. <button className="link-button" onClick={() => go("Evacuation")}>Set your home address</button> for exact distances.</p>}
    <Button variant="secondary" onClick={() => go("Wildfire Risk")}>Open interactive risk map</Button>
  </section>;
}

// ---- household forms (used by the Household pages and by first-time setup) ----

const parseAge=(value:string)=>{const n=Number.parseInt(value,10);return Number.isFinite(n)&&n>=0&&n<=120?n:null};
const tidy=(value:string)=>value.trim().replace(/\s+/g," ");

function FormActions({onCancel,submitLabel}:{onCancel?:()=>void;submitLabel:string}) {
  return <div className="hh-form-actions">{onCancel&&<button type="button" className="btn btn-secondary" onClick={onCancel}><span>Cancel</span></button>}<button type="submit" className="btn btn-primary"><span>{submitLabel}</span></button></div>;
}

function MemberForm({initial,isOwner=false,onSave,onCancel,submitLabel="Save"}:{initial?:Member;isOwner?:boolean;onSave:(m:Member)=>void;onCancel?:()=>void;submitLabel?:string}) {
  const [name,setName]=useState(initial?.name??"");
  const [type,setType]=useState<MemberType>(initial?.type??"Adult");
  const [age,setAge]=useState(initial?.age!=null?String(initial.age):"");
  const [needs,setNeeds]=useState(initial?.supportNeeds??"");
  const submit=()=>{
    if(!isOwner&&!tidy(name))return;
    onSave({id:initial?.id??newId(),name:tidy(name),type,age:parseAge(age),supportNeeds:tidy(needs),planReady:initial?.planReady??false});
    if(!initial){setName("");setType("Adult");setAge("");setNeeds("")}
  };
  return <form className="hh-form" onSubmit={e=>{e.preventDefault();submit()}}>
    <label>Name{isOwner?<input value={initial?.name??""} disabled title="Change your name in Settings"/>:<input value={name} required maxLength={40} placeholder="e.g. Alex" onChange={e=>setName(e.target.value)}/>}</label>
    <label>Type<select value={type} onChange={e=>setType(e.target.value as MemberType)}>{MEMBER_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
    <label>Age<input value={age} inputMode="numeric" maxLength={3} placeholder="Optional" onChange={e=>setAge(e.target.value.replace(/\D/g,""))}/></label>
    <label className="hh-wide">Support needs<input value={needs} maxLength={120} placeholder="e.g. Uses a wheelchair, needs daily medication" onChange={e=>setNeeds(e.target.value)}/></label>
    <FormActions onCancel={onCancel} submitLabel={submitLabel}/>
  </form>;
}

function PetForm({initial,onSave,onCancel,submitLabel="Save"}:{initial?:Pet;onSave:(p:Pet)=>void;onCancel?:()=>void;submitLabel?:string}) {
  const [name,setName]=useState(initial?.name??"");
  const [species,setSpecies]=useState<Pet["species"]>(initial?.species??"Dog");
  const [age,setAge]=useState(initial?.age!=null?String(initial.age):"");
  const submit=()=>{
    if(!tidy(name))return;
    onSave(initial?{...initial,name:tidy(name),species,age:parseAge(age)}:newPet(tidy(name),species,parseAge(age)));
    if(!initial){setName("");setSpecies("Dog");setAge("")}
  };
  return <form className="hh-form" onSubmit={e=>{e.preventDefault();submit()}}>
    <label>Pet name<input value={name} required maxLength={40} placeholder="e.g. Luna" onChange={e=>setName(e.target.value)}/></label>
    <label>Species<select value={species} onChange={e=>setSpecies(e.target.value as Pet["species"])}>{PET_SPECIES.map(s=><option key={s}>{s}</option>)}</select></label>
    <label>Age<input value={age} inputMode="numeric" maxLength={2} placeholder="Optional" onChange={e=>setAge(e.target.value.replace(/\D/g,""))}/></label>
    <FormActions onCancel={onCancel} submitLabel={submitLabel}/>
  </form>;
}

function VehicleForm({initial,onSave,onCancel,submitLabel="Save"}:{initial?:Vehicle;onSave:(v:Vehicle)=>void;onCancel?:()=>void;submitLabel?:string}) {
  const [name,setName]=useState(initial?.name??"");
  const [seats,setSeats]=useState(String(initial?.seats??5));
  const [power,setPower]=useState<Vehicle["power"]>(initial?.power??"Fuel");
  const submit=()=>{
    if(!tidy(name))return;
    onSave({id:initial?.id??newId(),name:tidy(name),seats:Math.min(Math.max(Number(seats)||1,1),15),power,level:initial?.level??100});
    if(!initial){setName("");setSeats("5");setPower("Fuel")}
  };
  return <form className="hh-form" onSubmit={e=>{e.preventDefault();submit()}}>
    <label>Vehicle<input value={name} required maxLength={40} placeholder="e.g. Toyota Sienna" onChange={e=>setName(e.target.value)}/></label>
    <label>Seats<select value={seats} onChange={e=>setSeats(e.target.value)}>{[2,4,5,6,7,8,9,12,15].map(n=><option key={n}>{n}</option>)}</select></label>
    <label>Power<select value={power} onChange={e=>setPower(e.target.value as Vehicle["power"])}>{VEHICLE_POWER.map(p=><option key={p}>{p}</option>)}</select></label>
    <FormActions onCancel={onCancel} submitLabel={submitLabel}/>
  </form>;
}

function ContactForm({initial,kind,onSave,onCancel,submitLabel="Save"}:{initial?:Contact;kind?:ContactKind;onSave:(c:Contact)=>void;onCancel?:()=>void;submitLabel?:string}) {
  const [name,setName]=useState(initial?.name??"");
  const [contactKind,setContactKind]=useState<ContactKind>(initial?.kind??kind??"Emergency contact");
  const [detail,setDetail]=useState(initial?.detail??"");
  const submit=()=>{
    if(!tidy(name))return;
    onSave({id:initial?.id??newId(),name:tidy(name),kind:contactKind,detail:tidy(detail)});
    if(!initial){setName("");setDetail("")}
  };
  return <form className="hh-form" onSubmit={e=>{e.preventDefault();submit()}}>
    <label>Name<input value={name} required maxLength={60} placeholder="e.g. Aunt Lisa" onChange={e=>setName(e.target.value)}/></label>
    <label>Type<select value={contactKind} onChange={e=>setContactKind(e.target.value as ContactKind)}>{CONTACT_KINDS.map(k=><option key={k}>{k}</option>)}</select></label>
    <label>Phone or location<input value={detail} maxLength={60} placeholder="Optional, e.g. (555) 010-2030 · Arizona" onChange={e=>setDetail(e.target.value)}/></label>
    <FormActions onCancel={onCancel} submitLabel={submitLabel}/>
  </form>;
}

// autoSave: write every change straight to the profile (setup wizard); otherwise save on submit (Settings).
function LocationForm({autoSave=false,onSaved,submitLabel="Save location"}:{autoSave?:boolean;onSaved?:()=>void;submitLabel?:string}) {
  const { profile, update } = useHousehold();
  const [county,setCounty]=useState(profile.location.county);
  const [city,setCity]=useState(profile.location.city);
  useEffect(()=>{setCounty(profile.location.county);setCity(profile.location.city)},[profile.location.county,profile.location.city]);
  const save=(next:{county:string;city:string})=>update(p=>({...p,location:{county:next.county,city:tidy(next.city)}}));
  const dirty=county!==profile.location.county||tidy(city)!==profile.location.city;
  return <form className="hh-form" onSubmit={e=>{e.preventDefault();save({county,city});onSaved?.()}}>
    <label>County<select value={county} required onChange={e=>{setCounty(e.target.value);if(autoSave)save({county:e.target.value,city})}}><option value="">Choose your county</option>{CA_COUNTIES.map(c=><option key={c} value={c}>{c} County</option>)}</select></label>
    <label>City or community<input value={city} maxLength={60} placeholder="Optional, e.g. Paradise" onChange={e=>{setCity(e.target.value);if(autoSave)save({county,city:e.target.value})}}/></label>
    {!autoSave&&<FormActions submitLabel={dirty||!profile.location.county?submitLabel:"Saved"}/>}
  </form>;
}

function RemoveButton({label,onClick}:{label:string;onClick:()=>void}) {
  return <button type="button" className="hh-remove" aria-label={label} title={label} onClick={onClick}><Icon name="close" size={14}/></button>;
}

function EmptyState({icon,title,copy}:{icon:IconName;title:string;copy:string}) {
  return <div className="hh-empty"><Icon name={icon} size={22}/><div><b>{title}</b><span>{copy}</span></div></div>;
}

// ---- household pages --------------------------------------------------------

function HouseholdOverview() {
  const { profile } = useHousehold();
  const a = analyzeHousehold(profile);
  const [simulation,setSimulation]=useState(false);
  const readiness=[["People",a.people,"users"],["Pets",a.pets,"pet"],["Transportation",a.transportation,"car"],["Communication",a.communication,"phone"],["Resources",a.resources,"box"]] as [string,number,IconName][];
  const ranked=[...readiness,["Evacuation",a.evacuation,"route"] as [string,number,IconName]].sort((x,y)=>y[1]-x[1]);
  const [strongest,weakest]=[ranked[0],ranked[ranked.length-1]];
  // Radar vertices (outer ring) in label order: people, pets, transport, resources, communication, evacuation.
  const axes:[number,number,number][]=[[110,18,a.people],[190,60,a.pets],[190,138,a.transportation],[110,178,a.resources],[30,138,a.communication],[30,60,a.evacuation]];
  const radar=axes.map(([x,y,v])=>{const r=Math.max(v,4)/100;return `${Math.round(110+(x-110)*r)},${Math.round(98+(y-98)*r)}`}).join(" ");
  const success=Math.round(ranked.reduce((s,[,v])=>s+v,0)/ranked.length);
  const tone=(v:number)=>v>=80?"green":"orange";
  const checks:[string,string,string][]=[
    ["People readiness",a.people===100?"Ready":`${a.people}%`,tone(a.people)],
    ...(profile.pets.length?[["Pet readiness",a.pets===100?"Ready":`${a.pets}%`,tone(a.pets)] as [string,string,string]]:[]),
    ["Communication reliability",a.communication===100?"Ready":"Needs backup",tone(a.communication)],
    ["Vehicle availability",profile.vehicles.length===0?"No vehicle":a.seats>=a.seatsNeeded?"Ready":"Capacity risk",profile.vehicles.length&&a.seats>=a.seatsNeeded?"green":"orange"],
    ["Resource coverage",`${a.resources}%`,tone(a.resources)],
  ];
  return <div className="household-overview">
    <div className="household-scoreboard">{readiness.map(([label,value,icon])=><article key={label}><span><Icon name={icon}/></span><div><small>{label.toUpperCase()}</small><b>{value}%</b></div><div className="progress"><i style={{width:`${value}%`}}/></div></article>)}</div>
    <div className="twin-grid">
      <section className="twin-radar"><div><span className="kicker">DYNAMIC HOUSEHOLD MODEL</span><h3>Readiness balance</h3><p>{strongest[0]} is your strongest area ({strongest[1]}%). {weakest[1]<100?`${weakest[0]} creates the most exposure (${weakest[1]}%).`:"Every area is fully covered."}</p></div><div className="household-radar"><svg viewBox="0 0 220 190"><g className="radar-grid"><polygon points="110,18 190,60 190,138 110,178 30,138 30,60"/><polygon points="110,46 163,74 163,124 110,150 57,124 57,74"/><line x1="110" y1="18" x2="110" y2="98"/><line x1="190" y1="60" x2="110" y2="98"/><line x1="190" y1="138" x2="110" y2="98"/><line x1="110" y1="178" x2="110" y2="98"/><line x1="30" y1="138" x2="110" y2="98"/><line x1="30" y1="60" x2="110" y2="98"/></g><polygon className="radar-value" points={radar}/></svg><span className="radar-l r-people">People</span><span className="radar-l r-pets">Pets</span><span className="radar-l r-transport">Transport</span><span className="radar-l r-resources">Supplies</span><span className="radar-l r-communication">Communication</span><span className="radar-l r-evacuation">Evacuation</span></div></section>
      <aside className="command-insights"><span className="kicker">READINESS INSIGHTS</span><h3>{a.gaps.length?`${Math.min(a.gaps.length,3)} ways to strengthen your household`:"Your household plan is complete"}</h3>{a.gaps.slice(0,3).map((gap,i)=><article key={gap.title}><span className={`insight-rank rank-${i}`}>{i+1}</span><div><b>{gap.title}</b><p>{gap.copy}</p></div><strong>{gap.points?`+${gap.points} pts`:"Setup"}</strong></article>)}</aside>
    </div>
    <section className={`evac-simulation ${simulation?"has-result":""}`}><div className="simulation-copy"><span className="simulation-icon"><Icon name="route"/></span><div><span className="kicker">HOUSEHOLD IMPACT SIMULATION</span><h3>How prepared are we if evacuation happens right now?</h3><p>Test your current people, pet, communication, vehicle, and supply readiness together.</p></div></div><Button onClick={()=>setSimulation(!simulation)}>{simulation?"Close results":"Run Evacuation Simulation"} <Icon name="arrow"/></Button>
      {simulation&&<div className="simulation-result"><div className="success-gauge"><strong>{success}%</strong><span>estimated evacuation readiness</span></div><div className="simulation-checks">{checks.map(([label,value,t])=><div key={label}><span className={`sim-dot ${t}`}/><b>{label}</b><strong>{value}</strong></div>)}</div><div className="simulation-verdict"><Icon name="spark"/><p><b>Primary constraint: {weakest[0].toLowerCase()}.</b> {a.gaps[0]?`${a.gaps[0].title}: ${a.gaps[0].copy}`:"No gaps found. Keep checking supplies every six months."}</p></div></div>}
    </section>
  </div>;
}

function PeopleModule() {
  const user = useCurrentUser();
  const { profile, update } = useHousehold();
  const owner:Member={id:OWNER_ID,name:user.firstName,...profile.owner};
  const members=[owner,...profile.members];
  const nameOf=(id:string)=>members.find(member=>member.id===id)?.name??"Removed member";
  const [draggedRole,setDraggedRole]=useState("");
  const [editing,setEditing]=useState<string|null>(null); // member id, or "new"
  const assign=(role:string,memberId:string)=>update(p=>({...p,roles:{...p.roles,[role]:memberId}}));
  const unassign=(role:string)=>update(p=>{const roles={...p.roles};delete roles[role];return {...p,roles}});
  const saveMember=(m:Member)=>update(p=>m.id===OWNER_ID
    ?{...p,owner:{type:m.type,age:m.age,supportNeeds:m.supportNeeds,planReady:m.planReady}}
    :p.members.some(x=>x.id===m.id)?{...p,members:p.members.map(x=>x.id===m.id?m:x)}:{...p,members:[...p.members,m]});
  const removeMember=(id:string)=>update(p=>({...p,members:p.members.filter(m=>m.id!==id),roles:Object.fromEntries(Object.entries(p.roles).filter(([,v])=>v!==id))}));
  const assignedCount=ROLES.filter(role=>profile.roles[role]).length;
  return <div className="people-module">
    <div className="module-toolbar"><div><span className="kicker">HOUSEHOLD MAP</span><h3>{plural(members.length,"person")} in this preparedness plan</h3><p>Each person has a role, support needs, and a confirmed go-bag and plan.</p></div><Button onClick={()=>setEditing("new")} disabled={editing==="new"}>Add Person</Button></div>
    <div className="person-grid">{members.map(member=>{
      const isOwner=member.id===OWNER_ID;
      if(editing===member.id)return <article className="person-card editing" key={member.id}><h4>Edit {isOwner?"your details":member.name}</h4><MemberForm initial={member} isOwner={isOwner} onSave={m=>{saveMember(m);setEditing(null)}} onCancel={()=>setEditing(null)}/></article>;
      const status=member.planReady?"READY":member.supportNeeds?"NEEDS SUPPORT":"PLAN NEEDED";
      return <article className="person-card" key={member.id} onDragOver={event=>event.preventDefault()} onDrop={()=>{if(draggedRole)assign(draggedRole,member.id);setDraggedRole("")}}>
        <div className={`person-avatar avatar-${member.planReady?"green":member.supportNeeds?"orange":"blue"}`}>{isOwner?user.initials:initials(member.name)}</div>
        <div className="person-title"><div><h4>{member.name}{isOwner&&<small className="you-tag">You</small>}</h4><span>{memberLabel(member)}</span></div><Badge tone={member.planReady?"green":"orange"}>{status}</Badge></div>
        <div className="person-need"><Icon name={member.supportNeeds?"help":"shield"} size={15}/><span>{member.supportNeeds||"No support needs noted"}</span></div>
        <div className="person-actions"><button onClick={()=>saveMember({...member,planReady:!member.planReady})}>{member.planReady?"✓ Go-bag & plan ready":"Mark go-bag & plan ready"}</button><button onClick={()=>setEditing(member.id)}>Edit profile</button>{!isOwner&&<button className="danger-link" onClick={()=>removeMember(member.id)}>Remove</button>}</div>
      </article>;
    })}
    {editing==="new"&&<article className="person-card editing"><h4>Add a household member</h4><MemberForm submitLabel="Add person" onSave={m=>{saveMember(m);setEditing(null)}} onCancel={()=>setEditing(null)}/></article>}</div>
    <section className="role-board"><div className="role-board-head"><div><span className="kicker">EMERGENCY RESPONSIBILITIES</span><h3>Role coverage</h3><p>Drag a responsibility onto a household member card, or select an unassigned role to assign it to {owner.name}. Select an assigned role to clear it.</p></div><div className="coverage-score"><b>{assignedCount}/{ROLES.length}</b><span>complete</span></div></div><div className="role-list">{ROLES.map(role=>{
      const assigned=profile.roles[role];
      return <button draggable onDragStart={()=>setDraggedRole(role)} onClick={()=>assigned?unassign(role):assign(role,OWNER_ID)} className={assigned?"assigned":""} key={role}><span className="drag-handle">••</span><div><b>{role}</b><small>{assigned?`Assigned to ${nameOf(assigned)}`:"Unassigned · drag to a person"}</small></div>{assigned?<Icon name="check"/>:<Icon name="chevron"/>}</button>;
    })}</div></section>
  </div>;
}

function PetsModule() {
  const { profile, update } = useHousehold();
  const a = analyzeHousehold(profile);
  const [simulation,setSimulation]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const savePet=(pet:Pet)=>update(p=>({...p,pets:p.pets.some(x=>x.id===pet.id)?p.pets.map(x=>x.id===pet.id?pet:x):[...p.pets,pet]}));
  const removePet=(id:string)=>update(p=>({...p,pets:p.pets.filter(x=>x.id!==id)}));
  const toggle=(pet:Pet,check:keyof Pet["checks"])=>savePet({...pet,checks:{...pet.checks,[check]:!pet.checks[check]}});
  const allCarriers=profile.pets.every(pet=>pet.checks.carrier), allKits=profile.pets.every(pet=>pet.checks.supplyKit);
  const sim:[string,boolean][]=[["Family members",a.people===100],["Household supplies",a.resources>=75],["Pet supplies",allKits],["Pet transportation",allCarriers]];
  const blocker=sim.find(([,ok])=>!ok);
  return <div className="pets-module"><div className="module-toolbar"><div><span className="kicker">PET EVACUATION PROFILES</span><h3>Every pet needs a way out</h3><p>Track transportation, medical records, supplies, and a verified emergency contact for each animal.</p></div><Button variant="secondary" onClick={()=>setEditing("new")} disabled={editing==="new"}>Add Pet</Button></div>
    {profile.pets.length===0&&editing!=="new"&&<EmptyState icon="pet" title="No pets added" copy="Add your pets so ReadyCA can plan carriers, supplies, and vehicle space for them."/>}
    <div className="pet-grid">{profile.pets.map(pet=>{
      if(editing===pet.id)return <article className="pet-card editing" key={pet.id}><h4>Edit {pet.name}</h4><PetForm initial={pet} onSave={p=>{savePet(p);setEditing(null)}} onCancel={()=>setEditing(null)}/></article>;
      const score=petScore(pet);
      return <article className="pet-card" key={pet.id}><RemoveButton label={`Remove ${pet.name}`} onClick={()=>removePet(pet.id)}/><div className={`pet-portrait ${pet.species==="Cat"?"pet-cat":"pet-dog"}`}><Icon name="pet" size={32}/></div><div className="pet-card-head"><div><h4>{pet.name}</h4><span>{pet.species}{pet.age!=null?` · ${plural(pet.age,"year")}`:""}</span></div><strong>{score}%</strong></div><div className="progress"><i style={{width:`${score}%`}}/></div>
        <div className="pet-checks">{PET_CHECKS.map(([key,label])=><button className="pet-check" key={key} onClick={()=>toggle(pet,key)} aria-pressed={pet.checks[key]}><span className={pet.checks[key]?"done":"missing"}><Icon name={pet.checks[key]?"check":"close"} size={13}/> {label}</span></button>)}</div>
        <Button variant="secondary" onClick={()=>setEditing(pet.id)}>Edit profile</Button></article>;
    })}
    {editing==="new"&&<article className="pet-card editing"><h4>Add a pet</h4><PetForm submitLabel="Add pet" onSave={p=>{savePet(p);setEditing(null)}} onCancel={()=>setEditing(null)}/></article>}</div>
    {profile.pets.length>0&&<section className="pet-simulator"><div><span className="kicker">PET EVACUATION SIMULATOR</span><h3>What happens if evacuation occurs today?</h3></div><Button onClick={()=>setSimulation(!simulation)}>{simulation?"Reset simulation":"Run readiness check"} <Icon name="arrow"/></Button>{simulation&&<div className="pet-sim-result">{sim.map(([label,ready])=><div className={ready?"ready":"blocked"} key={label}><Icon name={ready?"check":"close"}/><span>{label}</span><b>{ready?"Ready":"Not ready"}</b></div>)}<p><Icon name={blocker?"help":"check"}/><span>{blocker?<><b>Evacuation readiness is limited by {blocker[0].toLowerCase()}.</b> {a.gaps.find(g=>g.title.includes("evacuation profile")||g.title.includes("plan"))?.copy??"Resolve this before the next high-risk day."}</>:<b>Your pets are ready to evacuate.</b>}</span></p></div>}</section>}
  </div>;
}

function TransportationModule() {
  const { profile, update } = useHousehold();
  const [primaryUnavailable,setPrimaryUnavailable]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const a=analyzeHousehold(profile);
  const backupOnly=analyzeHousehold({...profile,vehicles:profile.vehicles.slice(1)});
  const unavailable=primaryUnavailable&&profile.vehicles.length>0;
  const capacity=unavailable?a.seatsWithoutPrimary:a.seats;
  const score=unavailable?backupOnly.transportation:a.transportation;
  const saveVehicle=(v:Vehicle)=>update(p=>({...p,vehicles:p.vehicles.some(x=>x.id===v.id)?p.vehicles.map(x=>x.id===v.id?v:x):[...p.vehicles,v]}));
  const removeVehicle=(id:string)=>update(p=>({...p,vehicles:p.vehicles.filter(x=>x.id!==id)}));
  const makePrimary=(id:string)=>update(p=>({...p,vehicles:[...p.vehicles.filter(x=>x.id===id),...p.vehicles.filter(x=>x.id!==id)]}));
  const summary=profile.vehicles.length===0?"Add the vehicles your household would use to evacuate.":unavailable?(capacity>=a.seatsNeeded?"Your backup vehicles can still carry everyone.":"Without the primary vehicle, not everyone has a seat."):(capacity>=a.seatsNeeded?`Your vehicles have enough seats for everyone (${a.seatsNeeded} people and pets).`:"Your vehicles don't have enough seats for everyone.");
  return <div className="transport-module"><div className="vehicle-summary"><div><span className="kicker">VEHICLE READINESS</span><b>{score}%</b><p>{summary}</p></div><div className="capacity-visual"><span>CAPACITY REQUIRED</span><div><b>{a.seatsNeeded}</b><i>/</i><strong>{capacity}</strong><small>people + pets / seats</small></div><Badge tone={capacity>=a.seatsNeeded?"green":"orange"}>{capacity>=a.seatsNeeded?"CAPACITY SUFFICIENT":"CAPACITY RISK"}</Badge></div></div>
    <div className="module-toolbar"><div><span className="kicker">YOUR VEHICLES</span><h3>{plural(profile.vehicles.length,"vehicle")}</h3><p>The first vehicle is your primary evacuation vehicle. Keep fuel or charge above half during fire season.</p></div><Button variant="secondary" onClick={()=>setEditing("new")} disabled={editing==="new"}>Add Vehicle</Button></div>
    {profile.vehicles.length===0&&editing!=="new"&&<EmptyState icon="car" title="No vehicles added" copy="Add a vehicle so ReadyCA can check seating and fuel for your evacuation."/>}
    <div className="vehicle-grid">{profile.vehicles.map((v,i)=>{
      if(editing===v.id)return <article className="vehicle-card editing" key={v.id}><h4>Edit {v.name}</h4><VehicleForm initial={v} onSave={x=>{saveVehicle(x);setEditing(null)}} onCancel={()=>setEditing(null)}/></article>;
      const off=unavailable&&i===0, low=v.level<50;
      const levelLabel=v.power==="Electric"?"BATTERY LEVEL":v.power==="Hybrid"?"FUEL / CHARGE":"FUEL LEVEL";
      return <article className={`vehicle-card ${off?"unavailable":low?"warning":""}`} key={v.id}><RemoveButton label={`Remove ${v.name}`} onClick={()=>removeVehicle(v.id)}/><div className="vehicle-art"><Icon name="car" size={34}/><Badge tone={off?"gray":low?"orange":"green"}>{off?"UNAVAILABLE":low?(v.power==="Electric"?"CHARGE RECOMMENDED":"REFUEL RECOMMENDED"):"EVACUATION READY"}</Badge></div><h4>{v.name}</h4><span>{i===0?"Primary":"Backup"} vehicle · {plural(v.seats,"seat")} · {v.power}</span>
        <div className="energy-row"><div><span>{levelLabel}</span><b>{off?"—":`${v.level}%`}</b></div><input className="level-input" type="range" min={0} max={100} step={5} value={v.level} aria-label={`${v.name} ${levelLabel.toLowerCase()}`} onChange={e=>saveVehicle({...v,level:Number(e.target.value)})}/></div>
        <div className="person-actions">{i>0&&<button onClick={()=>makePrimary(v.id)}>Make primary</button>}<button onClick={()=>setEditing(v.id)}>Edit vehicle</button></div></article>;
    })}
    {editing==="new"&&<article className="vehicle-card editing"><h4>Add a vehicle</h4><VehicleForm submitLabel="Add vehicle" onSave={x=>{saveVehicle(x);setEditing(null)}} onCancel={()=>setEditing(null)}/></article>}</div>
    {profile.vehicles.length>0&&<section className="what-if"><div><span className="kicker">WHAT-IF SIMULATION</span><h3>What if the primary vehicle is unavailable?</h3><p>ReadyCA recalculates capacity and household readiness using only your backup vehicles.</p></div><button className={`simulation-toggle ${primaryUnavailable?"on":""}`} onClick={()=>setPrimaryUnavailable(!primaryUnavailable)}><i/><span>{primaryUnavailable?"Primary unavailable":"Primary available"}</span></button>{unavailable&&<div className="recalculation"><span><b>{plural(a.seatsWithoutPrimary,"seat")}</b> available capacity</span><span><b>{backupOnly.transportation-a.transportation} pts</b> vehicle readiness</span><strong>{a.seatsWithoutPrimary>=a.seatsNeeded?"Backup vehicles can carry everyone":"Not enough seats without the primary vehicle"}</strong></div>}</section>}
  </div>;
}

// Communication tree slots: one node per contact type, positioned by the existing node-a..d styles.
const CONTACT_SLOTS:[ContactKind,string,string,boolean][]=[["Emergency contact","node-a","EC",true],["Out-of-area contact","node-b","OA",true],["School / childcare","node-c","CH",false],["Neighbor","node-d","NB",false]];

function CommunicationModule() {
  const user = useCurrentUser();
  const { profile, update } = useHousehold();
  const a=analyzeHousehold(profile);
  const [stress,setStress]=useState(false);
  const [adding,setAdding]=useState<ContactKind|null>(null);
  const [meetingPoint,setMeetingPoint]=useState(profile.meetingPoint);
  useEffect(()=>setMeetingPoint(profile.meetingPoint),[profile.meetingPoint]);
  const addContact=(c:Contact)=>{update(p=>({...p,contacts:[...p.contacts,c]}));setAdding(null)};
  const removeContact=(id:string)=>update(p=>({...p,contacts:p.contacts.filter(c=>c.id!==id)}));
  const hasOutOfArea=profile.contacts.some(c=>c.kind==="Out-of-area contact");
  return <div className="communication-module"><div className="comm-summary"><div><span className="kicker">COMMUNICATION READINESS</span><b>{a.communication}%</b><p>{stress?"Cell service outage simulated. Text, messaging, and radio backups remain available.":a.communication===100?"Your contact network and meeting point are complete.":"Your contact network has gaps. Complete the items below to make sure everyone can reconnect."}</p></div><div className="comm-checklist">{a.commChecks.map(([label,ready])=><span className={ready?"ready":"missing"} key={label}><Icon name={ready?"check":"close"} size={13}/>{label}</span>)}</div></div>
    <section className="network-builder"><div className="network-head"><div><span className="kicker">COMMUNICATION TREE</span><h3>Your emergency contact network</h3></div><Button variant="secondary" onClick={()=>setAdding("Emergency contact")}>Add Contact</Button></div><div className="network-canvas"><div className="network-lines"/><div className="network-node root-node"><span>{user.initials}</span><b>{user.firstName}</b><small>Plan owner</small></div>
      {CONTACT_SLOTS.map(([kind,slot,abbr,recommended])=>{
        const matches=profile.contacts.filter(c=>c.kind===kind);
        const first=matches[0];
        if(!first)return <button className={`network-node ${slot} node-missing`} key={kind} onClick={()=>setAdding(kind)}><span>+</span><b>Add {kind.toLowerCase()}</b><small>{recommended?"Recommended":"Optional"}</small></button>;
        return <div className={`network-node ${slot}`} key={kind}><span>{abbr}</span><b>{kind}</b><small>{first.name}{first.detail?` · ${first.detail}`:""}{matches.length>1?` +${matches.length-1}`:""}</small></div>;
      })}</div>
      {adding&&<div className="hh-inline"><h4>Add a contact</h4><ContactForm key={adding} kind={adding} submitLabel="Add contact" onSave={addContact} onCancel={()=>setAdding(null)}/></div>}
      {profile.contacts.length>0&&<ul className="hh-list">{profile.contacts.map(c=><li key={c.id}><span className="hh-list-initials">{initials(c.name)}</span><div><b>{c.name}</b><small>{c.kind}{c.detail?` · ${c.detail}`:""}</small></div><RemoveButton label={`Remove ${c.name}`} onClick={()=>removeContact(c.id)}/></li>)}</ul>}
      <form className="hh-form hh-meeting" onSubmit={e=>{e.preventDefault();update(p=>({...p,meetingPoint:tidy(meetingPoint)}))}}><label className="hh-wide">Emergency meeting point<input value={meetingPoint} maxLength={80} placeholder="e.g. Library parking lot on Main St" onChange={e=>setMeetingPoint(e.target.value)}/></label><FormActions submitLabel={profile.meetingPoint&&tidy(meetingPoint)===profile.meetingPoint?"Saved":"Save meeting point"}/></form>
    </section>
    {!hasOutOfArea&&<div className="comm-gap"><span><Icon name="help"/></span><div><b>No out-of-area emergency contact</b><p>Local networks may be congested or unavailable during a regional emergency.</p></div><strong>+4 pts</strong><Button onClick={()=>setAdding("Out-of-area contact")}>Quick fix</Button></div>}
    <section className="stress-test"><div><span className="kicker">COMMUNICATION STRESS TEST</span><h3>Cell service unavailable</h3><p>See which contact methods remain reliable when normal voice service fails.</p></div><button className={`simulation-toggle ${stress?"on":""}`} onClick={()=>setStress(!stress)}><i/><span>{stress?"Outage active":"Run stress test"}</span></button>{stress&&<div className="method-results">{[["Text message",true],["WhatsApp",true],["Emergency radio",true],["Voice call",false]].map(([method,works])=><span className={works?"works":"fails"} key={method as string}><Icon name={works?"check":"close"}/><b>{method as string}</b><small>{works?"Available":"Unavailable"}</small></span>)}</div>}</section>
  </div>;
}

function SaveStatus({onSignIn}:{onSignIn:()=>void}) {
  const { saveState, saveError } = useHousehold();
  if(saveState==="local")return <div className="save-status local"><Icon name="help" size={15}/><span>You're exploring a sample household. Changes aren't saved.</span><Button variant="secondary" onClick={onSignIn}>Sign in to save</Button></div>;
  if(saveState==="error")return <div className="save-status error" role="alert"><Icon name="close" size={15}/><span>{saveError?.startsWith("Couldn't")?saveError:`Couldn't save your household${saveError?` (${saveError})`:""}. Your latest changes may be lost.`}</span></div>;
  return <div className={`save-status ${saveState}`} aria-live="polite"><Icon name={saveState==="saving"?"clock":"check"} size={15}/><span>{saveState==="saving"?"Saving…":"All changes saved to your account"}</span></div>;
}

function formatDay(iso:string){return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}

function Household({onSignIn}:{onSignIn:()=>void}) {
  const { profile, update } = useHousehold();
  const a=analyzeHousehold(profile);
  const [section,setSection]=useState("Overview");
  const [expandedCategory,setExpandedCategory]=useState("Safety Equipment");
  const [editingItem,setEditingItem]=useState<string|null>(null);
  const groups:Record<string,[string,IconName]>={
    Overview:["Command center","grid"], People:["People","users"], Pets:["Pets","pet"],
    Transportation:["Transportation","car"], Communication:["Communication","phone"], Resources:["Household resources","box"],
  };
  const statusOf=(name:string)=>profile.resources[name]?.status??"missing";
  const setResource=(name:string,change:Partial<HouseholdProfile["resources"][string]>)=>update(p=>({...p,resources:{...p.resources,[name]:{...p.resources[name],...change,updatedAt:new Date().toLocaleDateString("en-CA")}}})); // local YYYY-MM-DD, not UTC
  const completion=a.resources;
  const resourceScore=Math.round(a.resources/100*25);
  const gaps=ALL_RESOURCES.filter(item=>statusOf(item.name)!=="ready");
  return <div><PageTitle kicker="PERSONALIZATION" title="Tell us about your household" copy="Your household profile helps ReadyCA personalize evacuation recommendations and identify preparedness gaps."/>
    <div className="profile-progress card"><div><b>Your household profile is {a.completeness}% complete</b><span>{a.missingDetails?`Complete ${plural(a.missingDetails,"more detail")} to improve your recommendations.`:"Every detail is in place. Review it whenever your household changes."}</span></div><div className="progress"><i style={{width:`${a.completeness}%`}}/></div></div>
    <div className="profile-layout"><aside className="profile-nav">{Object.entries(groups).map(([key,[label,icon]])=><button className={section===key?"active":""} onClick={()=>setSection(key)} key={key}><Icon name={icon}/><span>{label}</span><Icon name="chevron" size={14}/></button>)}</aside>
    <section className={`card form-card ${section==="Resources"?"resource-inventory-card":""} ${section!=="Resources"?"household-module-card":""}`}><div className="card-heading"><div><Badge tone="blue">{section==="Resources"?"READINESS INVENTORY":section==="Overview"?"DIGITAL HOUSEHOLD TWIN":"INTERACTIVE HOUSEHOLD MODEL"}</Badge><h2>{groups[section][0]}</h2><p>{section==="Resources"?"Track what is ready, what needs attention, and where critical supplies are stored.":section==="Overview"?"A live model of the people, pets, vehicles, communication systems, and resources your household depends on.":"Update readiness visually and see how each change affects your evacuation plan."}</p></div><Icon name={groups[section][1]} size={28}/></div>
      {section==="Resources"?<div className="resource-inventory">
        <div className="inventory-summary">
          <div className="inventory-completion"><div className="inventory-ring" style={{"--inventory-progress":`${completion*3.6}deg`} as React.CSSProperties}><strong>{completion}%</strong><span>complete</span></div><div><span className="kicker">HOUSEHOLD RESOURCE READINESS</span><h3>{completion>=90?"Your essential supplies are ready":completion>=60?"Your essential supplies are nearly ready":"Start building your emergency supplies"}</h3><p>{a.resourceReady} of {a.resourceTotal} tracked resources are ready. Review the priority gaps below to strengthen your plan.</p></div></div>
          <div className="resource-score"><span>RESOURCE READINESS</span><div><b>{resourceScore}</b><small>/ 25</small></div><p>Contributes directly to your overall readiness score.</p><button onClick={()=>setExpandedCategory("Emergency Supplies")}>View score contribution <Icon name="arrow" size={14}/></button></div>
        </div>

        <div className="inventory-toolbar"><div><span className="kicker">INVENTORY BY CATEGORY</span><h3>Preparedness inventory</h3></div><div className="inventory-legend"><span><i className="ready"/>Ready</span><span><i className="attention"/>Needs attention</span><span><i className="missing"/>Missing</span></div></div>
        <div className="inventory-categories">{RESOURCE_CATALOG.map(category=>{
          const open=expandedCategory===category.name;
          const categoryReady=category.items.filter(item=>statusOf(item.name)==="ready").length;
          return <section className={`inventory-category ${open?"open":""}`} key={category.name}>
            <button className="inventory-category-head" onClick={()=>setExpandedCategory(open?"":category.name)}>
              <span className="category-icon"><Icon name={category.icon}/></span><span><b>{category.name}</b><small>{categoryReady} of {category.items.length} ready</small></span><div className="mini-completion"><i style={{width:`${categoryReady/category.items.length*100}%`}}/></div><Icon name="chevron" size={16}/>
            </button>
            {open&&<div className="inventory-items">{category.items.map(item=>{
              const state=profile.resources[item.name];
              const status=state?.status??"missing";
              if(editingItem===item.name)return <ResourceEditor key={item.name} name={item.name} state={state} onSave={change=>{setResource(item.name,change);setEditingItem(null)}} onCancel={()=>setEditingItem(null)}/>;
              return <article className={`inventory-item status-${status}`} key={item.name}>
                <span className="inventory-status">{status==="ready"?<Icon name="check" size={14}/>:status==="attention"?<Icon name="clock" size={14}/>:<Icon name="close" size={14}/>}</span>
                <div className="inventory-item-main"><div><b>{item.name}</b><span className={`status-label ${status}`}>{status==="ready"?"Ready":status==="attention"?"Needs attention":"Missing"}</span></div><p><Icon name="pin" size={13}/>{state?.location||(status==="missing"?"Not in inventory":"Storage location not set")}</p><small><Icon name="clock" size={12}/>{state?.updatedAt?`Updated ${formatDay(state.updatedAt)}`:item.why}</small></div>
                <div className="inventory-quantity"><span>QUANTITY</span><b>{status==="missing"||!state?.quantity?"—":state.quantity}</b></div>
                {status==="ready"?<button className="inventory-more" onClick={()=>setEditingItem(item.name)}>Update</button>:<button className="inventory-fix" onClick={()=>setResource(item.name,{status:"ready"})}>Mark ready</button>}
              </article>;
            })}</div>}
          </section>;
        })}</div>

        <section className="gap-analysis"><div className="gap-heading"><div><span className="kicker">AUTOMATED GAP ANALYSIS</span><h3>{plural(gaps.length,"resource gap")} need{gaps.length===1?"s":""} your attention</h3><p>Prioritized by readiness impact for your household.</p></div><span className="ai-grounded"><Icon name="spark" size={15}/> Profile-informed</span></div>
          <div className="gap-grid">{[...gaps].sort((x,y)=>y.impact-x.impact).slice(0,3).map(item=><article className={`gap-card ${statusOf(item.name)}`} key={item.name}><div><span className="gap-icon"><Icon name={statusOf(item.name)==="attention"?"clock":"box"}/></span><Badge tone="orange">{statusOf(item.name)==="attention"?"CHECK QUANTITY":"MISSING ITEM"}</Badge></div><h4>{item.name}</h4><p>{item.why}</p><div className="gap-impact"><span>Readiness impact</span><b>+{item.impact} pts</b></div><Button variant="secondary" onClick={()=>setResource(item.name,{status:"ready"})}>{statusOf(item.name)==="attention"?"Update supply":"Add to inventory"} <Icon name="arrow" size={14}/></Button></article>)}</div>
          {gaps.length===0&&<div className="all-ready"><Icon name="check"/><div><b>Your tracked resources are ready</b><span>Continue checking expiration dates and inspecting supplies every six months.</span></div></div>}
        </section>
      </div>:section==="Overview"?<HouseholdOverview/>:section==="People"?<PeopleModule/>:section==="Pets"?<PetsModule/>:section==="Transportation"?<TransportationModule/>:<CommunicationModule/>}
      {section==="Resources"&&<div className="insight"><Icon name="spark"/><div><b>Inventory insights improve your plan</b><span>ReadyCA uses your resource status to surface missing supplies, expiration risks, and score opportunities.</span></div></div>}
      <SaveStatus onSignIn={onSignIn}/>
    </section></div>
  </div>;
}

function ResourceEditor({name,state,onSave,onCancel}:{name:string;state?:HouseholdProfile["resources"][string];onSave:(change:{status:ResourceStatus;quantity:string;location:string})=>void;onCancel:()=>void}) {
  const [status,setStatus]=useState<ResourceStatus>(state?.status??"ready");
  const [quantity,setQuantity]=useState(state?.quantity??"");
  const [location,setLocation]=useState(state?.location??"");
  return <article className="inventory-item editing"><form className="hh-form" onSubmit={e=>{e.preventDefault();onSave({status,quantity:tidy(quantity),location:tidy(location)})}}>
    <label className="hh-wide"><b>{name}</b></label>
    <label>Status<select value={status} onChange={e=>setStatus(e.target.value as ResourceStatus)}><option value="ready">Ready</option><option value="attention">Needs attention</option><option value="missing">Missing</option></select></label>
    <label>Quantity<input value={quantity} maxLength={20} placeholder="e.g. 6 gal" onChange={e=>setQuantity(e.target.value)}/></label>
    <label>Stored at<input value={location} maxLength={60} placeholder="e.g. Garage shelf" onChange={e=>setLocation(e.target.value)}/></label>
    <FormActions onCancel={onCancel} submitLabel="Save"/>
  </form></article>;
}

// ---- Readiness Advisor: a guided chat over a curated question bank (lib/advisor.ts) ----

type ChatMessage = { id: number; role: "user" | "ai"; text?: string; questionId?: string; answer?: AdvisorAnswer; fallback?: boolean };
const FALLBACK_SUGGESTIONS = ["first", "missing", "score-calc"];

function AdvisorReply({message,asked,onAsk,county}:{message:ChatMessage;asked:Set<string>;onAsk:(id:string)=>void;county:string}) {
  const q = message.questionId ? QUESTION_BY_ID[message.questionId] : null;
  // After an unmatched question, always offer something: unasked questions first, then the defaults.
  const pool = q ? q.related : [...FALLBACK_SUGGESTIONS, ...ADVISOR_QUESTIONS.map(x => x.id)];
  const unasked = [...new Set(pool)].filter(id => !asked.has(id));
  const followUps = (q || unasked.length ? unasked : FALLBACK_SUGGESTIONS).slice(0, 3);
  return <div className="message ai-message">
    {message.fallback
      ? <p>I don't have an answer for that yet. I can help with common questions about ReadyCA and your household plan, like these:</p>
      : message.answer && <>{message.answer.paragraphs.map(p => <p key={p}>{p}</p>)}{message.answer.list && <ul>{message.answer.list.map(item => <li key={item}>{item}</li>)}</ul>}{message.answer.after?.map(p => <p key={p}>{p}</p>)}</>}
    {q && <div className="citation"><Icon name="shield" size={14}/> {q.category === "Your plan" ? `Personalized from your household profile · CAL FIRE, Ready.gov${county ? `, ${county} OES` : ""}` : "ReadyCA preparedness guide"}</div>}
    {followUps.length > 0 && <div className="follow-ups">{!message.fallback && <span>Related questions</span>}{followUps.map(id => <button key={id} onClick={() => onAsk(id)}>{QUESTION_BY_ID[id].question}</button>)}</div>}
  </div>;
}

function Advisor({score}:{score:number}) {
  const user = useCurrentUser();
  const { profile } = useHousehold();
  const [messages,setMessages]=useState<ChatMessage[]>([]);
  const [typing,setTyping]=useState(false);
  const [draft,setDraft]=useState("");
  const [category,setCategory]=useState<AdvisorQuestion["category"]>("Your plan");
  const nextId=useRef(1);
  const replyTimer=useRef<number|undefined>(undefined);
  const log=useRef<HTMLDivElement>(null);
  const asked=new Set(messages.filter(m=>m.role==="ai"&&m.questionId).map(m=>m.questionId!));
  const county=countyLabel(profile);

  useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight,behavior:"smooth"})},[messages,typing]);
  useEffect(()=>()=>window.clearTimeout(replyTimer.current),[]);

  const send=(userText:string,question:AdvisorQuestion|null)=>{
    if(typing||!userText.trim())return;
    const id=nextId.current; nextId.current+=2;
    setMessages(m=>[...m,{id,role:"user",text:userText.trim()}]);
    setTyping(true);
    // Answer from the profile as it is when the question is asked, after a short "typing" pause.
    const ctx={profile,score,firstName:user.firstName,signedIn:user.signedIn};
    replyTimer.current=window.setTimeout(()=>{
      setTyping(false);
      setMessages(m=>[...m,question?{id:id+1,role:"ai",questionId:question.id,answer:question.answer(ctx)}:{id:id+1,role:"ai",fallback:true}]);
    },650);
  };
  const ask=(questionId:string)=>{const q=QUESTION_BY_ID[questionId];send(q.question,q)};
  const submit=()=>{send(draft,matchQuestion(draft));setDraft("")};

  return <div><PageTitle kicker="EVIDENCE-GROUNDED GUIDANCE" title="AI Readiness Advisor" copy="Ask common questions about ReadyCA and get answers personalized to your household profile and readiness score."/>
    <div className="grounded"><Icon name="shield"/> Grounded in your household profile + verified sources</div>
    <div className="advisor-layout"><section className="card chat">
      <div className="advisor-intro"><div className="ai-mark"><Icon name="spark"/></div><div><b>ReadyCA Advisor</b><span>Guided answers · personalized to your household</span></div>{messages.length>0&&<button className="text-button chat-clear" onClick={()=>{window.clearTimeout(replyTimer.current);setTyping(false);setMessages([])}}>Clear chat</button>}</div>
      <div className="chat-log" ref={log} role="log" aria-live="polite" aria-label="Advisor conversation">
        <div className="message ai-message"><p>Hi {user.firstName}! I answer common questions about ReadyCA and your household's wildfire plan. Choose a question below or type your own.</p></div>
        {messages.map(m=>m.role==="user"?<div className="message user-message" key={m.id}>{m.text}</div>:<AdvisorReply key={m.id} message={m} asked={asked} onAsk={ask} county={county}/>)}
        {typing&&<div className="message ai-message typing" aria-label="Advisor is typing"><i/><i/><i/></div>}
      </div>
      <div className="suggestions">
        <div className="suggestion-tabs" role="tablist">{(["Your plan","About ReadyCA"] as const).map(c=><button role="tab" aria-selected={category===c} className={category===c?"active":""} onClick={()=>setCategory(c)} key={c}>{c==="About ReadyCA"?"Frequently asked":"Your plan"}</button>)}</div>
        {ADVISOR_QUESTIONS.filter(q=>q.category===category).map(q=><button className={asked.has(q.id)?"asked":""} disabled={typing} onClick={()=>ask(q.id)} key={q.id}>{asked.has(q.id)&&<Icon name="check" size={11}/>}{q.question}</button>)}
      </div>
      <form className="chat-input" onSubmit={e=>{e.preventDefault();submit()}}><input value={draft} maxLength={200} placeholder="Ask about your readiness plan..." aria-label="Ask the advisor a question" onChange={e=>setDraft(e.target.value)}/><button type="submit" aria-label="Send" disabled={typing||!draft.trim()}><Icon name="arrow"/></button></form>
    </section><aside className="advisor-recs"><span className="kicker">RECOMMENDED FOR YOU</span><h2>Turn guidance into action</h2>{recommendations.slice(0,2).map(r=><article className="card advisor-card" key={r.title}><Badge tone="orange">{r.level.toUpperCase()}</Badge><h3>{r.title}</h3><div><span>Why this matters</span><p>{r.why}</p></div><div className="impact"><span>Estimated effort <b>{r.time}</b></span><span>Readiness impact <b>+{r.points} pts</b></span></div><div className="source"><Icon name="shield" size={14}/> Verified · {r.source}</div></article>)}</aside></div>
    <div className="ai-disclaimer"><b>Advisor answers are not emergency alerts.</b> They explain preparedness guidance and never replace evacuation orders. Follow local authorities during an emergency.</div>
  </div>;
}

// ---- Emergency Decision Game: five practice modes (content in lib/games.ts) ----

const GAME_MODES:{id:string;title:string;copy:string;icon:IconName}[]=[
  {id:"scenarios",title:"Scenario Decisions",copy:"Make the right call as a fire approaches.",icon:"flame"},
  {id:"bag",title:"Go-Bag Challenge",copy:"Pack the essentials with limited space.",icon:"box"},
  {id:"steps",title:"Evacuation Steps",copy:"Put the evacuation steps in order.",icon:"route"},
  {id:"myths",title:"Myth or Fact",copy:"Separate wildfire myths from facts.",icon:"help"},
  {id:"alerts",title:"Alert Match",copy:"Match each alert to what it means.",icon:"bell"},
];

// Best scores are a per-browser convenience only, so storage failures are ignored.
function loadBestScores():Record<string,number>{try{return JSON.parse(localStorage.getItem("readyca-game-best")??"{}")}catch{return {}}}

function GameResult({score,total,onReplay,children}:{score:number;total:number;onReplay:()=>void;children?:ReactNode}) {
  const pct=Math.round(score/total*100);
  return <div className="game-result"><div className="game-result-score"><b>{score}</b><span>/ {total}</span></div><h2>{pct===100?"Perfect score!":pct>=70?"Strong preparedness":"Keep practicing"}</h2><p>{pct===100?"You know exactly what to do.":pct>=70?"You got most of these right. Review the ones you missed.":"Each round builds the instincts you'll need. Review the explanations and try again."}</p>{children}<Button onClick={onReplay}>Play again <Icon name="arrow"/></Button></div>;
}

function ScenarioGame({onFinish}:{onFinish:(score:number,total:number)=>void}) {
  const [step,setStep]=useState(0),[selected,setSelected]=useState<number|null>(null),[points,setPoints]=useState(0),[done,setDone]=useState(false);
  const [timed,setTimed]=useState(false),[seconds,setSeconds]=useState(30);
  useEffect(()=>{if(!timed||selected!==null||done)return;const timer=window.setInterval(()=>setSeconds(s=>{if(s<=1){window.clearInterval(timer);setSelected(-1);return 0}return s-1}),1000);return()=>window.clearInterval(timer)},[timed,selected,step,done]);
  const s=SCENARIOS[step];
  const pick=(i:number)=>{if(selected!==null)return;setSelected(i);if(i===s.correct)setPoints(p=>p+1)};
  const next=()=>{setSeconds(30);if(step<SCENARIOS.length-1){setStep(x=>x+1);setSelected(null)}else{setDone(true);onFinish(points,SCENARIOS.length)}};
  const replay=()=>{setStep(0);setSelected(null);setPoints(0);setSeconds(30);setDone(false)};
  if(done)return <section className="card game-card"><GameResult score={points} total={SCENARIOS.length} onReplay={replay}/></section>;
  return <section className={`card game-card pressure-${Math.ceil(seconds/10)}`}><div className="smoke-layer"/><div className="game-top"><div><Badge tone="orange">SCENARIO {String(step+1).padStart(2,"0")}</Badge><Badge tone="gray">{s.level.toUpperCase()}</Badge></div><div className="timer-control"><button className={timed?"on":""} onClick={()=>{setTimed(!timed);setSeconds(30)}}><Icon name="clock" size={14}/> Time pressure {timed?"on":"off"}</button>{timed&&<span className={seconds<=10?"urgent":""}>{seconds}s</span>}<span>Score: <b>{points} / {step+(selected!==null?1:0)}</b></span></div></div><div className="scenario-map"><div className="scenario-fire"><Icon name="flame"/><i/></div><div className="scenario-home"><Icon name="home"/></div><div className="scenario-road"/></div><div className="scenario-progress">{SCENARIOS.map((_,i)=><i className={i<=step?"active":""} key={i}/>)}</div><h2>{s.q}</h2><div className="answers">{s.opts.map((o,i)=><button className={selected===null?"":i===s.correct?"correct":i===selected?"wrong":"dim"} onClick={()=>pick(i)} key={o}><span>{String.fromCharCode(65+i)}</span><b>{o}</b>{selected!==null&&i===s.correct&&<Icon name="check"/>}</button>)}</div>
    {selected!==null&&<div className={`explanation ${selected===s.correct?"correct":"review"}`}><div><Icon name={selected===s.correct?"check":"help"}/></div><div><b>{selected===s.correct?"Correct":selected===-1?"Time expired — review the safest action":"Good practice — review this choice"}</b><h3>Preparedness principle</h3><p>{s.why}</p><div className="source"><Icon name="shield" size={14}/> Verified principle · CAL FIRE Ready for Wildfire</div></div></div>}
    <div className="game-actions"><span>Preparedness level: <b>{points>=Math.ceil(SCENARIOS.length*0.7)?"Strong":"Building"}</b></span><Button onClick={next} disabled={selected===null}>{step===SCENARIOS.length-1?"See final score":"Next scenario"} <Icon name="arrow"/></Button></div>
  </section>;
}

function GoBagGame({onFinish}:{onFinish:(score:number,total:number)=>void}) {
  const { profile } = useHousehold();
  const [round,setRound]=useState(0);
  const items=useMemo(()=>shuffle(bagItems(profile)),[profile,round]);
  const slots=items.filter(i=>i.essential).length;
  const [packed,setPacked]=useState<string[]>([]);
  const [checked,setChecked]=useState(false);
  const score=items.filter(i=>i.essential&&packed.includes(i.name)).length;
  const toggle=(name:string)=>{if(checked)return;setPacked(p=>p.includes(name)?p.filter(x=>x!==name):p.length<slots?[...p,name]:p)};
  const check=()=>{setChecked(true);onFinish(score,slots)};
  const replay=()=>{setPacked([]);setChecked(false);setRound(r=>r+1)};
  const missed=items.filter(i=>i.essential&&!packed.includes(i.name));
  return <section className="card game-card">
    <div className="game-top"><div><Badge tone="orange">GO-BAG CHALLENGE</Badge><Badge tone="gray">{plural(slots,"slot")}</Badge></div><span>Packed: <b>{packed.length} / {slots}</b></span></div>
    <h2>An evacuation warning was just issued. Your bag has room for {slots} items. What do you pack?</h2>
    <p className="game-hint">Items marked for your household appear when your profile includes pets, children, or support needs.</p>
    <div className="answers bag-grid">{items.map(item=>{
      const isPacked=packed.includes(item.name);
      const cls=!checked?(isPacked?"packed":""):item.essential?(isPacked?"correct":"missed"):isPacked?"wrong":"dim";
      return <button className={cls} onClick={()=>toggle(item.name)} aria-pressed={isPacked} disabled={!checked&&!isPacked&&packed.length>=slots} key={item.name}><span>{isPacked?<Icon name="check" size={14}/>:<Icon name="box" size={14}/>}</span><b>{item.name}{checked&&<small>{item.why}</small>}</b></button>;
    })}</div>
    {checked?<GameResult score={score} total={slots} onReplay={replay}>{missed.length>0&&<div className="explanation review"><div><Icon name="help"/></div><div><b>Essentials you left behind</b>{missed.map(m=><p key={m.name}><b>{m.name}:</b> {m.why}</p>)}</div></div>}</GameResult>
      :<div className="game-actions"><span>{packed.length<slots?`${plural(slots-packed.length,"slot")} left`:"Bag full"}</span><Button onClick={check} disabled={packed.length===0}>Check my bag <Icon name="arrow"/></Button></div>}
  </section>;
}

function StepsGame({onFinish}:{onFinish:(score:number,total:number)=>void}) {
  const [round,setRound]=useState(0);
  const pool=useMemo(()=>shuffle(EVACUATION_STEPS.map(s=>s.step)),[round]);
  const [order,setOrder]=useState<string[]>([]);
  const [checked,setChecked]=useState(false);
  const correctAt=(i:number)=>order[i]===EVACUATION_STEPS[i].step;
  const score=order.filter((_,i)=>correctAt(i)).length;
  const check=()=>{setChecked(true);onFinish(score,EVACUATION_STEPS.length)};
  const replay=()=>{setOrder([]);setChecked(false);setRound(r=>r+1)};
  return <section className="card game-card">
    <div className="game-top"><div><Badge tone="orange">EVACUATION STEPS</Badge><Badge tone="gray">ORDERING</Badge></div><span>Placed: <b>{order.length} / {EVACUATION_STEPS.length}</b></span></div>
    <h2>An evacuation warning is issued for your neighborhood. Put these steps in the recommended order.</h2>
    <div className="steps-layout">
      <div><span className="kicker">YOUR PLAN</span><ol className="step-order">{EVACUATION_STEPS.map((_,i)=>{const item=order[i];return <li key={i} className={!item?"empty":checked?(correctAt(i)?"correct":"wrong"):""}><span>{i+1}</span>{item?<button disabled={checked} onClick={()=>setOrder(o=>o.filter(x=>x!==item))} aria-label={`Remove ${item}`}>{item}{!checked&&<Icon name="close" size={12}/>}</button>:<em>Select a step</em>}</li>})}</ol></div>
      <div><span className="kicker">STEPS</span><div className="step-pool">{pool.filter(s=>!order.includes(s)).map(s=><button key={s} onClick={()=>setOrder(o=>[...o,s])}>{s}</button>)}{order.length===EVACUATION_STEPS.length&&!checked&&<p className="game-hint">All steps placed. Select a step in your plan to move it back.</p>}</div></div>
    </div>
    {checked?<GameResult score={score} total={EVACUATION_STEPS.length} onReplay={replay}><div className="explanation correct"><div><Icon name="route"/></div><div><b>Recommended order</b>{EVACUATION_STEPS.map((s,i)=><p key={s.step}><b>{i+1}. {s.step}.</b> {s.why}</p>)}<div className="source"><Icon name="shield" size={14}/> CAL FIRE Ready, Set, Go!</div></div></div></GameResult>
      :<div className="game-actions"><span>Select steps in the order you'd do them.</span><Button onClick={check} disabled={order.length<EVACUATION_STEPS.length}>Check my order <Icon name="arrow"/></Button></div>}
  </section>;
}

function MythGame({onFinish}:{onFinish:(score:number,total:number)=>void}) {
  const [round,setRound]=useState(0);
  const deck=useMemo(()=>shuffle(MYTHS),[round]);
  const [index,setIndex]=useState(0),[answer,setAnswer]=useState<boolean|null>(null),[points,setPoints]=useState(0),[streak,setStreak]=useState(0),[done,setDone]=useState(false);
  const card=deck[index];
  const pick=(fact:boolean)=>{if(answer!==null)return;setAnswer(fact);if(fact===card.fact){setPoints(p=>p+1);setStreak(s=>s+1)}else setStreak(0)};
  const next=()=>{if(index<deck.length-1){setIndex(i=>i+1);setAnswer(null)}else{setDone(true);onFinish(points,deck.length)}};
  const replay=()=>{setRound(r=>r+1);setIndex(0);setAnswer(null);setPoints(0);setStreak(0);setDone(false)};
  if(done)return <section className="card game-card"><GameResult score={points} total={deck.length} onReplay={replay}/></section>;
  const right=answer!==null&&answer===card.fact;
  return <section className="card game-card">
    <div className="game-top"><div><Badge tone="orange">MYTH OR FACT</Badge><Badge tone="gray">{index+1} OF {deck.length}</Badge></div><span>Score: <b>{points}</b>{streak>=2&&<> · Streak <b>{streak}</b></>}</span></div>
    <div className="scenario-progress">{deck.map((_,i)=><i className={i<=index?"active":""} key={i}/>)}</div>
    <h2>“{card.statement}”</h2>
    <div className="answers myth-answers">{[false,true].map(fact=><button key={String(fact)} className={answer===null?"":fact===card.fact?"correct":fact===answer?"wrong":"dim"} onClick={()=>pick(fact)}><span>{fact?"F":"M"}</span><b>{fact?"Fact":"Myth"}</b>{answer!==null&&fact===card.fact&&<Icon name="check"/>}</button>)}</div>
    {answer!==null&&<div className={`explanation ${right?"correct":"review"}`}><div><Icon name={right?"check":"help"}/></div><div><b>{right?"Correct":"Not quite"} — it's a {card.fact?"fact":"myth"}</b><p>{card.why}</p></div></div>}
    <div className="game-actions"><span>Answer quickly to build a streak.</span><Button onClick={next} disabled={answer===null}>{index===deck.length-1?"See final score":"Next statement"} <Icon name="arrow"/></Button></div>
  </section>;
}

function AlertMatchGame({onFinish}:{onFinish:(score:number,total:number)=>void}) {
  const [round,setRound]=useState(0);
  const meanings=useMemo(()=>shuffle(ALERTS.map(a=>a.meaning)),[round]);
  const terms=useMemo(()=>shuffle(ALERTS.map(a=>a.term)),[round]);
  const [selected,setSelected]=useState<string|null>(null);
  const [matched,setMatched]=useState<string[]>([]);
  const [missed,setMissed]=useState<string[]>([]); // terms matched wrong at least once
  const [wrongFlash,setWrongFlash]=useState<string|null>(null);
  const done=matched.length===ALERTS.length;
  const score=ALERTS.length-missed.length;
  const choose=(meaning:string)=>{
    if(!selected||done)return;
    if(ALERTS.find(a=>a.term===selected)?.meaning===meaning){
      const next=[...matched,selected];setMatched(next);setSelected(null);
      if(next.length===ALERTS.length)onFinish(ALERTS.length-missed.length,ALERTS.length);
    }else{
      if(!missed.includes(selected))setMissed(m=>[...m,selected]);
      setWrongFlash(meaning);window.setTimeout(()=>setWrongFlash(null),600);
    }
  };
  const replay=()=>{setRound(r=>r+1);setSelected(null);setMatched([]);setMissed([]);setWrongFlash(null)};
  const termFor=(meaning:string)=>ALERTS.find(a=>a.meaning===meaning)!.term;
  return <section className="card game-card">
    <div className="game-top"><div><Badge tone="orange">ALERT MATCH</Badge><Badge tone="gray">KNOW YOUR ALERTS</Badge></div><span>Matched: <b>{matched.length} / {ALERTS.length}</b></span></div>
    <h2>Select an alert, then select what it means.</h2>
    <div className="match-grid">
      <div className="match-col">{terms.map(t=><button key={t} className={matched.includes(t)?"correct":selected===t?"selected":""} disabled={matched.includes(t)||done} onClick={()=>setSelected(t)} aria-pressed={selected===t}>{matched.includes(t)&&<Icon name="check" size={14}/>}{t}</button>)}</div>
      <div className="match-col meanings">{meanings.map(m=>{const isMatched=matched.includes(termFor(m));return <button key={m} className={isMatched?"correct":wrongFlash===m?"wrong":""} disabled={isMatched||!selected||done} onClick={()=>choose(m)}>{isMatched&&<b>{termFor(m)}: </b>}{m}</button>})}</div>
    </div>
    {done?<GameResult score={score} total={ALERTS.length} onReplay={replay}><p className="game-hint">Score counts alerts matched correctly on the first try. Sign up for your county's official alerts so you get warnings and orders directly.</p></GameResult>
      :<div className="game-actions"><span>{selected?`Now select what “${selected}” means.`:"Select an alert to start."}</span></div>}
  </section>;
}

function DecisionGame() {
  const [mode,setMode]=useState("scenarios");
  const [best,setBest]=useState<Record<string,number>>(loadBestScores);
  const finish=(id:string)=>(score:number,total:number)=>{
    const pct=Math.round(score/total*100);
    setBest(current=>{
      if((current[id]??-1)>=pct)return current;
      const next={...current,[id]:pct};
      try{localStorage.setItem("readyca-game-best",JSON.stringify(next))}catch{/* best scores are optional */}
      return next;
    });
  };
  return <div className="game-page"><PageTitle kicker="PRACTICE UNDER PRESSURE" title="Wildfire Ready: Emergency Decision Game" copy="Build the instincts you'll need when a wildfire approaches. Choose a game mode."/>
    <div className="game-modes" role="tablist">{GAME_MODES.map(m=><button role="tab" aria-selected={mode===m.id} className={mode===m.id?"active":""} onClick={()=>setMode(m.id)} key={m.id}><span className="game-mode-icon"><Icon name={m.icon}/></span><b>{m.title}</b><small>{m.copy}</small>{best[m.id]!=null&&<em>Best: {best[m.id]}%</em>}</button>)}</div>
    {mode==="scenarios"&&<ScenarioGame onFinish={finish("scenarios")}/>}
    {mode==="bag"&&<GoBagGame onFinish={finish("bag")}/>}
    {mode==="steps"&&<StepsGame onFinish={finish("steps")}/>}
    {mode==="myths"&&<MythGame onFinish={finish("myths")}/>}
    {mode==="alerts"&&<AlertMatchGame onFinish={finish("alerts")}/>}
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
  const household = `${possessive(useCurrentUser().name)} household`;
  const { profile } = useHousehold();
  const a = analyzeHousehold(profile);
  const county = countyLabel(profile) || "Location not set";
  const strengths = a.strengths.length ? a.strengths.slice(0, 3) : ["Household profile started"];
  const priorityGaps = a.gaps.slice(0, 3).map(g => g.title);
  const summary = `${plural(a.peopleCount, "person")}${profile.pets.length ? ` and ${plural(profile.pets.length, "pet")}` : ""} in this plan. ${a.strengths.length ? `Strongest area: ${strengths[0].toLowerCase()}.` : "Your plan is just getting started."} ${a.gaps.length ? `${plural(a.gaps.length, "gap")} remain${a.gaps.length === 1 ? "s" : ""}, led by: ${a.gaps[0].title.toLowerCase()}.` : "No gaps remain in your household profile."}`;
  const [generated,setGenerated]=useState(false),[loading,setLoading]=useState(false);
  const generate=()=>{setLoading(true);window.setTimeout(()=>{setLoading(false);setGenerated(true)},1200)};
  if(!generated)return <div><PageTitle kicker="PERSONALIZED SUMMARY" title="Your Family Preparedness Report" copy="Turn your profile and readiness progress into a clear, shareable household action plan."/><section className="card report-hero"><div className="report-illustration"><Icon name="file" size={48}/><i/></div><Badge tone="blue">AI-ASSISTED · EVIDENCE-GROUNDED</Badge><h2>A practical plan your whole family can use</h2><p>Your report summarizes strengths, priority gaps, evacuation planning, household needs, and next steps — with a verified source for every recommendation.</p><div className="report-features"><span><Icon name="check"/> Household-specific</span><span><Icon name="check"/> Source-linked</span><span><Icon name="check"/> Easy to share</span></div><Button onClick={generate} disabled={loading}>{loading?<><span className="spinner"/> Generating your report...</>:"Generate Report"}</Button><small>Uses your {a.completeness}% complete household profile. You can update it anytime.</small></section></div>;
  return <div><PageTitle kicker="GENERATED JUST NOW" title="Your Family Preparedness Report" copy={`Personalized for ${household} · ${county}`}/>
    <div className="report-actions"><Button variant="secondary" icon="download">Download Report</Button><Button variant="secondary">Share Report</Button><Button>Update My Plan</Button></div>
    <section className="report-doc"><div className="report-cover"><div className="brand"><BrandMark/><b>ReadyCA</b></div><span>HOUSEHOLD READINESS</span><div className="report-score">{score}<small>/ 100</small></div><Badge>GOOD PREPAREDNESS</Badge><p>Prepared for {household}<br/>{locationLong(profile)}</p></div>
    <div className="report-body"><h2>Executive Summary</h2><p>{summary}</p><div className="report-cols"><div><span className="kicker">STRENGTHS</span>{strengths.map(x=><p key={x}><Icon name="check" size={16}/>{x}</p>)}</div><div><span className="kicker">PRIORITY GAPS</span>{priorityGaps.length?priorityGaps.map(x=><p key={x}><i/> {x}</p>):<p><Icon name="check" size={16}/>No open gaps</p>}</div></div>
    <h2>Household Readiness Analytics</h2><div className="report-analytics"><div className="radar-card"><svg viewBox="0 0 180 160"><g className="radar-grid"><polygon points="90,12 160,55 135,140 45,140 20,55"/><polygon points="90,36 137,65 120,120 60,120 43,65"/><line x1="90" y1="12" x2="90" y2="82"/><line x1="160" y1="55" x2="90" y2="82"/><line x1="135" y1="140" x2="90" y2="82"/><line x1="45" y1="140" x2="90" y2="82"/><line x1="20" y1="55" x2="90" y2="82"/></g><polygon className="radar-value" points="90,27 147,60 126,126 65,112 38,62"/><g className="radar-points">{[[90,27],[147,60],[126,126],[65,112],[38,62]].map(([x,y])=><circle cx={x} cy={y} r="3" key={x}/>)}</g></svg><div className="radar-labels"><span>Evacuation</span><span>Transport</span><span>Supplies</span><span>Pets</span><span>Communication</span></div></div><div className="projection-card"><span className="kicker">PROJECTED READINESS</span><div><b>{score}</b><Icon name="arrow"/><strong>93</strong></div><p>Complete your top three recommended actions to gain a projected <b>+21 points.</b></p><div className="mini-trend"><i/><i/><i/><i/><i/></div></div><div className="resource-matrix"><span className="kicker">RESOURCE COMPLETENESS</span>{RESOURCE_CATALOG.map(c=>[c.name.split(" ")[0],Math.round(c.items.filter(i=>profile.resources[i.name]?.status==="ready").length/c.items.length*100)] as [string,number]).map(([n,v])=><div key={n}><span>{n}</span><div className="progress"><i style={{width:`${v}%`}}/></div><b>{v}%</b></div>)}</div><div className="exposure-card"><span className="kicker">LOCAL RISK EXPOSURE</span><div className="exposure-map"><i/><span>HOME</span><b>MODERATE</b></div><small>No active evacuation order · {county}</small></div></div>
    <h2>Top 3 actions for fastest improvement</h2><div className="top-actions">{recommendations.slice(0,3).map((r,i)=><span key={r.title}><i>{i+1}</i>{r.title}<b>+{r.points}</b></span>)}</div><h2>Recommended Action Plan</h2>{recommendations.map((r,i)=><div className="action-line" key={r.title}><span>{i+1}</span><div><b>{r.title}</b><small>{r.level} · {r.time} · Supporting source: {r.source}</small></div><strong>+{r.points} pts</strong></div>)}</div></section>
  </div>;
}

function PreparednessPlan({complete,completeTask}:{complete:string[];completeTask:(t:string,p:number)=>void}) {
  return <div><PageTitle kicker="YOUR ACTION PLAN" title="Preparedness Plan" copy="A prioritized checklist built from your household needs and readiness gaps."/><div className="plan-list">{recommendations.map((r,i)=><div className={`card plan-row ${complete.includes(r.title)?"is-done":""}`} key={r.title}><span className="plan-number">{complete.includes(r.title)?<Icon name="check"/>:i+1}</span><div><Badge tone={i===0?"orange":"blue"}>{r.level.toUpperCase()}</Badge><h3>{r.title}</h3><p>{r.why}</p><div className="source"><Icon name="shield" size={14}/> {r.source} · {r.time}</div></div><strong>+{r.points} pts</strong><Button disabled={complete.includes(r.title)} onClick={()=>completeTask(r.title,r.points)}>{complete.includes(r.title)?"Completed":"Complete task"}</Button></div>)}</div></div>;
}

function AccountSettings({onSignIn}:{onSignIn:()=>void}) {
  const user = useCurrentUser();
  const [name,setName]=useState(user.name===FALLBACK_NAME?"":user.name);
  const [status,setStatus]=useState<{tone:"error"|"info";text:string}|null>(null);
  const [saving,setSaving]=useState(false);
  // Pick up the new value when the name changes (here or in another tab); only clear
  // the status message when a different account signs in, so "Name updated." stays visible.
  useEffect(()=>{setName(user.name===FALLBACK_NAME?"":user.name)},[user.name]);
  useEffect(()=>{setStatus(null)},[user.email]);
  if(!user.signedIn)return <section className="card account-card"><div className="avatar">{user.initials}</div><div><b>You're browsing as a guest</b><small>Sign in to save your plan and personalize ReadyCA with your name.</small></div><Button onClick={onSignIn}>Sign in</Button></section>;
  const save=async()=>{
    const trimmed=name.trim().replace(/\s+/g," ");
    if(!trimmed||!supabase)return;
    setSaving(true);setStatus(null);
    // Updating user metadata triggers onAuthStateChange, which refreshes the name app-wide.
    const {error}=await supabase.auth.updateUser({data:{full_name:trimmed}});
    setSaving(false);
    setStatus(error?{tone:"error",text:error.message}:{tone:"info",text:"Name updated."});
  };
  return <form className="card account-card" onSubmit={e=>{e.preventDefault();save()}}><div className="avatar">{user.initials}</div><div className="account-fields"><label>Display name<input value={name} maxLength={60} required placeholder="Your name" onChange={e=>setName(e.target.value)}/></label><small>{user.email}</small>{status&&<span className={`auth-message ${status.tone}`}>{status.text}</span>}</div><button className="btn btn-primary" type="submit" disabled={saving||!name.trim()||name.trim()===user.name}><span>{saving?"Saving…":"Save"}</span></button></form>;
}

function Settings({onSignIn,go}:{onSignIn:()=>void;go:(n:string)=>void}){
  const { profile } = useHousehold();
  const rows:[string,IconName,string,(()=>void)|undefined][]=[
    ["Emergency notifications","bell","Critical and action alerts enabled",undefined],
    ["Household members",  "users",`${plural(1+profile.members.length,"person")} · ${plural(profile.pets.length,"pet")} · ${plural(profile.vehicles.length,"vehicle")}`,()=>go("My Household")],
    ["Data & privacy","shield","Review and manage",undefined],
    ["Accessibility","help","Review and manage",undefined],
  ];
  return <div><PageTitle kicker="ACCOUNT & PREFERENCES" title="Settings" copy="Manage your account, preparedness location, alerts, privacy, and household access."/><AccountSettings onSignIn={onSignIn}/>
    <section className="card location-card"><span className="settings-icon"><Icon name="pin"/></span><div><b>Preparedness location</b><small>{locationLong(profile)}</small><LocationForm/></div></section>
    <section className="card settings-card">{rows.map(([label,icon,detail,onClick])=><button key={label} onClick={onClick}><span className="settings-icon"><Icon name={icon}/></span><div><b>{label}</b><small>{detail}</small></div><Icon name="chevron"/></button>)}</section></div>;
}

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
