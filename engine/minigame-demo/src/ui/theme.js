export const C = {
  navy: 0x1d3548, deep: 0x122938, blue: 0x315a70,
  teal: 0x2d8e91, aqua: 0x75d9d0, gold: 0xc99b4d,
  cream: 0xfff4da, paper: 0xf8ecd1, ink: 0x263b4a,
  muted: 0x718694, danger: 0xb65a4b, success: 0x528c68,
};
// Each class has its own registered Arcadia venue and material palette.
export const SPACES = {
  workshop: { name: '마도 공방', image: 'BG08_magic_workshop_1920x1080_018.png', accent: 0xe2a24c, dark: 0x38293b, paper: 0xffedcf, ink: '#402b36' },
  lakeside: { name: '학원 호숫가', image: 'BG01_arcadia_entrance_and_lake_1920x1080_010.png', accent: 0x7bb8ac, dark: 0x15394a, paper: 0xf3edda, ink: '#244452' },
  library: { name: '대서고', image: 'BG04_grand_library_1920x1080_014.png', accent: 0xb68a57, dark: 0x392b35, paper: 0xf7ead3, ink: '#3d3035' },
  training: { name: '룬 수련장', image: 'BG09_rune_training_ground_1920x1080_019.png', accent: 0xe3b46d, dark: 0x283b48, paper: 0xf7ead1, ink: '#293b47' },
  greenhouse: { name: '유리 온실', image: 'BG06_glass_greenhouse_1920x1080_016.png', accent: 0x87b77c, dark: 0x244a3c, paper: 0xf3efd7, ink: '#2b4a38' },
  observatory: { name: '별빛 천문대', image: 'BG05_starlight_observatory_1920x1080_015.png', accent: 0x9bd7eb, dark: 0x192b50, paper: 0xe9edf5, ink: '#243257' },
  plaza: { name: '시계탑 광장', image: 'BG02_clocktower_plaza_1920x1080_011.png', accent: 0xe8bb82, dark: 0x344350, paper: 0xf5eddb, ink: '#354050' },
};
export const TEXT = { fontFamily: 'Arial, Apple SD Gothic Neo, Malgun Gothic, sans-serif', color: '#263b4a' };
export function panel(scene, x, y, w, h, alpha = 0.96) {
  const space = SPACES[scene.spaceId] || SPACES.training;
  const g = scene.add.graphics();
  g.fillStyle(space.paper, alpha).fillRoundedRect(x, y, w, h, 18);
  g.lineStyle(3, space.accent, 0.95).strokeRoundedRect(x, y, w, h, 18);
  return g;
}
export function label(scene, text, x, y, size = 22, options = {}) {
  const space = SPACES[scene.spaceId] || SPACES.training;
  return scene.add.text(x, y, text, { ...TEXT, color: space.ink, fontSize: `${size}px`, ...options });
}
export function button(scene, text, x, y, w, h, action, style = 'blue') {
  const space = SPACES[scene.spaceId] || SPACES.training;
  const fill = style === 'gold' ? space.accent : style === 'quiet' ? space.paper : space.dark;
  const color = style === 'quiet' ? space.ink : '#fff9ec';
  const g = scene.add.graphics();
  g.fillStyle(fill).fillRoundedRect(x, y, w, h, 12);
  g.lineStyle(2, space.accent, 0.8).strokeRoundedRect(x, y, w, h, 12);
  const hit = scene.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
  const t = label(scene, text, x + w / 2, y + h / 2, 19, { color, fontStyle: 'bold' }).setOrigin(0.5);
  hit.on('pointerover', () => t.setScale(1.05));
  hit.on('pointerout', () => t.setScale(1));
  hit.on('pointerdown', action);
  return { g, hit, t };
}
export function background(scene, spaceId = 'training') {
  const w = scene.scale.width, h = scene.scale.height;
  const id = typeof spaceId === 'string' ? spaceId : scene.spaceId || 'training';
  const space = SPACES[id] || SPACES.training;
  if (scene.textures.exists(`space-${id}`)) scene.add.image(w / 2, h / 2, `space-${id}`).setDisplaySize(w, h);
  else scene.add.rectangle(w / 2, h / 2, w, h, space.dark);
  scene.add.rectangle(w / 2, h / 2, w, h, space.dark, 0.38);
}
export function cell(scene, x, y, size, fill = C.cream, border = C.gold) {
  const g = scene.add.graphics();
  g.fillStyle(fill).fillRoundedRect(x, y, size - 4, size - 4, 9);
  g.lineStyle(2, border).strokeRoundedRect(x, y, size - 4, size - 4, 9);
  return g;
}
