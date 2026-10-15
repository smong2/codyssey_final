import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const [styles,ui]=await Promise.all([
 readFile(new URL('preview.css',root),'utf8'),
 readFile(new URL('src/ui/myroom.mjs',root),'utf8')
]);

test('schedule calendar omits redundant season and week summary',()=>{
 assert.doesNotMatch(ui,/calendar\.append\(top,el\('p',m\.season\s*\+/);
});

test('short landscape schedule uses a narrower, proportionally compact layout',()=>{
 const shortLandscape=styles.match(/@media\s*\(orientation:landscape\)\s*and\s*\(max-height:500px\)\s*\{([\s\S]*?)\n\}/)?.[1]??'';
 assert.match(shortLandscape,/\.schedule-layout[^}]*max-width/);
 assert.match(shortLandscape,/grid-template-columns:minmax\(0,1\.35fr\) minmax\(0,\.85fr\)/);
 assert.match(shortLandscape,/\.activity-card[^}]*font-size/);
});

test('tall schedule viewport centers the schedule frame group',()=>{
 const tallViewport=styles.match(/@media\s*\(min-width:\s*1000px\)\s*and\s*\(min-height:\s*700px\)\s*\{([\s\S]*?)\n\}/)?.[1]??'';
 assert.match(tallViewport,/#shell\.schedule-page[^}]*justify-content:\s*center/);
});

test('planned current-week dates stay in color across adjacent months while past activities stay grayscale',()=>{
 assert.match(styles,/\.schedule-layout\s+\.outside-month:not\(\.current-week\)\s+\.calendar-activity-image\s*\{[^}]*filter:\s*grayscale\(1\)/);
 assert.match(styles,/\.schedule-layout\s+\.past-activity\s+\.calendar-activity-image\s*\{[^}]*filter:\s*grayscale\(1\)/);
 assert.doesNotMatch(styles,/\.schedule-layout\s+\.outside-month\s+\.calendar-activity-image\s*\{/);
});
