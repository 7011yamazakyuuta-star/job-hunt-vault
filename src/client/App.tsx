import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Columns3,
  FlaskConical,
  Gauge,
  KeyRound,
  Link as LinkIcon,
  LockKeyhole,
  LogIn,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useParams } from "react-router-dom";
import { getHealth, getMe, type ApiUser } from "./api";

type CompanyStatus = "research" | "applied" | "interview" | "offer" | "hold";

const navItems = [
  { to: "/", label: "Dashboard", icon: Gauge },
  { to: "/personal/new", label: "Personal room", icon: Plus },
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
  { suffix: "/settings", label: "Settings", icon: Settings },
];

const companies = [
  {
    id: "c1",
    name: "Northstar Labs",
    domain: "northstar.example",
    status: "interview" as const,
    step: "Final interview",
    owner: "YU",
    deadline: "Jun 24",
    test: "TG-WEB",
    visibility: "Room",
    accent: "blue",
  },
  {
    id: "c2",
    name: "Kanda Mobility",
    domain: "kanda.example",
    status: "applied" as const,
    step: "ES submitted",
    owner: "AK",
    deadline: "Jun 27",
    test: "SPI",
    visibility: "Room",
    accent: "green",
  },
  {
    id: "c3",
    name: "Mizube Systems",
    domain: "mizube.example",
    status: "research" as const,
    step: "Company research",
    owner: "ME",
    deadline: "Jul 02",
    test: "Unknown",
    visibility: "Private",
    accent: "amber",
  },
  {
    id: "c4",
    name: "Sora Foods",
    domain: "sora.example",
    status: "offer" as const,
    step: "Offer review",
    owner: "YU",
    deadline: "Jul 05",
    test: "CUBIC",
    visibility: "Room",
    accent: "rose",
  },
];

const calendarItems = [
  { time: "10:00", title: "Northstar Labs final interview", meta: "Room / online" },
  { time: "14:30", title: "Mizube Systems research block", meta: "Private memo" },
  { time: "18:00", title: "Kanda Mobility test prep", meta: "SPI" },
];

const kanbanColumns = [
  { title: "Research", status: "research" as const },
  { title: "Applied", status: "applied" as const },
  { title: "Interview", status: "interview" as const },
  { title: "Offer", status: "offer" as const },
];

const testReports = [
  { company: "Northstar Labs", type: "TG-WEB", source: "Room note", updated: "Today" },
  { company: "Kanda Mobility", type: "SPI", source: "Past candidate", updated: "Yesterday" },
  { company: "Sora Foods", type: "CUBIC", source: "Manual", updated: "Jun 18" },
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

        <section className="room-switcher" aria-label="Rooms">
          <p>Rooms</p>
          <Link to="/rooms/demo-room" className="room-pill active-room">
            <span className="room-dot" />
            <span>Tokyo 2027</span>
          </Link>
          <Link to="/rooms/personal" className="room-pill">
            <LockKeyhole size={14} aria-hidden="true" />
            <span>Personal</span>
          </Link>
        </section>

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
  const [filter, setFilter] = useState<CompanyStatus | "all">("all");
  const visibleCompanies = filter === "all" ? companies : companies.filter((company) => company.status === filter);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Today</p>
          <h1>Job Hunt Vault</h1>
        </div>
        <a className="primary-action" href="/api/auth/google/start">
          <LogIn size={18} aria-hidden="true" />
          <span>{user ? "Refresh session" : "Google login"}</span>
        </a>
      </header>

      <section className="dashboard-grid">
        <div className="focus-panel">
          <div className="focus-copy">
            <span className="status-dot">3 due soon</span>
            <h2>Next interview is the risk point.</h2>
            <p>Northstar final round is closest. Confirm company notes, test history, and private login material before the meeting.</p>
          </div>
          <div className="focus-actions">
            <Link className="secondary-action" to="/rooms/demo-room/companies/c1">
              <BriefcaseBusiness size={17} aria-hidden="true" />
              <span>Open company</span>
            </Link>
            <Link className="secondary-action" to="/rooms/demo-room/vault">
              <KeyRound size={17} aria-hidden="true" />
              <span>Vault</span>
            </Link>
          </div>
        </div>

        <div className="metrics-panel" aria-label="Room metrics">
          <Metric label="Active companies" value="12" trend="+3 this week" />
          <Metric label="Interviews" value="4" trend="2 final rounds" />
          <Metric label="Private items" value="7" trend="encrypted" />
        </div>
      </section>

      <section className="split-layout">
        <div className="surface table-surface">
          <PanelHeader title="Pipeline" actionLabel="New company" to="/rooms/demo-room/companies" icon={Plus} />
          <SegmentedFilter value={filter} onChange={setFilter} />
          <CompanyTable companies={visibleCompanies} />
        </div>

        <aside className="right-rail">
          <div className="surface">
            <PanelHeader title="Schedule" actionLabel="Calendar" to="/rooms/demo-room/calendar" icon={CalendarDays} />
            <Timeline />
          </div>
          <div className="surface vault-summary">
            <div>
              <ShieldCheck size={20} aria-hidden="true" />
              <strong>Vault stays personal</strong>
              <span>3 credentials attached to active applications</span>
            </div>
            <Link to="/rooms/demo-room/vault" aria-label="Open vault">
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </section>
    </>
  );
}

