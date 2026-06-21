import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Columns3,
  FlaskConical,
  Gauge,
  Globe2,
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

type Locale = "ja" | "en";
type CompanyStatus = "research" | "applied" | "interview" | "offer" | "hold";
type CompanySortMode = "deadline" | "kana" | "industry";

type LocalText = {
  ja: string;
  en: string;
};

type Company = {
  id: string;
  name: LocalText;
  domain: string;
  industry: LocalText;
  dueDate: string;
  status: CompanyStatus;
  stage: LocalText;
  owner: LocalText;
  due: LocalText;
  test: string;
  visibility: LocalText;
  accent: "blue" | "green" | "amber" | "rose" | "violet";
};

const copy = {
  ja: {
    nav: {
      dashboard: "概要",
      personal: "個人ルーム",
      shared: "共有ルーム",
      join: "参加",
    },
    tabs: {
      overview: "全体",
      companies: "企業台帳",
      progress: "進捗",
      kanban: "ボード",
      tests: "適性検査",
      calendar: "日程",
      vault: "金庫",
      settings: "設定",
    },
    status: {
      checking: "接続確認中",
      online: "オンライン",
      offline: "API未接続",
    },
    home: {
      eyebrow: "本日の運用",
      title: "今日の選考ボード",
      login: "Googleでログイン",
      refresh: "セッション更新",
      queue: "優先キュー",
      pipeline: "企業台帳",
      schedule: "日程",
      vault: "個人金庫",
      logos: "企業ロゴ連携",
      newCompany: "企業を追加",
    },
  },
  en: {
    nav: {
      dashboard: "Overview",
      personal: "Personal room",
      shared: "Shared room",
      join: "Join",
    },
    tabs: {
      overview: "Overview",
      companies: "Companies",
      progress: "Progress",
      kanban: "Board",
      tests: "Tests",
      calendar: "Calendar",
      vault: "Vault",
      settings: "Settings",
    },
    status: {
      checking: "checking",
      online: "online",
      offline: "API offline",
    },
    home: {
      eyebrow: "Today",
      title: "Selection Board",
      login: "Sign in with Google",
      refresh: "Refresh session",
      queue: "Priority queue",
      pipeline: "Company ledger",
      schedule: "Schedule",
      vault: "Private vault",
      logos: "Logo provider",
      newCompany: "Add company",
    },
  },
} satisfies Record<Locale, unknown>;

const navItems = [
  { to: "/", key: "dashboard" as const, icon: Gauge },
  { to: "/personal/new", key: "personal" as const, icon: Plus },
  { to: "/rooms/new", key: "shared" as const, icon: UsersRound },
  { to: "/join", key: "join" as const, icon: UserRoundPlus },
];

const roomTabs = [
  { suffix: "", key: "overview" as const, icon: Gauge },
  { suffix: "/companies", key: "companies" as const, icon: BriefcaseBusiness },
  { suffix: "/progress", key: "progress" as const, icon: CheckCircle2 },
  { suffix: "/kanban", key: "kanban" as const, icon: Columns3 },
  { suffix: "/tests", key: "tests" as const, icon: FlaskConical },
  { suffix: "/calendar", key: "calendar" as const, icon: CalendarDays },
  { suffix: "/vault", key: "vault" as const, icon: KeyRound },
  { suffix: "/settings", key: "settings" as const, icon: Settings },
];

const companies: Company[] = [
  {
    id: "sony",
    name: { ja: "ソニーグループ", en: "Sony Group" },
    domain: "sony.com",
    industry: { ja: "電機・エンタメ", en: "Electronics / entertainment" },
    dueDate: "2026-06-24T10:00:00.000Z",
    status: "interview",
    stage: { ja: "二次面接前", en: "Second interview" },
    owner: { ja: "自分", en: "Me" },
    due: { ja: "6/24 10:00", en: "Jun 24 10:00" },
    test: "TG-WEB",
    visibility: { ja: "共有", en: "Room" },
    accent: "blue",
  },
  {
    id: "recruit",
    name: { ja: "リクルート", en: "Recruit" },
    domain: "recruit.co.jp",
    industry: { ja: "人材・メディア", en: "HR / media" },
    dueDate: "2026-06-27T14:59:00.000Z",
    status: "applied",
    stage: { ja: "ES提出済み", en: "ES submitted" },
    owner: { ja: "AK", en: "AK" },
    due: { ja: "6/27", en: "Jun 27" },
    test: "SPI",
    visibility: { ja: "共有", en: "Room" },
    accent: "green",
  },
  {
    id: "toyota",
    name: { ja: "トヨタ自動車", en: "Toyota Motor" },
    domain: "toyota-global.com",
    industry: { ja: "自動車", en: "Automotive" },
    dueDate: "2026-07-02T14:59:00.000Z",
    status: "research",
    stage: { ja: "企業研究", en: "Research" },
    owner: { ja: "自分", en: "Me" },
    due: { ja: "7/02", en: "Jul 02" },
    test: "不明",
    visibility: { ja: "非公開", en: "Private" },
    accent: "amber",
  },
  {
    id: "nintendo",
    name: { ja: "任天堂", en: "Nintendo" },
    domain: "nintendo.com",
    industry: { ja: "ゲーム・玩具", en: "Games / toys" },
    dueDate: "2026-07-05T14:59:00.000Z",
    status: "offer",
    stage: { ja: "条件確認", en: "Offer review" },
    owner: { ja: "自分", en: "Me" },
    due: { ja: "7/05", en: "Jul 05" },
    test: "CUBIC",
    visibility: { ja: "共有", en: "Room" },
    accent: "rose",
  },
  {
    id: "cyberagent",
    name: { ja: "サイバーエージェント", en: "CyberAgent" },
    domain: "cyberagent.co.jp",
    industry: { ja: "広告・IT", en: "Advertising / IT" },
    dueDate: "2026-07-10T14:59:00.000Z",
    status: "hold",
    stage: { ja: "連絡待ち", en: "Waiting" },
    owner: { ja: "YU", en: "YU" },
    due: { ja: "7/10", en: "Jul 10" },
    test: "企業独自",
    visibility: { ja: "共有", en: "Room" },
    accent: "violet",
  },
];

