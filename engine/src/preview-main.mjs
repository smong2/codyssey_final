import { CHARACTERS, startRun, setSchedule, actionToken, beginAction, applyAction, recoverInterruptedAction, stopAdventure, finishWeek, acknowledgeWeekSummary, deleteSlot, completeMainStory, prepareEnding, acceptEndingResult, completeRun } from "./core/state.mjs";
import { classOf } from "./core/classes.mjs";
import { createMinigameStartData } from "./core/minigame-contract.mjs";
import { activityResultText } from "./core/activity-rules.mjs";
import { titleModel } from "./core/preview.mjs";
import { createLocalRepository, createBoundaryWriter, prepareEngineStateUpdate } from "./core/storage.mjs";
import { previewScenes } from "./scenes/PreviewScenes.mjs";
import { curriculumScenes } from "./scenes/CurriculumScenes.mjs";
import { curriculumStart, DIFFICULTY_NAMES } from "./core/curriculum.mjs";
import { activeRoom } from "./core/collection-view.mjs";
import { SPACES } from "../minigame-demo/src/ui/theme.js";
import { createMyroomUI, DESCRIPTIONS } from "./ui/myroom.mjs";
import { createJournalUI } from "./ui/journal.mjs";
import { firstEmptySlot, recentSlot, createNotifier, invitationLines, ADMISSION_SCENES } from "./core/ui-flow.mjs";
import { introFrame } from "./core/intro.mjs";
import { mountAdventure } from "./scenes/AdventureScene.mjs";
import { ADVENTURE_LOCATIONS, getAdventureMap } from "./core/adventure-mission.mjs";
import { completeStoryEvent, storyContent } from "./core/story-events.mjs";
import { createPostActivityStoryFlow, queueServiceDialogue } from "./core/post-activity-story.mjs";
import { createAccountStorage, selectActivityEvent, ownsActivityEvent } from "./core/client-context.mjs";
import { inspectLocalSlots, deleteUnreadableSlot } from "./core/slot-recovery.mjs";
import { createSlotRecoveryUI } from "./ui/slot-recovery.mjs";
import { createAccountUI } from "./ui/account.mjs";
import { acceptCollectionReceipts, acceptBadgeReceipts, pendingBadgeReceipts, acknowledgeBadgeReceipts, markRoomNoticesRead, unreadRoomIds } from "./core/collection-notices.mjs";
import { createDialogueUI, createStoryResultUI } from "./ui/dialogue.mjs";
import { createDialogueRuntime } from "./core/dialogue-session.mjs";
import { createAdmissionPreviewPayload, createPreviewDialoguePayload } from "./core/preview-dialogue.mjs";
import { createNarrativeDialoguePayload } from "./core/narrative-dialogue.mjs";
import { finishNarrative, dismissNarrative } from "./core/narrative.mjs";
import { createAdventureResult, createAdventureStartData } from "./core/adventure-contract.mjs";
import { studentCards } from "./core/catalogue.mjs";
import { fitPortraitBounds } from "./core/portrait-layout.mjs";
import { createRoomLight } from "./core/room-light.mjs";
import { appendCharacterInfo } from "./ui/character-info.mjs";
import { createEndingUI } from "./ui/ending.mjs";
import { activePet } from "./core/pets.mjs";
import { createTitleAudioController } from "./core/title-audio.mjs";
import { createAdventureResultUI } from "./ui/adventure-result.mjs";
import { createBadgeResultUI } from "./ui/badge-result.mjs";
import { createImageButton, TITLE_BUTTON_ART } from "./ui/button-art.mjs";
import { dueMainStory, ensureMainStoryState, MAIN_STORIES } from "./core/main-story.mjs";
import { createServerDialogueSession, createServerGameSession } from "./core/server-game-session.mjs";
import { canRecordServerRoomVisit, serverAdventureStartData, serverClassStartData, serverRoomBackgroundId, serverRoomVisitKey, serverScheduleActivityIds } from "./core/server-state.mjs";
import { PRIVACY_CONSENT_VERSION } from "./services/api-provider.mjs";
import { createServerEndingUI } from "./ui/server-ending.mjs";
const roomLight = createRoomLight(),
	engineServices = globalThis.lumiaEngineServices ?? {};
const SERVER_GAME_METHODS = ["bootstrapAccount", "updateAccountSettings", "listSaveSlots", "getSaveSlot", "startRun", "deleteSaveSlot", "recoverSaveSlot", "confirmSchedule", "startActivity", "completeSpecial", "completeClassQuit", "completeClassReplay", "completeForcedRest", "completeRest", "completeAdventure", "closeWeek", "acknowledgeWeekSummary", "loadDialogue", "completeDialogue", "getCollection", "openMyRoom", "decideEnding", "prepareEnding", "getEnding", "finishEnding"];
const serverMode = Boolean(engineServices.account && SERVER_GAME_METHODS.every((name) => typeof engineServices[name] === "function"));
let previousRoomBackground = null;
function decorateRoom() {
	const bg = 'url("./world-assets/' + activeRoom(profile, roomLight.time).image + '")';
	shell.style.setProperty("--room-bg", bg);
	shell.style.setProperty("--previous-room-bg", previousRoomBackground ?? bg);
	shell.dataset.roomTime = roomLight.time;
	shell.classList.toggle("room-light-change", Boolean(previousRoomBackground && previousRoomBackground !== bg));
	previousRoomBackground = bg;
}
function reflectRoom() {
	roomLight.event("reflect");
	decorateRoom();
}
let adventureView = null;
let portraitObserver = null;
const shell = document.querySelector("#shell"),
	notice = document.querySelector("#notice");
let profile,
	writer,
	repository,
	slotId,
	pending,
	reviewPrompt = null,
	afterSaveSuccess = null,
	saveFailed = false,
	monthOffset = 0,
	view = "intro",
	introTimer,
	introAnimation,
	titleAudioSyncAnimation = 0,
	audioSync = () => {},
	introTimePosition = 0;
let activeStorage,
	slotSnapshot,
	clientUid = null;
let serverGame = serverMode
		? createServerGameSession({
				services: engineServices,
				onChange: (next) => {
					profile = next;
					slotSnapshot = { slots: next?.slots ?? [], canDelete: false };
				},
				onCollectionChanges: (messages) => messages.forEach(message),
			})
		: null,
	serverDialogue = null,
	serverDialogueContinuation = null,
	serverRetryContinuation = null;
const serverRoomVisits = new Set(),
	serverRoomVisitInFlight = new Set();
const asset = (category, file) => "./design-assets/" + category + "/" + file;
function el(tag, text, cls) {
	const e = document.createElement(tag);
	if (text) e.textContent = text;
	if (cls) e.className = cls;
	return e;
}
const notify = createNotifier(notice);
const adventureResultUI = createAdventureResultUI({ el }),
	badgeResultUI = createBadgeResultUI({ el }),
	storyResultUI = createStoryResultUI({ el, btn });
