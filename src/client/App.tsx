import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Columns3,
  Eye,
  EyeOff,
  FlaskConical,
  Gauge,
  Globe2,
  KeyRound,
  LockKeyhole,
  LogIn,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  avatarPhotoUrl,
  createApplication,
  createCompany,
  createEvent,
  createPersonalRoom,
  createSharedRoom,
  createTestReport,
  createTask,
  createVaultItem,
  deleteRoomMemberAvatar,
  getHealth,
  getMe,
  joinRoom,
  listRooms,
  listRoomCompanies,
  listProgress,
  listTestReports,
  listEvents,
  listTasks,
  listVaultItems,
  listRoomMembers,
  searchCompanyCatalog,
  searchLogoCandidates,
  setRoomMemberAvatar,
  type ApiCompany,
  type ApiApplication,
  type ApiRoomMember,
  type ApiRoomListItem,
  type ApiEvent,
  type ApiTestReport,
  type ApiTask,
  type ApiUser,
  type ApiVaultItem,
  type CatalogCompany,
  type CatalogSearchResponse,
  type LogoSearchResult,
  uploadRoomMemberAvatar,
} from "./api";
import { decryptVaultText, encryptVaultText, type EncryptedVaultPayload } from "./vaultCrypto";

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
  nameKana: string;
  domain: string;
  industry: LocalText;
  dueDate: string | null;
  ticker: string | null;
  exchange: string | null;
  marketSegment: string;
  legalType: string;
  careerUrl: string;
  mypageUrl: string;
  logoUrl?: string | null;
  status: CompanyStatus;
  stage: LocalText;
  owner: LocalText;
  due: LocalText;
  test: string;
  visibility: LocalText;
  accent: "blue" | "green" | "amber" | "rose" | "violet";
};

type TestReportDisplay = {
  id: string;
  company: Company;
  type: string;
  source: LocalText;
  notes: string;
  visibility: "room" | "private";
  updated: LocalText;
  updatedAt: string;
};

type VaultPlainPayload = {
  version: 1;
  label: string;
  content: string;
  savedAt: string;
};

const copy = {
  ja: {
    nav: {
      dashboard: "概要",
      personal: "個人スペース",
      shared: "共有スペース",
      join: "参加",
    },
    tabs: {
      overview: "全体",
      companies: "企業一覧",
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
      offline: "保存先未接続",
    },
    home: {
      eyebrow: "本日の運用",
      title: "今日の選考ボード",
      login: "Googleでログイン",
      refresh: "セッション更新",
      queue: "今日やること",
      pipeline: "選考企業",
      schedule: "日程",
      vault: "個人金庫",
      logos: "企業情報",
      newCompany: "企業を追加",
    },
  },
  en: {
    nav: {
      dashboard: "Overview",
      personal: "Personal space",
      shared: "Shared space",
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
      offline: "storage offline",
    },
    home: {
      eyebrow: "Today",
      title: "Selection Board",
      login: "Sign in with Google",
      refresh: "Refresh session",
      queue: "Priority queue",
      pipeline: "Selection list",
      schedule: "Schedule",
      vault: "Private vault",
      logos: "Company info",
      newCompany: "Add company",
    },
  },
} satisfies Record<Locale, unknown>;

const navItems = [
  { to: "/", key: "dashboard" as const, icon: Gauge },
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

const accentCycle: Company["accent"][] = ["blue", "green", "amber", "rose", "violet"];
const emptyCompanies: Company[] = [];

function mapApiCompany(row: ApiCompany, index: number): Company {
  const dueDate = row.priority_deadline_at;
  return {
    id: row.id,
    name: { ja: row.name, en: row.name },
    nameKana: row.name_kana ?? row.name,
    domain: row.domain ?? "",
    industry: { ja: row.industry ?? "未分類", en: row.industry ?? "Uncategorized" },
    dueDate,
    ticker: row.ticker,
    exchange: row.exchange,
    marketSegment: row.market_segment ?? "",
    legalType: row.legal_type ?? "",
    careerUrl: row.career_url ?? "",
    mypageUrl: row.mypage_url ?? "",
    logoUrl: row.logo_url,
    status: "research",
    stage: { ja: "企業研究", en: "Research" },
    owner: { ja: "自分", en: "Me" },
    due: dueDate ? { ja: deadlineDateLabel(dueDate, "ja"), en: deadlineDateLabel(dueDate, "en") } : { ja: "未登録", en: "Not set" },
    test: "未登録",
    visibility: { ja: "共有", en: "Room" },
    accent: accentCycle[index % accentCycle.length],
  };
}

const kanbanColumns = [
  { title: { ja: "企業研究", en: "Research" }, status: "research" as const },
  { title: { ja: "応募済み", en: "Applied" }, status: "applied" as const },
  { title: { ja: "面接中", en: "Interview" }, status: "interview" as const },
  { title: { ja: "内定/条件", en: "Offer" }, status: "offer" as const },
];

const applicationStatusOptions = [
  { value: "tracking", label: { ja: "追跡中", en: "Tracking" }, stepIndex: 0 },
  { value: "submitted", label: { ja: "ES提出", en: "ES submitted" }, stepIndex: 1 },
  { value: "test", label: { ja: "検査待ち", en: "Test" }, stepIndex: 2 },
  { value: "interview", label: { ja: "面接中", en: "Interview" }, stepIndex: 3 },
  { value: "final", label: { ja: "最終前", en: "Final" }, stepIndex: 4 },
  { value: "offer", label: { ja: "内定/条件", en: "Offer" }, stepIndex: 4 },
  { value: "hold", label: { ja: "保留", en: "Hold" }, stepIndex: 0 },
];

type CompanyDraft = {
  domain: string;
  exchange: string;
  industry: string;
  legalType: string;
  logoUrl: string;
  marketSegment: string;
  careerUrl: string;
  mypageUrl: string;
  name: string;
  nameKana: string;
  ticker: string;
};

const industryOptionValues = [
  "",
  "機械",
  "電気機器",
  "電気機器・エンタメ",
  "輸送用機器",
  "情報・通信",
  "IT・情報通信",
  "インターネットサービス",
  "サービス",
  "小売",
  "総合商社",
  "銀行",
  "広告・マーケティング",
  "空運",
  "鉄鋼",
  "レジャー",
  "官公庁",
  "地方自治体",
  "独立行政法人",
  "国立研究開発法人",
  "教育・研究",
  "その他",
];

const exchangeOptionValues = ["", "TSE", "NSE", "FSE", "SSE", "TOKYO PRO Market"];
const marketSegmentValues = ["", "プライム", "スタンダード", "グロース", "TOKYO PRO Market", "非上場", "対象外"];
const legalTypeValues = [
  "",
  "株式会社",
  "合同会社",
  "有限会社",
  "一般社団法人",
  "一般財団法人",
  "公益社団法人",
  "公益財団法人",
  "独立行政法人",
  "国立研究開発法人",
  "国立大学法人",
  "学校法人",
  "医療法人",
  "社会福祉法人",
  "省庁",
  "地方自治体",
  "その他",
];

function createEmptyCompanyDraft(): CompanyDraft {
  return {
    domain: "",
    exchange: "",
    industry: "",
    legalType: "",
    logoUrl: "",
    marketSegment: "",
    careerUrl: "",
    mypageUrl: "",
    name: "",
    nameKana: "",
    ticker: "",
  };
}

function optionList(values: string[], locale: Locale, emptyJa: string, emptyEn: string): Array<{ label: string; value: string }> {
  return values.map((value) => ({
    label: value || (locale === "ja" ? emptyJa : emptyEn),
    value,
  }));
}

function industryOptions(locale: Locale) {
  return optionList(industryOptionValues, locale, "未選択", "Not selected");
}

function exchangeOptions(locale: Locale) {
  return optionList(exchangeOptionValues, locale, "対象外・未選択", "N/A or not selected");
}

function marketSegmentOptions(locale: Locale) {
  return optionList(marketSegmentValues, locale, "対象外・未選択", "N/A or not selected");
}

function legalTypeOptions(locale: Locale) {
  return optionList(legalTypeValues, locale, "未選択", "Not selected");
}

function setDraftField(
  setDraft: Dispatch<SetStateAction<CompanyDraft>>,
  key: keyof CompanyDraft,
  value: string,
) {
  setDraft((current) => ({ ...current, [key]: value }));
}

function inferLegalType(name: string): string {
  if (name.includes("合同会社")) return "合同会社";
  if (name.includes("有限会社")) return "有限会社";
  if (name.includes("国立研究開発法人")) return "国立研究開発法人";
  if (name.includes("独立行政法人")) return "独立行政法人";
  if (name.includes("国立大学法人")) return "国立大学法人";
  if (name.includes("学校法人")) return "学校法人";
  if (name.includes("省") || name.includes("庁")) return "省庁";
  if (name.includes("市") || name.includes("区役所") || name.includes("県庁") || name.includes("都庁") || name.includes("府庁")) return "地方自治体";
  if (name.includes("株式会社") || !name.match(/法人|省|庁|役所|市$/)) return "株式会社";
  return "その他";
}

const referenceNow = new Date("2026-06-21T09:00:00+09:00");

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => readInitialLocale());
  const [rooms, setRooms] = useState<ApiRoomListItem[]>([]);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [health, setHealth] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    window.localStorage.setItem("job-hunt-vault-locale", locale);
  }, [locale]);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([getMe(), getHealth(), listRooms()]).then(([meResult, healthResult, roomsResult]) => {
      if (!active) {
        return;
      }
      if (meResult.status === "fulfilled") {
        setUser(meResult.value.user);
      }
      if (roomsResult.status === "fulfilled") {
        setRooms(roomsResult.value.rooms);
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
        <Link className="brand" to="/" aria-label={locale === "ja" ? "就活選考 ホーム" : "Selection Desk home"}>
          <span className="brand-mark">就</span>
          <span>
            <strong>{locale === "ja" ? "就活選考" : "Selection Desk"}</strong>
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

        <section className="room-switcher" aria-label={locale === "ja" ? "スペース" : "Rooms"}>
          <div className="room-switcher-heading">
            <p>{locale === "ja" ? "スペース" : "Rooms"}</p>
            <div className="room-quick-actions">
              <Link className="room-action-button" to="/personal/new" title={locale === "ja" ? "個人スペースを作成" : "New personal space"}>
                <LockKeyhole size={15} aria-hidden="true" />
              </Link>
              <Link className="room-action-button" to="/rooms/new" title={locale === "ja" ? "共有スペースを作成" : "New shared space"}>
                <Plus size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="room-dock">
            {rooms.length ? (
              rooms.slice(0, 8).map((room) => (
                <NavLink
                  to={`/rooms/${room.id}`}
                  className={({ isActive }) => `room-tile${isActive ? " active-room" : ""}`}
                  key={room.id}
                  title={room.name}
                >
                  <span className={`room-avatar ${room.type}`}>
                    {room.type === "personal" ? <LockKeyhole size={15} aria-hidden="true" /> : initialsFor(room.name)}
                  </span>
                  <span>{room.name}</span>
                </NavLink>
              ))
            ) : (
              <div className="room-empty-state">
                <span>{locale === "ja" ? "まだスペースなし" : "No rooms yet"}</span>
              </div>
            )}
          </div>
        </section>

        <LocaleSwitch locale={locale} setLocale={setLocale} />

        <div className="session-panel">
          <div className="avatar">{initialsFor(user?.name ?? "Dev User")}</div>
          <div>
            <strong>{user?.name ?? (locale === "ja" ? "未ログイン" : "Not signed in")}</strong>
            <small>{user?.email ?? (locale === "ja" ? "ログイン前の確認画面" : "Preview before sign-in")}</small>
          </div>
        </div>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage locale={locale} rooms={rooms} user={user} />} />
          <Route path="/personal/new" element={<StartRoomPage locale={locale} mode="personal" />} />
          <Route path="/rooms/new" element={<StartRoomPage locale={locale} mode="shared" />} />
          <Route path="/join/:roomCode?" element={<JoinRoomPage locale={locale} />} />
          <Route path="/api/auth/google/start" element={<OAuthRouteRecovery locale={locale} mode="start" />} />
          <Route path="/api/auth/google/callback" element={<OAuthRouteRecovery locale={locale} mode="callback" />} />
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

function OAuthRouteRecovery({ locale, mode }: { locale: Locale; mode: "callback" | "start" }) {
  const location = useLocation();
  const targetLabel = mode === "start" ? (locale === "ja" ? "Google認証" : "Google sign-in") : locale === "ja" ? "ログイン完了処理" : "sign-in callback";

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has("_jhv_retry")) {
      params.set("_jhv_retry", String(Date.now()));
      const nextUrl = `${location.pathname}?${params.toString()}`;
      window.location.replace(nextUrl);
    }
  }, [location.pathname, location.search]);

  const fallbackHref = `${location.pathname}${location.search ? `${location.search}&` : "?"}_jhv_retry=${Date.now()}`;

  return (
    <section className="entry-shell" aria-labelledby="oauth-recovery-title">
      <div className="entry-panel recovery-panel">
        <span className="entry-mark">就</span>
        <p className="eyebrow">OAuth</p>
        <h1 id="oauth-recovery-title">{locale === "ja" ? `${targetLabel}へ移動中` : `Opening ${targetLabel}`}</h1>
        <p>
          {locale === "ja"
            ? "ブラウザが認証APIを画面として開いたため、もう一度安全に移動しています。"
            : "The browser opened the auth API as a page, so we are retrying the redirect safely."}
        </p>
        <a className="primary-action" href={fallbackHref}>
          <LogIn size={18} aria-hidden="true" />
          <span>{locale === "ja" ? "もう一度移動する" : "Retry sign-in"}</span>
        </a>
      </div>
    </section>
  );
}