const calendarItems = [
  {
    time: "10:00",
    title: { ja: "ソニーグループ 二次面接", en: "Sony Group second interview" },
    meta: { ja: "オンライン / 共有メモ確認", en: "Online / review room notes" },
  },
  {
    time: "14:30",
    title: { ja: "トヨタ自動車 企業研究", en: "Toyota research block" },
    meta: { ja: "非公開メモ", en: "Private note" },
  },
  {
    time: "18:00",
    title: { ja: "リクルート SPI復習", en: "Recruit SPI review" },
    meta: { ja: "過去レポート参照", en: "Use past reports" },
  },
];

const priorityItems = [
  {
    label: { ja: "面接前に確認", en: "Before interview" },
    title: { ja: "ソニーグループ: 逆質問と研究領域メモ", en: "Sony Group: questions and research notes" },
    due: { ja: "今日 21:00", en: "Today 21:00" },
  },
  {
    label: { ja: "提出物", en: "Submission" },
    title: { ja: "リクルート: MyPageの追加設問", en: "Recruit: MyPage extra question" },
    due: { ja: "明日", en: "Tomorrow" },
  },
  {
    label: { ja: "整理", en: "Triage" },
    title: { ja: "企業ロゴとドメイン未登録の候補を補完", en: "Complete missing domains and logos" },
    due: { ja: "今週", en: "This week" },
  },
];

const kanbanColumns = [
  { title: { ja: "企業研究", en: "Research" }, status: "research" as const },
  { title: { ja: "応募済み", en: "Applied" }, status: "applied" as const },
  { title: { ja: "面接中", en: "Interview" }, status: "interview" as const },
  { title: { ja: "内定/条件", en: "Offer" }, status: "offer" as const },
];

const testReports = [
  { company: companies[0], type: "TG-WEB", source: { ja: "共有メモ", en: "Room note" }, updated: { ja: "今日", en: "Today" } },
  { company: companies[1], type: "SPI", source: { ja: "先輩レポート", en: "Past candidate" }, updated: { ja: "昨日", en: "Yesterday" } },
  { company: companies[3], type: "CUBIC", source: { ja: "手入力", en: "Manual" }, updated: { ja: "6/18", en: "Jun 18" } },
];

const referenceNow = new Date("2026-06-21T09:00:00+09:00");

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => readInitialLocale());
  const [user, setUser] = useState<ApiUser | null>(null);
  const [health, setHealth] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    window.localStorage.setItem("job-hunt-vault-locale", locale);
  }, [locale]);

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

  const t = copy[locale];

  return (
    <div className="app-shell" lang={locale}>
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="Job Hunt Vault home">
          <span className="brand-mark">JH</span>
          <span>
            <strong>Job Hunt Vault</strong>
            <small>{t.status[health]}</small>
          </span>
        </Link>

        <nav aria-label={locale === "ja" ? "メイン" : "Primary"} className="main-nav">
          {navItems.map((item) => (
            <NavLink className="nav-item" key={item.to} to={item.to}>
              <item.icon size={18} aria-hidden="true" />
              <span>{t.nav[item.key]}</span>
            </NavLink>
          ))}
        </nav>

        <section className="room-switcher" aria-label={locale === "ja" ? "ルーム" : "Rooms"}>
          <p>{locale === "ja" ? "ルーム" : "Rooms"}</p>
          <Link to="/rooms/demo-room" className="room-pill active-room">
            <span className="room-dot" />
            <span>{locale === "ja" ? "2027 東京" : "Tokyo 2027"}</span>
          </Link>
          <Link to="/rooms/personal" className="room-pill">
            <LockKeyhole size={14} aria-hidden="true" />
            <span>{locale === "ja" ? "個人" : "Personal"}</span>
          </Link>
        </section>

        <LocaleSwitch locale={locale} setLocale={setLocale} />

        <div className="session-panel">
          <div className="avatar">{initialsFor(user?.name ?? "Dev User")}</div>
          <div>
            <strong>{user?.name ?? (locale === "ja" ? "未ログイン" : "Not signed in")}</strong>
            <small>{user?.email ?? (locale === "ja" ? "Google OAuth / ローカル確認" : "Google OAuth / local mock")}</small>
          </div>
        </div>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage locale={locale} user={user} />} />
          <Route path="/personal/new" element={<StartRoomPage locale={locale} mode="personal" />} />
          <Route path="/rooms/new" element={<StartRoomPage locale={locale} mode="shared" />} />
          <Route path="/join/:roomCode?" element={<JoinRoomPage locale={locale} />} />
          <Route path="/rooms/:roomId" element={<RoomPage locale={locale} tab="overview" />} />
          <Route path="/rooms/:roomId/companies" element={<RoomPage locale={locale} tab="companies" />} />
          <Route path="/rooms/:roomId/companies/:companyId" element={<RoomPage locale={locale} tab="company-detail" />} />
          <Route path="/rooms/:roomId/progress" element={<RoomPage locale={locale} tab="progress" />} />
          <Route path="/rooms/:roomId/kanban" element={<RoomPage locale={locale} tab="kanban" />} />
          <Route path="/rooms/:roomId/tests" element={<RoomPage locale={locale} tab="tests" />} />
          <Route path="/rooms/:roomId/calendar" element={<RoomPage locale={locale} tab="calendar" />} />
          <Route path="/rooms/:roomId/vault" element={<RoomPage locale={locale} tab="vault" />} />
          <Route path="/rooms/:roomId/settings" element={<RoomPage locale={locale} tab="settings" />} />
        </Routes>
      </main>
    </div>
  );
}

