import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Columns3,
  FlaskConical,
  Gauge,
  KeyRound,
  Link as LinkIcon,
  LogIn,
  Plus,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useParams } from "react-router-dom";
import { getHealth, getMe, type ApiUser } from "./api";

const navItems = [
  { to: "/", label: "Home", icon: Gauge },
  { to: "/personal/new", label: "Personal", icon: Plus },
  { to: "/rooms/new", label: "Shared room", icon: UsersRound },
  { to: "/join", label: "Join", icon: UserRoundPlus },
];

const roomTabs = [
  { suffix: "", label: "Overview", icon: Gauge },
  { suffix: "/companies", label: "Companies", icon: BriefcaseBusiness },
  { suffix: "/progress", label: "Progress", icon: CheckCircle2 },
  { suffix: "/kanban", label: "Kanban", icon: Columns3 },
  { suffix: "/tests", label: "Tests", icon: FlaskConical },
  { suffix: "/calendar", label: "Calendar", icon: CalendarDays },
  { suffix: "/vault", label: "Vault", icon: KeyRound },
  { suffix: "/settings", label: "Settings", icon: ShieldCheck },
];

export default function App() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [health, setHealth] = useState<string>("checking");

  useEffect(() => {
    let active = true;
    void Promise.allSettled([getMe(), getHealth()]).then(([meResult, healthResult]) => {
      if (!active) {
        return;
      }
      if (meResult.status === "fulfilled") {
        setUser(meResult.value.user);
      }
      setHealth(healthResult.status === "fulfilled" && healthResult.value.ok ? "online" : "offline");
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="Job Hunt Vault home">
          <span className="brand-mark">JH</span>
          <span>
            <strong>Job Hunt Vault</strong>
            <small>{health}</small>
          </span>
        </Link>
        <nav aria-label="Primary" className="main-nav">
          {navItems.map((item) => (
            <NavLink className="nav-item" key={item.to} to={item.to}>
              <item.icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="session-panel">
          <div className="avatar">{initialsFor(user?.name ?? "Dev User")}</div>
          <div>
            <strong>{user?.name ?? "Not signed in"}</strong>
            <small>{user?.email ?? "Google OAuth or local mock"}</small>
          </div>
        </div>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/personal/new" element={<StartRoomPage mode="personal" />} />
          <Route path="/rooms/new" element={<StartRoomPage mode="shared" />} />
          <Route path="/join/:roomCode?" element={<JoinRoomPage />} />
          <Route path="/rooms/:roomId" element={<RoomPage tab="overview" />} />
          <Route path="/rooms/:roomId/companies" element={<RoomPage tab="companies" />} />
          <Route path="/rooms/:roomId/companies/:companyId" element={<RoomPage tab="company-detail" />} />
          <Route path="/rooms/:roomId/progress" element={<RoomPage tab="progress" />} />
          <Route path="/rooms/:roomId/kanban" element={<RoomPage tab="kanban" />} />
          <Route path="/rooms/:roomId/tests" element={<RoomPage tab="tests" />} />
          <Route path="/rooms/:roomId/calendar" element={<RoomPage tab="calendar" />} />
          <Route path="/rooms/:roomId/vault" element={<RoomPage tab="vault" />} />
          <Route path="/rooms/:roomId/settings" element={<RoomPage tab="settings" />} />
        </Routes>
      </main>
    </div>
  );
}

function HomePage({ user }: { user: ApiUser | null }) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Job Hunt Vault</h1>
        </div>
        <a className="primary-action" href="/api/auth/google/start">
          <LogIn size={18} aria-hidden="true" />
          <span>{user ? "Refresh session" : "Google login"}</span>
        </a>
      </header>

      <section className="metric-band" aria-label="MVP status">
        <Metric label="Rooms" value="Personal + Shared" />
        <Metric label="Storage" value="D1 + R2" />
        <Metric label="Vault" value="Client crypto" />
      </section>

      <section className="work-grid">
        <ActionPanel
          icon={Plus}
          title="Start personal tracking"
          body="Create a private room for one-person job hunt tracking."
          to="/personal/new"
        />
        <ActionPanel
          icon={UsersRound}
          title="Create shared room"
          body="Open an invite-only space for friends and shared company progress."
          to="/rooms/new"
        />
        <ActionPanel
          icon={UserRoundPlus}
          title="Join room"
          body="Use a room code and passphrase when a friend invites you."
          to="/join"
        />
      </section>
    </>
  );
}

function StartRoomPage({ mode }: { mode: "personal" | "shared" }) {
  const title = mode === "personal" ? "New personal room" : "New shared room";
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Room setup</p>
          <h1>{title}</h1>
        </div>
      </header>
      <form className="form-panel">
        <label>
          Room name
          <input name="name" placeholder={mode === "personal" ? "My job hunt" : "Tokyo 2027 team"} />
        </label>
        {mode === "shared" ? (
          <label>
            Passphrase
            <input name="passphrase" type="password" placeholder="At least 8 characters" />
          </label>
        ) : null}
        <label>
          Display name
          <input name="displayName" placeholder="Name shown in this room" />
        </label>
        <button className="primary-action" type="button">
          <Plus size={18} aria-hidden="true" />
          <span>Create</span>
        </button>
      </form>
    </>
  );
}

function JoinRoomPage() {
  const { roomCode } = useParams();
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Invitation</p>
          <h1>Join room</h1>
        </div>
      </header>
      <form className="form-panel">
        <label>
          Room code
          <input name="roomCode" defaultValue={roomCode ?? ""} placeholder="rm_..." />
        </label>
        <label>
          Passphrase
          <input name="passphrase" type="password" />
        </label>
        <label>
          Display name
          <input name="displayName" placeholder="Name shown in this room" />
        </label>
        <button className="primary-action" type="button">
          <UserRoundPlus size={18} aria-hidden="true" />
          <span>Join</span>
        </button>
      </form>
    </>
  );
}

function RoomPage({ tab }: { tab: string }) {
  const { roomId, companyId } = useParams();
  const title = useMemo(() => titleForTab(tab), [tab]);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Room {roomId}</p>
          <h1>{title}</h1>
        </div>
      </header>
      <RoomNav roomId={roomId ?? "demo-room"} />
      <section className="surface">
        {tab === "vault" ? <VaultPlaceholder /> : <RoutePlaceholder tab={tab} companyId={companyId} />}
      </section>
    </>
  );
}