function message(text) {
	notify(text);
}
function btn(text, action, cls = "") {
	const b = el("button", text, cls);
	b.type = "button";
	b.onclick = () => {
		try {
			const result = action();
			if (result && typeof result.catch === "function") result.catch((e) => message(e.message));
		} catch (e) {
			message(e.message);
		}
	};
	return b;
}
let refreshAudioToggle = () => {};
const titleAudio = createTitleAudioController({
	onBlocked() {
		refreshAudioToggle();
	},
	onSoundError(kind, error) {
		console.warn("효과음 재생 실패:", kind, error);
	},
});
document.addEventListener(
	"click",
	(event) => {
		const button = event.target instanceof Element ? event.target.closest("button") : null;
		if (button && !button.disabled) {
			if (titleAudio.isBlocked() && !button.classList.contains("audio-toggle")) titleAudio.resume();
			titleAudio.playClick(button.dataset.sfx);
		}
	},
	true,
);
function blackDissolve(action, duration = 900) {
	const cover = el("div", null, "black-dissolve");
	cover.setAttribute("aria-hidden", "true");
	document.body.append(cover);
	requestAnimationFrame(() => {
		cover.classList.add("black-dissolve-active");
		setTimeout(() => {
			action();
			requestAnimationFrame(() => {
				cover.classList.remove("black-dissolve-active");
				setTimeout(() => cover.remove(), duration);
			});
		}, duration);
	});
}
function audioToggle() {
	const toggle = el("button", null, "audio-toggle");
	toggle.type = "button";
	const paint = (muted) => {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", "0 0 24 24");
		svg.setAttribute("aria-hidden", "true");
		const path = (d) => {
			const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
			node.setAttribute("d", d);
			svg.append(node);
		};
		path("M11 5 6 9H2v6h4l5 4V5z");
		if (muted) {
			path("m17 9 5 6");
			path("m22 9-5 6");
		} else {
			path("M15.54 8.46a5 5 0 0 1 0 7.07");
			path("M19.07 4.93a10 10 0 0 1 0 14.14");
		}
		toggle.replaceChildren(svg);
		toggle.setAttribute("aria-label", muted ? "BGM 켜기" : "BGM 끄기");
		toggle.setAttribute("aria-pressed", String(muted));
		toggle.title = muted ? "BGM 켜기" : "BGM 끄기";
	};
	refreshAudioToggle = () => paint(titleAudio.isBgmMuted() || titleAudio.isBlocked());
	refreshAudioToggle();
	toggle.onclick = () => {
		audioSync();
		if (titleAudio.isBlocked()) {
			titleAudio.setBgmMuted(false);
			titleAudio.resume();
		} else titleAudio.toggleBgmMute();
		refreshAudioToggle();
	};
	return toggle;
}
function img(category, file, alt, cls) {
	const i = el("img", null, cls);
	i.src = asset(category, file);
	i.alt = alt;
	return i;
}
function current() {
	return profile?.slots?.[slotId - 1]?.activeRun ?? null;
}
function heading(title, cls = "page") {
	adventureResultUI.clear();
	badgeResultUI.clear();
	storyResultUI.clear();
	shell.onclick = null;
	cancelAnimationFrame(titleAudioSyncAnimation);
	titleAudioSyncAnimation = 0;
	portraitObserver?.disconnect();
	portraitObserver = null;
	if (adventureView) {
		adventureView.destroy();
		adventureView = null;
	}
	view = cls;
	document.querySelector("#game").hidden = true;
	shell.hidden = false;
	shell.className = cls;
	shell.replaceChildren(el("h1", title));
	shell.scrollTop = 0;
	shell.append(el("p", "실행형 화면 시안 · 서비스 제공 여부에 따라 연결", "preview-label"));
}
function npcStage(image) {
	const stage = el("div", null, "npc-portrait-stage");
	stage.append(image);
	let bounds;
	const fit = () => {
		if (!bounds || !stage.isConnected) return;
		const p = fitPortraitBounds(stage.clientWidth, stage.clientHeight, image.naturalWidth, image.naturalHeight, bounds);
		for (const k of ["width", "height", "left", "top"]) image.style[k] = p[k] + "px";
	};
	image.onload = () => {
		const canvas = document.createElement("canvas");
		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;
		const context = canvas.getContext("2d", { willReadFrequently: true });
		context.drawImage(image, 0, 0);
		const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
		let left = canvas.width,
			top = canvas.height,
			right = -1,
			bottom = -1;
		for (let y = 0; y < canvas.height; y++)
			for (let x = 0; x < canvas.width; x++)
				if (pixels[(y * canvas.width + x) * 4 + 3] > 16) {
					left = Math.min(left, x);
					right = Math.max(right, x);
					top = Math.min(top, y);
					bottom = Math.max(bottom, y);
				}
		bounds = right >= left ? { x: left, y: top, width: right - left + 1, height: bottom - top + 1 } : { x: 0, y: 0, width: canvas.width, height: canvas.height };
		fit();
	};
	portraitObserver = new ResizeObserver(fit);
	portraitObserver.observe(stage);
	return stage;
}
function save(retry = false, savedSlotId = slotId, afterSuccess = null) {
	if (afterSuccess) afterSaveSuccess = afterSuccess;
	try {
		retry ? writer.retry() : writer.save(profile, savedSlotId);
		saveFailed = false;
		message("로컬 자동 저장 완료.");
	} catch (e) {
		saveFailed = true;
		message("저장 실패: " + e.message);
		return false;
	}
	const continuation = afterSaveSuccess;
	afterSaveSuccess = null;
	continuation?.();
	return true;
}
function retrySave() {
	const continuing = Boolean(afterSaveSuccess),
		saved = save(true);
	return saved && !continuing;
}
const activityStoryFlow = createPostActivityStoryFlow({ current, save: (next) => save(false, slotId, next), receive: (token) => selectActivityEvent(engineServices.storyEvents ?? profile.meta.narrativeEvents, { slotId, activityToken: token, uid: clientUid }), queue: typeof engineServices.loadDialogue === "function" || typeof engineServices.completeDialogue === "function" ? queueServiceDialogue : undefined, onStory: renderPendingStory, onContinue: continueSchedule });
async function selectPet(id) {
	if (saveFailed) return false;
	if (serverMode) {
		try {
			await serverGame.updateSettings({ activePetId: id });
			message(activePet(profile).name + "과 함께합니다.");
			return true;
		} catch (e) {
			message("펫 선택을 저장하지 못했습니다. " + e.message);
			return false;
		}
	}
	try {
		repository.saveSettings({ activePetId: id });
		profile.settings = { ...(profile.settings ?? {}), activePetId: id };
		message(activePet(profile).name + "과 함께합니다.");
		return true;
	} catch (e) {
		message("펫 선택을 저장하지 못했습니다. " + e.message);
		return false;
	}
}
async function selectRoom(id) {
	if (saveFailed) return false;
	if (serverMode) {
		try {
			await serverGame.updateSettings({ activeRoomBackgroundId: serverRoomBackgroundId(id) });
			return true;
		} catch (e) {
			message("배경을 변경하지 못했습니다. 다시 시도해 주세요. " + e.message);
			return false;
		}
	}
	try {
		repository.saveSettings({ activeRoomBackgroundId: id });
		profile.settings = { ...(profile.settings ?? {}), activeRoomBackgroundId: id };
		return true;
	} catch (e) {
		message("배경을 변경하지 못했습니다. 다시 시도해 주세요. " + e.message);
		return false;
	}
}
function modal(title, body, actions = []) {
	const d = el("dialog", null, "paper-modal");
	d.setAttribute("aria-label", title);
	d.append(el("h2", title), body);
	const a = el("div", null, "actions");
	for (const b of actions) a.append(b);
	const close = btn("X", () => d.close(), "close-x");
	close.setAttribute("aria-label", "닫기");
	d.append(close, a);
	d.addEventListener("close", () => d.remove());
	document.body.append(d);
	d.showModal();
	return d;
}
async function retryServerMutation() {
	if (!serverMode || !serverGame?.pending()) return false;
	let result;
	try {
		result = await serverGame.retry();
	} catch (error) {
		showServerMutationError(error, serverRetryContinuation);
		return false;
	}
	const continuation = serverRetryContinuation;
	serverRetryContinuation = null;
	document.querySelector("dialog.server-save-error[open]")?.close();
	message("서버 저장 완료.");
	continuation?.(result);
	return true;
}
function showServerMutationError(error, continuation = null) {
	serverRetryContinuation = continuation;
	document.querySelector("dialog.server-save-error[open]")?.close();
	const body = el("div", null, "empty-frame");
	body.append(el("p", "서버 저장을 완료하지 못했습니다."), el("small", error?.message ?? "잠시 후 다시 시도해 주세요."));
	const actions = serverGame?.pending() ? [btn("저장 다시 시도", retryServerMutation)] : [];
	const d = modal("서버 저장 확인", body, actions);
	d.classList.add("server-save-error");
}
async function performServerMutation(work, continuation = null) {
	let result;
	try {
		result = await work();
	} catch (error) {
		showServerMutationError(error, continuation);
		return false;
	}
	serverRetryContinuation = null;
	message("서버 저장 완료.");
	continuation?.(result);
	return true;
}
function renderServerLoadError(error) {
	heading("게임 데이터를 불러오지 못했습니다.", "account-page");
	const body = el("section", null, "account-panel");
	if (error?.code === "NOT_FOUND" && /account not initialized/i.test(error?.message ?? "")) {
		const consent = el("label", "[필수] 개인정보 수집·이용 동의", "account-consent"),
			check = el("input");
		check.type = "checkbox";
		consent.append(check);
		body.append(
			el("p", "게임 저장 데이터를 처음 연결하려면 개인정보 수집·이용 동의가 필요합니다."),
			el("p", "수집 항목: 이메일 주소 · 이용 목적: 계정 인증, 로그인, 비밀번호 재설정, 게임 저장 데이터 연결 · 보관 기간: 회원 탈퇴 시까지", "account-policy"),
			consent,
			btn("게임 데이터 시작", async () => {
				if (!check.checked) {
					message("개인정보 수집·이용 동의가 필요합니다.");
					return;
				}
				heading("게임 데이터 준비 중", "account-page");
				try {
					await serverGame.bootstrap({ privacyConsentAccepted: true, privacyConsentVersion: PRIVACY_CONSENT_VERSION });
					renderIntro();
				} catch (nextError) {
					renderServerLoadError(nextError);
				}
			}),
		);
	} else body.append(el("p", "로그인은 유지했지만 저장 데이터를 읽지 못했습니다."), el("small", error?.message ?? "잠시 후 다시 시도해 주세요."), btn("다시 불러오기", loadServerProfile));
	shell.append(body);
}
async function loadServerProfile() {
	if (!serverMode) return false;
	heading("게임 데이터 불러오는 중", "account-page");
	try {
		await serverGame.load();
		writer = null;
		repository = null;
		activeStorage = null;
		saveFailed = false;
		renderIntro();
		return true;
	} catch (error) {
		profile = null;
		slotSnapshot = null;
		renderServerLoadError(error);
		return false;
	}
}
function emptyFrame(title, description, actions = []) {
	const body = el("div", null, "empty-frame");
	body.append(el("div", "◇", "empty-symbol"), el("p", description), el("small", "백엔드 데이터 연결 예정 · 임의 데이터 없음"));
	modal(title, body, actions);
}
function soundSettings() {
	const body = el("div", null, "sound-settings"),
		bgm = btn("", () => {
			titleAudio.toggleBgmMute();
			refresh();
		}),
		sfx = btn("", () => {
			titleAudio.toggleSfxMute();
			refresh();
		});
	const refresh = () => {
		bgm.textContent = "BGM · " + (titleAudio.isBgmMuted() ? "꺼짐" : "켜짐");
		sfx.textContent = "효과음 · " + (titleAudio.isSfxMuted() ? "꺼짐" : "켜짐");
		bgm.setAttribute("aria-pressed", String(!titleAudio.isBgmMuted()));
		sfx.setAttribute("aria-pressed", String(!titleAudio.isSfxMuted()));
	};
	body.append(bgm, sfx);
	refresh();
	modal("소리 설정", body);
}
function openTodayReview() {
	reviewPrompt = null;
	reflectRoom();
	emptyFrame("오늘 돌아보기", "돌아보기 질문과 기록 데이터 연결 예정", [btn("다이어리에 남기기", () => message("저장할 기록 데이터가 아직 없습니다."))]);
}
function canLeave() {
	return !saveFailed && !["ACTING", "WEEK_COMPLETE"].includes(current().phase);
}
function menu() {
	const existing = shell.querySelector(".menu-popover");
	if (existing && !existing.classList.contains("menu-closing")) {
		shell.classList.remove("menu-open");
		existing.classList.add("menu-closing");
		existing.inert = true;
		for (const child of shell.children) if (child !== existing) child.inert = false;
		shell.querySelector('[aria-label="메뉴"]')?.setAttribute("aria-expanded", "false");
		shell.querySelector('[aria-label="메뉴"]')?.focus({ preventScroll: true });
		setTimeout(() => existing.remove(), 220);
		return;
	}
	existing?.remove();
	const pop = el("div", null, "menu-popover paper");
	pop.setAttribute("aria-label", "메뉴 항목");
	shell.querySelector('[aria-label="메뉴"]')?.setAttribute("aria-expanded", "true");
	const close = () => {
		shell.classList.remove("menu-open");
		pop.classList.add("menu-closing");
		pop.inert = true;
		for (const child of shell.children) if (child !== pop) child.inert = false;
		setTimeout(() => pop.remove(), 220);
		shell.querySelector('[aria-label="메뉴"]')?.setAttribute("aria-expanded", "false");
		shell.querySelector('[aria-label="메뉴"]')?.focus({ preventScroll: true });
	};
	const entry = (label, action) =>
		btn(label, () => {
			close();
			if (label === "오늘 돌아보기") {
				reviewPrompt = null;
				reflectRoom();
			}
			action();
		});
	pop.append(entry("소리 설정", soundSettings));
	pop.append(entry("지난 엔딩 편지", () => endingUI.history(profile.meta.endingRecords ?? [])));
	pop.append(
		entry("계속하기", () => {}),
		entry("오늘 돌아보기", () => emptyFrame("오늘 돌아보기", "돌아보기 질문과 기록 데이터 연결 예정", [btn("다이어리에 남기기", () => message("저장할 기록 데이터가 아직 없습니다."))])),
		entry("관계", () => emptyFrame("관계", "NPC 관계 데이터 연결 예정")),
		entry("계정", () => {
			if (saveFailed) {
				message("저장 오류를 해결한 뒤 계정 화면을 열어 주세요.");
				return;
			}
			accountUI.open();
		}),
	);
	const back = entry("타이틀로 돌아가기", () => renderTitle());
	back.disabled = !canLeave();
	pop.append(back);
	if (!canLeave()) pop.append(el("small", "이번 주 일정과 주말 저장 후 타이틀로 돌아갈 수 있습니다."));
	shell.append(pop);
	shell.classList.add("menu-open");
	const x = btn("X", close, "close-x");
	x.setAttribute("aria-label", "메뉴 닫기");
	pop.prepend(el("h2", "메뉴"), x);
	for (const child of shell.children) if (child !== pop) child.inert = true;
	pop.querySelector("button").focus({ preventScroll: true });
	pop.onkeydown = (e) => {
		if (e.key !== "Tab") return;
		const buttons = [...pop.querySelectorAll("button:not([disabled])")],
			first = buttons[0],
			last = buttons.at(-1);
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus({ preventScroll: true });
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus({ preventScroll: true });
		}
	};
}
function storyFrame(kind, onReturn) {
	if (kind === "최종 이벤트 · 엔딩") {
		endingUI.render({ example: true });
		return;
	}
	heading(kind, "story-page");
	shell.append(el("p", "시나리오 데이터가 아직 등록되지 않았습니다.", "empty-frame"), el("p", "이 화면은 연결 프레임입니다. 이야기를 완료하거나 보상을 지급하지 않습니다."), btn(kind === "메인 스토리" ? "내용 미등록 · 마이룸으로" : "마이룸으로 돌아가기", onReturn));
}
function renderTitle(animated = false, overlayVideo = null, audioEntry = "direct") {
	clearTimeout(introTimer);
	cancelAnimationFrame(introAnimation);
	cancelAnimationFrame(titleAudioSyncAnimation);
	titleAudioSyncAnimation = 0;
	heading("", "title-page");
	const wrap = el("div", null, "logo-group");
	// Clip in original image coordinates so portrait/landscape letterboxing stays aligned.
	const svgNode = (tag, attrs = {}) => {
		const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
		for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
		return n;
	};
	const logo = svgNode("svg", { viewBox: "0 0 1774 887", class: "title-logo", role: "img", "aria-label": "LUMIA · 루미아 전기: 마음을 품은 룬" }),
		defs = svgNode("defs");
	const revealRegions = [
		{ x: 0, y: 704, width: 1774, height: 183 },
		{ x: 370, y: 642, width: 1050, height: 24 },
		{ x: 806, y: 588, width: 152, height: 116 },
	];
	const goldMask = svgNode("mask", { id: "title-gold-mask", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 1774, height: 887 });
	goldMask.append(svgNode("rect", { x: 0, y: 0, width: 1774, height: 887, fill: "white" }));
	const subtitleClip = svgNode("clipPath", { id: "title-subtitle-clip" }),
		decorationClip = svgNode("clipPath", { id: "title-decoration-clip" });
	for (const [i, region] of revealRegions.entries()) {
		goldMask.append(svgNode("rect", { ...region, fill: "black" }));
		(i === 0 ? subtitleClip : decorationClip).append(svgNode("rect", region));
	}
	defs.append(goldMask, subtitleClip, decorationClip);
	logo.append(defs);
	logo.append(svgNode("image", { href: asset("ui", "lumia_logo_final_034.png"), width: 1774, height: 887, mask: "url(#title-gold-mask)", class: "logo-wordmark" }), svgNode("image", { href: asset("ui", "lumia_logo_final_034.png"), width: 1774, height: 887, "clip-path": "url(#title-decoration-clip)", class: "logo-decoration" }), svgNode("image", { href: asset("ui", "lumia_logo_final_034.png"), width: 1774, height: 887, "clip-path": "url(#title-subtitle-clip)", class: "logo-subtitle" }));
	wrap.append(img("effect", "lumia_logo_glow_003.png", "", "logo-glow"), logo);
	const particles = el("div", null, "gold-particles");
	particles.setAttribute("aria-hidden", "true");
	for (let i = 0; i < 24; i++) {
		const p = el("i");
		p.style.cssText = `--x:${18 + ((i * 29) % 66)}%;--y:${10 + ((i * 17) % 58)}%;--delay:${-(i % 8)}s;--size:${1 + (i % 3)}px`;
		particles.append(p);
	}
	wrap.append(particles);
	const actions = el("div", null, "title-actions");
	if (!profile) {
		actions.append(el("p", "저장 데이터를 읽지 못했습니다. 기존 데이터를 보존했습니다."), btn("저장 슬롯 확인", renderSlots));
	} else {
		const slotNotice = el("p", null, "title-slot-notice");
		slotNotice.setAttribute("role", "status");
		slotNotice.setAttribute("aria-live", "polite");
		const notifySlots = createNotifier(slotNotice);
		const m = titleModel(profile),
			startKey = m.startLabel === "새로 시작하기" ? "newGame" : "start",
			start = createImageButton({ el, btn, src: asset("ui", TITLE_BUTTON_ART[startKey]), label: m.startLabel, caption: m.startLabel, onClick: () => renderEmptySlots(notifySlots), className: "title-image-button" });
		start.disabled = saveFailed;
		actions.append(start);
		if (m.continueVisible) actions.append(createImageButton({ el, btn, src: asset("ui", TITLE_BUTTON_ART.continue), label: "이어서 하기", caption: "이어서 하기", onClick: renderSlots, className: "title-image-button" }));
		actions.append(slotNotice);
	}
	shell.append(wrap, actions, btn("다시 보기", renderIntro, "text-button title-replay"), audioToggle());
	if (overlayVideo) {
		overlayVideo.className = "intro-overlay";
		shell.prepend(overlayVideo);
	}
	shell.classList.toggle("title-enter", animated);
	if (audioEntry === "intro") {
		audioSync = () => {
			if (overlayVideo?.isConnected) titleAudio.syncIntroPosition(overlayVideo.currentTime);
		};
		const sync = () => {
			if (view !== "title-page" || !overlayVideo?.isConnected) {
				titleAudioSyncAnimation = 0;
				return;
			}
			audioSync();
			titleAudioSyncAnimation = requestAnimationFrame(sync);
		};
		titleAudioSyncAnimation = requestAnimationFrame(sync);
	} else if (audioEntry === "skip") titleAudio.skipToTitle();
	else if (audioEntry !== "preserve") titleAudio.startTitle();
}
function renderIntro() {
	clearTimeout(introTimer);
	cancelAnimationFrame(introAnimation);
	cancelAnimationFrame(titleAudioSyncAnimation);
	titleAudioSyncAnimation = 0;
	heading("", "intro-page");
	const video = el("video");
	video.src = "./intro.mp4";
	video.muted = true;
	video.playsInline = true;
	video.preload = "metadata";
	video.controls = false;
	video.style.transition = "none";
	introTimePosition = 0;
	audioSync = () => titleAudio.syncIntroPosition(video.isConnected ? video.currentTime : introTimePosition);
	titleAudio.startIntro(0);
	let ended = false,
		titleStarted = false;
	const release = () => {
		introTimePosition = video.currentTime;
		video.onended = null;
		video.onerror = null;
		video.pause();
		video.removeAttribute("src");
		video.load();
		video.remove();
	};
	const complete = () => {
		if (ended) return;
		ended = true;
		clearTimeout(introTimer);
		cancelAnimationFrame(introAnimation);
		video.style.opacity = "0";
		release();
		if (!titleStarted) renderTitle(true, null, "intro");
	};
	const finish = () => {
		if (ended || !["intro-page", "title-page"].includes(view)) return;
		if (titleStarted) {
			complete();
			return;
		}
		ended = true;
		clearTimeout(introTimer);
		cancelAnimationFrame(introAnimation);
		video.style.transition = "opacity .65s";
		video.style.opacity = "0";
		shell.classList.add("intro-fade");
		introTimer = setTimeout(() => {
			release();
			renderTitle(true, null, "intro");
		}, 650);
	};
	const skip = () => {
		if (ended || !["intro-page", "title-page"].includes(view)) return;
		ended = true;
		clearTimeout(introTimer);
		cancelAnimationFrame(introAnimation);
		release();
		renderTitle(true, null, "skip");
		shell.classList.add("title-skip-enter");
	};
	const tick = () => {
		if (ended) return;
		if (!video.isConnected || !["intro-page", "title-page"].includes(view)) {
			ended = true;
			clearTimeout(introTimer);
			release();
			return;
		}
		introTimePosition = video.currentTime;
		titleAudio.syncIntroPosition(introTimePosition);
		const frame = introFrame(video.currentTime);
		video.style.opacity = String(frame.opacity);
		if (frame.titleVisible && !titleStarted) {
			titleStarted = true;
			renderTitle(true, video, "intro");
			video.play().catch(() => complete());
		}
		if (frame.complete) {
			complete();
			return;
		}
		introAnimation = requestAnimationFrame(tick);
	};
	video.onended = () => {
		introFrame(video.currentTime).complete ? complete() : finish();
	};
	video.onerror = finish;
	shell.append(video, btn("건너뛰기", skip, "intro-skip"), audioToggle());
	introTimer = setTimeout(finish, 120000);
	video.play().catch(() => {
		message("영상을 재생하지 못했습니다. 건너뛰기로 계속할 수 있습니다.");
	});
	introAnimation = requestAnimationFrame(tick);
}
function renderSlots() {
	if (view !== "title-page") renderTitle();
	document.querySelector(".slot-dialog")?.close();
	const cards = el("div", null, "slot-list");
	const resume = (s, d) => {
		dialogueRuntime.cancel();
		serverDialogue?.cancel();
		d.close();
		slotId = s.slotId;
		monthOffset = 0;
		roomLight.event("resume");
		previousRoomBackground = null;
		if (s.status === "PLAYING") {
			if (current().inProgressActivity) {
				recoverInterruptedAction(profile, slotId);
				save(false, slotId, () => resumeToRoom());
				if (saveFailed) renderRoom();
			} else if ((serverMode && current().pendingStoryEvent?.eventId === "MS01") || current().flags?.admissionPending) renderAdmission();
			else if (serverMode && current().pendingStoryEvent) renderPendingStory();
			else resumeToRoom();
		} else renderCharacters(s.slotId, false);
	};
	let dialog;
	const cardFor = (s, recent = false) => {
		if (s.status === "LOAD_ERROR") {
			if (!serverMode) return slotRecoveryUI.card(s.slotId, { canDelete: slotSnapshot.canDelete });
			const card = el("article", null, "slot-row slot-recovery-error");
			card.append(
				el("h3", "슬롯 " + s.slotId),
				el("p", "서버 저장을 불러오지 못했습니다. 원본을 빈 슬롯으로 취급하지 않습니다."),
				btn("다시 불러오기", async () => {
					try {
						await serverGame.refreshSlot(s.slotId);
						renderSlots();
					} catch (error) {
						message("슬롯 다시 불러오기 실패: " + error.message);
					}
				}),
			);
			return card;
		}
		const card = el("article", null, "slot-row" + (recent ? " recent-slot" : ""));
		card.append(el("h3", (recent ? "최근 저장 · " : "") + "슬롯 " + s.slotId));
		if (s.status === "EMPTY") card.append(el("p", "저장 기록 없음"));
		else {
			const c = CHARACTERS.find((c) => c.id === s.activeRun?.characterId);
			card.append(el("p", s.status === "PLAYING" ? (c?.name ?? "학생") + " · " + s.activeRun.runNumber + "회차 · " + s.activeRun.week + "주차" : s.completedRunCount + "회차 완료"));
			const open = btn(s.status === "PLAYING" ? "이어서 하기" : s.completedRunCount + 1 + "회차 시작", () => resume(s, dialog));
			open.disabled = !profile || saveFailed;
			card.append(open);
			if (!recent && profile) {
				const remove = btn(
					"슬롯 삭제",
					() => {
						modal("슬롯을 삭제할까요?", el("p", "이 슬롯의 회차만 삭제합니다. 공용 메타는 유지됩니다."), [
							btn(
								"삭제",
								async () => {
									if (serverMode) {
										await performServerMutation(
											() => serverGame.deleteSaveSlot(s.slotId),
											() => {
												document.querySelector("dialog:not(.slot-dialog)")?.close();
												renderSlots();
											},
										);
										return;
									}
									deleteSlot(profile, s.slotId);
									save(false, null);
									document.querySelector("dialog:not(.slot-dialog)")?.close();
									renderSlots();
								},
								"danger",
							),
						]);
					},
					"text-button",
				);
				remove.disabled = saveFailed;
				card.append(remove);
			}
		}
		return card;
	};
	const recent = profile ? recentSlot(profile) : null;
	if (recent) cards.append(cardFor(recent, true));
	if (!profile) cards.append(el("p", "원본 저장을 보호하기 위해 오류 슬롯을 복구하거나 확인 후 삭제할 때까지 새 게임과 이어하기를 잠시 사용할 수 없습니다.", "slot-recovery-error"));
	for (const s of profile?.slots ?? slotSnapshot.slots) cards.append(cardFor(s));
	const retryActions = [];
	if (saveFailed)
		retryActions.push(
			btn("저장 다시 시도", () => {
				if (retrySave()) renderSlots();
			}),
		);
	if (serverMode && serverGame.pending())
		retryActions.push(
			btn("서버 저장 다시 시도", async () => {
				if (await retryServerMutation()) renderSlots();
			}),
		);
	dialog = modal("이어서 하기", cards, retryActions);
	dialog.classList.add("slot-dialog");
	dialog.querySelector("button")?.focus();
}
function renderEmptySlots(showNotice = message) {
	if (saveFailed) {
		message("저장 오류를 해결한 뒤 새 이야기를 시작해 주세요.");
		return;
	}
	const empty = firstEmptySlot(profile);
	if (!empty) {
		showNotice("슬롯이 모두 사용 중이에요.\n이어서 하기에서 슬롯을 삭제해 주세요.");
		return;
	}
	renderCharacters(empty.slotId, true);
}
function renderCharacters(id, isNew, gender = "male", selectedId = null) {
	heading("", "character-select-page");
	const available = studentCards(profile.meta)
			.filter((c) => c.gender === gender)
			.sort((a, b) => Number(b.selectable) - Number(a.selectable)),
		selected = available.find((c) => c.id === selectedId && c.selectable) ?? available.find((c) => c.selectable);
	const layout = el("div", null, "character-catalogue"),
		list = el("section", null, "character-list-panel paper"),
		tabs = el("nav", null, "actions");
	list.append(el("h2", "어떤 친구로 모험을 시작할까요?", "character-selection-title"));
	for (const [value, label] of [
		["male", "남성"],
		["female", "여성"],
	]) {
		const b = btn(label, () => renderCharacters(id, isNew, value), value === gender ? "selected" : "quiet");
		b.setAttribute("aria-pressed", String(value === gender));
		tabs.append(b);
	}
	list.append(tabs);
	const grid = el("div", null, "character-grid");
	const enlarge = (c) => {
		const large = el("img", null, "enlarged-character");
		large.src = "./character-assets/" + c.fullbody;
		large.alt = c.name + " 전신";
		const d = modal(c.name + " · 전신 크게 보기", large);
		d.classList.add("character-preview-dialog");
	};
	for (const c of available) {
		const card = el("article", null, "select-character-card" + (selected.id === c.id ? " selected" : ""));
		const choose = btn("", () => renderCharacters(id, isNew, gender, c.id), "character-card-select");
		choose.setAttribute("aria-label", c.name + " 선택");
		choose.setAttribute("aria-pressed", String(selected.id === c.id));
		const art = el("img");
		art.src = "./character-assets/" + c.fullbody;
		art.alt = c.name;
		choose.append(art, el("strong", c.name));
		choose.disabled = !c.selectable;
		card.classList.toggle("locked-card", !c.selectable);
		if (!c.selectable) {
			const lock = el("span", "🔒", "card-lock");
			lock.setAttribute("aria-label", "미해금");
			card.append(lock);
		}
		const plus = btn("+", () => enlarge(c), "card-plus");
		plus.setAttribute("aria-label", c.name + " 이미지 크게 보기");
		card.append(choose);
		if (c.selectable) card.append(plus);
		grid.append(card);
	}
	list.append(grid);
	const detail = el("aside", null, "character-detail-panel paper");
	const full = el("img", null, "selected-character-full");
	full.src = "./character-assets/" + selected.fullbody;
	full.alt = selected.name + " 전신";
	appendCharacterInfo(detail, selected, el);
	detail.append(el("small", "체력 100 · 초기 성장 스탯에 캐릭터 보정과 영구 보너스 적용"));
	const start = btn("시작하기", async () => {
		start.disabled = true;
		slotId = id;
		monthOffset = 0;
		if (serverMode) {
			const saved = await performServerMutation(
				() => serverGame.startRun(id, selected.id),
				() => {
					titleAudio.playMusic("admission", 0.9, { restart: true });
					blackDissolve(renderAdmission);
				},
			);
			if (!saved) start.disabled = false;
			return;
		}
		startRun(profile, id, selected.id);
		current().flags.admissionPending = true;
		save();
		if (saveFailed) {
			renderRoom();
			return;
		}
		titleAudio.playMusic("admission", 0.9, { restart: true });
		blackDissolve(renderAdmission);
	});
	start.disabled = saveFailed;
	detail.append(start);
	layout.append(list, detail);
	shell.append(layout, btn("뒤로가기", isNew ? () => renderTitle(false, null, "preserve") : renderSlots, "text-button character-select-back"));
}
function renderAdmission() {
	titleAudio.playMusic("admission");
	heading("입학 초대장", "admission-page");
	const c = CHARACTERS.find((c) => c.id === current().characterId);
	const letter = el("section", null, "invitation-letter");
	const art = img("ui", "UI07_admission_invitation_004.png", "", "invitation-art");
	art.onload = () => {
		letter.style.aspectRatio = art.naturalWidth + "/" + art.naturalHeight;
	};
	letter.append(art);
	const copy = el("div", null, "invitation-copy");
	invitationLines(c.name).forEach((text, i) => copy.append(el(i === 0 ? "h2" : "p", text)));
	copy.append(btn("입학하기", () => (usesServerDialogue() ? renderServiceDialogue("MS01", renderRoom) : renderAdmissionScene(0))));
	letter.append(copy);
	shell.append(letter);
}
function finishAdmissionPreview() {
	if (current().flags?.admissionPending) current().flags.admissionPending = false;
	completeMainStory(current(), "MS01");
	save(false, slotId, renderRoom);
	if (saveFailed) renderRoom();
}
function renderAdmissionScene(index) {
	const scene = ADMISSION_SCENES[index],
		actor = CHARACTERS.find((character) => character.id === "CH16");
	if (!scene || !actor) {
		renderAdmission();
		return;
	}
	const isLast = index + 1 === ADMISSION_SCENES.length;
	const payload = createAdmissionPreviewPayload(scene, { id: actor.id, name: actor.name, image: actor.fullbody }, { finishLabel: isLast ? "마이룸으로" : "다음 장면" });
	dialogueUI.render({ payload, pageClassName: "admission-story-page", extraControls: [btn("이전", () => (index ? renderAdmissionScene(index - 1) : renderAdmission()), "text-button")], onComplete: () => (isLast ? finishAdmissionPreview() : renderAdmissionScene(index + 1)), onSkip: finishAdmissionPreview });
}
function renderMainStory(id, index = 0) {
	if (usesServerDialogue()) {
		renderServiceDialogue(id, renderRoom);
		return;
	}
	const story = MAIN_STORIES.find((item) => item.id === id);
	if (!story) {
		renderRoom();
		return;
	}
	const stage = story.stages[index];
	heading(story.title, "admission-story-page");
	const frame = el("section", null, "paper life-dialogue main-story-unregistered");
	frame.append(el("small", story.id + " · " + (index + 1) + " / " + story.stages.length), el("h2", story.title), el("p", "미등록 프레임 · 정식 대사와 장면 연출이 등록되지 않았습니다.", "dialogue-text"), el("small", stage.id + " · 스토리 원고 연결 대기"));
	const actions = el("nav", null, "actions");
	if (index > 0) actions.append(btn("이전", () => renderMainStory(id, index - 1), "quiet"));
	if (index + 1 < story.stages.length) actions.append(btn("다음 장면", () => renderMainStory(id, index + 1)));
	else
		actions.append(
			btn("이야기 마치기", () => {
				completeMainStory(current(), id);
				save(false, slotId, renderRoom);
				if (saveFailed) renderRoom();
			}),
		);
	frame.append(actions);
	shell.append(frame);
}
function readRoomNotices(id) {
	if (serverMode) return;
	if (saveFailed || !unreadRoomIds(profile.meta).includes(id)) return;
	const old = structuredClone(profile.meta.collectionNoticeState);
	markRoomNoticesRead(profile.meta, id);
	const next = structuredClone(profile.meta.collectionNoticeState);
	const saved = save(false, null, () => {
		profile.meta.collectionNoticeState = next;
		if (!unreadRoomIds(profile.meta).length) shell.querySelectorAll(".collection-new-indicator").forEach((node) => node.remove());
	});
	if (!saved) {
		profile.meta.collectionNoticeState = old;
		modal("확인 상태 저장 실패", el("p", "NEW 표시를 보존했습니다. 저장을 다시 시도해 주세요."), [
			btn("저장 다시 시도", () => {
				if (save(true)) document.querySelector("dialog[open]")?.close();
			}),
		]);
	}
}
const journalUI = createJournalUI({ el, btn, shell, heading, current, meta: () => profile.meta, settings: () => profile.settings, activePet: () => activePet(profile), onSelectPet: selectPet, onSelectRoom: selectRoom, onReadRoomNotices: readRoomNotices, isSaveFailed: () => saveFailed, onReturn: renderRoom, turnPage: (_layout, done) => done(), modal });
const dialogueUI = createDialogueUI({ el, btn, shell, heading, modal });
const usesServerDialogue = () => serverMode;
function showDialogueError(error, retry) {
	console.warn("대화 서비스:", error);
	heading("이야기를 이어갈 준비가 필요해요.", "dialogue-service-page");
	const frame = el("section", null, "paper stat-panel");
	frame.append(
		el("p", "이야기를 불러오거나 저장하지 못했어요. 다음 일정은 잠시 기다립니다."),
		btn("다시 시도", () => {
			heading("이야기를 확인하고 있어요.", "dialogue-service-page");
			retry();
		}),
	);
	shell.append(frame);
}
const dialogueRuntime = createDialogueRuntime({
	services: engineServices,
	getProfile: () => profile,
	getSlotId: () => slotId,
	getUid: () => clientUid,
	setProfile: (value) => {
		profile = value;
		saveFailed = false;
	},
	persist: (value, id) => writer.save(value, id),
	render: (payload, handlers) =>
		dialogueUI.render({
			payload,
			onComplete: (result) => {
				heading("이야기를 저장하고 있어요.", "dialogue-service-page");
				handlers.onComplete(result);
			},
			onSkip: (result) => {
				heading("이야기를 저장하고 있어요.", "dialogue-service-page");
				handlers.onSkip(result);
			},
		}),
	onError: showDialogueError,
});
if (serverMode)
	serverDialogue = createServerDialogueSession({
		game: serverGame,
		services: engineServices,
		slotId: () => slotId,
		onRender: (payload, handlers) =>
			dialogueUI.render({
				payload,
				onComplete: (result) => {
					heading("이야기를 저장하고 있어요.", "dialogue-service-page");
					handlers.onComplete(result);
				},
				onSkip: (result) => {
					heading("이야기를 저장하고 있어요.", "dialogue-service-page");
					handlers.onSkip(result);
				},
			}),
		onContinue: (response) => {
			const next = serverDialogueContinuation;
			serverDialogueContinuation = null;
			storyResultUI.show(shell, { completionMode: response.completionMode, visibleStatDelta: response.appliedSummary?.visibleStatDelta ?? {} }, () => showPendingBadgeNotices(next));
		},
		onError: showDialogueError,
	});