function HomePage({ locale, user }: { locale: Locale; user: ApiUser | null }) {
  const [filter, setFilter] = useState<CompanyStatus | "all">("all");
  const [sortMode, setSortMode] = useState<CompanySortMode>("deadline");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const t = copy[locale];
  const visibleCompanies = useMemo(
    () => sortCompanies(filterCompanies(companies, filter, industryFilter, locale), sortMode, locale),
    [filter, industryFilter, locale, sortMode],
  );

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t.home.eyebrow}</p>
          <h1>{t.home.title}</h1>
        </div>
        <a className="primary-action" href="/api/auth/google/start">
          <LogIn size={18} aria-hidden="true" />
          <span>{user ? t.home.refresh : t.home.login}</span>
        </a>
      </header>

      <section className="ops-grid" aria-label={locale === "ja" ? "本日の要点" : "Today summary"}>
        <Metric label={locale === "ja" ? "本日締切" : "Due today"} value="2" trend={locale === "ja" ? "ES / 面接準備" : "ES / prep"} />
        <Metric label={locale === "ja" ? "次の面接" : "Next interview"} value="6/24" trend="10:00" />
        <Metric label={locale === "ja" ? "未整理メモ" : "Unsorted notes"} value="5" trend={locale === "ja" ? "共有前確認" : "Review before sharing"} />
        <Metric label={locale === "ja" ? "ロゴ候補" : "Logo candidates"} value="5" trend={locale === "ja" ? "ドメイン登録済み" : "Domains ready"} />
      </section>

      <DeadlineStrip companies={companies} locale={locale} />

      <section className="workbench">
        <div className="surface queue-surface">
          <PanelHeader title={t.home.queue} actionLabel={locale === "ja" ? "日程へ" : "Schedule"} to="/rooms/demo-room/calendar" icon={CalendarDays} />
          <PriorityList locale={locale} />
        </div>
        <div className="surface next-company">
          <div>
            <p className="eyebrow">{locale === "ja" ? "次に触る企業" : "Next company"}</p>
            <h2>{text(companies[0].name, locale)}</h2>
            <span>{companies[0].domain}</span>
          </div>
          <div className="next-company-grid">
            <DetailItem label={locale === "ja" ? "現在地" : "Stage"} value={text(companies[0].stage, locale)} />
            <DetailItem label={locale === "ja" ? "検査" : "Test"} value={companies[0].test} />
          </div>
          <Link className="secondary-action" to="/rooms/demo-room/companies/sony">
            <BriefcaseBusiness size={17} aria-hidden="true" />
            <span>{locale === "ja" ? "企業詳細" : "Company detail"}</span>
          </Link>
        </div>
      </section>

      <section className="split-layout">
        <div className="surface table-surface">
          <PanelHeader title={t.home.pipeline} actionLabel={t.home.newCompany} to="/rooms/demo-room/companies" icon={Plus} />
          <CompanyControls
            industryFilter={industryFilter}
            locale={locale}
            setIndustryFilter={setIndustryFilter}
            setSortMode={setSortMode}
            sortMode={sortMode}
          />
          <SegmentedFilter locale={locale} value={filter} onChange={setFilter} />
          <CompanyTable companies={visibleCompanies} locale={locale} />
        </div>

        <aside className="right-rail">
          <div className="surface">
          <PanelHeader title={t.home.schedule} actionLabel={locale === "ja" ? "開く" : "Open"} to="/rooms/demo-room/calendar" icon={CalendarDays} />
            <DeadlineCalendar companies={companies.slice(0, 4)} locale={locale} />
          </div>
          <LogoProviderPanel locale={locale} />
          <div className="surface vault-summary">
            <div>
              <ShieldCheck size={20} aria-hidden="true" />
              <strong>{t.home.vault}</strong>
              <span>{locale === "ja" ? "認証情報 7件 / 共有なし" : "7 credentials / no sharing"}</span>
            </div>
            <Link to="/rooms/demo-room/vault" aria-label={locale === "ja" ? "金庫を開く" : "Open vault"}>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </section>
    </>
  );
}