function RoomNav({ roomId }: { roomId: string }) {
  return (
    <nav className="tab-row" aria-label="Room">
      {roomTabs.map((item) => (
        <NavLink className="tab-item" key={item.label} to={`/rooms/${roomId}${item.suffix}`} end={item.suffix === ""}>
          <item.icon size={16} aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function RoutePlaceholder({ tab, companyId }: { tab: string; companyId?: string }) {
  return (
    <div className="placeholder-grid">
      <div className="placeholder-copy">
        <ClipboardList size={24} aria-hidden="true" />
        <h2>{titleForTab(tab)}</h2>
        <p>{companyId ? `Company ${companyId}` : "API-backed controls land here as the MVP grows."}</p>
      </div>
      <div className="list-preview" aria-label="Preview rows">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function VaultPlaceholder() {
  return (
    <div className="placeholder-grid">
      <div className="placeholder-copy">
        <KeyRound size={24} aria-hidden="true" />
        <h2>Personal Vault</h2>
        <p>Encrypted payloads are prepared in the browser before they touch the API.</p>
      </div>
      <div className="vault-lock">
        <ShieldCheck size={44} aria-hidden="true" />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActionPanel({
  icon: Icon,
  title,
  body,
  to,
}: {
  icon: typeof Plus;
  title: string;
  body: string;
  to: string;
}) {
  return (
    <Link className="action-panel" to={to}>
      <Icon size={22} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{body}</span>
      <LinkIcon size={16} aria-hidden="true" />
    </Link>
  );
}

function titleForTab(tab: string): string {
  const labels: Record<string, string> = {
    overview: "Room overview",
    companies: "Companies",
    "company-detail": "Company detail",
    progress: "Progress matrix",
    kanban: "Kanban",
    tests: "Test reports",
    calendar: "Calendar",
    vault: "Personal Vault",
    settings: "Room settings",
  };
  return labels[tab] ?? "Room";
}

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
