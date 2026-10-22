import { useState, type FormEvent } from "react";
import { supabase, supabaseConfigured } from "./lib/supabase";
import logo from "./assets/CAReady128x.png";

function Auth({ initialMode = "signin", onBack }: { initialMode?: "signin" | "signup"; onBack: () => void }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage(null);
    if (mode === "signup") {
      // full_name is stored on the account and read by userFromSession() in lib/currentUser.ts.
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name.trim().replace(/\s+/g, " ") } } });
      if (error) setMessage({ tone: "error", text: error.message });
      // With email confirmation on, Supabase returns a user but no session yet.
      else if (!data.session) setMessage({ tone: "info", text: "Check your email for a confirmation link, then sign in." });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ tone: "error", text: error.message });
    }
    setLoading(false);
  };

  return <div className="auth-page">
    <form className="auth-card" onSubmit={submit}>
      <div className="brand"><img className="brand-mark brand-logo" src={logo} alt="" width={38} height={38}/><div><b>ReadyCA</b><small>WILDFIRE READINESS</small></div></div>
      <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
      <p>{mode === "signin" ? "Sign in to pick up your readiness plan where you left off." : "Save your household plan and progress across devices."}</p>
      {!supabaseConfigured && <div className="auth-message error">Login isn't connected yet. Add your Supabase URL and anon key to <code>.env.local</code> and restart the dev server.</div>}
      {mode === "signup" && <label>Your name<input type="text" required maxLength={60} autoComplete="name" value={name} onChange={e => setName(e.target.value)}/></label>}
      <label>Email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/></label>
      <label>Password<input type="password" required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)}/></label>
      {message && <div className={`auth-message ${message.tone}`}>{message.text}</div>}
      <button className="btn btn-primary" type="submit" disabled={loading || !supabaseConfigured}><span>{loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</span></button>
      <button type="button" className="text-button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(null); }}>{mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
      <button type="button" className="text-button" onClick={onBack}>← Back</button>
    </form>
  </div>;
}

export default Auth;