function StartRoomPage({ mode }: { mode: "personal" | "shared" }) {
  const title = mode === "personal" ? "New personal room" : "New shared room";
  return (
    <>
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">Room setup</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="setup-layout">
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
        <SetupNotes mode={mode} />
      </div>
    </>
  );
}

function JoinRoomPage() {
  const { roomCode } = useParams();
  return (
    <>
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">Invitation</p>
          <h1>Join room</h1>
        </div>
      </header>
      <div className="setup-layout">
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
        <div className="surface setup-notes">
          <h2>Shared boundary</h2>
          <p>Room data is shared only after Google login and passphrase verification. Private progress and Vault items stay with the current user.</p>
        </div>
      </div>
    </>
  );
}

function RoomPage({ tab }: { tab: string }) {
  const { roomId, companyId } = useParams();
  const title = useMemo(() => titleForTab(tab), [tab]);

  return (
    <>
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">Room {roomId}</p>
          <h1>{title}</h1>
        </div>
        <Link className="secondary-action" to="/rooms/demo-room/companies">
          <Search size={17} aria-hidden="true" />
          <span>Search room</span>
        </Link>
      </header>
      <RoomNav roomId={roomId ?? "demo-room"} />
      <RoomContent tab={tab} companyId={companyId} />
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

function RoomContent({ tab, companyId }: { tab: string; companyId?: string }) {
  if (tab === "companies") {
    return (
      <section className="surface table-surface">
        <PanelHeader title="Companies" actionLabel="Add" to="/rooms/demo-room/companies" icon={Plus} />
        <CompanyTable companies={companies} />
      </section>
    );
  }

  if (tab === "company-detail") {
    const company = companies.find((item) => item.id === companyId) ?? companies[0];
    return <CompanyDetail company={company} />;
  }

  if (tab === "progress") {
    return (
      <section className="surface">
        <PanelHeader title="Progress matrix" actionLabel="Update" to="/rooms/demo-room/progress" icon={CheckCircle2} />
        <ProgressMatrix />
      </section>
    );
  }

  if (tab === "kanban") {
    return <KanbanBoard />;
  }

  if (tab === "tests") {
    return (
      <section className="surface table-surface">
        <PanelHeader title="Test reports" actionLabel="Add report" to="/rooms/demo-room/tests" icon={FlaskConical} />
        <TestReportTable />
      </section>
    );
  }

  if (tab === "calendar") {
    return (
      <section className="surface calendar-surface">
        <PanelHeader title="Calendar" actionLabel="New event" to="/rooms/demo-room/calendar" icon={CalendarDays} />
        <Timeline />
      </section>
    );
  }

  if (tab === "vault") {
    return <VaultPanel />;
  }

  if (tab === "settings") {
    return <SettingsPanel />;
  }

  return (
    <section className="split-layout">
      <div className="surface table-surface">
        <PanelHeader title="Room overview" actionLabel="New company" to="/rooms/demo-room/companies" icon={Plus} />
        <CompanyTable companies={companies.slice(0, 3)} />
      </div>
      <aside className="right-rail">
        <div className="surface">
          <PanelHeader title="Today" actionLabel="Open" to="/rooms/demo-room/calendar" icon={CalendarDays} />
          <Timeline />
        </div>
        <div className="surface">
          <PanelHeader title="Tests" actionLabel="View" to="/rooms/demo-room/tests" icon={FlaskConical} />
          <TestReportTable compact />
        </div>
      </aside>
    </section>
  );
}

function CompanyTable({ companies: rows }: { companies: typeof companies }) {
  return (
    <div className="data-table" role="table" aria-label="Companies">
      <div className="table-row table-head" role="row">
        <span>Company</span>
        <span>Status</span>
        <span>Step</span>
        <span>Deadline</span>
        <span>Owner</span>
      </div>
      {rows.map((company) => (
        <Link className="table-row" role="row" key={company.id} to={`/rooms/demo-room/companies/${company.id}`}>
          <span className="company-cell">
            <span className={`logo-chip ${company.accent}`}>{company.name.slice(0, 1)}</span>
            <span>
              <strong>{company.name}</strong>
              <small>{company.domain}</small>
            </span>
          </span>
          <StatusBadge status={company.status} />
          <span>{company.step}</span>
          <span>{company.deadline}</span>
          <span className="owner-chip">{company.owner}</span>
        </Link>
      ))}
    </div>
  );
}

function CompanyDetail({ company }: { company: (typeof companies)[number] }) {
  return (
    <section className="detail-layout">
      <div className="surface detail-main">
        <div className="company-title">
          <span className={`logo-chip large ${company.accent}`}>{company.name.slice(0, 1)}</span>
          <div>
            <p className="eyebrow">{company.domain}</p>
            <h2>{company.name}</h2>
          </div>
        </div>
        <div className="detail-grid">
          <DetailItem label="Current step" value={company.step} />
          <DetailItem label="Deadline" value={company.deadline} />
          <DetailItem label="Test" value={company.test} />
          <DetailItem label="Visibility" value={company.visibility} />
        </div>
        <div className="step-list">
          {["Entry sheet", "Web test", "First interview", "Final interview"].map((step, index) => (
            <div className="step-item" key={step}>
              <span className={index < 3 ? "step-dot complete" : "step-dot"} />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
      <aside className="right-rail">
        <div className="surface">
          <PanelHeader title="Links" actionLabel="Open" to="#" icon={LinkIcon} />
          <div className="link-list">
            <a href="#">Career page</a>
            <a href="#">My page</a>
          </div>
        </div>
        <div className="surface vault-summary">
          <div>
            <KeyRound size={20} aria-hidden="true" />
            <strong>Private credentials</strong>
            <span>1 encrypted item attached</span>
          </div>
          <Link to="/rooms/demo-room/vault" aria-label="Open vault">
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </section>
  );
}

function SegmentedFilter({
  value,
  onChange,
}: {
  value: CompanyStatus | "all";
  onChange: (value: CompanyStatus | "all") => void;
}) {
  const options: Array<{ value: CompanyStatus | "all"; label: string }> = [
    { value: "all", label: "All" },
    { value: "research", label: "Research" },
    { value: "applied", label: "Applied" },
    { value: "interview", label: "Interview" },
    { value: "offer", label: "Offer" },
  ];

  return (
    <div className="segmented-control" role="tablist" aria-label="Pipeline filter">
      {options.map((option) => (
        <button
          aria-selected={value === option.value}
          className={value === option.value ? "selected" : ""}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Timeline() {
  return (
    <div className="timeline">
      {calendarItems.map((item) => (
        <div className="timeline-item" key={`${item.time}-${item.title}`}>
          <time>{item.time}</time>
          <span>
            <strong>{item.title}</strong>
            <small>{item.meta}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function KanbanBoard() {
  return (
    <section className="kanban-board" aria-label="Kanban">
      {kanbanColumns.map((column) => (
        <div className="kanban-column" key={column.status}>
          <div className="kanban-header">
            <strong>{column.title}</strong>
            <span>{companies.filter((company) => company.status === column.status).length}</span>
          </div>
          {companies
            .filter((company) => company.status === column.status)
            .map((company) => (
              <Link className="kanban-card" key={company.id} to={`/rooms/demo-room/companies/${company.id}`}>
                <span className={`logo-chip ${company.accent}`}>{company.name.slice(0, 1)}</span>
                <strong>{company.name}</strong>
                <small>{company.step}</small>
              </Link>
            ))}
        </div>
      ))}
    </section>
  );
}

function ProgressMatrix() {
  const steps = ["ES", "Test", "1st", "Final", "Offer"];
  return (
    <div className="matrix" role="table" aria-label="Progress matrix">
      <div className="matrix-row matrix-head" role="row">
        <span>Company</span>
        {steps.map((step) => (
          <span key={step}>{step}</span>
        ))}
      </div>
      {companies.map((company, companyIndex) => (
        <div className="matrix-row" role="row" key={company.id}>
          <strong>{company.name}</strong>
          {steps.map((step, stepIndex) => (
            <span className={stepIndex <= companyIndex ? "matrix-cell done" : "matrix-cell"} key={step}>
              {stepIndex <= companyIndex ? <CheckCircle2 size={15} aria-hidden="true" /> : <CircleDot size={15} aria-hidden="true" />}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function TestReportTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "compact-list" : "data-table"} role="table" aria-label="Test reports">
      {testReports.map((report) => (
        <div className={compact ? "compact-row" : "table-row"} key={`${report.company}-${report.type}`}>
          <span>
            <strong>{report.company}</strong>
            <small>{report.source}</small>
          </span>
          <span>{report.type}</span>
          {!compact ? <span>{report.updated}</span> : null}
        </div>
      ))}
    </div>
  );
}

function VaultPanel() {
  return (
    <section className="detail-layout">
      <div className="surface detail-main vault-panel">
        <div className="company-title">
          <span className="logo-chip large green">
            <KeyRound size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">Personal Vault</p>
            <h2>Encrypted before upload</h2>
          </div>
        </div>
        <div className="vault-grid">
          <DetailItem label="Items" value="7" />
          <DetailItem label="Linked companies" value="3" />
          <DetailItem label="Sharing" value="Off" />
        </div>
        <form className="inline-vault-form">
          <label>
            Label
            <input placeholder="Northstar mypage" />
          </label>
          <label>
            Encrypted payload
            <input placeholder="Created in browser" />
          </label>
          <button className="primary-action" type="button">
            <LockKeyhole size={17} aria-hidden="true" />
            <span>Save encrypted item</span>
          </button>
        </form>
      </div>
      <aside className="right-rail">
        <div className="surface setup-notes">
          <h2>Vault boundary</h2>
          <p>Passphrases never leave the browser. Server routes filter every credential item by owner user.</p>
        </div>
      </aside>
    </section>
  );
}

function SettingsPanel() {
  return (
    <section className="surface settings-grid">
      <DetailItem label="Room type" value="Shared" />
      <DetailItem label="Join method" value="Room code + passphrase" />
      <DetailItem label="Avatar storage" value="Private R2" />
      <DetailItem label="Secrets" value="Cloudflare Workers" />
    </section>
  );
}

function SetupNotes({ mode }: { mode: "personal" | "shared" }) {
  return (
    <div className="surface setup-notes">
      <h2>{mode === "personal" ? "Personal boundary" : "Shared boundary"}</h2>
      <p>
        {mode === "personal"
          ? "A personal room starts private and can later be converted into a shared room."
          : "Shared rooms expose company and room-visible progress, while Vault and private progress stay personal."}
      </p>
    </div>
  );
}

function PanelHeader({
  title,
  actionLabel,
  to,
  icon: Icon,
}: {
  title: string;
  actionLabel: string;
  to: string;
  icon: typeof Plus;
}) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      <Link to={to}>
        <Icon size={16} aria-hidden="true" />
        <span>{actionLabel}</span>
      </Link>
    </div>
  );
}

function Metric({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{trend}</small>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }: { status: CompanyStatus }) {
  const label: Record<CompanyStatus, string> = {
    research: "Research",
    applied: "Applied",
    interview: "Interview",
    offer: "Offer",
    hold: "Hold",
  };
  return <span className={`status-badge ${status}`}>{label[status]}</span>;
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
