"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type Auth, type User } from "firebase/auth";
import { adminRequest, ApiError } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";
import { dateTime, number, percent, todayKst } from "@/lib/format";
import { statLabels, stats, type Analytics, type Balance, type Period, type Stat, type UserDetail, type UserSummary } from "@/lib/types";

type Section = "overview" | "users" | "balance";
const periodLabels: Record<Period, string> = { day: "일간", week: "주간", month: "월간" };
const sectionLabels: Record<Section, string> = { overview: "운영 현황", users: "회원 조회", balance: "보상 배율" };

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    sliders: <><path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3" /><path d="M1 14h6m2-6h6m2 8h6" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    arrow: <><path d="m9 18 6-6-6-6" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14-5L4 8" /><path d="M4 4v4h4M4 13a8 8 0 0 0 14 5l2-2" /><path d="M20 20v-4h-4" /></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
    close: <><path d="M18 6 6 18M6 6l12 12" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`panel rounded-xl bg-white ${className}`}>{children}</div>;
}

function Notice({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "info" | "success" }) {
  return <div role={tone === "error" ? "alert" : "status"} className={`notice notice-${tone}`}>{children}</div>;
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

function StatCard({ label, value, note, previous }: { label: string; value: number | null | undefined; note?: string; previous?: number | null }) {
  const difference = typeof value === "number" && typeof previous === "number" ? value - previous : null;
  return <Card className="stat-card">
    <div className="stat-top"><span>{label}</span><span className="stat-spark"><Icon name="trend" size={17} /></span></div>
    <strong>{number(value)}</strong>
    <div className="stat-foot">{difference !== null ? <span className={difference >= 0 ? "delta-up" : "delta-down"}>{difference > 0 ? "+" : ""}{number(difference)} 전 기간 대비</span> : <span>{note ?? "현재 집계"}</span>}</div>
  </Card>;
}

function SectionHead({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="section-head flex flex-wrap items-center justify-between"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="section-description">{description}</p></div>{action}</div>;
}

function kstShift(anchor: string, period: Period, direction: number) {
  const date = new Date(`${anchor}T12:00:00Z`);
  if (period === "month") {
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + direction);
  }
  else date.setUTCDate(date.getUTCDate() + direction * (period === "week" ? 7 : 1));
  return date.toISOString().slice(0, 10);
}

function Dashboard({ user }: { user: User }) {
  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState(todayKst);
  const [data, setData] = useState<Analytics | null>(null);
  const [previous, setPrevious] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rebuilding, setRebuilding] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    const query = (date: string) => `/admin/analytics?period=${period}&anchor=${date}`;
    adminRequest<Analytics>(user, query(anchor)).then(async current => {
      if (!live) return;
      setData(current);
      try {
        const prior = await adminRequest<Analytics>(user, query(kstShift(anchor, period, -1)));
        if (live) setPrevious(prior);
      } catch { if (live) setPrevious(null); }
    }).catch(e => {
      if (live) { setData(null); setPrevious(null); setError(e.message); }
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [user, period, anchor, reload]);

  const rebuild = async () => {
    if (!data || !window.confirm(`${data.startDate} ~ ${data.endDate} 집계를 다시 생성할까요? 사용자 기록을 읽어 통계 요약을 갱신합니다.`)) return;
    setRebuilding(true);
    setError("");
    try {
      await adminRequest<Analytics>(user, "/admin/analytics/rebuild", {
        method: "POST", body: JSON.stringify({ period, anchor }),
      });
      setReload(value => value + 1);
    } catch (e) { setError((e as Error).message); }
    finally { setRebuilding(false); }
  };

  const metrics = data?.metrics;
  const users = data?.currentUsers;
  const prevMetrics = previous?.metrics;
  const activity = [
    ["수업", "class"], ["모험", "adventure"], ["휴식", "rest"], ["특수 활동", "special"], ["강제 휴식", "forcedRest"],
  ] as const;
  const maxActivity = Math.max(1, ...activity.map(([, key]) => metrics?.activityCounts[key] ?? 0));
  const minigames = Object.entries(metrics?.minigame.byGameId ?? {}).sort((a, b) => b[1].playCount - a[1].playCount);
  const endings = Object.entries(metrics?.run.endingViewCounts ?? {}).sort((a, b) => b[1] - a[1]);
  const unlocks = Object.entries(metrics?.unlocks.newByTypeAndId ?? {}).flatMap(([kind, items]) =>
    Object.entries(items).map(([id, count]) => ({ kind, id, count }))
  ).sort((a, b) => b.count - a.count);

  return <>
    <SectionHead eyebrow="OVERVIEW / 운영 현황" title="운영 현황" description="계정과 플레이 흐름을 기간별로 확인합니다." action={
      <button className="button button-ghost" onClick={() => setReload(v => v + 1)} aria-label="통계 다시 불러오기"><Icon name="refresh" size={16} /> 새로고침</button>
    } />
    <div className="filter-bar">
      <div className="segmented" aria-label="통계 기간">
        {(["day", "week", "month"] as const).map(value => <button key={value} aria-pressed={period === value} className={period === value ? "selected" : ""} onClick={() => setPeriod(value)}>{periodLabels[value]}</button>)}
      </div>
      <div className="date-controls">
        <button className="icon-button" onClick={() => setAnchor(kstShift(anchor, period, -1))} aria-label="이전 기간"><Icon name="arrow" size={17} /></button>
        <input aria-label="기준 날짜" type={period === "month" ? "month" : "date"} value={period === "month" ? anchor.slice(0, 7) : anchor} onChange={e => setAnchor(period === "month" ? `${e.target.value}-01` : e.target.value)} />
        <button className="icon-button next" onClick={() => setAnchor(kstShift(anchor, period, 1))} aria-label="다음 기간"><Icon name="arrow" size={17} /></button>
      </div>
      {data && <span className="range-label">{data.startDate} — {data.endDate} · KST</span>}
    </div>
    {error && <Notice>{error}</Notice>}
    {loading && <Empty>통계를 불러오는 중입니다…</Empty>}
    {!loading && data && <>
      {!data.complete && <Notice tone="info"><div><strong>집계가 완전하지 않습니다.</strong> 누락된 날짜 {number(data.missingDates.length)}일의 값은 아래 기간 수치에 포함되지 않습니다.</div><button className="button button-small" onClick={rebuild} disabled={rebuilding}>{rebuilding ? "생성 중…" : "집계 생성"}</button></Notice>}
      <div className="stat-grid">
        <StatCard label="전체 가입 사용자" value={users?.totalUserCount} note="현재 누적" />
        <StatCard label="실제 플레이 사용자" value={users?.playedUserCount} note="현재 누적" />
        <StatCard label="최근 7일 활동" value={users?.recent7ActiveUserCount} note="오늘 기준" />
        <StatCard label="최근 30일 활동" value={users?.recent30ActiveUserCount} note="오늘 기준" />
      </div>
      <div className="stat-grid compact">
        <StatCard label="기간 신규 가입" value={metrics?.newUserCount} previous={prevMetrics?.newUserCount} />
        <StatCard label="기간 활동 사용자" value={metrics?.activeUserCount} previous={prevMetrics?.activeUserCount} />
        <StatCard label="기간 완료 회차" value={metrics?.run.completedRunCount} previous={prevMetrics?.run.completedRunCount} />
        <StatCard label="기간 미니게임" value={metrics?.minigame.playCount} previous={prevMetrics?.minigame.playCount} />
      </div>
      <div className="content-grid">
        <Card><div className="card-heading"><div><p className="eyebrow">ACTIVITY</p><h2>활동 분포</h2></div><span className="muted">선택 기간</span></div>
          <div className="bar-list">{activity.map(([label, key]) => <div className="bar-row" key={key}><span>{label}</span><div className="bar-track"><div style={{ width: `${((metrics?.activityCounts[key] ?? 0) / maxActivity) * 100}%` }} /></div><strong>{number(metrics?.activityCounts[key])}</strong></div>)}</div>
        </Card>
        <Card><div className="card-heading"><div><p className="eyebrow">RUNS & STORIES</p><h2>진행 요약</h2></div></div>
          <div className="summary-list">
            <div><span>52주 완료 사용자</span><strong>{number(users?.completedUserCount)}명</strong></div>
            <div><span>전체 완료 회차</span><strong>{number(users?.totalCompletedRuns)}회</strong></div>
            <div><span>사용자당 평균 완료</span><strong>{number(users?.averageCompletedRunsPerUser)}회</strong></div>
            <div><span>NPC Story 진행</span><strong>{number(metrics?.story.npcCompletedCount)}건</strong></div>
            <div><span>Location Story 진행</span><strong>{number(metrics?.story.locationCompletedCount)}건</strong></div>
          </div>
        </Card>
      </div>
      <div className="content-grid">
        <Card><div className="card-heading"><div><p className="eyebrow">MINIGAME</p><h2>미니게임 결과</h2></div><span className="muted">전체 성공률 {percent(metrics?.minigame.successRatio)}</span></div>
          {minigames.length ? <div className="table-scroll"><table><thead><tr><th>게임 ID</th><th>시도</th><th>FAIL</th><th>SUCCESS</th><th>GREAT</th><th>성공률</th></tr></thead><tbody>{minigames.map(([id, row]) => <tr key={id}><td className="strong-cell">{id}</td><td>{number(row.playCount)}</td><td>{number(row.fail)}</td><td>{number(row.success)}</td><td>{number(row.great)}</td><td>{percent(row.successRatio)}</td></tr>)}</tbody></table></div> : <Empty>선택 기간의 미니게임 기록이 없습니다.</Empty>}
        </Card>
        <Card><div className="card-heading"><div><p className="eyebrow">ENDING</p><h2>직업 엔딩 분포</h2></div></div>
          {endings.length ? <div className="rank-list">{endings.map(([id, count], index) => <div key={id}><span className="rank">{String(index + 1).padStart(2, "0")}</span><span className="rank-name">{id}</span><strong>{number(count)}회</strong></div>)}</div> : <Empty>선택 기간의 엔딩 기록이 없습니다.</Empty>}
        </Card>
      </div>
      <div className="content-grid">
        <Card><div className="card-heading"><div><p className="eyebrow">GROWTH</p><h2>완료 회차 성장 스탯</h2></div><span className="muted">평균 최종값 / 500</span></div>
          <div className="growth-list">{stats.map(stat => <div key={stat}><div className="growth-line"><span>{statLabels[stat]}</span><strong>{number(metrics?.run.finalStatAverages[stat])}</strong></div><div className="bar-track"><div style={{ width: `${((metrics?.run.finalStatAverages[stat] ?? 0) / 500) * 100}%` }} /></div><p>300 이상 {percent(metrics?.run.finalStatGte300Ratios[stat])} · 500 도달 {percent(metrics?.run.finalStatGte500Ratios[stat])}</p></div>)}</div>
        </Card>
        <Card><div className="card-heading"><div><p className="eyebrow">UNLOCKS</p><h2>기간 신규 해금</h2></div></div>
          {unlocks.length ? <div className="rank-list">{unlocks.slice(0, 10).map(item => <div key={`${item.kind}-${item.id}`}><span className="tag">{item.kind}</span><span className="rank-name">{item.id}</span><strong>{number(item.count)}</strong></div>)}</div> : <Empty>선택 기간의 신규 해금이 없습니다.</Empty>}
        </Card>
      </div>
      <p className="data-footnote">통계 생성 시각 {dateTime(metrics?.latestGeneratedAt)} · 기간 집계에는 개인 식별 정보를 표시하지 않습니다.</p>
    </>}
  </>;
}

function UserDrawer({ user, summary, onClose }: { user: User; summary: UserSummary; onClose: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    adminRequest<UserDetail>(user, `/admin/users/${encodeURIComponent(summary.uid)}`).then(value => { if (live) setDetail(value); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [user, summary.uid]);
  const counts = detail?.statistics;
  const unlocks = detail?.meta;
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="drawer" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="회원 상세">
    <div className="drawer-header"><div><p className="eyebrow">MEMBER DETAIL</p><h2>{summary.email ?? "이메일 없음"}</h2><p className="uid">{summary.uid}</p></div><button className="icon-button" onClick={onClose} aria-label="상세 닫기"><Icon name="close" /></button></div>
    {error && <Notice>{error}</Notice>}
    {!detail && !error && <Empty>회원 기록을 불러오는 중입니다…</Empty>}
    {detail && <div className="drawer-content">
      <div className="detail-metrics"><div><span>가입</span><strong>{dateTime(detail.profile.createdAt)}</strong></div><div><span>마지막 플레이</span><strong>{dateTime(detail.profile.lastPlayedAt)}</strong></div><div><span>완료 회차</span><strong>{number(counts?.totalCompletedRuns)}회</strong></div></div>
      <h3>세이브 슬롯</h3><div className="slot-list">{detail.slots.map(slot => <div className="slot" key={slot.slotId}><div className="slot-head"><strong>슬롯 {slot.slotId}</strong><span className="status-pill">{slot.status}</span></div><p>{slot.activeRun ? `${slot.activeRun.characterId ?? "캐릭터 미정"} · ${slot.activeRun.week ?? "—"}주차 · ${slot.activeRun.phase ?? "진행 중"}` : slot.lastCompletedCharacterId ? `마지막 캐릭터 ${slot.lastCompletedCharacterId}` : "진행 기록 없음"}</p>{slot.activeRun?.stats && <div className="chips">{stats.map(stat => <span key={stat}>{statLabels[stat]} {number(slot.activeRun?.stats?.[stat])}</span>)}</div>}</div>)}</div>
      <h3>누적 플레이</h3><div className="detail-list"><div><span>수업</span><strong>{number(counts?.totalClassCount)}</strong></div><div><span>모험</span><strong>{number(counts?.totalAdventureCount)}</strong></div><div><span>휴식</span><strong>{number(counts?.totalRestCount)}</strong></div><div><span>미니게임 / 클리어</span><strong>{number(counts?.totalMinigamePlayCount)} / {number(counts?.totalMinigameClearCount)}</strong></div><div><span>NPC 조우 / Story</span><strong>{number(counts?.totalNpcEncounterCount)} / {number(counts?.completedNpcStoryCount)}</strong></div><div><span>특수 아이템 / 장소 발견</span><strong>{number(counts?.totalSpecialItemDiscoveryCount)} / {number(counts?.totalLocationDiscoveryCount)}</strong></div></div>
      <h3>해금 현황</h3><div className="detail-list"><div><span>캐릭터</span><strong>{number(unlocks?.unlockedCharacterIds.length)}개</strong></div><div><span>펫</span><strong>{number(unlocks?.unlockedPetIds.length)}마리</strong></div><div><span>배지</span><strong>{number(unlocks?.acquiredBadgeIds.length)}개</strong></div><div><span>마이룸 배경</span><strong>{number(unlocks?.unlockedRoomBackgroundIds.length)}개</strong></div></div><div className="chips">{[...(unlocks?.unlockedCharacterIds ?? []), ...(unlocks?.unlockedPetIds ?? []), ...(unlocks?.acquiredBadgeIds ?? []), ...(unlocks?.unlockedRoomBackgroundIds ?? [])].map(id => <span key={id}>{id}</span>)}</div>
      <h3>확인한 직업 엔딩</h3><div className="chips">{unlocks?.seenEndingIds.length ? unlocks.seenEndingIds.map(id => <span key={id}>{id}</span>) : <span>기록 없음</span>}</div>
      <h3>완료 회차 편지</h3>{detail.endingRecords.length ? detail.endingRecords.map(record => <details className="letter" key={record.endingRecordId}><summary><span>{record.endingId} · 슬롯 {record.slotId}</span><small>{dateTime(record.completedAt)}</small></summary><p>{record.letter.content}</p><small>{record.letter.generationStatus === "FALLBACK" ? "준비된 대체 편지" : "생성된 편지"}</small></details>) : <Empty>저장된 엔딩 편지가 없습니다.</Empty>}
    </div>}
  </aside></div>;
}

function Users({ user }: { user: User }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [items, setItems] = useState<UserSummary[]>([]);
  const [selected, setSelected] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    const suffix = submitted ? `?query=${encodeURIComponent(submitted)}` : "?limit=50";
    adminRequest<{ items: UserSummary[] }>(user, `/admin/users${suffix}`).then(value => { if (live) setItems(value.items); }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [user, submitted, reload]);
  const submit = (event: FormEvent) => { event.preventDefault(); setSubmitted(query.trim()); setReload(value => value + 1); };
  return <>
    <SectionHead eyebrow="MEMBERS / 회원 조회" title="회원 조회" description="계정과 플레이 기록을 조회합니다. 저장 데이터는 이 화면에서 변경할 수 없습니다." action={<button className="button button-ghost" onClick={() => setReload(v => v + 1)}><Icon name="refresh" size={16} /> 새로고침</button>} />
    <Card className="search-card"><form onSubmit={submit} className="search-form"><Icon name="search" size={19} /><input aria-label="이메일 또는 UID 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="정확한 이메일 또는 UID 입력" /><button className="button button-primary" type="submit">검색</button></form><p>검색은 이메일 또는 UID의 정확한 일치값을 사용합니다. 기본 목록은 최대 50명입니다.</p></Card>
    {error && <Notice>{error}</Notice>}
    <Card className="table-card"><div className="card-heading"><div><p className="eyebrow">MEMBER DIRECTORY</p><h2>{submitted ? "검색 결과" : "사용자 목록"}</h2></div><span className="muted">{loading ? "조회 중" : `${number(items.length)}명 표시`}</span></div>
      {loading ? <Empty>회원을 불러오는 중입니다…</Empty> : items.length ? <div className="table-scroll"><table className="member-table"><thead><tr><th>이메일 / UID</th><th>가입</th><th>마지막 플레이</th><th>완료 회차</th><th><span className="sr-only">상세 보기</span></th></tr></thead><tbody>{items.map(item => <tr key={item.uid} onClick={() => setSelected(item)}><td><strong>{item.email ?? "이메일 없음"}</strong><small>{item.uid}</small></td><td>{dateTime(item.createdAt)}</td><td>{dateTime(item.lastPlayedAt)}</td><td>{number(item.totalCompletedRuns)}회</td><td><button className="row-arrow" onClick={() => setSelected(item)} aria-label={`${item.email ?? item.uid} 상세 보기`}><Icon name="arrow" size={17} /></button></td></tr>)}</tbody></table></div> : <Empty>{submitted ? "일치하는 사용자가 없습니다." : "표시할 사용자가 없습니다."}</Empty>}
    </Card>
    {selected && <UserDrawer user={user} summary={selected} onClose={() => setSelected(null)} />}
  </>;
}

function BalancePage({ user }: { user: User }) {
  const [current, setCurrent] = useState<Balance | null>(null);
  const [draft, setDraft] = useState<Balance["rewardMultiplier"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    adminRequest<Balance>(user, "/admin/balance").then(value => { if (live) { setCurrent(value); setDraft({ ...value.rewardMultiplier }); } }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [user, reload]);
  const changes = useMemo(() => {
    const changed: Partial<Record<Stat, number>> = {};
    if (current && draft) for (const stat of stats) if (current.rewardMultiplier[stat] !== draft[stat]) changed[stat] = draft[stat];
    return changed;
  }, [current, draft]);
  const changedCount = Object.keys(changes).length;
  const save = async () => {
    if (!changedCount || !current || !draft) return;
    const details = stats.filter(stat => stat in changes).map(stat => `${statLabels[stat]} ${Math.round(current.rewardMultiplier[stat] * 100)}% → ${Math.round(draft[stat] * 100)}%`).join("\n");
    if (!window.confirm(`다음 보상 배율을 저장할까요?\n\n${details}\n\n저장 이후 완료되는 반복 활동 보상에 적용됩니다.`)) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await adminRequest<Balance>(user, "/admin/balance", { method: "PATCH", body: JSON.stringify({ rewardMultiplier: changes }) });
      setCurrent(updated); setDraft({ ...updated.rewardMultiplier }); setSuccess(`버전 ${updated.version}으로 저장했습니다. 변경 내역은 서버 감사로그에 기록됩니다.`);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };
  return <>
    <SectionHead eyebrow="SYSTEM / 보상 배율" title="보상 배율" description="반복 가능한 성장 콘텐츠의 보이는 스탯 보상을 전역으로 조정합니다." action={<button className="button button-ghost" onClick={() => setReload(v => v + 1)}><Icon name="refresh" size={16} /> 새로고침</button>} />
    {error && <Notice>{error}</Notice>}{success && <Notice tone="success">{success}</Notice>}
    {loading ? <Empty>설정을 불러오는 중입니다…</Empty> : current && draft && <>
      <div className="balance-layout"><Card className="balance-main"><div className="card-heading"><div><p className="eyebrow">REWARD MULTIPLIER</p><h2>성장 스탯별 배율</h2></div><span className="tag">운영 설정</span></div>
        <p className="balance-intro">기본 보상의 50%에서 100%까지, 10% 단위로 선택합니다.</p>
        <div className="balance-rows">{stats.map(stat => <div className="balance-row" key={stat}><div><strong>{statLabels[stat]}</strong><span>{stat}</span></div><div className="balance-choices" role="group" aria-label={`${statLabels[stat]} 보상 배율`}>{[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(value => <button type="button" key={value} aria-pressed={draft[stat] === value} className={draft[stat] === value ? "active" : ""} onClick={() => { setSuccess(""); setDraft({ ...draft, [stat]: value }); }}>{Math.round(value * 100)}%</button>)}</div></div>)}</div>
        <div className="balance-actions"><span>{changedCount ? `${changedCount}개 스탯 변경됨` : "저장된 설정과 같습니다"}</span><div><button className="button button-ghost" disabled={!changedCount || saving} onClick={() => setDraft({ ...current.rewardMultiplier })}>되돌리기</button><button className="button button-primary" disabled={!changedCount || saving} onClick={save}>{saving ? "저장 중…" : "변경 저장"}</button></div></div>
      </Card><div className="balance-side"><Card><p className="eyebrow">CURRENT VERSION</p><div className="version-number">v{current.version}</div><div className="summary-list"><div><span>마지막 변경</span><strong>{dateTime(current.updatedAt)}</strong></div><div><span>변경한 운영자</span><strong className="uid-truncate" title={current.updatedBy}>{current.updatedBy}</strong></div></div></Card><Card className="help-card"><div className="help-icon"><Icon name="shield" size={21} /></div><h3>적용 범위</h3><p>수업·미니게임·모험 등 반복 가능한 콘텐츠에서 앞으로 확정되는 보상에 적용됩니다.</p><p>이미 저장된 스탯과 일회성 Story 보상에는 소급 적용되지 않습니다.</p></Card></div></div>
    </>}
  </>;
}

export default function Home() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [section, setSection] = useState<Section>("overview");

  useEffect(() => {
    let instance: Auth;
    try { instance = getFirebaseAuth(); setAuth(instance); }
    catch (e) { setLoginError((e as Error).message); setReady(true); return; }
    let active = true;
    const unsubscribe = onAuthStateChanged(instance, async candidate => {
      if (!active) return;
      if (!candidate) { setUser(null); setReady(true); return; }
      try {
        await adminRequest<{ admin: true; uid: string }>(candidate, "/admin/session", { method: "POST" });
        if (active) { setUser(candidate); setLoginError(""); }
      } catch (e) {
        if (active) {
          setUser(null);
          setLoginError(e instanceof ApiError && e.status === 403 ? "관리자 권한이 없거나 이메일 인증이 완료되지 않았습니다." : (e as Error).message);
          await signOut(instance);
        }
      } finally { if (active) setReady(true); }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth) return;
    setBusy(true); setLoginError("");
    try { await signInWithEmailAndPassword(auth, email.trim(), password); setPassword(""); }
    catch { setLoginError("로그인할 수 없습니다. 이메일과 비밀번호를 확인하세요."); }
    finally { setBusy(false); }
  };
  const logout = useCallback(async () => { if (auth) await signOut(auth); setSection("overview"); }, [auth]);

  if (!ready) return <div className="boot-screen"><div className="brand-mark">✦</div><p>LUMIA 운영 콘솔을 준비하고 있습니다…</p></div>;
  if (!user) return <main className="login-page"><div className="login-ambient" /><div className="login-shell"><div className="login-brand"><div className="brand-mark">✦</div><span>LUMIA <small>ADMIN</small></span></div><div className="login-copy"><p className="eyebrow">ARKADIA OPERATIONS</p><h1>아르카디아의<br /><em>오늘을 살펴보세요.</em></h1><p>루미아 운영팀을 위한 전용 공간입니다.<br />승인된 관리자 계정으로 로그인하세요.</p></div><Card className="login-card"><div className="login-card-head"><div className="login-icon"><Icon name="shield" size={24} /></div><h2>관리자 로그인</h2><p>Firebase 계정과 서버 관리자 권한을 확인합니다.</p></div><form onSubmit={login}><label htmlFor="email">이메일</label><input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" /><label htmlFor="password">비밀번호</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호 입력" />{loginError && <Notice>{loginError}</Notice>}<button className="button button-primary login-submit" type="submit" disabled={busy || !auth}>{busy ? "확인 중…" : "운영 콘솔 입장"}<Icon name="arrow" size={17} /></button></form></Card><p className="login-footer">LUMIA · FOR AUTHORIZED OPERATORS ONLY</p></div></main>;

  return <div className="app-shell"><aside className="sidebar"><div className="sidebar-brand"><div className="brand-mark">✦</div><span>LUMIA<small>OPERATIONS</small></span></div><div className="nav-caption">WORKSPACE</div><nav aria-label="관리자 메뉴">{(["overview", "users", "balance"] as const).map(value => <button key={value} className={section === value ? "active" : ""} onClick={() => setSection(value)}><Icon name={value === "overview" ? "grid" : value === "users" ? "users" : "sliders"} /><span>{sectionLabels[value]}</span>{section === value && <span className="nav-dot" />}</button>)}</nav><div className="sidebar-bottom"><div className="operator"><div className="operator-avatar">{user.email?.slice(0, 1).toUpperCase() ?? "A"}</div><div><strong>운영자</strong><span title={user.email ?? ""}>{user.email}</span></div></div><button className="logout" onClick={logout}><Icon name="logout" size={17} /> 로그아웃</button></div></aside><main className="main-area"><header className="topbar"><div className="breadcrumb">LUMIA <span>/</span> 관리자 <span>/</span> <strong>{sectionLabels[section]}</strong></div><div className="topbar-right"><span className="live-dot" /> 운영 콘솔 <span className="topbar-divider" /> {todayKst()} KST</div></header><div className="page-content">{section === "overview" ? <Dashboard user={user} /> : section === "users" ? <Users user={user} /> : <BalancePage user={user} />}</div></main></div>;
}