function StartRoomPage({ locale, mode }: { locale: Locale; mode: "personal" | "shared" }) {
  const isPersonal = mode === "personal";
  const title = isPersonal
    ? locale === "ja"
      ? "個人ルームを作成"
      : "New personal room"
    : locale === "ja"
      ? "共有ルームを作成"
      : "New shared room";
  return (
    <>
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">{locale === "ja" ? "ルーム設定" : "Room setup"}</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="setup-layout">
        <form className="form-panel">
          <label>
            {locale === "ja" ? "ルーム名" : "Room name"}
            <input name="name" placeholder={isPersonal ? (locale === "ja" ? "自分の就活" : "My job hunt") : "2027 東京"} />
          </label>
          {!isPersonal ? (
            <label>
              {locale === "ja" ? "合言葉" : "Passphrase"}
              <input name="passphrase" type="password" placeholder={locale === "ja" ? "8文字以上" : "At least 8 characters"} />
            </label>
          ) : null}
          <label>
            {locale === "ja" ? "表示名" : "Display name"}
            <input name="displayName" placeholder={locale === "ja" ? "ルーム内で表示する名前" : "Name shown in this room"} />
          </label>
          <button className="primary-action" type="button">
            <Plus size={18} aria-hidden="true" />
            <span>{locale === "ja" ? "作成" : "Create"}</span>
          </button>
        </form>
        <SetupNotes locale={locale} mode={mode} />
      </div>
    </>
  );
}

function JoinRoomPage({ locale }: { locale: Locale }) {
  const { roomCode } = useParams();
  return (
    <>
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">{locale === "ja" ? "招待" : "Invitation"}</p>
          <h1>{locale === "ja" ? "共有ルームに参加" : "Join room"}</h1>
        </div>
      </header>
      <div className="setup-layout">
        <form className="form-panel">
          <label>
            {locale === "ja" ? "ルームコード" : "Room code"}
            <input name="roomCode" defaultValue={roomCode ?? ""} placeholder="rm_..." />
          </label>
          <label>
            {locale === "ja" ? "合言葉" : "Passphrase"}
            <input name="passphrase" type="password" />
          </label>
          <label>
            {locale === "ja" ? "表示名" : "Display name"}
            <input name="displayName" placeholder={locale === "ja" ? "ルーム内で表示する名前" : "Name shown in this room"} />
          </label>
          <button className="primary-action" type="button">
            <UserRoundPlus size={18} aria-hidden="true" />
            <span>{locale === "ja" ? "参加" : "Join"}</span>
          </button>
        </form>
        <div className="surface setup-notes">
          <h2>{locale === "ja" ? "共有の境界" : "Shared boundary"}</h2>
          <p>
            {locale === "ja"
              ? "企業情報と共有進捗はルーム内に出ます。個人の金庫と非公開進捗は本人だけに残ります。"
              : "Company data and room-visible progress are shared. Vault items and private progress stay personal."}
          </p>
        </div>
      </div>
    </>
  );
}

function RoomPage({ locale, tab }: { locale: Locale; tab: string }) {
  const { roomId, companyId } = useParams();
  const title = useMemo(() => titleForTab(tab, locale), [locale, tab]);

  return (
    <>
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">{locale === "ja" ? `ルーム ${roomId}` : `Room ${roomId}`}</p>
          <h1>{title}</h1>
        </div>
        <Link className="secondary-action" to="/rooms/demo-room/companies">
          <Search size={17} aria-hidden="true" />
          <span>{locale === "ja" ? "検索" : "Search"}</span>
        </Link>
      </header>
      <RoomNav locale={locale} roomId={roomId ?? "demo-room"} />
      <RoomContent locale={locale} tab={tab} companyId={companyId} />
    </>
  );
}