function renderServiceDialogue(eventId, next) {
	if (serverMode) {
		if (serverDialogue.hasPendingCompletion()) return;
		serverDialogueContinuation = next;
		heading("이야기를 준비하고 있어요.", "dialogue-service-page");
		serverDialogue.start({ slotId, eventId });
		return;
	}
	if (dialogueRuntime.isActive()) return;
	heading("이야기를 준비하고 있어요.", "dialogue-service-page");
	dialogueRuntime.start(eventId, (response) => {
		if (response.messages?.length) message(response.messages.join("\n"));
		storyResultUI.show(shell, response, () => showPendingBadgeNotices(next));
	});
}
function dispatchActivity(checkpoint) {
	const run = current(),
		action = checkpoint.action,
		lesson = classOf(action);
	if (action !== "rest") reviewPrompt = null;
	roomLight.event("start");
	if (action === "adventure") renderAdventure(checkpoint);
	else if (serverMode && action === "rest") void completeServerActivity(checkpoint);
	else if (serverMode && action === "fairy-trade") openFairyTrade(checkpoint);
	else if (lesson) {
		pending = { slotId, token: checkpoint.token, server: serverMode, checkpoint: structuredClone(checkpoint) };
		shell.hidden = true;
		document.querySelector("#game").hidden = false;
		const input = { gameId: lesson.id, locationId: lesson.locationId, statValue: run.stats[lesson.stat], consecutiveFailures: run.consecutiveFails?.[lesson.id] ?? 0, seed: `run-${run.runNumber}-${run.week}-${run.day}`, maxDurationMs: 180000, rewardInputs: null };
		const startData = serverMode ? serverClassStartData(checkpoint, lesson) : lesson.curriculum ? curriculumStart(input) : createMinigameStartData(input);
		game.scene.start(lesson.sceneKey ?? lesson.id, startData);
	} else renderRoom();
}
async function startScheduledActivity() {
	if (saveFailed) {
		renderRoom();
		return false;
	}
	if (serverMode) {
		if (current()?.pendingStoryEvent) {
			renderPendingStory();
			return false;
		}
		const run = current();
		if (run?.phase !== "ACTING") {
			renderRoom();
			return false;
		}
		if (run.inProgressActivity) {
			dispatchActivity(run.inProgressActivity);
			return true;
		}
		return performServerMutation(
			() => serverGame.startActivity(slotId),
			() => dispatchActivity(current().inProgressActivity),
		);
	}
	if (current().pendingActivityStory) {
		const saved = activityStoryFlow.resume();
		if (saveFailed) renderRoom();
		return saved;
	}
	if (current().pendingDialogue || current().storyState?.pending || current().narrativeState?.pending) {
		renderPendingStory();
		return false;
	}
	const run = current();
	if (run.phase !== "ACTING") {
		renderRoom();
		return false;
	}
	if (run.inProgressActivity) {
		dispatchActivity(run.inProgressActivity);
		return true;
	}
	const checkpoint = beginAction(profile, slotId, actionToken(run));
	if (!checkpoint) {
		renderRoom();
		return false;
	}
	const saved = save(false, slotId, () => dispatchActivity(checkpoint));
	if (!saved) renderRoom();
	return saved;
}
function resumeToRoom() {
	if (saveFailed) {
		renderRoom();
		return;
	}
	if (serverMode && current().pendingStoryEvent) {
		if (current().pendingStoryEvent.eventId === "MS01") renderAdmission();
		else renderPendingStory();
	} else if (current().pendingDialogue || current().pendingActivityStory || current().storyState?.pending || current().narrativeState?.pending) {
		renderRoom();
		setTimeout(() => {
			activityStoryFlow.resume();
			if (saveFailed) renderRoom();
		}, 180);
	} else if (current().phase === "ACTING") setTimeout(startScheduledActivity, 180);
	else if (current().phase === "WEEK_COMPLETE") setTimeout(finishWeekFlow, 180);
	else renderRoom();
}
function finishWeekFlow() {
	if (saveFailed) {
		renderRoom();
		return false;
	}
	if (current().phase !== "WEEK_COMPLETE") {
		renderRoom();
		return false;
	}
	reviewPrompt = null;
	roomLight.event("next-day");
	if (serverMode) return performServerMutation(() => serverGame.closeWeek(slotId), renderRoom);
	finishWeek(profile, slotId);
	const saved = save(false, slotId, () => renderRoom());
	if (saveFailed) renderRoom();
	return saved;
}
function continueSchedule() {
	if (serverMode && current()?.pendingStoryEvent) {
		renderPendingStory();
		return;
	}
	if (current()?.phase === "ACTING") startScheduledActivity();
	else if (current()?.phase === "WEEK_COMPLETE") finishWeekFlow();
	else renderRoom();
}
async function renderServerRoom(run) {
	const key = serverRoomVisitKey(run);
	if (!canRecordServerRoomVisit(run) || serverRoomVisits.has(key) || serverRoomVisitInFlight.has(key)) {
		roomUI.room();
		return;
	}
	serverRoomVisitInFlight.add(key);
	heading("마이룸 기록 중", "room-page");
	shell.append(el("p", "이번 주 마이룸 방문을 서버에 기록하고 있습니다.", "ending-placeholder"));
	const ok = await performServerMutation(
		() => serverGame.openMyRoom(slotId),
		() => {
			serverRoomVisits.add(key);
			serverRoomVisitInFlight.delete(key);
			roomUI.room();
		},
	);
	if (!ok) {
		serverRoomVisitInFlight.delete(key);
		roomUI.room();
	}
}
function showPendingBadgeNotices(next) {
	let badges;
	try {
		badges = pendingBadgeReceipts(profile.meta);
	} catch {
		message("배지 획득 정보를 확인하지 못했습니다.");
		next?.();
		return false;
	}
	if (!badges.length) {
		next?.();
		return false;
	}
	const before = structuredClone(profile.meta.collectionNoticeState);
	const ids = badges.map((item) => item.receiptId);
	acknowledgeBadgeReceipts(profile.meta, ids);
	if (serverMode) {
		next?.();
		return true;
	}
	const acknowledged = structuredClone(profile.meta.collectionNoticeState);
	profile.meta.collectionNoticeState = before;
	const saveAcknowledgement = (retry) => {
		const saved = save(retry, slotId, () => {
			profile.meta.collectionNoticeState = acknowledged;
			next?.();
		});
		if (!saved) {
			profile.meta.collectionNoticeState = before;
			badgeResultUI.show(shell, pendingBadgeReceipts(profile.meta), () => saveAcknowledgement(true));
		}
	};
	badgeResultUI.show(shell, badges, () => saveAcknowledgement(false));
	return true;
}
function renderPendingStory() {
	if (usesServerDialogue()) {
		const event = current().pendingStoryEvent ?? current().pendingDialogue ?? current().narrativeState?.pending ?? current().storyState?.pending;
		if (event) {
			renderServiceDialogue(event.eventId ?? event.id, continueSchedule);
			return;
		}
	}
	if (current().narrativeState?.pending) {
		const pendingStory = current().narrativeState.pending,
			playerName = CHARACTERS.find((character) => character.id === current().characterId)?.name ?? "카엘";
		const payload = createNarrativeDialoguePayload(pendingStory, { playerName });
		dialogueUI.render({
			payload,
			onComplete: ({ selectedChoices }) => {
				finishNarrative(current(), selectedChoices.at(-1)?.choiceId ?? null);
				if (!save(false, slotId, continueSchedule)) renderRoom();
			},
			onSkip: () => {
				dismissNarrative(current());
				if (!save(false, slotId, continueSchedule)) renderRoom();
			},
		});
		return;
	}
	const event = current().storyState?.pending;
	if (!event) {
		continueSchedule();
		return;
	}
	const content = storyContent(event),
		payload = createPreviewDialoguePayload(event, content);
	dialogueUI.render({
		payload,
		onComplete: ({ selectedChoices }) => {
			const choiceId = selectedChoices.at(-1)?.choiceId;
			if (!choiceId) return;
			completeStoryEvent(current(), { eventId: event.eventId, choiceId });
			if (!save(false, slotId, continueSchedule)) renderRoom();
		},
	});
}
function completeActivity(token, result) {
	const applied = applyAction(profile, slotId, token, result);
	if (applied) {
		reviewPrompt = structuredClone(current().actionHistory.at(-1));
		roomLight.event("complete");
		const completed = current().actionHistory.at(-1),
			resultText = activityResultText(completed);
		let receiptMessages = [];
		try {
			const context = { slotId, activityToken: token, uid: clientUid },
				events = engineServices.collectionEvents ?? [];
			const scoped = Array.isArray(events) ? events.filter((event) => ownsActivityEvent(event, { ...context, slotId: "slot-" + slotId })) : [];
			const badgeEvents = scoped.filter((event) => event?.kind === "badge").map(({ uid, kind, ...receipt }) => receipt);
			const roomEvents = scoped.filter((event) => event?.kind === undefined && event?.roomId).map(({ uid, ...receipt }) => receipt);
			if (roomEvents.length)
				try {
					receiptMessages = acceptCollectionReceipts(profile.meta, roomEvents).map((item) => item.message);
				} catch {
					receiptMessages.push("마이룸 수집 알림을 확인하지 못했습니다.");
				}
			if (badgeEvents.length)
				try {
					acceptBadgeReceipts(profile.meta, badgeEvents);
				} catch {
					receiptMessages.push("배지 획득 알림을 확인하지 못했습니다.");
				}
		} catch {
			receiptMessages.push("수집 알림을 확인하지 못했습니다. 활동 결과는 그대로 저장합니다.");
		}
		activityStoryFlow.complete(completed, (advance) => {
			const continueWithBadges = () => showPendingBadgeNotices(advance);
			if (completed.action === "adventure" && ["MISSION_COMPLETE", "TIMEOUT"].includes(result?.outcome)) {
				if (receiptMessages.length) message(receiptMessages.join("\n"));
				adventureResultUI.show(shell, { ...result, feedback: resultText }, continueWithBadges);
			} else {
				message([resultText, ...receiptMessages].filter(Boolean).join("\n"));
				continueWithBadges();
			}
		});
		if (saveFailed) renderRoom();
	} else {
		renderRoom();
		message("이미 처리된 일정입니다.");
	}
	return applied;
}
async function completeServerActivity(checkpoint, result = {}, afterComplete = null) {
	let operation, command;
	if (checkpoint.action === "adventure") {
		if (!["MISSION_COMPLETE", "TIMEOUT"].includes(result.outcome)) throw new Error("서버 모험 완료 API가 이 결과를 지원하지 않습니다.");
		operation = "completeAdventure";
		command = { resolution: result.outcome, foundCount: result.foundCount, targetCount: checkpoint.serverStart?.targetCount };
	} else if (classOf(checkpoint.action)) {
		if (result.endReason === "QUIT") {
			operation = "completeClassQuit";
			command = {};
		} else {
			if (!Array.isArray(result.inputLog)) throw new Error("서버 수업 검증에 필요한 입력 기록이 없습니다.");
			operation = "completeClassReplay";
			command = { inputLog: result.inputLog };
		}
	} else if (checkpoint.action === "rest") {
		operation = checkpoint.forcedRest ? "completeForcedRest" : "completeRest";
		command = {};
	} else if (checkpoint.action === "fairy-trade") {
		operation = "completeSpecial";
		command = result;
	} else throw new Error("서버에서 완료할 수 없는 활동입니다.");

	const complete = () => {
		const completed = current().actionHistory.at(-1);
		if (completed) reviewPrompt = structuredClone(completed);
		roomLight.event("complete");
		const resultText = completed ? activityResultText(completed) : "활동을 마쳤어요.";
		const advance = () => showPendingBadgeNotices(() => {
			if (afterComplete) afterComplete();
			else continueSchedule();
		});
		if (checkpoint.action === "adventure" && ["MISSION_COMPLETE", "TIMEOUT"].includes(result.outcome)) {
			adventureResultUI.show(shell, { outcome: result.outcome, foundCount: result.foundCount, objectiveCount: checkpoint.serverStart.targetCount, feedback: resultText }, advance);
		} else {
			message(resultText);
			advance();
		}
	};
	return performServerMutation(
		() => (operation === "completeClassReplay" ? serverGame.completeClassReplay(slotId, result.inputLog) : serverGame[operation](slotId, command)),
		complete,
	);
}
function openFairyTrade(checkpoint) {
	const run = current(),
		stats = ["knowledge", "expression", "dexterity", "exploration", "magic"],
		names = { knowledge: "지식", expression: "표현력", dexterity: "솜씨", exploration: "탐험", magic: "마법" },
		body = el("div", null, "fairy-trade-form"),
		from = el("select"),
		to = el("select"),
		amount = el("select");
	for (const key of stats) {
		from.append(new Option(names[key] + " · " + run.stats[key], key));
		to.append(new Option(names[key] + " · " + run.stats[key], key));
	}
	for (let n = 1; n <= 5; n++) amount.append(new Option(String(n) + "포인트", String(n)));
	body.append(el("p", "성장 스탯을 1~5포인트, 같은 양으로 교환합니다. 주 1회 · 체력 소모 없음."), el("label", "보낼 스탯"), from, el("label", "받을 스탯"), to, el("label", "포인트"), amount);
	let tradeDialog;
	const finish = (value) => completeServerActivity(checkpoint, value, () => {
		tradeDialog.close();
		continueSchedule();
	});
	tradeDialog = modal("요정의 거래", body, [
		btn("교환하기", () => finish({ transfer: { fromStat: from.value, toStat: to.value, amount: Number(amount.value) } })),
		btn("건너뛰기", () => finish({ skip: true }), "quiet"),
	]);
}
function receiveEnding(value) {
	const record = current().endingRecord;
	try {
		const received = prepareEngineStateUpdate(profile, value);
		acceptEndingResult(received.profile, slotId, value);
		writer.save(received.profile, slotId);
		Object.assign(record, received.profile.slots[slotId - 1].activeRun.endingRecord);
		profile.meta = received.profile.meta;
		profile.settings = received.profile.settings;
		profile.config = received.profile.config;
		if (received.messages.length) message(received.messages.join("\n"));
		return true;
	} catch (error) {
		console.warn("엔딩 결과 저장:", error);
		return false;
	}
}
const endingUI = createEndingUI({
	el,
	btn,
	shell,
	heading,
	current,
	character: () => CHARACTERS.find((c) => c.id === current().characterId),
	slotId: () => slotId,
	onReturn: renderRoom,
	isSaveFailed: () => saveFailed,
	loadEnding: typeof engineServices.loadEnding === "function" ? (key) => engineServices.loadEnding(key) : null,
	onReceive: receiveEnding,
	onComplete: () => {
		completeRun(profile, slotId);
		save(false, slotId, renderTitle);
		if (saveFailed) {
			heading("저장 확인이 필요합니다.", "ending-page");
			shell.append(el("p", "회차 완료를 저장하지 못했습니다. 저장에 성공할 때까지 진행 상태를 유지합니다.", "ending-placeholder"), btn("저장 다시 시도", retrySave, "ending-continue"));
		}
	},
});
const serverEndingUI = serverMode
	? createServerEndingUI({
			el,
			btn,
			shell,
			heading,
			current,
			slotId: () => slotId,
			game: serverGame,
			services: engineServices,
			mutate: performServerMutation,
			character: () => CHARACTERS.find((character) => character.id === current()?.characterId),
			onTitle: () => renderTitle(false, null, "preserve"),
		})
	: null;
