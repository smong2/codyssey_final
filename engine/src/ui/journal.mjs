import { classOf } from "../core/classes.mjs";
import { createPageTurnGate } from "../core/ui-flow.mjs";
import { studentCards, petCards } from "../core/catalogue.mjs";
import { renderBadgePanel, renderRoomPanel } from "./collection-panels.mjs";
import { appendCharacterInfo } from "./character-info.mjs";
import { weeklyActivityRecords, storyDiaryRecords } from "../core/activity-history.mjs";
import { activityResultText } from "../core/activity-rules.mjs";
import { ADVENTURE_LOCATIONS, getAdventureMap } from "../core/adventure-mission.mjs";
import { storyContent } from "../core/story-events.mjs";
import { NARRATIVE_SCENES } from "../core/narrative.mjs";
import { unreadRoomIds } from "../core/collection-notices.mjs";
import { createBagButton, createCloseButton } from "./button-art.mjs";
const diaryStory = (record) => (record.formal || record.kind === "main" || NARRATIVE_SCENES.some((scene) => scene.id === record.id) ? { title: record.title ?? NARRATIVE_SCENES.find((scene) => scene.id === record.id)?.title ?? "완료한 이야기", choices: record.selectedChoices ?? [{ id: record.choiceId, label: record.choiceLabel }], closing: record.closing, formal: true } : storyContent(record));
const ACTIVITY_PLACES = { "rune-circuit": "BG08_magic_workshop_1920x1080_018.png", excavation: "BG01_arcadia_entrance_and_lake_1920x1080_010.png", "rune-link": "BG04_grand_library_1920x1080_014.png", "training-guardian": "BG09_rune_training_ground_1920x1080_019.png", "rune-merge": "BG06_glass_greenhouse_1920x1080_016.png", "mirror-magic": "BG05_starlight_observatory_1920x1080_015.png", "seal-dismantle": "BG02_clocktower_plaza_1920x1080_011.png", "observatory-mirror": "BG05_starlight_observatory_1920x1080_015.png", "starlight-stage": "BG02_clocktower_plaza_1920x1080_011.png", "spirit-pot-sort": "BG06_glass_greenhouse_1920x1080_016.png", "sealed-shelves": "BG04_grand_library_1920x1080_014.png", "rune-pin-training": "BG09_rune_training_ground_1920x1080_019.png" };
export const activityArt = (a, locationId = "greenhouse") => (a === "adventure" ? getAdventureMap((ADVENTURE_LOCATIONS.find((place) => place.id === locationId) ?? ADVENTURE_LOCATIONS[0]).mapId).thumbnail : a === "rest" ? "./world-assets/BG11_myroom2_day_1920x1080_023.png" : a === "fairy-trade" ? "./character-assets/CH_DRM_fairy_trade_upperbody_01.png" : ACTIVITY_PLACES[classOf(a)?.id] ? "./world-assets/" + ACTIVITY_PLACES[classOf(a).id] : null);
export const activityLabel = (a, locationId = "greenhouse") => (a === "adventure" ? (ADVENTURE_LOCATIONS.find((place) => place.id === locationId)?.title ?? "모험") + " 모험" : a === "fairy-trade" ? "요정의 거래" : (classOf(a)?.title ?? "휴식"));
function diaryCoverArt(record) {
	if (!record.activities) return record.formal || record.kind === "main" ? null : activityArt("adventure", record.locationId);
	// A presentation-only highlight from saved activities; ties use the later day.
	const rank = (activity) => (({ greatSuccess: 4, success: 3, complete: 2 })[activity.effect?.outcome] ?? 1) + (activity.action === "adventure" ? 0.25 : activity.action === "rest" ? -1 : 0);
	const highlight = record.activities.filter((activity) => activityArt(activity.action, activity.locationId)).reduce((best, activity) => (!best || rank(activity) > rank(best) || (rank(activity) === rank(best) && activity.day > best.day) ? activity : best), null);
	return highlight ? activityArt(highlight.action, highlight.locationId) : null;
}
export function createJournalUI(ctx) {
	const { el, btn, shell, heading, current, meta, onReturn, turnPage, modal } = ctx;
	let diaryTab = "활동 기록",
		page = 0,
		selected = 0;
	const turns = createPageTurnGate();
	const close = (diary = false, host = shell) => {
		const x = createCloseButton({el,btn,onClick:onReturn,label:"마이룸으로 닫기"});
		host.append(x);
	};
	function diary() {
		turns.reset();
		heading("다이어리", "diary-page");
		const records = diaryTab === "활동 기록" ? weeklyActivityRecords(current().actionHistory ?? []) : storyDiaryRecords(current()),
			pages = Math.max(1, Math.ceil(records.length / 6));
		page = Math.min(page, pages - 1);
		const layout = el("div", null, "book-layout"),
			tabs = el("nav", null, "book-tabs");
		layout.setAttribute("aria-label", "다이어리 펼친 책");
		const change = (fn) => {
			const done = turns.begin(() => {
				if (!layout.isConnected) return;
				fn();
				diary();
			});
			if (done) turnPage(layout, done);
		};
		tabs.setAttribute("aria-label", "다이어리 책갈피");
		for (const tab of ["이야기", "활동 기록"]) {
			const bookmark = btn(
				tab === "활동 기록" ? "활동기록" : tab,
				() =>
					change(() => {
						diaryTab = tab;
						page = 0;
						selected = 0;
					}),
				diaryTab === tab ? "selected" : "quiet",
			);
			bookmark.setAttribute("aria-pressed", String(diaryTab === tab));
			tabs.append(bookmark);
		}
		const left = el("section", null, "book-page book-left"),
			right = el("section", null, "book-page book-right");
		left.append(shell.querySelector("h1"), el("h2", diaryTab));
		const grid = el("div", null, "scrap-cards");
		if (!records.length) grid.append(el("p", diaryTab === "이야기" ? "아직 등록된 이야기 기록이 없습니다." : "아직 완료한 활동이 없습니다.", "book-empty"));
		for (const [index, record] of records.slice(page * 6, page * 6 + 6).entries()) {
			const absolute = page * 6 + index,
				card = btn(
					"",
					() =>
						change(() => {
							selected = absolute;
						}),
					"scrap-card" + (selected === absolute ? " selected" : ""),
				);
			const art = diaryCoverArt(record);
			if (art) {
				const image = el("img", null, "diary-record-cover");
				image.src = art;
				image.alt = "";
				card.append(image);
			}
			card.setAttribute("aria-pressed", String(absolute === selected));
			card.append(el("strong", record.activities ? record.week + "주차" : diaryStory(record).title), el("small", record.activities ? "실제 활동 " + record.activities.length + " / 5회" : record.week + "주차 · " + (diaryStory(record).formal ? "이야기" : "기존 임시 이야기")));
			grid.append(card);
		}
		left.append(grid);
		const record = records[selected];
		right.append(el("h2", record ? (record.activities ? record.week + "주차 활동 기록" : diaryStory(record).title) : "이야기의 자리"));
		if (record?.activities) {
			for (const activity of record.activities) {
				const row = el("p", ["월", "화", "수", "목", "금"][activity.day] + "요일 · " + activityLabel(activity.action, activity.locationId)),
					result = activityResultText(activity);
				if (result) row.append(el("br"), el("small", result));
				right.append(row);
			}
			right.append(el("small", "완료한 활동만 표시합니다. 활동 결과 저장 후 유지됩니다."));
		} else if (record) {
			const content = diaryStory(record),
				choices = record.selectedChoices ?? content.choices.filter((c) => c.id === record.choiceId);
			right.append(el("p", record.week + "주차" + (Number.isInteger(record.day) ? " · " + ["월", "화", "수", "목", "금"][record.day] + "요일" : "")));
			for (const choice of choices) {
				const text = choice.label ?? choice.text;
				if (text) right.append(el("p", text));
			}
			if (choices.length && !choices.some((choice) => choice.label || choice.text)) right.append(el("p", "선택 " + choices.length + "개 기록 · 상세 문구 연결 대기"));
			if (content.closing) right.append(el("p", content.closing));
			right.append(el("small", content.formal ? "완료한 이야기의 선택과 마무리입니다." : "기존 연결 확인용 임시 이야기 기록 · 정식 스토리·해금 아님"));
		} else right.append(el("p", "아직 펼쳐 볼 기록이 없어요. 활동과 이야기를 마치면 이곳에 남아요.", "book-empty"));
		const spine = el("div", null, "book-spine");
		spine.setAttribute("aria-hidden", "true");
		layout.append(tabs, left, spine, right);
		shell.append(layout);
		const footer = el("nav", null, "book-footer");
		const previous = btn(
				"이전 페이지",
				() =>
					change(() => {
						page--;
						selected = page * 6;
					}),
				"quiet",
			),
			next = btn(
				"다음 페이지",
				() =>
					change(() => {
						page++;
						selected = page * 6;
					}),
				"quiet",
			);
		previous.disabled = page === 0;
		next.disabled = page + 1 >= pages;
		for (const [button, label] of [[previous, "이전 페이지"], [next, "다음 페이지"]]) {
			button.setAttribute("aria-label", label);
			const art = el("img", null, "journal-page-arrow");
			art.src = "./design-assets/ui/UI23_journal_arrow_right.png";
			art.alt = "";
			button.append(art);
		}
		footer.append(previous, el("span", page + 1 + " / " + pages), next);
		layout.append(footer);
		close(true, layout);
	}
	function bag(tab = "배지") {
		heading("가방", "bag-page");
		const panel = el("section", null, "paper bag-frame" + (tab === "마이룸" ? " room-bag-frame" : "")),
			tabs = el("nav", null, "actions bag-tabs"),
			hasUnread = unreadRoomIds(meta()).length > 0;
		let roomNotice;
		panel.setAttribute("aria-label", "가방");
		tabs.setAttribute("aria-label", "가방 카테고리");
		for (const label of ["배지", "펫", "캐릭터", "마이룸"]) {
			const b = btn(label, () => bag(label), "bag-tab" + (label === tab ? " is-selected" : ""));
			b.setAttribute("aria-pressed", String(label === tab));
			if (label === "마이룸" && hasUnread) {
				roomNotice = el("small", "NEW", "collection-new-indicator");
				b.append(roomNotice);
			}
			tabs.append(b);
		}
		panel.append(tabs);
		shell.replaceChildren(panel);
		close(false, panel);
		if (tab === "배지") {
			renderBadgePanel(panel, ctx);
			return;
		}
		if (tab === "마이룸") {
			renderRoomPanel(panel, {
				...ctx,
				onReadRoomNotices: (id) => {
					ctx.onReadRoomNotices?.(id);
					if (!unreadRoomIds(meta()).length) roomNotice?.remove?.();
				},
			});
			return;
		}
		const grid = el("div", null, "bag-card-grid" + (["캐릭터", "펫"].includes(tab) ? " silhouette-card-grid" : ""));
		if (tab === "캐릭터" || tab === "펫") {
			const entries = tab === "캐릭터" ? studentCards(meta(), "bag") : petCards(meta(), ctx.activePet().id);
			for (const c of entries) {
				const kind = tab === "캐릭터" ? "캐릭터" : "펫",
					locked = !c.unlocked;
				const card = btn(
					"",
					() => {
						if (locked) {
							const body = el("div", null, "collection-unlock-info");
							body.append(el("p", c.pendingUnlock ? "조건 달성 완료 · 이번 회차를 마치면 만날 수 있어요." : kind === "캐릭터" ? "아직 만날 수 없는 학생이에요." : "아직 함께할 수 없는 펫이에요."), el("h3", "해금 조건"), el("p", c.unlockHint ?? c.condition ?? "해금 정보가 아직 등록되지 않았어요."));
							if (kind === "캐릭터") body.append(el("p", "조건 달성은 현재 회차에 기록되고, 회차 종료가 확정되면 다음 회차부터 사용할 수 있어요."));
							body.append(el("small", "조건 안내용 화면입니다. 자동 해금 판정은 아직 연결되지 않았습니다."));
							modal?.("해금 안내", body);
							return;
						}
						let body,
							actions = [],
							dialog;
						if (kind === "캐릭터") {
							body = el("section", null, "collection-character-info");
							appendCharacterInfo(body, c, el);
						} else {
							body = el("section", null, "collection-pet-info");
							const names = { knowledge: "지식", expression: "표현력", dexterity: "솜씨", exploration: "탐험", magic: "마법" };
							body.append(
								el("h2", c.name),
								el("p", c.description),
								el("h3", "함께하는 효과"),
								el(
									"p",
									Object.entries(c.modifiers)
										.map(([key, value]) => names[key] + " +" + value)
										.join(" · "),
								),
							);
							if (c.selected) body.append(el("small", "현재 함께하는 펫입니다."));
							else if (ctx.onSelectPet) {
								const choose = createBagButton({
									el,
									btn,
									label: "함께하기",
									onClick: () => {
										if (ctx.onSelectPet(c.id)) {
											dialog?.close?.();
											bag("펫");
										}
									},
								});
								choose.disabled = ctx.isSaveFailed?.() ?? false;
								actions.push(choose);
							}
						}
						dialog = modal?.(kind + " 정보", body, actions);
					},
					"collection-item-card collection-card-trigger silhouette-collection-card" + (locked ? " locked-card" : "") + (c.selected ? " active-collection-card" : ""),
				);
				card.setAttribute("type", "button");
				card.setAttribute("aria-label", locked ? "미해금 " + kind + " 해금 방법 보기" : "해금된 " + kind + " 정보 보기");
				const image = el("img", null, "bag-portrait");
				image.src = tab === "캐릭터" ? "./character-assets/" + c.fullbody : "./design-assets/pet/" + c.image;
				image.alt = "";
				image.setAttribute("aria-hidden", "true");
				card.append(image);
				if (locked) {
					const lock = el("span", "🔒", "collection-lock");
					lock.setAttribute("aria-hidden", "true");
					card.append(lock);
				}
				grid.append(card);
			}
		}
		panel.append(grid);
	}
	return { diary, bag };
}