function RoomNav({ locale, roomId }: { locale: Locale; roomId: string }) {
  const t = copy[locale];
  return (
    <nav className="tab-row" aria-label={locale === "ja" ? "ルーム" : "Room"}>
      {roomTabs.map((item) => (
        <NavLink className="tab-item" key={item.key} to={`/rooms/${roomId}${item.suffix}`} end={item.suffix === ""}>
          <item.icon size={16} aria-hidden="true" />
          <span>{t.tabs[item.key]}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function RoomContent({ locale, tab, companyId }: { locale: Locale; tab: string; companyId?: string }) {
  if (tab === "companies") {
    return (
      <section className="surface table-surface">
        <PanelHeader title={locale === "ja" ? "企業台帳" : "Companies"} actionLabel={locale === "ja" ? "追加" : "Add"} to="/rooms/demo-room/companies" icon={Plus} />
        <CompanyIntakePanel locale={locale} />
        <CompanyTable companies={companies} locale={locale} />
      </section>
    );
  }

  if (tab === "company-detail") {
    const company = companies.find((item) => item.id === companyId) ?? companies[0];
    return <CompanyDetail company={company} locale={locale} />;
  }

  if (tab === "progress") {
    return (
      <section className="surface">
        <PanelHeader title={locale === "ja" ? "進捗マトリクス" : "Progress matrix"} actionLabel={locale === "ja" ? "更新" : "Update"} to="/rooms/demo-room/progress" icon={CheckCircle2} />
        <ProgressMatrix locale={locale} />
      </section>
    );
  }

  if (tab === "kanban") {
    return <KanbanBoard locale={locale} />;
  }

  if (tab === "tests") {
    return (
      <section className="surface table-surface">
        <PanelHeader title={locale === "ja" ? "適性検査レポート" : "Test reports"} actionLabel={locale === "ja" ? "追加" : "Add report"} to="/rooms/demo-room/tests" icon={FlaskConical} />
        <TestReportTable locale={locale} />
      </section>
    );
  }

  if (tab === "calendar") {
    return (
      <section className="surface calendar-surface">
        <PanelHeader title={locale === "ja" ? "日程" : "Calendar"} actionLabel={locale === "ja" ? "予定追加" : "New event"} to="/rooms/demo-room/calendar" icon={CalendarDays} />
        <DeadlineCalendar companies={companies} locale={locale} large />
        <Timeline locale={locale} />
      </section>
    );
  }

  if (tab === "vault") {
    return <VaultPanel locale={locale} />;
  }

  if (tab === "settings") {
    return <SettingsPanel locale={locale} />;
  }

  return (
    <section className="split-layout">
      <div className="surface table-surface">
        <PanelHeader title={locale === "ja" ? "ルーム全体" : "Room overview"} actionLabel={locale === "ja" ? "企業追加" : "New company"} to="/rooms/demo-room/companies" icon={Plus} />
        <CompanyTable companies={companies.slice(0, 4)} locale={locale} />
      </div>
      <aside className="right-rail">
        <div className="surface">
          <PanelHeader title={locale === "ja" ? "今日" : "Today"} actionLabel={locale === "ja" ? "開く" : "Open"} to="/rooms/demo-room/calendar" icon={CalendarDays} />
          <Timeline locale={locale} />
        </div>
        <LogoProviderPanel locale={locale} />
      </aside>
    </section>
  );
}

function CompanyTable({ companies: rows, locale }: { companies: Company[]; locale: Locale }) {
  return (
    <div className="data-table" role="table" aria-label={locale === "ja" ? "企業" : "Companies"}>
      <div className="table-row table-head" role="row">
        <span>{locale === "ja" ? "企業" : "Company"}</span>
        <span>{locale === "ja" ? "業種" : "Industry"}</span>
        <span>{locale === "ja" ? "状態" : "Status"}</span>
        <span>{locale === "ja" ? "現在地" : "Stage"}</span>
        <span>{locale === "ja" ? "期限" : "Due"}</span>
        <span>{locale === "ja" ? "担当" : "Owner"}</span>
      </div>
      {rows.map((company) => (
        <Link className="table-row" role="row" key={company.id} to={`/rooms/demo-room/companies/${company.id}`}>
          <span className="company-cell">
            <span className={`logo-chip ${company.accent}`}>{initialsFor(text(company.name, locale))}</span>
            <span>
              <strong>{text(company.name, locale)}</strong>
              <small>{company.domain}</small>
            </span>
          </span>
          <span>{text(company.industry, locale)}</span>
          <StatusBadge locale={locale} status={company.status} />
          <span>{text(company.stage, locale)}</span>
          <span className={`remaining-cell ${deadlineTone(company.dueDate)}`}>
            <strong>{remainingTimeText(company.dueDate, locale)}</strong>
            <small>{text(company.due, locale)}</small>
          </span>
          <span className="owner-chip">{text(company.owner, locale)}</span>
        </Link>
      ))}
    </div>
  );
}

function CompanyDetail({ company, locale }: { company: Company; locale: Locale }) {
  return (
    <section className="detail-layout">
      <div className="surface detail-main">
        <div className="company-title">
          <span className={`logo-chip large ${company.accent}`}>{initialsFor(text(company.name, locale))}</span>
          <div>
            <p className="eyebrow">{company.domain}</p>
            <h2>{text(company.name, locale)}</h2>
          </div>
        </div>
        <div className="detail-grid">
          <DetailItem label={locale === "ja" ? "現在地" : "Current step"} value={text(company.stage, locale)} />
          <DetailItem label={locale === "ja" ? "期限" : "Deadline"} value={text(company.due, locale)} />
          <DetailItem label={locale === "ja" ? "適性検査" : "Test"} value={company.test} />
          <DetailItem label={locale === "ja" ? "公開範囲" : "Visibility"} value={text(company.visibility, locale)} />
        </div>
        <div className="step-list">
          {(locale === "ja" ? ["ES", "Webテスト", "一次面接", "二次面接", "最終面接"] : ["Entry sheet", "Web test", "First", "Second", "Final"]).map(
            (step, index) => (
              <div className="step-item" key={step}>
                <span className={index < 3 ? "step-dot complete" : "step-dot"} />
                <span>{step}</span>
              </div>
            ),
          )}
        </div>
      </div>
      <aside className="right-rail">
        <div className="surface">
          <PanelHeader title={locale === "ja" ? "リンク" : "Links"} actionLabel={locale === "ja" ? "開く" : "Open"} to="#" icon={LinkIcon} />
          <div className="link-list">
            <a href="#">{locale === "ja" ? "採用ページ" : "Career page"}</a>
            <a href="#">{locale === "ja" ? "MyPage" : "My page"}</a>
          </div>
        </div>
        <LogoProviderPanel locale={locale} company={company} />
      </aside>
    </section>
  );
}

function CompanyControls({
  industryFilter,
  locale,
  setIndustryFilter,
  setSortMode,
  sortMode,
}: {
  industryFilter: string;
  locale: Locale;
  setIndustryFilter: (value: string) => void;
  setSortMode: (value: CompanySortMode) => void;
  sortMode: CompanySortMode;
}) {
  const industries = Array.from(new Set(companies.map((company) => text(company.industry, locale))));
  const sortOptions: Array<{ value: CompanySortMode; label: LocalText }> = [
    { value: "deadline", label: { ja: "締切順", en: "Deadline" } },
    { value: "kana", label: { ja: "50音順", en: "A-Z" } },
    { value: "industry", label: { ja: "業種順", en: "Industry" } },
  ];

  return (
    <div className="company-controls">
      <div className="sort-tabs" aria-label={locale === "ja" ? "並べ替え" : "Sort"}>
        {sortOptions.map((option) => (
          <button
            className={sortMode === option.value ? "selected" : ""}
            key={option.value}
            onClick={() => setSortMode(option.value)}
            type="button"
          >
            {text(option.label, locale)}
          </button>
        ))}
      </div>
      <label className="industry-select">
        <span>{locale === "ja" ? "業種" : "Industry"}</span>
        <select value={industryFilter} onChange={(event) => setIndustryFilter(event.target.value)}>
          <option value="all">{locale === "ja" ? "すべて" : "All"}</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function CompanyIntakePanel({ locale }: { locale: Locale }) {
  return (
    <form className="company-intake-panel">
      <label>
        {locale === "ja" ? "企業名" : "Company"}
        <input placeholder={locale === "ja" ? "例: ソニーグループ" : "Example: Sony Group"} />
      </label>
      <label>
        {locale === "ja" ? "業種" : "Industry"}
        <input placeholder={locale === "ja" ? "例: 電機・エンタメ" : "Example: Electronics"} />
      </label>
      <label>
        {locale === "ja" ? "直近締切" : "Priority deadline"}
        <input type="datetime-local" />
      </label>
      <label>
        {locale === "ja" ? "ドメイン" : "Domain"}
        <input placeholder="example.com" />
      </label>
      <button className="secondary-action" type="button">
        <Plus size={16} aria-hidden="true" />
        <span>{locale === "ja" ? "下書き追加" : "Add draft"}</span>
      </button>
    </form>
  );
}

function SegmentedFilter({
  locale,
  value,
  onChange,
}: {
  locale: Locale;
  value: CompanyStatus | "all";
  onChange: (value: CompanyStatus | "all") => void;
}) {
  const options: Array<{ value: CompanyStatus | "all"; label: LocalText }> = [
    { value: "all", label: { ja: "すべて", en: "All" } },
    { value: "research", label: { ja: "企業研究", en: "Research" } },
    { value: "applied", label: { ja: "応募済み", en: "Applied" } },
    { value: "interview", label: { ja: "面接中", en: "Interview" } },
    { value: "offer", label: { ja: "内定", en: "Offer" } },
  ];

  return (
    <div className="segmented-control" role="tablist" aria-label={locale === "ja" ? "企業フィルター" : "Pipeline filter"}>
      {options.map((option) => (
        <button
          aria-selected={value === option.value}
          className={value === option.value ? "selected" : ""}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {text(option.label, locale)}
        </button>
      ))}
    </div>
  );
}

function PriorityList({ locale }: { locale: Locale }) {
  return (
    <div className="priority-list">
      {priorityItems.map((item) => (
        <div className="priority-item" key={item.title.ja}>
          <span>{text(item.label, locale)}</span>
          <strong>{text(item.title, locale)}</strong>
          <small>{text(item.due, locale)}</small>
        </div>
      ))}
    </div>
  );
}

function DeadlineStrip({ companies, locale }: { companies: Company[]; locale: Locale }) {
  const urgent = sortCompanies(companies, "deadline", locale).filter((company) => daysUntil(company.dueDate) <= 3);
  return (
    <section className="deadline-strip" aria-label={locale === "ja" ? "締切アラート" : "Deadline alerts"}>
      <div>
        <strong>{locale === "ja" ? "2〜3日前に入った企業" : "Entering the 2-3 day window"}</strong>
        <span>{locale === "ja" ? "残り時間が短い順に確認" : "Sorted by shortest remaining time"}</span>
      </div>
      <div className="deadline-chip-row">
        {urgent.map((company) => (
          <Link className={`deadline-chip ${deadlineTone(company.dueDate)}`} key={company.id} to={`/rooms/demo-room/companies/${company.id}`}>
            <span>{text(company.name, locale)}</span>
            <strong>{remainingTimeText(company.dueDate, locale)}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DeadlineCalendar({ companies, locale, large = false }: { companies: Company[]; locale: Locale; large?: boolean }) {
  const ordered = sortCompanies(companies, "deadline", locale);
  return (
    <div className={large ? "deadline-calendar large" : "deadline-calendar"}>
      {ordered.map((company) => (
        <Link className={`deadline-row ${deadlineTone(company.dueDate)}`} key={company.id} to={`/rooms/demo-room/companies/${company.id}`}>
          <time dateTime={company.dueDate}>{deadlineDateLabel(company.dueDate, locale)}</time>
          <span>
            <strong>{text(company.name, locale)}</strong>
            <small>
              {text(company.stage, locale)} / {text(company.industry, locale)}
            </small>
          </span>
          <b>{remainingTimeText(company.dueDate, locale)}</b>
        </Link>
      ))}
    </div>
  );
}

function Timeline({ locale }: { locale: Locale }) {
  return (
    <div className="timeline">
      {calendarItems.map((item) => (
        <div className="timeline-item" key={`${item.time}-${item.title.ja}`}>
          <time>{item.time}</time>
          <span>
            <strong>{text(item.title, locale)}</strong>
            <small>{text(item.meta, locale)}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function KanbanBoard({ locale }: { locale: Locale }) {
  return (
    <section className="kanban-board" aria-label={locale === "ja" ? "選考ボード" : "Kanban"}>
      {kanbanColumns.map((column) => (
        <div className="kanban-column" key={column.status}>
          <div className="kanban-header">
            <strong>{text(column.title, locale)}</strong>
            <span>{companies.filter((company) => company.status === column.status).length}</span>
          </div>
          {companies
            .filter((company) => company.status === column.status)
            .map((company) => (
              <Link className="kanban-card" key={company.id} to={`/rooms/demo-room/companies/${company.id}`}>
                <span className={`logo-chip ${company.accent}`}>{initialsFor(text(company.name, locale))}</span>
                <strong>{text(company.name, locale)}</strong>
                <small>{text(company.stage, locale)}</small>
              </Link>
            ))}
        </div>
      ))}
    </section>
  );
}

function ProgressMatrix({ locale }: { locale: Locale }) {
  const steps = locale === "ja" ? ["ES", "検査", "一次", "二次", "最終"] : ["ES", "Test", "1st", "2nd", "Final"];
  return (
    <div className="matrix" role="table" aria-label={locale === "ja" ? "進捗マトリクス" : "Progress matrix"}>
      <div className="matrix-row matrix-head" role="row">
        <span>{locale === "ja" ? "企業" : "Company"}</span>
        {steps.map((step) => (
          <span key={step}>{step}</span>
        ))}
      </div>
      {companies.map((company, companyIndex) => (
        <div className="matrix-row" role="row" key={company.id}>
          <strong>{text(company.name, locale)}</strong>
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

function TestReportTable({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  return (
    <div className={compact ? "compact-list" : "data-table report-table"} role="table" aria-label={locale === "ja" ? "適性検査レポート" : "Test reports"}>
      {testReports.map((report) => (
        <div className={compact ? "compact-row" : "table-row"} key={`${report.company.id}-${report.type}`}>
          <span>
            <strong>{text(report.company.name, locale)}</strong>
            <small>{text(report.source, locale)}</small>
          </span>
          <span>{report.type}</span>
          {!compact ? <span>{text(report.updated, locale)}</span> : null}
        </div>
      ))}
    </div>
  );
}

function VaultPanel({ locale }: { locale: Locale }) {
  return (
    <section className="detail-layout">
      <div className="surface detail-main vault-panel">
        <div className="company-title">
          <span className="logo-chip large green">
            <KeyRound size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">{locale === "ja" ? "個人金庫" : "Personal Vault"}</p>
            <h2>{locale === "ja" ? "ブラウザで暗号化してから保存" : "Encrypted before upload"}</h2>
          </div>
        </div>
        <div className="vault-grid">
          <DetailItem label={locale === "ja" ? "保存項目" : "Items"} value="7" />
          <DetailItem label={locale === "ja" ? "関連企業" : "Linked companies"} value="3" />
          <DetailItem label={locale === "ja" ? "共有" : "Sharing"} value={locale === "ja" ? "なし" : "Off"} />
        </div>
        <form className="inline-vault-form">
          <label>
            {locale === "ja" ? "ラベル" : "Label"}
            <input placeholder={locale === "ja" ? "ソニー MyPage" : "Sony mypage"} />
          </label>
          <label>
            {locale === "ja" ? "暗号化済みデータ" : "Encrypted payload"}
            <input placeholder={locale === "ja" ? "ブラウザ内で生成" : "Created in browser"} />
          </label>
          <button className="primary-action" type="button">
            <LockKeyhole size={17} aria-hidden="true" />
            <span>{locale === "ja" ? "保存" : "Save"}</span>
          </button>
        </form>
      </div>
      <aside className="right-rail">
        <div className="surface setup-notes">
          <h2>{locale === "ja" ? "金庫の境界" : "Vault boundary"}</h2>
          <p>
            {locale === "ja"
              ? "パスフレーズはブラウザから出ません。サーバーは暗号化済みpayloadだけをユーザー単位で保存します。"
              : "Passphrases never leave the browser. Server routes filter every credential item by owner user."}
          </p>
        </div>
      </aside>
    </section>
  );
}

function SettingsPanel({ locale }: { locale: Locale }) {
  return (
    <section className="surface settings-grid">
      <DetailItem label={locale === "ja" ? "ルーム種別" : "Room type"} value={locale === "ja" ? "共有" : "Shared"} />
      <DetailItem label={locale === "ja" ? "参加方法" : "Join method"} value={locale === "ja" ? "コード + 合言葉" : "Room code + passphrase"} />
      <DetailItem label={locale === "ja" ? "アバター保存" : "Avatar storage"} value="Private R2" />
      <DetailItem label={locale === "ja" ? "Secrets" : "Secrets"} value="Cloudflare Workers" />
      <DetailItem label={locale === "ja" ? "ロゴ" : "Logos"} value="Logo.dev optional" />
    </section>
  );
}

function LogoProviderPanel({ locale, company }: { locale: Locale; company?: Company }) {
  return (
    <div className="surface logo-provider-panel">
      <div className="logo-provider-heading">
        <span className="logo-provider-icon">
          <Globe2 size={18} aria-hidden="true" />
        </span>
        <div>
          <strong>{locale === "ja" ? "Logo.dev連携" : "Logo.dev provider"}</strong>
          <small>{locale === "ja" ? "ドメインからロゴURLを解決" : "Resolve logo URL from domain"}</small>
        </div>
      </div>
      <div className="logo-provider-body">
        <DetailItem label={locale === "ja" ? "対象" : "Target"} value={company ? company.domain : "5 domains"} />
        <DetailItem label={locale === "ja" ? "状態" : "State"} value={locale === "ja" ? "設定待ち" : "Needs key"} />
      </div>
      <p>
        {locale === "ja"
          ? "公開repoにはロゴ画像を含めず、Cloudflareの環境変数にpublishable keyを入れた時だけAPIがURLを返します。"
          : "The public repo stores no logo files. The API returns logo URLs only when a publishable key is configured."}
      </p>
    </div>
  );
}

function SetupNotes({ locale, mode }: { locale: Locale; mode: "personal" | "shared" }) {
  const isPersonal = mode === "personal";
  return (
    <div className="surface setup-notes">
      <h2>{isPersonal ? (locale === "ja" ? "個人の境界" : "Personal boundary") : locale === "ja" ? "共有の境界" : "Shared boundary"}</h2>
      <p>
        {isPersonal
          ? locale === "ja"
            ? "最初は自分だけの部屋として作り、必要になったら共有ルームに変換できます。"
            : "A personal room starts private and can later be converted into a shared room."
          : locale === "ja"
            ? "企業情報と共有進捗だけをルームに出します。個人の金庫と非公開進捗は混ぜません。"
            : "Shared rooms expose company and room-visible progress, while Vault and private progress stay personal."}
      </p>
    </div>
  );
}

function LocaleSwitch({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  return (
    <div className="language-switch" aria-label="Language">
      <button className={locale === "ja" ? "selected" : ""} type="button" onClick={() => setLocale("ja")}>
        日本語
      </button>
      <button className={locale === "en" ? "selected" : ""} type="button" onClick={() => setLocale("en")}>
        EN
      </button>
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

function StatusBadge({ locale, status }: { locale: Locale; status: CompanyStatus }) {
  const label: Record<CompanyStatus, LocalText> = {
    research: { ja: "企業研究", en: "Research" },
    applied: { ja: "応募済み", en: "Applied" },
    interview: { ja: "面接中", en: "Interview" },
    offer: { ja: "内定", en: "Offer" },
    hold: { ja: "保留", en: "Hold" },
  };
  return <span className={`status-badge ${status}`}>{text(label[status], locale)}</span>;
}

function titleForTab(tab: string, locale: Locale): string {
  const labels: Record<string, LocalText> = {
    overview: { ja: "ルーム全体", en: "Room overview" },
    companies: { ja: "企業台帳", en: "Companies" },
    "company-detail": { ja: "企業詳細", en: "Company detail" },
    progress: { ja: "進捗マトリクス", en: "Progress matrix" },
    kanban: { ja: "選考ボード", en: "Selection board" },
    tests: { ja: "適性検査レポート", en: "Test reports" },
    calendar: { ja: "日程", en: "Calendar" },
    vault: { ja: "個人金庫", en: "Personal Vault" },
    settings: { ja: "ルーム設定", en: "Room settings" },
  };
  return text(labels[tab] ?? { ja: "ルーム", en: "Room" }, locale);
}

function filterCompanies(rows: Company[], status: CompanyStatus | "all", industry: string, locale: Locale): Company[] {
  return rows.filter((company) => {
    const statusMatch = status === "all" || company.status === status;
    const industryMatch = industry === "all" || text(company.industry, locale) === industry;
    return statusMatch && industryMatch;
  });
}

function sortCompanies(rows: Company[], sortMode: CompanySortMode, locale: Locale): Company[] {
  const collator = new Intl.Collator(locale === "ja" ? "ja" : "en", {
    numeric: true,
    sensitivity: "base",
  });
  return [...rows].sort((a, b) => {
    if (sortMode === "deadline") {
      return Date.parse(a.dueDate) - Date.parse(b.dueDate);
    }
    if (sortMode === "industry") {
      const industry = collator.compare(text(a.industry, locale), text(b.industry, locale));
      return industry || collator.compare(text(a.name, locale), text(b.name, locale));
    }
    return collator.compare(text(a.name, locale), text(b.name, locale));
  });
}

function daysUntil(dateIso: string): number {
  const diffMs = Date.parse(dateIso) - referenceNow.getTime();
  return Math.ceil(diffMs / 86_400_000);
}

function remainingTimeText(dateIso: string, locale: Locale): string {
  const diffMs = Date.parse(dateIso) - referenceNow.getTime();
  if (diffMs <= 0) {
    return locale === "ja" ? "期限超過" : "Overdue";
  }
  const totalHours = Math.ceil(diffMs / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days <= 0) {
    return locale === "ja" ? `残り${hours}時間` : `${hours}h left`;
  }
  if (locale === "ja") {
    return hours > 0 ? `残り${days}日${hours}時間` : `残り${days}日`;
  }
  return hours > 0 ? `${days}d ${hours}h left` : `${days}d left`;
}

function deadlineDateLabel(dateIso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateIso));
}

function deadlineTone(dateIso: string): "danger" | "warning" | "calm" {
  const days = daysUntil(dateIso);
  if (days <= 1) {
    return "danger";
  }
  if (days <= 3) {
    return "warning";
  }
  return "calm";
}

function initialsFor(name: string): string {
  const compact = name.replace(/\s+/g, "");
  if (/^[\x00-\x7F]+$/.test(compact)) {
    return compact
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return compact.slice(0, 2);
}

function text(value: LocalText, locale: Locale): string {
  return value[locale];
}

function readInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "ja";
  }
  const saved = window.localStorage.getItem("job-hunt-vault-locale");
  return saved === "en" ? "en" : "ja";
}
