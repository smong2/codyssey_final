import { classOf } from "../core/classes.mjs";
import { createPageTurnGate } from "../core/ui-flow.mjs";
import { renderBadgePanel, renderRoomPanel } from "./collection-panels.mjs";
import { renderCompanionPanel } from "./companion-panel.mjs";
import { weeklyActivityRecords, storyDiaryRecords } from "../core/activity-history.mjs";
import { activityResultText } from "../core/activity-rules.mjs";
import { ADVENTURE_LOCATIONS, getAdventureMap } from "../core/adventure-mission.mjs";
import { storyContent } from "../core/story-events.mjs";
import { NARRATIVE_SCENES } from "../core/narrative.mjs";
import { unreadRoomIds } from "../core/collection-notices.mjs";
import { createCloseButton } from "./button-art.mjs";
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
	const { el, btn, shell, heading, current, meta, onReturn, turnPage } = ctx;
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
			if (choices.length) {
				const choiceList = el("section", null, "story-choice-records");
				choiceList.append(el("h3", "내가 고른 선택"));
				const items = el("ol");
				for (const choice of choices) items.append(el("li", choice.label ?? choice.text ?? "이전 버전에서 저장한 선택"));
				choiceList.append(items);
				right.append(choiceList);
			} else if (record.completionMode === "SKIP") right.append(el("p", "이 이야기는 건너뛰어 선택 기록이 없어요."));
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
		if (tab === "캐릭터" || tab === "펫") renderCompanionPanel(panel, ctx, tab);
	}
	return { diary, bag };
}