function HomePage({ locale, rooms, user }: { locale: Locale; rooms: ApiRoomListItem[]; user: ApiUser | null }) {
  const location = useLocation();
  const authErrorMessage = authErrorMessageFor(new URLSearchParams(location.search).get("auth_error"), locale);

  if (!user) {
    return (
      <section className="entry-shell" aria-labelledby="entry-title">
        <div className="entry-panel">
          <span className="entry-mark">就</span>
          <p className="eyebrow">{locale === "ja" ? "選考ワークスペース" : "Selection workspace"}</p>
          <h1 id="entry-title">{locale === "ja" ? "就活選考" : "Selection Desk"}</h1>
          <p>
            {locale === "ja"
              ? "企業、締切、面接、Webテスト、認証情報をひとつの作業場にまとめます。"
              : "Keep companies, deadlines, interviews, tests, and credentials in one quiet workspace."}
          </p>
          {authErrorMessage ? (
            <div className="auth-error-notice" role="alert">
              <strong>{locale === "ja" ? "Googleログインに失敗しました" : "Google sign-in failed"}</strong>
              <span>{authErrorMessage}</span>
            </div>
          ) : null}
          <div className="entry-actions">
            <a className="primary-action" href="/api/auth/google/start">
              <LogIn size={18} aria-hidden="true" />
              <span>{locale === "ja" ? "Googleで始める" : "Continue with Google"}</span>
            </a>
            <Link className="secondary-action" to="/join">
              <UserRoundPlus size={18} aria-hidden="true" />
              <span>{locale === "ja" ? "招待コードで参加" : "Join with code"}</span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!rooms.length) {
    return (
      <>
        <header className="page-header compact-header">
          <div>
            <p className="eyebrow">{locale === "ja" ? "はじめる" : "Workspace"}</p>
            <h1>{locale === "ja" ? "選考ワークスペースを作成" : "Create a selection workspace"}</h1>
          </div>
        </header>
        <section className="home-action-grid" aria-label={locale === "ja" ? "スペース作成" : "Room actions"}>
          <HomeActionLink
            description={locale === "ja" ? "自分だけの選考管理を始める" : "Start a private selection workspace"}
            icon={LockKeyhole}
            label={locale === "ja" ? "個人スペース" : "Personal space"}
            to="/personal/new"
          />
          <HomeActionLink
            description={locale === "ja" ? "友人やメンターと選考状況を見る" : "Share progress with friends or mentors"}
            icon={UsersRound}
            label={locale === "ja" ? "共有スペース" : "Shared space"}
            to="/rooms/new"
          />
          <HomeActionLink
            description={locale === "ja" ? "受け取ったコードで参加する" : "Enter with an invitation code"}
            icon={UserRoundPlus}
            label={locale === "ja" ? "招待コード" : "Join with code"}
            to="/join"
          />
        </section>
      </>
    );
  }

  return (
    <>
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">{locale === "ja" ? "スペース" : "Rooms"}</p>
          <h1>{locale === "ja" ? "スペースを選択" : "Choose a room"}</h1>
        </div>
        <Link className="primary-action" to="/rooms/new">
          <Plus size={18} aria-hidden="true" />
          <span>{locale === "ja" ? "共有スペースを追加" : "New shared room"}</span>
        </Link>
      </header>
      <section className="room-home-grid" aria-label={locale === "ja" ? "スペース一覧" : "Room list"}>
        {rooms.map((room) => (
          <HomeRoomCard key={room.id} locale={locale} room={room} />
        ))}
      </section>
    </>
  );
}

function authErrorMessageFor(error: string | null, locale: Locale): string | null {
  if (!error) {
    return null;
  }
  if (error === "token_exchange_failed") {
    return locale === "ja"
      ? "Cloudflare Secrets の GOOGLE_CLIENT_SECRET が、Google Cloud のOAuthクライアントと一致しているか確認してください。"
      : "Check that GOOGLE_CLIENT_SECRET in Cloudflare Secrets belongs to the selected Google OAuth client.";
  }
  if (error === "id_token_audience_invalid") {
    return locale === "ja"
      ? "Cloudflare Secrets の GOOGLE_CLIENT_ID が、Google Cloud のOAuthクライアントIDと一致しているか確認してください。"
      : "Check that GOOGLE_CLIENT_ID in Cloudflare Secrets matches the Google OAuth client ID.";
  }
  if (error === "google_email_unverified") {
    return locale === "ja"
      ? "Googleアカウントのメール確認が完了しているか確認してください。"
      : "Check that the Google account email address is verified.";
  }
  return locale === "ja"
    ? "Google OAuth設定を確認してください。詳しい理由はCloudflareのWorkerログに記録されます。"
    : "Check the Google OAuth settings. The detailed reason is recorded in the Cloudflare Worker logs.";
}

function HomeActionLink({
  description,
  icon: Icon,
  label,
  to,
}: {
  description: string;
  icon: typeof Plus;
  label: string;
  to: string;
}) {
  return (
    <Link className="home-action-card" to={to}>
      <span className="home-action-icon">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}

function EmptyState({
  actionLabel,
  icon: Icon,
  text: body,
  title,
  to,
}: {
  actionLabel?: string;
  icon: typeof Plus;
  text: string;
  title: string;
  to?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon size={18} aria-hidden="true" />
      </span>
      <strong>{title}</strong>
      <p>{body}</p>
      {to && actionLabel ? (
        <Link className="secondary-action" to={to}>
          <ArrowRight size={16} aria-hidden="true" />
          <span>{actionLabel}</span>
        </Link>
      ) : null}
    </div>
  );
}

function HomeRoomCard({ locale, room }: { locale: Locale; room: ApiRoomListItem }) {
  return (
    <Link className="room-card" to={`/rooms/${room.id}`}>
      <span className={`room-avatar large ${room.type}`}>
        {room.type === "personal" ? <LockKeyhole size={18} aria-hidden="true" /> : initialsFor(room.name)}
      </span>
      <span>
        <strong>{room.name}</strong>
        <small>
          {roomTypeLabel(room.type, locale)} / {roomRoleLabel(room.role, locale)}
        </small>
      </span>
      <ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}

function StartRoomPage({ locale, mode }: { locale: Locale; mode: "personal" | "shared" }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isPersonal = mode === "personal";
  const title = isPersonal
    ? locale === "ja"
      ? "個人スペースを作成"
      : "New personal room"
    : locale === "ja"
      ? "共有スペースを作成"
      : "New shared room";
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    const name = readFormText(data, "name") || (isPersonal ? "Personal room" : "Shared room");
    const displayName = readFormText(data, "displayName");
    try {
      const result = isPersonal
        ? await createPersonalRoom({ name, displayName })
        : await createSharedRoom({
            displayName,
            name,
            passphrase: readFormText(data, "passphrase") ?? "",
          });
      navigate(`/rooms/${result.room.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "作成できませんでした" : "Could not create room");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">{locale === "ja" ? "スペース設定" : "Room setup"}</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="setup-layout">
        <form className="form-panel" onSubmit={handleSubmit}>
          <label>
            {locale === "ja" ? "スペース名" : "Room name"}
            <input name="name" placeholder={isPersonal ? (locale === "ja" ? "自分の就活" : "My job hunt") : "2027 東京"} />
          </label>
          {!isPersonal ? (
            <label>
              {locale === "ja" ? "合言葉" : "Passphrase"}
              <input name="passphrase" type="password" minLength={8} required placeholder={locale === "ja" ? "8文字以上" : "At least 8 characters"} />
            </label>
          ) : null}
          <label>
            {locale === "ja" ? "表示名" : "Display name"}
            <input name="displayName" placeholder={locale === "ja" ? "スペース内で表示する名前" : "Name shown in this room"} />
          </label>
          {message ? <p className="form-status danger">{message}</p> : null}
          <button className="primary-action" type="submit" disabled={submitting}>
            <Plus size={18} aria-hidden="true" />
            <span>{submitting ? (locale === "ja" ? "作成中" : "Creating") : locale === "ja" ? "作成" : "Create"}</span>
          </button>
        </form>
        <SetupNotes locale={locale} mode={mode} />
      </div>
    </>
  );
}

function JoinRoomPage({ locale }: { locale: Locale }) {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    try {
      const result = await joinRoom({
        displayName: readFormText(data, "displayName"),
        passphrase: readFormText(data, "passphrase") ?? "",
        roomCode: readFormText(data, "roomCode"),
      });
      navigate(`/rooms/${result.roomId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "参加できませんでした" : "Could not join room");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">{locale === "ja" ? "招待" : "Invitation"}</p>
          <h1>{locale === "ja" ? "共有スペースに参加" : "Join room"}</h1>
        </div>
      </header>
      <div className="setup-layout">
        <form className="form-panel" onSubmit={handleSubmit}>
          <label>
            {locale === "ja" ? "招待コード" : "Room code"}
            <input name="roomCode" defaultValue={roomCode ?? ""} required placeholder="rm_..." />
          </label>
          <label>
            {locale === "ja" ? "合言葉" : "Passphrase"}
            <input name="passphrase" type="password" minLength={8} required />
          </label>
          <label>
            {locale === "ja" ? "表示名" : "Display name"}
            <input name="displayName" placeholder={locale === "ja" ? "スペース内で表示する名前" : "Name shown in this room"} />
          </label>
          {message ? <p className="form-status danger">{message}</p> : null}
          <button className="primary-action" type="submit" disabled={submitting}>
            <UserRoundPlus size={18} aria-hidden="true" />
            <span>{submitting ? (locale === "ja" ? "参加中" : "Joining") : locale === "ja" ? "参加" : "Join"}</span>
          </button>
        </form>
        <div className="surface setup-notes">
          <h2>{locale === "ja" ? "共有の境界" : "Shared boundary"}</h2>
          <p>
            {locale === "ja"
              ? "企業情報と共有進捗はスペース内に出ます。個人の金庫と非公開進捗は本人だけに残ります。"
              : "Company data and room-visible progress are shared. Vault items and private progress stay personal."}
          </p>
        </div>
      </div>
    </>
  );
}

function RoomPage({ locale, tab }: { locale: Locale; tab: string }) {
  const { roomId, companyId } = useParams();
  const activeRoomId = roomId ?? "demo-room";
  const title = useMemo(() => titleForTab(tab, locale), [locale, tab]);

  return (
    <>
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">{locale === "ja" ? `スペース ${activeRoomId}` : `Room ${activeRoomId}`}</p>
          <h1>{title}</h1>
        </div>
        <Link className="secondary-action" to={`/rooms/${activeRoomId}/companies`}>
          <Search size={17} aria-hidden="true" />
          <span>{locale === "ja" ? "検索" : "Search"}</span>
        </Link>
      </header>
      <RoomNav locale={locale} roomId={activeRoomId} />
      <RoomContent locale={locale} roomId={activeRoomId} tab={tab} companyId={companyId} />
    </>
  );
}

function RoomNav({ locale, roomId }: { locale: Locale; roomId: string }) {
  const t = copy[locale];
  return (
    <nav className="tab-row" aria-label={locale === "ja" ? "スペース" : "Room"}>
      {roomTabs.map((item) => (
        <NavLink className="tab-item" key={item.key} to={`/rooms/${roomId}${item.suffix}`} end={item.suffix === ""}>
          <item.icon size={16} aria-hidden="true" />
          <span>{t.tabs[item.key]}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function RoomContent({ locale, roomId, tab, companyId }: { locale: Locale; roomId: string; tab: string; companyId?: string }) {
  const [sortMode, setSortMode] = useState<CompanySortMode>("deadline");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [liveCompanies, setLiveCompanies] = useState<Company[] | null>(null);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [selectedCatalogCompany, setSelectedCatalogCompany] = useState<CatalogCompany | null>(null);
  const reloadCompanies = useCallback(async () => {
    setLoadMessage(null);
    try {
      const result = await listRoomCompanies(roomId, {
        industry: industryFilter,
        sort: sortMode,
      });
      setLiveCompanies(result.companies.map(mapApiCompany));
    } catch (error) {
      setLiveCompanies(null);
      setLoadMessage(error instanceof Error ? error.message : locale === "ja" ? "企業一覧を取得できませんでした" : "Could not load companies");
    }
  }, [industryFilter, locale, roomId, sortMode]);

  useEffect(() => {
    if (["overview", "companies", "company-detail", "calendar", "kanban", "progress", "tests"].includes(tab)) {
      void reloadCompanies();
    }
  }, [reloadCompanies, tab]);

  const roomCompanies = liveCompanies ?? emptyCompanies;
  const filteredCompanies = useMemo(
    () => sortCompanies(filterCompanies(roomCompanies, "all", industryFilter, locale), sortMode, locale),
    [industryFilter, locale, roomCompanies, sortMode],
  );

  if (tab === "companies") {
    return (
      <section className="surface table-surface">
        <PanelHeader title={locale === "ja" ? "選考企業" : "Selection list"} actionLabel={locale === "ja" ? "追加" : "Add"} to={`/rooms/${roomId}/companies`} icon={Plus} />
        <CatalogSearchPanel locale={locale} onSelected={setSelectedCatalogCompany} />
        <CompanyIntakePanel locale={locale} onCreated={reloadCompanies} roomId={roomId} selectedCatalog={selectedCatalogCompany} />
        <CompanyControls
          companies={roomCompanies}
          industryFilter={industryFilter}
          locale={locale}
          setIndustryFilter={setIndustryFilter}
          setSortMode={setSortMode}
          sortMode={sortMode}
        />
        {loadMessage ? <p className="form-status">{loadMessage}</p> : null}
        <CompanyTable companies={filteredCompanies} locale={locale} roomId={roomId} />
      </section>
    );
  }

  if (tab === "company-detail") {
    const company = roomCompanies.find((item) => item.id === companyId);
    if (!company) {
      return (
        <section className="surface">
          <EmptyState
            actionLabel={locale === "ja" ? "企業一覧へ" : "Open companies"}
            icon={BriefcaseBusiness}
            text={locale === "ja" ? "企業を追加すると、選考状況や締切をここで確認できます。" : "Add companies to view selection details and deadlines here."}
            title={locale === "ja" ? "企業がまだありません" : "No company selected"}
            to={`/rooms/${roomId}/companies`}
          />
        </section>
      );
    }
    return <CompanyDetail company={company} locale={locale} roomId={roomId} />;
  }

  if (tab === "progress") {
    return (
      <section className="surface">
        <PanelHeader title={locale === "ja" ? "進捗マトリクス" : "Progress matrix"} actionLabel={locale === "ja" ? "更新" : "Update"} to={`/rooms/${roomId}/progress`} icon={CheckCircle2} />
        <ProgressPanel companies={roomCompanies} locale={locale} roomId={roomId} />
      </section>
    );
  }

  if (tab === "kanban") {
    return <KanbanBoard companies={roomCompanies} locale={locale} roomId={roomId} />;
  }

  if (tab === "tests") {
    return (
      <section className="surface table-surface">
        <PanelHeader title={locale === "ja" ? "適性検査レポート" : "Test reports"} actionLabel={locale === "ja" ? "追加" : "Add report"} to={`/rooms/${roomId}/tests`} icon={FlaskConical} />
        <TestReportsPanel companies={roomCompanies} locale={locale} roomId={roomId} />
      </section>
    );
  }

  if (tab === "calendar") {
    return (
      <section className="surface calendar-surface">
        <PanelHeader title={locale === "ja" ? "日程" : "Calendar"} actionLabel={locale === "ja" ? "予定追加" : "New event"} to={`/rooms/${roomId}/calendar`} icon={CalendarDays} />
        <SchedulePanel companies={roomCompanies} locale={locale} roomId={roomId} />
      </section>
    );
  }

  if (tab === "vault") {
    return <VaultPanel locale={locale} roomId={roomId} />;
  }

  if (tab === "settings") {
    return <SettingsPanel locale={locale} roomId={roomId} />;
  }

  return (
    <section className="split-layout workspace-overview">
      <div className="surface table-surface overview-primary">
        <PanelHeader title={locale === "ja" ? "スペース全体" : "Room overview"} actionLabel={locale === "ja" ? "企業追加" : "New company"} to={`/rooms/${roomId}/companies`} icon={Plus} />
        <CompanyTable companies={roomCompanies.slice(0, 4)} locale={locale} roomId={roomId} />
      </div>
      <aside className="right-rail">
        <SchedulePreview companies={roomCompanies} locale={locale} roomId={roomId} />
        <LogoProviderPanel company={roomCompanies[0]} locale={locale} />
      </aside>
    </section>
  );
}

function CompanyTable({ companies: rows, locale, roomId }: { companies: Company[]; locale: Locale; roomId: string }) {
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
      {!rows.length ? (
        <div className="table-empty-row">
          <EmptyState
            actionLabel={locale === "ja" ? "企業を追加" : "Add company"}
            icon={BriefcaseBusiness}
            text={locale === "ja" ? "企業名、締切、選考状況を追加すると、ここに一覧として並びます。架空の企業やメモは表示しません。" : "Add company names, deadlines, and selection status. This view does not show placeholder records."}
            title={locale === "ja" ? "選考企業はまだありません" : "No companies yet"}
            to={`/rooms/${roomId}/companies`}
          />
        </div>
      ) : null}
      {rows.map((company) => (
        <Link className="table-row" role="row" key={company.id} to={`/rooms/${roomId}/companies/${company.id}`}>
          <span className="company-cell">
            <CompanyLogoMark company={company} locale={locale} />
            <span>
              <strong>{text(company.name, locale)}</strong>
              <small>{[company.mypageUrl ? (locale === "ja" ? "MyPage登録済み" : "MyPage saved") : company.careerUrl ? (locale === "ja" ? "採用ページ登録済み" : "Careers URL") : company.domain, formatTicker(company), company.legalType].filter(Boolean).join(" / ")}</small>
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

function CompanyLogoMark({ company, locale, large = false }: { company: Company; locale: Locale; large?: boolean }) {
  const label = text(company.name, locale);
  const className = `logo-chip${large ? " large" : ""} ${company.logoUrl ? "logo-image-chip" : company.accent}`;
  return (
    <span className={className}>
      {company.logoUrl ? <img alt="" loading="lazy" src={company.logoUrl} /> : initialsFor(label)}
    </span>
  );
}

function CompanyDetail({ company, locale, roomId }: { company: Company; locale: Locale; roomId: string }) {
  return (
    <section className="detail-layout">
      <div className="surface detail-main">
        <div className="company-title">
          <CompanyLogoMark company={company} locale={locale} large />
          <div>
            <p className="eyebrow">{[company.legalType, company.marketSegment].filter(Boolean).join(" / ") || company.domain}</p>
            <h2>{text(company.name, locale)}</h2>
          </div>
        </div>
        <div className="detail-grid">
          <DetailItem label={locale === "ja" ? "現在地" : "Current step"} value={text(company.stage, locale)} />
          <DetailItem label={locale === "ja" ? "期限" : "Deadline"} value={text(company.due, locale)} />
          <DetailItem label={locale === "ja" ? "業種" : "Industry"} value={text(company.industry, locale)} />
          <DetailItem label={locale === "ja" ? "法人区分" : "Legal type"} value={company.legalType || (locale === "ja" ? "未登録" : "Not set")} />
          <DetailItem label={locale === "ja" ? "市場区分" : "Market segment"} value={company.marketSegment || (locale === "ja" ? "対象外・未登録" : "N/A or not set")} />
          <DetailItem label={locale === "ja" ? "証券コード" : "Ticker"} value={formatTicker(company) ?? (locale === "ja" ? "未登録" : "Not set")} />
          <DetailItem label={locale === "ja" ? "採用ページURL" : "Careers URL"} value={company.careerUrl || (locale === "ja" ? "未登録" : "Not set")} />
          <DetailItem label="MyPage URL" value={company.mypageUrl || (locale === "ja" ? "未登録" : "Not set")} />
          <DetailItem label={locale === "ja" ? "公式ドメイン" : "Official domain"} value={company.domain || (locale === "ja" ? "未登録" : "Not set")} />
          <DetailItem label={locale === "ja" ? "適性検査" : "Test"} value={company.test} />
          <DetailItem label={locale === "ja" ? "公開範囲" : "Visibility"} value={text(company.visibility, locale)} />
        </div>
        <div className="detail-empty-note">
          <span>{locale === "ja" ? "進捗は未登録です" : "Progress is not registered yet"}</span>
          <Link to={`/rooms/${roomId}/progress`}>
            {locale === "ja" ? "進捗を保存" : "Save progress"}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <aside className="right-rail">
        <LogoProviderPanel locale={locale} company={company} />
      </aside>
    </section>
  );
}

function CompanyControls({
  companies: rows,
  industryFilter,
  locale,
  setIndustryFilter,
  setSortMode,
  sortMode,
}: {
  companies: Company[];
  industryFilter: string;
  locale: Locale;
  setIndustryFilter: (value: string) => void;
  setSortMode: (value: CompanySortMode) => void;
  sortMode: CompanySortMode;
}) {
  const industries = Array.from(new Set(rows.map((company) => text(company.industry, locale)).filter(Boolean)));
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

function CatalogSearchPanel({ locale, onSelected }: { locale: Locale; onSelected: (company: CatalogCompany) => void }) {
  const [catalogInfo, setCatalogInfo] = useState<CatalogSearchResponse["catalog"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogCompany[]>([]);
  const [searching, setSearching] = useState(false);
  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearching(true);
    setMessage(null);
    try {
      const response = await searchCompanyCatalog(query);
      setCatalogInfo(response.catalog);
      setResults(response.companies);
      if (!response.companies.length) {
        setMessage(locale === "ja" ? "辞書に候補がありません。" : "No catalog matches.");
      }
    } catch (error) {
      setCatalogInfo(null);
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "辞書を検索できませんでした" : "Could not search catalog");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="catalog-search-panel">
      <form className="catalog-search-form" onSubmit={handleSearch}>
        <label>
          {locale === "ja" ? "企業・法人辞書" : "Company and organization catalog"}
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder={locale === "ja" ? "企業名・法人名・証券コードで検索" : "Search name, organization, or ticker"}
            value={query}
          />
        </label>
        <button className="secondary-action" type="submit" disabled={searching}>
          <Search size={16} aria-hidden="true" />
          <span>{searching ? (locale === "ja" ? "検索中" : "Searching") : locale === "ja" ? "検索" : "Search"}</span>
        </button>
      </form>
      {catalogInfo ? <p className="catalog-source-note">{formatCatalogSourceNote(catalogInfo, locale)}</p> : null}
      {message ? <p className={message.includes("追加") || message.includes("Added") ? "form-status success" : "form-status"}>{message}</p> : null}
      {results.length ? (
        <div className="catalog-result-list">
          {results.slice(0, 6).map((company) => (
            <div className="catalog-result-row" key={company.id}>
              <span>
                <strong>{company.name}</strong>
                <small>{[company.industry, company.market, legalTypeFromCatalog(company), formatCatalogTicker(company)].filter(Boolean).join(" / ")}</small>
              </span>
              <button className="secondary-action" type="button" onClick={() => onSelected({ ...company })}>
                <ArrowRight size={15} aria-hidden="true" />
                <span>{locale === "ja" ? "反映" : "Fill"}</span>
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CompanyIntakePanel({
  locale,
  onCreated,
  roomId,
  selectedCatalog,
}: {
  locale: Locale;
  onCreated: () => void;
  roomId: string;
  selectedCatalog: CatalogCompany | null;
}) {
  const [draft, setDraft] = useState(createEmptyCompanyDraft());
  const [message, setMessage] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedCatalog) {
      return;
    }
    setDraft((current) => ({
      ...current,
      domain: selectedCatalog.domain ?? current.domain,
      exchange: selectedCatalog.exchange ?? current.exchange,
      industry: selectedCatalog.industry ?? current.industry,
      legalType: legalTypeFromCatalog(selectedCatalog) || inferLegalType(selectedCatalog.name),
      logoUrl: selectedCatalog.logo_url ?? current.logoUrl,
      marketSegment: selectedCatalog.market ?? current.marketSegment,
      careerUrl: current.careerUrl,
      mypageUrl: keepUserEnteredMyPageUrl(current.mypageUrl, current.domain),
      name: selectedCatalog.name,
      nameKana: selectedCatalog.name_kana ?? current.nameKana,
      ticker: selectedCatalog.ticker ?? current.ticker,
    }));
    setMessage(locale === "ja" ? "辞書候補を反映しました。MyPage URLは必要に応じて手入力してください。" : "Catalog candidate filled. Enter the MyPage URL manually if needed.");
  }, [locale, selectedCatalog]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const deadline = readFormText(data, "priorityDeadlineAt");
    const name = readFormText(data, "name") ?? "";
    const mypagePassword = readFormText(data, "mypagePassword");
    const vaultPassphrase = readFormText(data, "vaultPassphrase");
    if (mypagePassword && (!vaultPassphrase || vaultPassphrase.length < 8)) {
      setSubmitting(false);
      setMessage(locale === "ja" ? "MyPageパスワードを保存する場合は、8文字以上の金庫パスフレーズも入力してください。" : "Enter a vault passphrase of at least 8 characters to save the MyPage password.");
      return;
    }
    try {
      await createCompany(roomId, {
        domain: readFormText(data, "domain"),
        exchange: readFormText(data, "exchange"),
        industry: readFormText(data, "industry"),
        legalType: readFormText(data, "legalType"),
        logoUrl: readFormText(data, "logoUrl"),
        marketSegment: readFormText(data, "marketSegment"),
        careerUrl: readFormText(data, "careerUrl"),
        mypageUrl: readFormText(data, "mypageUrl"),
        name,
        nameKana: readFormText(data, "nameKana"),
        priorityDeadlineAt: deadline ? new Date(deadline).toISOString() : undefined,
        ticker: readFormText(data, "ticker"),
      });
      if (mypagePassword) {
        const plain: VaultPlainPayload = {
          version: 1,
          label: `${name} MyPage`,
          content: [
            readFormText(data, "mypageUrl") ? `URL: ${readFormText(data, "mypageUrl")}` : null,
            `Password: ${mypagePassword}`,
          ]
            .filter(Boolean)
            .join("\n"),
          savedAt: new Date().toISOString(),
        };
        const encrypted = await encryptVaultText(JSON.stringify(plain), vaultPassphrase ?? "");
        await createVaultItem(roomId, { encryptedPayload: JSON.stringify(encrypted) });
      }
      form.reset();
      setDraft(createEmptyCompanyDraft());
      setMessage(locale === "ja" ? "企業を追加しました。" : "Company added.");
      onCreated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "保存できませんでした" : "Could not save company");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <form className="company-intake-panel" onSubmit={handleSubmit}>
      <label>
        {locale === "ja" ? "名称" : "Name"}
        <input name="name" required placeholder={locale === "ja" ? "例: 第一志望の企業・法人" : "Example: target organization"} value={draft.name} onChange={(event) => setDraftField(setDraft, "name", event.target.value)} />
      </label>
      <label>
        {locale === "ja" ? "読み" : "Reading"}
        <input name="nameKana" placeholder={locale === "ja" ? "みつびしじゅうこうぎょう" : "name reading"} value={draft.nameKana} onChange={(event) => setDraftField(setDraft, "nameKana", event.target.value)} />
      </label>
      <label>
        {locale === "ja" ? "業種" : "Industry"}
        <select name="industry" value={draft.industry} onChange={(event) => setDraftField(setDraft, "industry", event.target.value)}>
          {industryOptions(locale).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        {locale === "ja" ? "直近締切" : "Priority deadline"}
        <input name="priorityDeadlineAt" type="datetime-local" />
      </label>
      <label>
        {locale === "ja" ? "証券コード" : "Ticker"}
        <input name="ticker" placeholder={locale === "ja" ? "上場企業のみ" : "Listed only"} value={draft.ticker} onChange={(event) => setDraftField(setDraft, "ticker", event.target.value)} />
      </label>
      <label>
        {locale === "ja" ? "取引所" : "Exchange"}
        <select name="exchange" value={draft.exchange} onChange={(event) => setDraftField(setDraft, "exchange", event.target.value)}>
          {exchangeOptions(locale).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        {locale === "ja" ? "市場区分" : "Market segment"}
        <select name="marketSegment" value={draft.marketSegment} onChange={(event) => setDraftField(setDraft, "marketSegment", event.target.value)}>
          {marketSegmentOptions(locale).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        {locale === "ja" ? "法人区分" : "Legal type"}
        <select name="legalType" value={draft.legalType} onChange={(event) => setDraftField(setDraft, "legalType", event.target.value)}>
          {legalTypeOptions(locale).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        MyPage URL
        <input name="mypageUrl" placeholder={locale === "ja" ? "採用マイページのURLのみ" : "Only the recruiting MyPage URL"} type="url" value={draft.mypageUrl} onChange={(event) => setDraftField(setDraft, "mypageUrl", event.target.value)} />
      </label>
      <label>
        {locale === "ja" ? "採用ページURL" : "Careers URL"}
        <input name="careerUrl" placeholder={locale === "ja" ? "募集要項・採用トップのURL" : "Recruiting page URL"} type="url" value={draft.careerUrl} onChange={(event) => setDraftField(setDraft, "careerUrl", event.target.value)} />
      </label>
      <label>
        {locale === "ja" ? "公式ドメイン" : "Official domain"}
        <input name="domain" placeholder="example.com" value={draft.domain} onChange={(event) => setDraftField(setDraft, "domain", event.target.value)} />
      </label>
      <label className="password-label">
        {locale === "ja" ? "MyPage パスワード" : "MyPage password"}
        <span className="password-field">
          <input name="mypagePassword" placeholder={locale === "ja" ? "任意・金庫へ暗号化保存" : "Optional, encrypted in vault"} type={passwordVisible ? "text" : "password"} />
          <button type="button" onClick={() => setPasswordVisible((current) => !current)} aria-label={passwordVisible ? (locale === "ja" ? "隠す" : "Hide") : locale === "ja" ? "表示" : "Show"}>
            {passwordVisible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
          </button>
        </span>
      </label>
      <label>
        {locale === "ja" ? "金庫パスフレーズ" : "Vault passphrase"}
        <input name="vaultPassphrase" placeholder={locale === "ja" ? "8文字以上・任意" : "8+ characters, optional"} type="password" />
      </label>
      <input name="logoUrl" type="hidden" value={draft.logoUrl} />
      {message ? <p className={isPositiveMessage(message) ? "form-status success" : "form-status danger"}>{message}</p> : null}
      <button className="secondary-action" type="submit" disabled={submitting}>
        <Plus size={16} aria-hidden="true" />
        <span>{submitting ? (locale === "ja" ? "保存中" : "Saving") : locale === "ja" ? "保存" : "Save"}</span>
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

function DeadlineStrip({ companies, locale, roomId }: { companies: Company[]; locale: Locale; roomId: string }) {
  const urgent = sortCompanies(companies, "deadline", locale).filter((company) => company.dueDate && daysUntil(company.dueDate) <= 3);
  return (
    <section className="deadline-strip" aria-label={locale === "ja" ? "締切アラート" : "Deadline alerts"}>
      <div>
        <strong>{locale === "ja" ? "2〜3日前に入った企業" : "Entering the 2-3 day window"}</strong>
        <span>{locale === "ja" ? "残り時間が短い順に確認" : "Sorted by shortest remaining time"}</span>
      </div>
      <div className="deadline-chip-row">
        {urgent.map((company) => (
          <Link className={`deadline-chip ${deadlineTone(company.dueDate)}`} key={company.id} to={`/rooms/${roomId}/companies/${company.id}`}>
            <span>{text(company.name, locale)}</span>
            <strong>{remainingTimeText(company.dueDate, locale)}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SchedulePreview({ companies: rows, locale, roomId }: { companies: Company[]; locale: Locale; roomId: string }) {
  const [items, setItems] = useState<Array<{ companyId: string | null; id: string; kind: string; meta: string; time: string | null; title: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (roomId === "demo-room") {
      setItems([]);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    Promise.all([listEvents(roomId), listTasks(roomId)])
      .then(([eventResponse, taskResponse]) => {
        if (!active) {
          return;
        }
        const nextItems = [
          ...eventResponse.events.map((event) => ({
            companyId: event.company_id,
            id: event.id,
            kind: locale === "ja" ? "予定" : "Event",
            meta: [event.kind, visibilityLabel(event.visibility, locale)].filter(Boolean).join(" / "),
            time: event.starts_at,
            title: event.title,
          })),
          ...taskResponse.tasks.map((task) => ({
            companyId: task.company_id,
            id: task.id,
            kind: locale === "ja" ? "TODO" : "Task",
            meta: [taskStatusLabel(task.status, locale), visibilityLabel(task.visibility, locale)].join(" / "),
            time: task.due_at,
            title: task.title,
          })),
        ].sort((a, b) => scheduleSortValue(a.time) - scheduleSortValue(b.time));
        setItems(nextItems.slice(0, 4));
      })
      .catch(() => {
        if (active) {
          setItems([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [locale, roomId]);

  return (
    <div className="surface schedule-preview">
      <PanelHeader title={locale === "ja" ? "今日" : "Today"} actionLabel={locale === "ja" ? "開く" : "Open"} to={`/rooms/${roomId}/calendar`} icon={CalendarDays} />
      {items.length ? (
        <div className="schedule-list">
          {items.map((item) => (
            <div className="schedule-row" key={`${item.kind}-${item.id}`}>
              <time>{item.time ? formatDateTimeLabel(item.time, locale) : locale === "ja" ? "期限なし" : "No due date"}</time>
              <span>
                <strong>{item.title}</strong>
                <small>{[findCompanyName(rows, item.companyId, locale), item.meta].filter(Boolean).join(" / ")}</small>
              </span>
              <b>{item.kind}</b>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          actionLabel={locale === "ja" ? "日程を追加" : "Add schedule"}
          icon={CalendarDays}
          text={locale === "ja" ? "保存した予定やTODOだけを表示します。まだ登録がないため、ここには何も出していません。" : "Only saved events and tasks appear here. Nothing has been added yet."}
          title={loading ? (locale === "ja" ? "読み込み中" : "Loading") : locale === "ja" ? "今日の予定はまだありません" : "Nothing scheduled yet"}
          to={`/rooms/${roomId}/calendar`}
        />
      )}
    </div>
  );
}

function SchedulePanel({ companies: rows, locale, roomId }: { companies: Company[]; locale: Locale; roomId: string }) {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);

  const loadSchedule = useCallback(async () => {
    if (roomId === "demo-room") {
      setEvents([]);
      setTasks([]);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const [eventResponse, taskResponse] = await Promise.all([listEvents(roomId), listTasks(roomId)]);
      setEvents(eventResponse.events);
      setTasks(taskResponse.tasks);
    } catch (error) {
      setEvents([]);
      setTasks([]);
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "日程を取得できませんでした" : "Could not load schedule");
    } finally {
      setLoading(false);
    }
  }, [locale, roomId]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const handleEventSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = readFormText(data, "title");
    const startsAt = dateTimeLocalToIso(readFormText(data, "startsAt"));
    if (!title || !startsAt) {
      setMessage(locale === "ja" ? "予定名と開始日時を入力してください。" : "Enter an event title and start time.");
      return;
    }
    if (roomId === "demo-room") {
      setMessage(locale === "ja" ? "保存はスペース作成後に使えます。" : "Create or join a room to save events.");
      return;
    }
    setSubmittingEvent(true);
    setMessage(null);
    try {
      await createEvent(roomId, {
        companyId: readFormText(data, "companyId"),
        endsAt: dateTimeLocalToIso(readFormText(data, "endsAt")),
        kind: readFormText(data, "kind") ?? "event",
        startsAt,
        title,
        visibility: readVisibility(data),
      });
      form.reset();
      await loadSchedule();
      setMessage(locale === "ja" ? "予定を保存しました。" : "Event saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "予定を保存できませんでした" : "Could not save event");
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleTaskSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = readFormText(data, "title");
    if (!title) {
      setMessage(locale === "ja" ? "TODO名を入力してください。" : "Enter a task title.");
      return;
    }
    if (roomId === "demo-room") {
      setMessage(locale === "ja" ? "保存はスペース作成後に使えます。" : "Create or join a room to save tasks.");
      return;
    }
    setSubmittingTask(true);
    setMessage(null);
    try {
      await createTask(roomId, {
        companyId: readFormText(data, "companyId"),
        dueAt: dateTimeLocalToIso(readFormText(data, "dueAt")),
        status: readFormText(data, "status") ?? "open",
        title,
        visibility: readVisibility(data),
      });
      form.reset();
      await loadSchedule();
      setMessage(locale === "ja" ? "TODOを保存しました。" : "Task saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "TODOを保存できませんでした" : "Could not save task");
    } finally {
      setSubmittingTask(false);
    }
  };

  return (
    <div className="schedule-panel">
      <DeadlineCalendar companies={rows} locale={locale} roomId={roomId} large />
      <div className="schedule-forms">
        <form className="schedule-form" onSubmit={handleEventSubmit}>
          <strong>{locale === "ja" ? "予定" : "Event"}</strong>
          <label>
            {locale === "ja" ? "予定名" : "Title"}
            <input name="title" placeholder={locale === "ja" ? "一次面接 / ES締切確認" : "First interview / ES check"} required />
          </label>
          <label>
            {locale === "ja" ? "関連企業" : "Company"}
            <select name="companyId">
              <option value="">{locale === "ja" ? "なし" : "None"}</option>
              {rows.map((company) => (
                <option key={company.id} value={company.id}>
                  {text(company.name, locale)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {locale === "ja" ? "開始" : "Starts"}
            <input name="startsAt" required type="datetime-local" />
          </label>
          <label>
            {locale === "ja" ? "終了" : "Ends"}
            <input name="endsAt" type="datetime-local" />
          </label>
          <label>
            {locale === "ja" ? "公開範囲" : "Visibility"}
            <select name="visibility" defaultValue="room">
              <option value="room">{locale === "ja" ? "スペース共有" : "Room"}</option>
              <option value="private">{locale === "ja" ? "自分だけ" : "Private"}</option>
            </select>
          </label>
          <input name="kind" type="hidden" value="event" />
          <button className="secondary-action" type="submit" disabled={submittingEvent}>
            <Plus size={16} aria-hidden="true" />
            <span>{submittingEvent ? (locale === "ja" ? "保存中" : "Saving") : locale === "ja" ? "予定を保存" : "Save event"}</span>
          </button>
        </form>
        <form className="schedule-form" onSubmit={handleTaskSubmit}>
          <strong>{locale === "ja" ? "TODO" : "Task"}</strong>
          <label>
            {locale === "ja" ? "TODO名" : "Title"}
            <input name="title" placeholder={locale === "ja" ? "逆質問を整理 / MyPage確認" : "Prepare questions / Check MyPage"} required />
          </label>
          <label>
            {locale === "ja" ? "関連企業" : "Company"}
            <select name="companyId">
              <option value="">{locale === "ja" ? "なし" : "None"}</option>
              {rows.map((company) => (
                <option key={company.id} value={company.id}>
                  {text(company.name, locale)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {locale === "ja" ? "期限" : "Due"}
            <input name="dueAt" type="datetime-local" />
          </label>
          <label>
            {locale === "ja" ? "状態" : "Status"}
            <select name="status" defaultValue="open">
              <option value="open">{locale === "ja" ? "未完了" : "Open"}</option>
              <option value="done">{locale === "ja" ? "完了" : "Done"}</option>
            </select>
          </label>
          <label>
            {locale === "ja" ? "公開範囲" : "Visibility"}
            <select name="visibility" defaultValue="room">
              <option value="room">{locale === "ja" ? "スペース共有" : "Room"}</option>
              <option value="private">{locale === "ja" ? "自分だけ" : "Private"}</option>
            </select>
          </label>
          <button className="secondary-action" type="submit" disabled={submittingTask}>
            <Plus size={16} aria-hidden="true" />
            <span>{submittingTask ? (locale === "ja" ? "保存中" : "Saving") : locale === "ja" ? "TODOを保存" : "Save task"}</span>
          </button>
        </form>
      </div>
      {message ? <p className={isPositiveMessage(message) ? "form-status success" : "form-status"}>{message}</p> : null}
      {loading ? <p className="form-status">{locale === "ja" ? "読み込み中..." : "Loading..."}</p> : null}
      <ScheduleItemList companies={rows} events={events} locale={locale} tasks={tasks} />
    </div>
  );
}

function ScheduleItemList({
  companies: rows,
  events,
  locale,
  tasks,
}: {
  companies: Company[];
  events: ApiEvent[];
  locale: Locale;
  tasks: ApiTask[];
}) {
  const items = [
    ...events.map((event) => ({
      companyId: event.company_id,
      id: event.id,
      kind: locale === "ja" ? "予定" : "Event",
      meta: [event.kind, visibilityLabel(event.visibility, locale)].filter(Boolean).join(" / "),
      time: event.starts_at,
      title: event.title,
    })),
    ...tasks.map((task) => ({
      companyId: task.company_id,
      id: task.id,
      kind: locale === "ja" ? "TODO" : "Task",
      meta: [taskStatusLabel(task.status, locale), visibilityLabel(task.visibility, locale)].join(" / "),
      time: task.due_at,
      title: task.title,
    })),
  ].sort((a, b) => scheduleSortValue(a.time) - scheduleSortValue(b.time));

  if (!items.length) {
    return <p className="form-status">{locale === "ja" ? "まだ保存済みの予定やTODOはありません。" : "No saved events or tasks yet."}</p>;
  }

  return (
    <div className="schedule-list">
      {items.map((item) => (
        <div className="schedule-row" key={`${item.kind}-${item.id}`}>
          <time>{item.time ? formatDateTimeLabel(item.time, locale) : locale === "ja" ? "期限なし" : "No due date"}</time>
          <span>
            <strong>{item.title}</strong>
            <small>{[findCompanyName(rows, item.companyId, locale), item.meta].filter(Boolean).join(" / ")}</small>
          </span>
          <b>{item.kind}</b>
        </div>
      ))}
    </div>
  );
}

function DeadlineCalendar({ companies, locale, roomId, large = false }: { companies: Company[]; locale: Locale; roomId: string; large?: boolean }) {
  const ordered = sortCompanies(companies, "deadline", locale);
  return (
    <div className={large ? "deadline-calendar large" : "deadline-calendar"}>
      {ordered.map((company) => (
        <Link className={`deadline-row ${deadlineTone(company.dueDate)}`} key={company.id} to={`/rooms/${roomId}/companies/${company.id}`}>
          <time dateTime={company.dueDate ?? undefined}>{company.dueDate ? deadlineDateLabel(company.dueDate, locale) : locale === "ja" ? "未登録" : "Not set"}</time>
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

function KanbanBoard({ companies: rows, locale, roomId }: { companies: Company[]; locale: Locale; roomId: string }) {
  return (
    <section className="kanban-board" aria-label={locale === "ja" ? "選考ボード" : "Kanban"}>
      {kanbanColumns.map((column) => (
        <div className="kanban-column" key={column.status}>
          <div className="kanban-header">
            <strong>{text(column.title, locale)}</strong>
            <span>{rows.filter((company) => company.status === column.status).length}</span>
          </div>
          {rows
            .filter((company) => company.status === column.status)
            .map((company) => (
              <Link className="kanban-card" key={company.id} to={`/rooms/${roomId}/companies/${company.id}`}>
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

function ProgressPanel({ companies: rows, locale, roomId }: { companies: Company[]; locale: Locale; roomId: string }) {
  const [applications, setApplications] = useState<ApiApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadProgress = useCallback(async () => {
    if (roomId === "demo-room") {
      setApplications([]);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await listProgress(roomId);
      setApplications(response.applications);
    } catch (error) {
      setApplications([]);
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "進捗を取得できませんでした" : "Could not load progress");
    } finally {
      setLoading(false);
    }
  }, [locale, roomId]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const companyId = readFormText(data, "companyId");
    if (!companyId) {
      setMessage(locale === "ja" ? "企業を選択してください。" : "Select a company.");
      return;
    }
    if (roomId === "demo-room") {
      setMessage(locale === "ja" ? "保存はスペース作成後に使えます。" : "Create or join a room to save progress.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await createApplication(roomId, {
        companyId,
        mypageUrl: readFormText(data, "mypageUrl"),
        overallStatus: readFormText(data, "overallStatus") ?? "tracking",
        visibility: readVisibility(data),
      });
      form.reset();
      await loadProgress();
      setMessage(locale === "ja" ? "進捗を保存しました。" : "Progress saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "保存できませんでした" : "Could not save progress");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="progress-panel">
      <form className="progress-form" onSubmit={handleSubmit}>
        <label>
          {locale === "ja" ? "企業" : "Company"}
          <select name="companyId" required>
            <option value="">{locale === "ja" ? "選択" : "Select"}</option>
            {rows.map((company) => (
              <option key={company.id} value={company.id}>
                {text(company.name, locale)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {locale === "ja" ? "状態" : "Status"}
          <select name="overallStatus" defaultValue="tracking">
            {applicationStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {text(option.label, locale)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {locale === "ja" ? "公開範囲" : "Visibility"}
          <select name="visibility" defaultValue="room">
            <option value="room">{locale === "ja" ? "スペース共有" : "Room"}</option>
            <option value="private">{locale === "ja" ? "自分だけ" : "Private"}</option>
          </select>
        </label>
        <label>
          MyPage URL
          <input name="mypageUrl" placeholder="https://..." type="url" />
        </label>
        <button className="secondary-action" type="submit" disabled={submitting || !rows.length}>
          <Plus size={16} aria-hidden="true" />
          <span>{submitting ? (locale === "ja" ? "保存中" : "Saving") : locale === "ja" ? "保存" : "Save"}</span>
        </button>
      </form>
      {message ? <p className={isPositiveMessage(message) ? "form-status success" : "form-status"}>{message}</p> : null}
      {loading ? <p className="form-status">{locale === "ja" ? "読み込み中..." : "Loading..."}</p> : null}
      <ProgressMatrix
        applications={applications}
        companies={rows}
        locale={locale}
      />
      <ProgressApplicationList applications={applications} locale={locale} />
    </div>
  );
}

function ProgressMatrix({
  applications,
  companies: rows,
  locale,
}: {
  applications: ApiApplication[];
  companies: Company[];
  locale: Locale;
}) {
  const steps = locale === "ja" ? ["ES", "検査", "一次", "二次", "最終"] : ["ES", "Test", "1st", "2nd", "Final"];
  const applicationByCompany = new Map(applications.map((application) => [application.company_id, application]));
  return (
    <div className="matrix" role="table" aria-label={locale === "ja" ? "進捗マトリクス" : "Progress matrix"}>
      <div className="matrix-row matrix-head" role="row">
        <span>{locale === "ja" ? "企業" : "Company"}</span>
        {steps.map((step) => (
          <span key={step}>{step}</span>
        ))}
      </div>
      {rows.map((company) => {
        const application = applicationByCompany.get(company.id);
        const currentStep = application ? progressStepIndex(application.overall_status) : -1;
        return (
          <div className="matrix-row" role="row" key={company.id}>
            <strong>{text(company.name, locale)}</strong>
            {steps.map((step, stepIndex) => (
              <span className={stepIndex <= currentStep ? "matrix-cell done" : "matrix-cell"} key={step}>
                {stepIndex <= currentStep ? <CheckCircle2 size={15} aria-hidden="true" /> : <CircleDot size={15} aria-hidden="true" />}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ProgressApplicationList({ applications, locale }: { applications: ApiApplication[]; locale: Locale }) {
  if (!applications.length) {
    return <p className="form-status">{locale === "ja" ? "まだ保存済みの進捗はありません。" : "No saved progress yet."}</p>;
  }
  return (
    <div className="data-table progress-table" role="table" aria-label={locale === "ja" ? "保存済み進捗" : "Saved progress"}>
      <div className="table-row table-head" role="row">
        <span>{locale === "ja" ? "企業" : "Company"}</span>
        <span>{locale === "ja" ? "状態" : "Status"}</span>
        <span>{locale === "ja" ? "公開範囲" : "Visibility"}</span>
        <span>{locale === "ja" ? "更新" : "Updated"}</span>
        <span>MyPage</span>
      </div>
      {applications.map((application) => (
        <div className="table-row" role="row" key={application.id}>
          <span>
            <strong>{application.company_name}</strong>
          </span>
          <span>{applicationStatusLabel(application.overall_status, locale)}</span>
          <span>{visibilityLabel(application.visibility, locale)}</span>
          <span>{formatDateTimeLabel(application.updated_at, locale)}</span>
          <span>
            {application.mypage_url ? (
              <a href={application.mypage_url} rel="noreferrer" target="_blank">
                {locale === "ja" ? "開く" : "Open"}
              </a>
            ) : (
              locale === "ja" ? "未登録" : "Not set"
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function TestReportsPanel({ companies: rows, locale, roomId }: { companies: Company[]; locale: Locale; roomId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [reports, setReports] = useState<TestReportDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadReports = useCallback(async () => {
    if (roomId === "demo-room") {
      setReports([]);
      return;
    }
    if (!rows.length) {
      setReports([]);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const grouped = await Promise.all(
        rows.map(async (company) => {
          const response = await listTestReports(roomId, company.id);
          return response.testReports.map((report) => mapApiTestReport(report, company));
        }),
      );
      setReports(grouped.flat().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)));
    } catch (error) {
      setReports([]);
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "レポートを取得できませんでした" : "Could not load reports");
    } finally {
      setLoading(false);
    }
  }, [locale, roomId, rows]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const companyId = readFormText(data, "companyId");
    if (!companyId) {
      setMessage(locale === "ja" ? "企業を選択してください。" : "Select a company.");
      return;
    }
    if (roomId === "demo-room") {
      setMessage(locale === "ja" ? "保存はスペース作成後に使えます。" : "Create or join a room to save reports.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await createTestReport(roomId, {
        companyId,
        notes: readFormText(data, "notes"),
        source: readFormText(data, "source"),
        testTypeId: readFormText(data, "testTypeId"),
        visibility: readVisibility(data),
      });
      form.reset();
      await loadReports();
      setMessage(locale === "ja" ? "レポートを保存しました。" : "Report saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "保存できませんでした" : "Could not save report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="test-report-panel">
      <form className="test-report-form" onSubmit={handleSubmit}>
        <label>
          {locale === "ja" ? "企業" : "Company"}
          <select name="companyId" required>
            <option value="">{locale === "ja" ? "選択" : "Select"}</option>
            {rows.map((company) => (
              <option key={company.id} value={company.id}>
                {text(company.name, locale)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {locale === "ja" ? "検査種別" : "Test type"}
          <input name="testTypeId" placeholder={locale === "ja" ? "SPI / TG-WEB / 玉手箱" : "SPI / TG-WEB / CUBIC"} />
        </label>
        <label>
          {locale === "ja" ? "出典" : "Source"}
          <input name="source" placeholder={locale === "ja" ? "共有メモ、先輩レポートなど" : "Shared note, past candidate"} />
        </label>
        <label>
          {locale === "ja" ? "公開範囲" : "Visibility"}
          <select name="visibility" defaultValue="room">
            <option value="room">{locale === "ja" ? "スペース共有" : "Room"}</option>
            <option value="private">{locale === "ja" ? "自分だけ" : "Private"}</option>
          </select>
        </label>
        <label className="span-2">
          {locale === "ja" ? "メモ" : "Notes"}
          <textarea name="notes" placeholder={locale === "ja" ? "問題傾向、時間配分、準備メモ" : "Question style, timing, prep note"} rows={3} />
        </label>
        <button className="secondary-action" type="submit" disabled={submitting || !rows.length}>
          <Plus size={16} aria-hidden="true" />
          <span>{submitting ? (locale === "ja" ? "保存中" : "Saving") : locale === "ja" ? "保存" : "Save"}</span>
        </button>
      </form>
      {message ? <p className={isPositiveMessage(message) ? "form-status success" : "form-status"}>{message}</p> : null}
      {loading ? <p className="form-status">{locale === "ja" ? "読み込み中..." : "Loading..."}</p> : null}
      <TestReportTable locale={locale} reports={reports} />
    </div>
  );
}

function TestReportTable({
  locale,
  compact = false,
  reports = [],
}: {
  locale: Locale;
  compact?: boolean;
  reports?: TestReportDisplay[];
}) {
  if (!reports.length) {
    return <p className="form-status">{locale === "ja" ? "まだレポートはありません。" : "No reports yet."}</p>;
  }
  return (
    <div className={compact ? "compact-list" : "data-table report-table"} role="table" aria-label={locale === "ja" ? "適性検査レポート" : "Test reports"}>
      {reports.map((report) => (
        <div className={compact ? "compact-row" : "table-row"} key={report.id}>
          <span>
            <strong>{text(report.company.name, locale)}</strong>
            <small>{[text(report.source, locale), visibilityLabel(report.visibility, locale)].join(" / ")}</small>
          </span>
          <span>
            <strong>{report.type}</strong>
            {!compact && report.notes ? <small>{report.notes}</small> : null}
          </span>
          {!compact ? <span>{text(report.updated, locale)}</span> : null}
        </div>
      ))}
    </div>
  );
}

function VaultPanel({ locale, roomId }: { locale: Locale; roomId: string }) {
  const [credentialItems, setCredentialItems] = useState<ApiVaultItem[]>([]);
  const [decryptedItems, setDecryptedItems] = useState<Record<string, VaultPlainPayload>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const loadVaultItems = useCallback(async () => {
    if (roomId === "demo-room") {
      setCredentialItems([]);
      return;
    }
    try {
      const response = await listVaultItems(roomId);
      setCredentialItems(response.credentialItems);
    } catch (error) {
      setCredentialItems([]);
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "金庫を取得できませんでした" : "Could not load vault");
    }
  }, [locale, roomId]);

  useEffect(() => {
    void loadVaultItems();
  }, [loadVaultItems]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const label = readFormText(data, "label");
    const content = readFormText(data, "content");
    if (!label || !content) {
      setMessage(locale === "ja" ? "ラベルと保存内容を入力してください。" : "Enter a label and content.");
      return;
    }
    if (passphrase.length < 8) {
      setMessage(locale === "ja" ? "金庫パスフレーズは8文字以上にしてください。" : "Use at least 8 characters for the vault passphrase.");
      return;
    }
    if (roomId === "demo-room") {
      setMessage(locale === "ja" ? "保存はスペース作成後に使えます。" : "Create or join a room to save vault items.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const plain: VaultPlainPayload = {
        version: 1,
        label,
        content,
        savedAt: new Date().toISOString(),
      };
      const encrypted = await encryptVaultText(JSON.stringify(plain), passphrase);
      await createVaultItem(roomId, { encryptedPayload: JSON.stringify(encrypted) });
      form.reset();
      setMessage(locale === "ja" ? "暗号化して保存しました。" : "Encrypted and saved.");
      await loadVaultItems();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "保存できませんでした" : "Could not save item");
    } finally {
      setSubmitting(false);
    }
  };

  const unlockItem = async (item: ApiVaultItem) => {
    if (!passphrase) {
      setMessage(locale === "ja" ? "金庫パスフレーズを入力してください。" : "Enter the vault passphrase.");
      return;
    }
    setUnlockingId(item.id);
    setMessage(null);
    try {
      const encrypted = parseEncryptedVaultPayload(item.encrypted_payload);
      const plainText = await decryptVaultText(encrypted, passphrase);
      const plain = parseVaultPlainPayload(plainText);
      setDecryptedItems((current) => ({ ...current, [item.id]: plain }));
      setMessage(locale === "ja" ? "復号しました。" : "Unlocked.");
    } catch {
      setMessage(locale === "ja" ? "復号できませんでした。パスフレーズを確認してください。" : "Could not unlock. Check the passphrase.");
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <section className="detail-layout">
      <div className="surface detail-main vault-panel">
        <div className="company-title">
          <span className="logo-chip large green">
            <KeyRound size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">{locale === "ja" ? "個人金庫" : "Personal Vault"}</p>
            <h2>{locale === "ja" ? "ログイン情報や非公開メモを保管" : "Keep credentials and private notes"}</h2>
          </div>
        </div>
        <div className="vault-grid">
          <DetailItem label={locale === "ja" ? "保存項目" : "Items"} value={`${credentialItems.length}`} />
          <DetailItem label={locale === "ja" ? "復号済み" : "Unlocked"} value={`${Object.keys(decryptedItems).length}`} />
          <DetailItem label={locale === "ja" ? "共有" : "Sharing"} value={locale === "ja" ? "なし" : "Off"} />
        </div>
        <form className="inline-vault-form vault-form" onSubmit={handleSave}>
          <label>
            {locale === "ja" ? "金庫パスフレーズ" : "Vault passphrase"}
            <input
              autoComplete="new-password"
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder={locale === "ja" ? "このブラウザで暗号化に使用" : "Used in this browser only"}
              type="password"
              value={passphrase}
            />
          </label>
          <label>
            {locale === "ja" ? "ラベル" : "Label"}
            <input name="label" placeholder={locale === "ja" ? "企業名 MyPage" : "Company mypage"} />
          </label>
          <label className="span-2">
            {locale === "ja" ? "保存内容" : "Saved content"}
            <textarea name="content" placeholder={locale === "ja" ? "ID、メモ、確認事項など" : "ID, note, checklist"} rows={4} />
          </label>
          <button className="primary-action" type="submit" disabled={submitting}>
            <LockKeyhole size={17} aria-hidden="true" />
            <span>{submitting ? (locale === "ja" ? "保存中" : "Saving") : locale === "ja" ? "保存" : "Save"}</span>
          </button>
        </form>
        {message ? <p className={isPositiveMessage(message) ? "form-status success" : "form-status"}>{message}</p> : null}
        <div className="vault-item-list">
          {credentialItems.length ? (
            credentialItems.map((item) => {
              const plain = decryptedItems[item.id];
              return (
                <div className="vault-item-row" key={item.id}>
                  <span>
                    <strong>{plain?.label ?? (locale === "ja" ? "暗号化済み項目" : "Encrypted item")}</strong>
                    <small>{formatDateTimeLabel(item.updated_at, locale)}</small>
                  </span>
                  {plain ? <p>{plain.content}</p> : null}
                  <button className="secondary-action" type="button" onClick={() => void unlockItem(item)} disabled={unlockingId === item.id}>
                    <LockKeyhole size={15} aria-hidden="true" />
                    <span>{unlockingId === item.id ? (locale === "ja" ? "確認中" : "Checking") : locale === "ja" ? "復号" : "Unlock"}</span>
                  </button>
                </div>
              );
            })
          ) : (
            <p className="form-status">{locale === "ja" ? "まだ保存項目はありません。" : "No saved items yet."}</p>
          )}
        </div>
      </div>
      <aside className="right-rail">
        <div className="surface setup-notes">
          <h2>{locale === "ja" ? "非公開の扱い" : "Private handling"}</h2>
          <p>
            {locale === "ja"
              ? "パスフレーズはブラウザ内で鍵を作るためだけに使い、Workerへ送信しません。共有スペースに企業情報を出しても、金庫の中身は本人の暗号文として分離されます。"
              : "The passphrase is used only in the browser to derive the key. The Worker stores encrypted JSON, and Vault items stay personal even in shared rooms."}
          </p>
        </div>
      </aside>
    </section>
  );
}

function SettingsPanel({ locale, roomId }: { locale: Locale; roomId: string }) {
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [members, setMembers] = useState<ApiRoomMember[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<ApiUser | null>(null);

  const loadSettings = useCallback(async () => {
    if (roomId === "demo-room") {
      setMembers([]);
      return;
    }
    try {
      const [meResponse, memberResponse] = await Promise.all([getMe(), listRoomMembers(roomId)]);
      setUser(meResponse.user);
      setMembers(memberResponse.members);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "設定を取得できませんでした" : "Could not load settings");
    }
  }, [locale, roomId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const currentMember = user ? members.find((member) => member.user_id === user.id) : null;
  const previewUrl = currentMember?.avatar_kind === "photo" && user ? `${avatarPhotoUrl(roomId, user.id)}?v=${avatarVersion}` : null;

  const handleInitialsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      setMessage(locale === "ja" ? "ログイン後に設定できます。" : "Sign in to update your avatar.");
      return;
    }
    if (roomId === "demo-room") {
      setMessage(locale === "ja" ? "保存はスペース作成後に使えます。" : "Create or join a room to save avatar settings.");
      return;
    }
    const data = new FormData(event.currentTarget);
    const initials = readFormText(data, "initials") ?? initialsFor(user.name);
    setSaving(true);
    setMessage(null);
    try {
      await setRoomMemberAvatar(roomId, user.id, {
        color: readFormText(data, "color") ?? "teal",
        initials: initials.slice(0, 4),
        kind: "initials",
      });
      await loadSettings();
      setAvatarVersion((version) => version + 1);
      setMessage(locale === "ja" ? "アバターを保存しました。" : "Avatar saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "保存できませんでした" : "Could not save avatar");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      setMessage(locale === "ja" ? "ログイン後に設定できます。" : "Sign in to update your avatar.");
      return;
    }
    if (roomId === "demo-room") {
      setMessage(locale === "ja" ? "保存はスペース作成後に使えます。" : "Create or join a room to upload an avatar.");
      return;
    }
    const file = new FormData(event.currentTarget).get("photo");
    if (!(file instanceof File) || !file.size) {
      setMessage(locale === "ja" ? "画像を選択してください。" : "Choose an image.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage(locale === "ja" ? "JPEG / PNG / WebP を選択してください。" : "Choose JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setMessage(locale === "ja" ? "画像は1MB以下にしてください。" : "Keep the image under 1 MB.");
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      await uploadRoomMemberAvatar(roomId, user.id, file);
      await loadSettings();
      setAvatarVersion((version) => version + 1);
      setMessage(locale === "ja" ? "画像を保存しました。" : "Photo saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "アップロードできませんでした" : "Could not upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!user || roomId === "demo-room") {
      setMessage(locale === "ja" ? "スペース作成後に使えます。" : "Create or join a room first.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await deleteRoomMemberAvatar(roomId, user.id);
      await loadSettings();
      setAvatarVersion((version) => version + 1);
      setMessage(locale === "ja" ? "画像を削除しました。" : "Photo removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "削除できませんでした" : "Could not remove photo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="settings-layout">
      <div className="surface settings-grid">
        <DetailItem label={locale === "ja" ? "スペース種別" : "Room type"} value={locale === "ja" ? "共有" : "Shared"} />
        <DetailItem label={locale === "ja" ? "参加方法" : "Join method"} value={locale === "ja" ? "コード + 合言葉" : "Room code + passphrase"} />
        <DetailItem label={locale === "ja" ? "アバター保存" : "Avatar storage"} value="Private R2" />
        <DetailItem label={locale === "ja" ? "秘密情報" : "Private keys"} value={locale === "ja" ? "管理画面で設定" : "Set in dashboard"} />
        <DetailItem label={locale === "ja" ? "企業ロゴ" : "Company logos"} value={locale === "ja" ? "候補検索を使用" : "Search candidates"} />
      </div>
      <div className="surface avatar-settings">
        <div className="avatar-heading">
          {previewUrl ? <img alt="" src={previewUrl} /> : <span className="avatar-preview">{currentMember ? memberAvatarText(currentMember) : initialsFor(user?.name ?? "Me")}</span>}
          <div>
            <h2>{locale === "ja" ? "スペース内アバター" : "Room avatar"}</h2>
            <p>{locale === "ja" ? "写真はprivate R2に保存し、Workerの認可済みAPIだけで配信します。" : "Photos stay in private R2 and are served only through authorized Worker routes."}</p>
          </div>
        </div>
        <form className="avatar-form" onSubmit={handleInitialsSubmit}>
          <label>
            {locale === "ja" ? "表示文字" : "Initials"}
            <input defaultValue={currentMember ? memberAvatarText(currentMember) : initialsFor(user?.name ?? "Me")} maxLength={4} name="initials" />
          </label>
          <label>
            {locale === "ja" ? "色" : "Color"}
            <select defaultValue={currentMember?.avatar_color ?? "teal"} name="color">
              <option value="teal">Teal</option>
              <option value="indigo">Indigo</option>
              <option value="amber">Amber</option>
              <option value="rose">Rose</option>
            </select>
          </label>
          <button className="secondary-action" type="submit" disabled={saving}>
            <ShieldCheck size={16} aria-hidden="true" />
            <span>{saving ? (locale === "ja" ? "保存中" : "Saving") : locale === "ja" ? "文字で保存" : "Save initials"}</span>
          </button>
        </form>
        <form className="avatar-form" onSubmit={handlePhotoSubmit}>
          <label className="span-2">
            {locale === "ja" ? "写真" : "Photo"}
            <input accept="image/jpeg,image/png,image/webp" name="photo" type="file" />
          </label>
          <button className="secondary-action" type="submit" disabled={uploading}>
            <Plus size={16} aria-hidden="true" />
            <span>{uploading ? (locale === "ja" ? "保存中" : "Saving") : locale === "ja" ? "画像を保存" : "Save photo"}</span>
          </button>
          <button className="secondary-action muted" type="button" onClick={() => void handleDeletePhoto()} disabled={saving || !currentMember}>
            <LockKeyhole size={16} aria-hidden="true" />
            <span>{locale === "ja" ? "画像を削除" : "Remove photo"}</span>
          </button>
        </form>
        {message ? <p className={isPositiveMessage(message) ? "form-status success" : "form-status"}>{message}</p> : null}
        <div className="member-list">
          {members.map((member) => (
            <div className="member-row" key={member.user_id}>
              <span className="avatar-preview small">{memberAvatarText(member)}</span>
              <span>
                <strong>{member.display_name_in_room}</strong>
                <small>{[member.role, member.avatar_kind].join(" / ")}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LogoProviderPanel({ locale, company }: { locale: Locale; company?: Company }) {
  const [query, setQuery] = useState(company ? text(company.name, locale) : "");
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<LogoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setQuery(company ? text(company.name, locale) : "");
    setResults([]);
    setMessage(null);
  }, [company, locale]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setMessage(locale === "ja" ? "2文字以上で検索してください。" : "Search with at least 2 characters.");
      return;
    }
    setSearching(true);
    setMessage(null);
    try {
      const response = await searchLogoCandidates(trimmed);
      setResults(response.results);
      if (response.status === "provider-unconfigured") {
        setMessage(locale === "ja" ? "Cloudflare Secrets に LOGO_DEV_SECRET_KEY を追加すると候補検索が使えます。" : "Add LOGO_DEV_SECRET_KEY to Cloudflare Secrets to enable candidate search.");
      } else if (!response.results.length) {
        setMessage(locale === "ja" ? "候補が見つかりませんでした。" : "No candidates found.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : locale === "ja" ? "検索できませんでした" : "Could not search");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="surface logo-provider-panel">
      <div className="logo-provider-heading">
        <span className="logo-provider-icon">
          <Globe2 size={18} aria-hidden="true" />
        </span>
        <div>
          <strong>{locale === "ja" ? "企業ロゴ候補" : "Company logo candidates"}</strong>
          <small>{locale === "ja" ? "企業名・ドメインから探す" : "Find by company name or domain"}</small>
        </div>
      </div>
      <form className="logo-search-form" onSubmit={handleSearch}>
        <input
          aria-label={locale === "ja" ? "企業名またはドメイン" : "Company name or domain"}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === "ja" ? "企業名またはドメイン" : "Company name or domain"}
          value={query}
        />
        <button className="secondary-action" type="submit" disabled={searching}>
          <Search size={16} aria-hidden="true" />
          <span>{searching ? (locale === "ja" ? "検索中" : "Searching") : locale === "ja" ? "検索" : "Search"}</span>
        </button>
      </form>
      <div className="logo-provider-body">
        <DetailItem label={locale === "ja" ? "対象" : "Target"} value={company?.domain || (locale === "ja" ? "未選択" : "Not selected")} />
        <DetailItem label={locale === "ja" ? "候補" : "Candidates"} value={results.length ? `${results.length}` : locale === "ja" ? "未検索" : "Not searched"} />
      </div>
      {message ? <p className="form-status">{message}</p> : null}
      {results.length ? (
        <ul className="logo-result-list">
          {results.map((result) => (
            <li key={`${result.domain}-${result.name}`}>
              <img alt="" src={result.logoUrl} />
              <span>
                <strong>{result.name}</strong>
                <small>{result.domain}</small>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
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
            ? "最初は自分だけのスペースとして作り、必要になったら共有スペースに変換できます。"
            : "A personal room starts private and can later be converted into a shared room."
          : locale === "ja"
            ? "企業情報と共有進捗だけをスペースに出します。個人の金庫と非公開進捗は混ぜません。"
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
    overview: { ja: "スペース全体", en: "Room overview" },
    companies: { ja: "企業一覧", en: "Companies" },
    "company-detail": { ja: "企業詳細", en: "Company detail" },
    progress: { ja: "進捗マトリクス", en: "Progress matrix" },
    kanban: { ja: "選考ボード", en: "Selection board" },
    tests: { ja: "適性検査レポート", en: "Test reports" },
    calendar: { ja: "日程", en: "Calendar" },
    vault: { ja: "個人金庫", en: "Personal Vault" },
    settings: { ja: "スペース設定", en: "Room settings" },
  };
  return text(labels[tab] ?? { ja: "スペース", en: "Room" }, locale);
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
      return deadlineSortValue(a.dueDate) - deadlineSortValue(b.dueDate);
    }
    if (sortMode === "industry") {
      const industry = collator.compare(text(a.industry, locale), text(b.industry, locale));
      return industry || collator.compare(locale === "ja" ? a.nameKana : text(a.name, locale), locale === "ja" ? b.nameKana : text(b.name, locale));
    }
    return collator.compare(locale === "ja" ? a.nameKana : text(a.name, locale), locale === "ja" ? b.nameKana : text(b.name, locale));
  });
}

function formatTicker(company: Company): string | null {
  if (!company.ticker) {
    return null;
  }
  return company.exchange ? `${company.exchange}:${company.ticker}` : company.ticker;
}

function formatCatalogTicker(company: CatalogCompany): string | null {
  if (!company.ticker) {
    return null;
  }
  return company.exchange ? `${company.exchange}:${company.ticker}` : company.ticker;
}

function formatCatalogSourceNote(info: CatalogSearchResponse["catalog"], locale: Locale): string {
  if (locale === "ja") {
    const databaseLabel = info.databaseCount ? `D1辞書 ${info.databaseCount.toLocaleString("ja-JP")}件` : "D1辞書 未投入";
    const builtInLabel = `内蔵辞書 ${info.builtInCount.toLocaleString("ja-JP")}件`;
    return `${databaseLabel} / ${builtInLabel} / 表示候補 ${info.matched.toLocaleString("ja-JP")}件`;
  }
  const databaseLabel = info.databaseCount ? `${info.databaseCount.toLocaleString("en-US")} D1 records` : "No D1 catalog";
  const builtInLabel = `${info.builtInCount.toLocaleString("en-US")} built-in records`;
  return `${databaseLabel} / ${builtInLabel} / ${info.matched.toLocaleString("en-US")} matches`;
}

function legalTypeFromCatalog(company: CatalogCompany): string {
  if (!company.metadata_json) {
    return "";
  }
  try {
    const metadata = JSON.parse(company.metadata_json) as { legalType?: unknown };
    return typeof metadata.legalType === "string" ? metadata.legalType : "";
  } catch {
    return "";
  }
}

function keepUserEnteredMyPageUrl(currentUrl: string, currentDomain: string): string {
  if (!currentUrl || !currentDomain) {
    return currentUrl;
  }
  const normalizedUrl = currentUrl.replace(/\/+$/, "").toLowerCase();
  const normalizedDomain = currentDomain.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase();
  if (normalizedUrl === `https://${normalizedDomain}` || normalizedUrl === `http://${normalizedDomain}`) {
    return "";
  }
  return currentUrl;
}

function mapApiTestReport(report: ApiTestReport, company: Company): TestReportDisplay {
  return {
    id: report.id,
    company,
    notes: report.notes ?? "",
    source: { ja: report.source ?? "手入力", en: report.source ?? "Manual" },
    type: report.test_type_id ?? "N/A",
    updated: {
      ja: formatDateTimeLabel(report.updated_at, "ja"),
      en: formatDateTimeLabel(report.updated_at, "en"),
    },
    updatedAt: report.updated_at,
    visibility: report.visibility,
  };
}

function readFormText(data: FormData, key: string): string | undefined {
  const value = data.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readVisibility(data: FormData): "room" | "private" {
  return data.get("visibility") === "private" ? "private" : "room";
}

function visibilityLabel(visibility: "room" | "private", locale: Locale): string {
  if (visibility === "private") {
    return locale === "ja" ? "自分だけ" : "Private";
  }
  return locale === "ja" ? "スペース共有" : "Room";
}

function applicationStatusLabel(status: string, locale: Locale): string {
  const option = applicationStatusOptions.find((item) => item.value === status);
  return option ? text(option.label, locale) : status;
}

function progressStepIndex(status: string): number {
  return applicationStatusOptions.find((item) => item.value === status)?.stepIndex ?? 0;
}

function taskStatusLabel(status: string, locale: Locale): string {
  if (status === "done") {
    return locale === "ja" ? "完了" : "Done";
  }
  if (status === "open") {
    return locale === "ja" ? "未完了" : "Open";
  }
  return status;
}

function dateTimeLocalToIso(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function scheduleSortValue(dateIso: string | null): number {
  return dateIso ? Date.parse(dateIso) : Number.MAX_SAFE_INTEGER;
}

function findCompanyName(rows: Company[], companyId: string | null, locale: Locale): string | null {
  if (!companyId) {
    return null;
  }
  const company = rows.find((item) => item.id === companyId);
  return company ? text(company.name, locale) : null;
}

function memberAvatarText(member: ApiRoomMember): string {
  if (member.avatar_kind === "emoji" && member.avatar_emoji) {
    return member.avatar_emoji;
  }
  if (member.avatar_kind === "initials" && member.avatar_emoji) {
    return member.avatar_emoji;
  }
  return initialsFor(member.display_name_in_room);
}

function isPositiveMessage(message: string): boolean {
  return ["追加", "保存", "復号", "反映", "Added", "added", "saved", "Saved", "Unlocked", "filled"].some((word) => message.includes(word));
}

function deadlineSortValue(dateIso: string | null): number {
  return dateIso ? Date.parse(dateIso) : Number.MAX_SAFE_INTEGER;
}

function daysUntil(dateIso: string): number {
  const diffMs = Date.parse(dateIso) - referenceNow.getTime();
  return Math.ceil(diffMs / 86_400_000);
}

function remainingTimeText(dateIso: string | null, locale: Locale): string {
  if (!dateIso) {
    return locale === "ja" ? "未登録" : "Not set";
  }
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

function formatDateTimeLabel(dateIso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateIso));
}

function deadlineTone(dateIso: string | null): "danger" | "warning" | "calm" | "" {
  if (!dateIso) {
    return "";
  }
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

function roomTypeLabel(type: ApiRoomListItem["type"], locale: Locale): string {
  if (type === "personal") {
    return locale === "ja" ? "個人" : "Personal";
  }
  return locale === "ja" ? "共有" : "Shared";
}

function roomRoleLabel(role: ApiRoomListItem["role"], locale: Locale): string {
  if (role === "owner") {
    return locale === "ja" ? "オーナー" : "Owner";
  }
  return locale === "ja" ? "メンバー" : "Member";
}

function text(value: LocalText, locale: Locale): string {
  return value[locale];
}

function parseEncryptedVaultPayload(value: string): EncryptedVaultPayload {
  const parsed = JSON.parse(value) as Partial<EncryptedVaultPayload>;
  if (
    parsed.version !== 1 ||
    parsed.kdf !== "PBKDF2-SHA-256" ||
    typeof parsed.iterations !== "number" ||
    typeof parsed.salt !== "string" ||
    typeof parsed.iv !== "string" ||
    typeof parsed.ciphertext !== "string"
  ) {
    throw new Error("Invalid vault payload");
  }
  return parsed as EncryptedVaultPayload;
}

function parseVaultPlainPayload(value: string): VaultPlainPayload {
  const parsed = JSON.parse(value) as Partial<VaultPlainPayload>;
  if (parsed.version !== 1 || typeof parsed.label !== "string" || typeof parsed.content !== "string") {
    throw new Error("Invalid vault content");
  }
  return {
    version: 1,
    label: parsed.label,
    content: parsed.content,
    savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
  };
}

function readInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "ja";
  }
  const saved = window.localStorage.getItem("job-hunt-vault-locale");
  return saved === "en" ? "en" : "ja";
}