const roomUI = createMyroomUI({
	el,
	btn,
	img,
	shell,
	heading,
	current,
	characters: CHARACTERS,
	emptyFrame,
	message,
	menu,
	decorateRoom,
	onDiary: () => journalUI.diary(),
	onBag: () => journalUI.bag(),
	onAdmission: renderAdmission,
	onPet: () => journalUI.bag("펫"),
	activePet: () => activePet(profile),
	meta: () => profile.meta,
	isSaveFailed: () => saveFailed,
	reviewPrompt: () => reviewPrompt,
	onReview: openTodayReview,
	onDismissReview: () => {
		reviewPrompt = null;
		renderRoom();
	},
	onAcknowledgeWeekSummary: () => {
		if (serverMode) {
			performServerMutation(() => serverGame.acknowledgeWeekSummary(slotId), renderRoom);
			return;
		}
		const final = current().phase === "AWAITING_ENDING",
			summaryWeek = current().pendingWeekSummaryWeek;
		acknowledgeWeekSummary(profile, slotId);
		const advance = () => {
			delete current().pendingWeekSummaryWeek;
			if (final) {
				prepareEnding(profile, slotId, Math.random, { serverAuthority: typeof engineServices.loadEnding === "function" });
				save(false, slotId, () => endingUI.render({ actual: true }));
				if (saveFailed) roomUI.room();
			} else renderRoom();
		};
		save(false, slotId, advance);
		if (saveFailed) {
			current().pendingWeekSummaryWeek = summaryWeek;
			roomUI.weeklySummary();
		}
	},
	onAdventure: renderAdventure,
	onCommit: (schedule, locations) => {
		roomLight.event("start");
		if (serverMode) {
			let activityIds;
			try {
				activityIds = serverScheduleActivityIds(current(), schedule, locations);
			} catch (error) {
				message(error.message);
				return;
			}
			performServerMutation(() => serverGame.confirmSchedule(slotId, activityIds), () => startScheduledActivity());
			return;
		}
		setSchedule(profile, slotId, schedule, locations);
		save(false, slotId, () => startScheduledActivity());
		if (saveFailed) renderRoom();
	},
	onRetry: retrySave,
	onFinish: finishWeekFlow,
	onEnding: () => {
		if (serverMode) {
			serverEndingUI.render();
			return;
		}
		prepareEnding(profile, slotId, Math.random, { serverAuthority: typeof engineServices.loadEnding === "function" });
		save(false, slotId, () => endingUI.render({ actual: true }));
		if (saveFailed) renderRoom();
	},
	onAction: () => {
		if (serverMode) {
			startScheduledActivity();
			return;
		}
		const run = current(),
			checkpoint = run.inProgressActivity;
		if (checkpoint?.action === "rest") {
			completeActivity(checkpoint.token);
			return;
		}
		if (checkpoint?.action === "fairy-trade") {
			const stats = ["knowledge", "expression", "dexterity", "exploration", "magic"],
				names = { knowledge: "지식", expression: "표현력", dexterity: "솜씨", exploration: "탐험", magic: "마법" },
				body = el("div", null, "fairy-trade-form");
			const from = el("select"),
				to = el("select"),
				amount = el("select");
			for (const key of stats) {
				from.append(new Option(names[key] + " · " + run.stats[key], key));
				to.append(new Option(names[key] + " · " + run.stats[key], key));
			}
			for (let n = 1; n <= 5; n++) amount.append(new Option(String(n) + "포인트", String(n)));
			body.append(el("p", "성장 스탯을 1~5포인트, 같은 양으로 교환합니다. 주 1회 · 체력 소모 없음."), el("label", "보낼 스탯"), from, el("label", "받을 스탯"), to, el("label", "포인트"), amount);
			let tradeDialog;
			tradeDialog = modal("요정의 거래", body, [
				btn("교환하기", async () => {
					try {
						const value = { transfer: { from: from.value, to: to.value, amount: Number(amount.value) } },
							saved = serverMode ? await completeServerActivity(checkpoint, value) : (completeActivity(checkpoint.token, value), true);
						if (saved !== false) tradeDialog.close();
					} catch (e) {
						message(e.message);
					}
				}),
				btn(
					"건너뛰기",
					async () => {
						const saved = serverMode ? await completeServerActivity(checkpoint, { skip: true }) : (completeActivity(checkpoint.token, { skip: true }), true);
						if (saved !== false) tradeDialog.close();
					},
					"quiet",
				),
			]);
			return;
		}
		startScheduledActivity();
	},
});
function renderRoom() {
	titleAudio.playMusic("room");
	const run = current();
	if (serverMode) {
		if (run.pendingWeekSummaryWeek !== undefined || run.serverPhase === "WEEK_SUMMARY_PENDING" || run.serverPhase === "FINAL_SUMMARY_PENDING") {
			roomUI.weeklySummary();
			return;
		}
		if (run.pendingStoryEvent) {
			if (run.pendingStoryEvent.eventId === "MS01") roomUI.room();
			else renderPendingStory();
			return;
		}
		if (run.serverPhase === "ENDING_DECIDED" || run.serverPhase === "ENDING_READY") {
			serverEndingUI.render();
			return;
		}
		void renderServerRoom(run);
		if (pendingBadgeReceipts(profile.meta).length && !badgeResultUI.isOpen())
			queueMicrotask(() => {
				if (view === "room-page" && !badgeResultUI.isOpen()) showPendingBadgeNotices(() => {});
			});
		return;
	}
	if (run.pendingWeekSummaryWeek !== undefined) {
		ensureMainStoryState(run);
		roomUI.weeklySummary();
		return;
	}
	if (run.flags?.admissionPending) {
		ensureMainStoryState(run);
		roomUI.room();
		return;
	}
	ensureMainStoryState(run);
	const due = dueMainStory(run);
	if (due) {
		renderMainStory(due);
		return;
	}
	if (run.phase === "AWAITING_ENDING" && run.endingRecord) {
		endingUI.render({ actual: true });
		return;
	}
	roomUI.room();
	if (pendingBadgeReceipts(profile.meta).length && !badgeResultUI.isOpen())
		queueMicrotask(() => {
			if (view === "room-page" && !badgeResultUI.isOpen()) showPendingBadgeNotices(() => {});
		});
}
function renderAdventure(checkpoint = current().inProgressActivity) {
	const run = current(),
		locationId = checkpoint?.locationId ?? run.scheduleLocations?.[run.day] ?? "greenhouse",
		place = ADVENTURE_LOCATIONS.find((item) => item.id === locationId) ?? ADVENTURE_LOCATIONS[0];
	const map = getAdventureMap(place.mapId);
	const startData = serverMode ? serverAdventureStartData(checkpoint) : createAdventureStartData({ missionId: `run-${run.runNumber}-week-${run.week}-day-${run.day}`, locationId: place.id, seed: `run-${run.runNumber}-week-${run.week}-day-${run.day}`, storedExploration: run.stats.exploration, petExplorationBonus: activePet(profile).modifiers.exploration, objectiveCount: 3 });
	const token = checkpoint?.token ?? actionToken(run);
	heading(place.title, "adventure-page");
	const host = el("div", null, "adventure-viewport");
	host.setAttribute("aria-label", place.title + " SD 캐릭터 모험 맵");
	shell.append(host);
	const hud = el("section", null, "adventure-hud paper"),
		placeName = el("strong", place.title),
		timer = el("span", "--:--"),
		progress = el("span", "목표물 준비 중"),
		searchCount = el("span", "조사 0회"),
		clueButton = btn("단서 다시 보기", () => showClues(false), "quiet"),
		stopButton = btn("중단하기", requestAdventureStop, "quiet");
	stopButton.hidden = true;
	stopButton.disabled = true;
	hud.append(placeName, timer, progress, searchCount, clueButton, stopButton);
	shell.append(hud);
	const hintLine = el("p", null, "adventure-hint");
	hintLine.hidden = true;
	shell.append(hintLine);
	const pad = el("nav", null, "adventure-pad");
	pad.setAttribute("aria-label", "모험 방향 조작");
	for (const [label, x, y] of [
		["↑", 0, -1],
		["←", -1, 0],
		["↓", 0, 1],
		["→", 1, 0],
	]) {
		const b = btn(label, () => {});
		b.setAttribute("aria-label", "이동 " + label);
		b.onpointerdown = (e) => {
			e.preventDefault();
			b.setPointerCapture(e.pointerId);
			adventureView?.direction(x, y);
		};
		const stop = () => adventureView?.direction(0, 0);
		b.onpointerup = stop;
		b.onpointercancel = stop;
		b.onlostpointercapture = stop;
		pad.append(b);
	}
	shell.append(pad);
	const investigate = btn(
		"조사하기",
		() => {
			investigate.disabled = true;
			adventureView?.investigate();
		},
		"adventure-investigate",
	);
	investigate.setAttribute("aria-live", "polite");
	investigate.disabled = true;
	shell.append(investigate);
	let missionReady = false,
		started = false,
		finished = false,
		lastState = null,
		briefing = null;
	let errorPanel = null;
	const paintState = (state) => {
		if (!state) return;
		if (state.error) {
			missionReady = false;
			investigate.disabled = true;
			clueButton.disabled = true;
			stopButton.disabled = true;
			briefing?.remove();
			briefing = null;
			errorPanel?.remove();
			errorPanel = el("section", null, "adventure-briefing paper");
			errorPanel.append(
				el("h2", "모험 지도를 준비하지 못했습니다"),
				el("p", state.error),
				el("small", "체력은 시작 체크포인트에 보존되며, 같은 모험을 다시 불러옵니다."),
				btn("다시 불러오기", () => {
					errorPanel.remove();
					errorPanel = null;
					mount();
				}),
			);
			shell.append(errorPanel);
			message(state.error);
			return;
		}
		lastState = state;
		timer.textContent = `${String(Math.floor(state.remainingMs / 60000)).padStart(2, "0")}:${String(Math.floor(state.remainingMs / 1000) % 60).padStart(2, "0")}`;
		progress.textContent = `발견 ${state.foundIds.length} / ${state.objectives.length || startData.objectiveCount}`;
		searchCount.textContent = `조사 ${state.investigationCount}회`;
		investigate.textContent = state.investigating ? "찾는 중..." : "조사하기";
		investigate.disabled = !started || state.paused || finished;
		clueButton.disabled = !missionReady || finished || state.investigating;
		stopButton.disabled = !started || finished;
		if (state.hint) {
			hintLine.textContent = state.hint;
			hintLine.hidden = false;
			message("조사 결과 · " + state.hint);
		}
		if (started && !finished && state.foundId && state.foundIds.length < state.objectives.length) {
			adventureView?.pause(true);
			adventureResultUI.showFound(shell, { foundCount: state.foundIds.length, objectiveCount: state.objectives.length }, () => {
				if (!finished) adventureView?.pause(Boolean(briefing));
			});
		}
	};
	const showClues = (initial) => {
		if (!missionReady || finished) return;
		if (started) adventureView?.pause(true);
		briefing?.remove();
		briefing = el("section", null, "adventure-briefing paper");
		briefing.setAttribute("aria-label", "모험 단서");
		briefing.append(el("h2", initial ? "이번 모험에서 찾아야 할 것" : "모험 단서"), el("p", initial ? `숨은 목표 ${startData.objectiveCount}개 · 제한시간 ${Math.floor(startData.durationSeconds / 60)}분 ${startData.durationSeconds % 60}초` : "단서를 읽는 동안 이동과 시간이 멈춥니다."));
		const list = el("div", null, "adventure-clue-list");
		for (const item of lastState.objectives) {
			const found = lastState.foundIds.includes(item.id),
				selected = lastState.trackedId === item.id,
				b = btn(
					"",
					() => {
						adventureView?.track(item.id);
						lastState = { ...lastState, trackedId: item.id };
						showClues(initial);
					},
					"adventure-clue" + (selected ? " selected" : ""),
				);
			b.disabled = found;
			b.append(el("strong", item.name), el("span", item.clue), el("small", found ? "발견 완료" : selected ? "현재 추적 중" : "누르면 추적"));
			list.append(b);
		}
		briefing.append(list);
		const actions = el("div", null, "adventure-briefing-actions");
		if (initial) {
			const begin = btn("모험 시작", () => {
				if (!adventureView?.start()) return;
				started = true;
				stopButton.hidden = false;
				briefing.remove();
				briefing = null;
				paintState(lastState);
			});
			begin.disabled = !missionReady;
			actions.append(begin);
		} else
			actions.append(
				btn(
					"닫기",
					() => {
						briefing.remove();
						briefing = null;
						adventureView?.pause(false);
						paintState(lastState);
					},
					"quiet",
				),
			);
		briefing.append(actions);
		shell.append(briefing);
	};
	function requestAdventureStop() {
		if (!started || finished || saveFailed) return;
		adventureView?.pause(true);
		const body = el("p", "이미 사용한 체력은 돌려받지 않고 오늘 일정은 진행 처리됩니다. 성장·보상은 없습니다.");
		const dialog = modal("모험을 중단할까요?", body, [
			btn("계속 탐험", () => dialog.close(), "quiet"),
			btn("중단하고 다음으로", async () => {
				if (finished) return;
				if (serverMode) {
					dialog.close();
					message("서버에서 모험 중단 결과를 처리할 API가 아직 없어 중단을 저장할 수 없습니다. 계속 탐험해 주세요.");
					adventureView?.pause(Boolean(briefing));
					return;
				}
				if (!stopAdventure(profile, slotId, token)) {
					dialog.close();
					renderRoom();
					message("이미 처리된 일정입니다.");
					return;
				}
				finished = true;
				dialog.close();
				briefing?.remove();
				briefing = null;
				save(false, slotId, () => {
					message("모험을 중단했습니다. 오늘 일정은 진행 처리됩니다.");
					continueSchedule();
				});
				if (saveFailed) renderRoom();
			}),
		]);
		dialog.addEventListener(
			"close",
			() => {
				if (!finished) adventureView?.pause(Boolean(briefing));
			},
			{ once: true },
		);
	}
	const finishMission = (outcome, foundCount) => {
		if (finished) return;
		finished = true;
		briefing?.remove();
		if (serverMode) {
			completeServerActivity(checkpoint, { outcome, foundCount });
			return;
		}
		const result = createAdventureResult(startData, outcome, { foundCount, successGrowth: 8, stamina: checkpoint.staminaBefore });
		completeActivity(token, result);
	};
	const mount = () => {
		adventureView?.destroy();
		missionReady = false;
		started = false;
		finished = false;
		lastState = null;
		adventureView = mountAdventure(host, {
			startData,
			map,
			characterId: run.characterId,
			onReady: (state) => {
				missionReady = true;
				errorPanel?.remove();
				errorPanel = null;
				paintState(state);
				showClues(true);
			},
			onState: paintState,
			onFinish: finishMission,
		});
	};
	mount();
}
class HomeScene extends Phaser.Scene {
	constructor() {
		super("home");
	}
	preload() {
		this.load.image("myroom", "./world-assets/BG10_myroom1_day_1920x1080_012.png");
		for (const [id, s] of Object.entries(SPACES)) this.load.image("space-" + id, "./world-assets/" + s.image);
	}
	create() {}
}
const game = new Phaser.Game({ type: Phaser.AUTO, parent: "game", width: 1280, height: 720, backgroundColor: "#142a37", scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [HomeScene, ...previewScenes, ...curriculumScenes] });
function receive(result) {
	if (!pending) return;
	const item = pending;
	pending = null;
	slotId = item.slotId;
	try {
		if (item.server) {
			completeServerActivity(item.checkpoint, result).catch((e) => {
				renderRoom();
				message(e.message);
			});
			return;
		}
		completeActivity(item.token, result);
	} catch (e) {
		renderRoom();
		message(e.message);
	}
}
game.events.on("minigame:complete", receive);
game.events.on("minigame:quit", receive);
function loadPreviewProfile(storage) {
	dialogueRuntime.cancel();
	activeStorage = storage;
	slotSnapshot = inspectLocalSlots(storage);
	profile = slotSnapshot.profile;
	repository = createLocalRepository(storage);
	writer = createBoundaryWriter(repository);
	if (!profile) message("저장 데이터를 읽지 못했습니다. 원본을 보존하며 슬롯별 재시도를 기다립니다.");
}
function previewStorage() {
	try {
		return window.localStorage;
	} catch {
		return {
			getItem() {
				throw new Error("저장소에 접근할 수 없습니다.");
			},
			setItem() {
				throw new Error("저장소에 접근할 수 없습니다.");
			},
		};
	}
}
const slotRecoveryUI = createSlotRecoveryUI({
	el,
	btn,
	modal,
	onRetry: () => {
		if (saveFailed) throw new Error("진행 중인 저장을 먼저 다시 시도해 주세요.");
		loadPreviewProfile(activeStorage);
		renderSlots();
	},
	onDelete: (id) => {
		if (saveFailed) throw new Error("진행 중인 저장을 먼저 다시 시도해 주세요.");
		deleteUnreadableSlot(activeStorage, id);
		loadPreviewProfile(activeStorage);
		renderSlots();
	},
});
const accountUI = createAccountUI({
	el,
	btn,
	shell,
	heading,
	modal,
	service: engineServices.account,
	onAuthenticated: (session) => {
		clientUid = session.uid;
		if (serverMode) {
			loadServerProfile();
			return;
		}
		loadPreviewProfile(createAccountStorage(previewStorage(), clientUid));
		renderIntro();
	},
	onSignedOut: () => {
		serverDialogue?.cancel();
		serverRoomVisits.clear();
		serverRoomVisitInFlight.clear();
		clientUid = null;
		profile = null;
		writer = null;
		repository = null;
		slotSnapshot = null;
		slotId = undefined;
		pending = null;
		afterSaveSuccess = null;
		saveFailed = false;
		reviewPrompt = null;
		serverRetryContinuation = null;
		previousRoomBackground = null;
		clearTimeout(introTimer);
		cancelAnimationFrame(introAnimation);
		document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
		for (const scene of game.scene.getScenes(true)) game.scene.stop(scene.scene.key);
	},
	onReturn: () => (current() ? renderRoom() : renderTitle(false, null, "preserve")),
});
document.fonts.load('18px "Gowun Batang"').catch(() => message("폰트를 불러오지 못해 기본 글꼴로 표시합니다."));
// Browsers may restrict orientation locking to fullscreen or installed apps.
// Request it silently at entry and retry on gestures/fullscreen changes.
const landscapeDevice = matchMedia("(pointer:coarse)");
let orientationPending = false;
async function lockLandscape(fromGesture = false) {
	if (!landscapeDevice.matches || orientationPending || !screen.orientation?.lock) return;
	orientationPending = true;
	try {
		if (fromGesture && !document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: "hide" });
		await screen.orientation.lock("landscape");
	} catch {
	} finally {
		orientationPending = false;
	}
}
lockLandscape();
window.addEventListener("pointerdown", () => lockLandscape(true), { passive: true });
document.addEventListener("fullscreenchange", () => lockLandscape());
if (engineServices.account) accountUI.start();
else {
	loadPreviewProfile(previewStorage());
	renderIntro();
}
window.addEventListener("keydown", (e) => {
	if (e.key === "Escape" && view === "room-page" && !document.querySelector("dialog[open]")) menu();
});
window.addEventListener("beforeunload", (e) => {
	if (saveFailed || profile?.slots.some((s) => s.activeRun && ["ACTING", "WEEK_COMPLETE"].includes(s.activeRun.phase))) {
		e.preventDefault();
		e.returnValue = "";
	}
});
