const key = 'oxford-pockets-six-language';
let current = 'en';
try {
  const previous = localStorage.getItem(key);
  if (['en', 'zh'].includes(previous)) {
    current = previous;
  }
} catch {}
const words = {
  照片模式: 'Photo mode',
  恢复界面: 'Show controls',
  皇后学院: 'Queen’s',
  大学学院: 'Univ',
  皇后学院与皇后巷: 'The Queen’s College & Queen’s Lane',
  大学学院与逻辑巷: 'University College & Logic Lane',
  选择街区: 'Choose a neighbourhood',
  '从卡罗琳王后的圆亭穿过柱廊，沿皇后巷到圣埃德蒙学堂':
    'Queen Caroline’s cupola, the arcades and St Edmund Hall on Queen’s Lane',
  '沿高街双门楼进入庭院，经逻辑巷廊桥走到考试学校':
    'The twin gateways on the High, the Logic Lane bridge and the Examination Schools',
  穿过高街到大学学院: 'Walk to Univ',
  穿过高街到皇后学院: 'Walk to Queen’s',
  卡罗琳圆亭: 'Caroline’s cupola',
  前庭柱廊: 'Front Quad arcade',
  后庭图书馆: 'Back Quad library',
  圣彼得旧教堂: 'St Peter-in-the-East',
  高街门楼: 'High Street tower',
  主庭院: 'Main Quad',
  逻辑巷廊桥: 'Logic Lane bridge',
  考试学校: 'Examination Schools',
  拉德克利夫庭院: 'Radcliffe Quad',
  皇后学院地图: 'The Queen’s College map',
  大学学院建筑: 'University College buildings',
  完整地图: 'Full map',
  只看此区: 'Pocket only',
  显示范围: 'Map display',
  街区全貌: 'Fit pocket',
  贝利奥尔: 'Balliol',
  三一: 'Trinity',
  贝利奥尔学院与宽街西段: 'Balliol College & West Broad Street',
  三一学院与宽街东段: 'Trinity College & East Broad Street',
  '从宽街店屋穿过沃特豪斯门楼，走向彩带石墙的礼拜堂':
    'Broad Street shops, the Waterhouse gateway and the banded stone chapel',
  '从铁艺校门望向礼拜堂钟塔，沿街到书店与韦斯顿图书馆':
    'Walk from the iron gates to the chapel tower, Blackwell’s and the Weston Library',
  沿宽街到三一: 'Walk to Trinity',
  沿宽街到贝利奥尔: 'Walk to Balliol',
  沃特豪斯门楼: 'Waterhouse gate',
  彩带礼拜堂: 'Butterfield chapel',
  花园与大厅: 'Garden & hall',
  宽街铁门: 'Broad Street gates',
  前庭钟塔: 'Chapel clock',
  花园庭院: 'Garden Quad',
  韦斯顿柱廊: 'Weston colonnade',
  贝利奥尔学院建筑: 'Balliol buildings',
  三一学院地图: 'Trinity College map',
  新学院: 'New Coll.',
  默顿: 'Merton',
  新学院与中世纪城墙: 'New College & City Wall',
  默顿学院与默顿街: 'Merton College & Merton Street',
  '从常绿栎树下的回廊，经前庭到城墙花园': 'The cloisters, Front Quad and the walled garden',
  '沿默顿街到礼拜堂、莫布庭院和院士花园': 'Merton Street, the chapel, Mob Quad and Fellows’ Garden',
  漫步前庭: 'Walk Front Quad',
  走过默顿街: 'Walk Merton Street',
  栎树回廊: 'Cloister oak',
  城墙花境: 'City wall',
  旧图书馆庭院: 'Mob Quad',
  礼拜堂塔楼: 'Chapel tower',
  院士庭院: 'Fellows’ Quad',
  从回廊草坪看常绿栎树与独立钟楼: 'The holm oak and freestanding bell tower from the cloister garth',
  回廊内侧: 'Cloister walk',
  穿过新学院回廊南侧的木构廊道: 'Under the timber roof of the south cloister walk',
  沿花境看中世纪城墙与半圆堡台: 'The medieval wall and its bastions from the herbaceous border',
  从莫布庭院看旧图书馆与礼拜堂塔顶: 'The old library and chapel tower from Mob Quad',
  从默顿街看礼拜堂耳堂与交叉塔: 'The chapel transepts and crossing tower from Merton Street',
  院士庭院南翼的四柱式门楼: 'The Tower of the Four Orders on the south range',
  新学院建筑图集: 'New College buildings',
  默顿学院建筑史: 'Merton College buildings',
  椴树下: 'Under the lime tree',
  'Addison’s Walk 的椴树与河岸': 'Beneath the lime on Addison’s Walk',
  阿什莫林: 'Ashmolean',
  卡尔法克斯: 'Carfax',
  阿什莫林与圣吉尔斯街: 'Ashmolean & St Giles’',
  卡尔法克斯与市政厅: 'Carfax & Town Hall',
  从博蒙特街柱廊到泰勒图书馆和殉道者纪念碑:
    'Beaumont Street, the Taylor Institution and the Martyrs’ Memorial',
  '卡尔法克斯钟楼、四街交汇处与圣奥尔代茨街': 'The clock tower, the crossroads and St Aldate’s',
  走向博物馆: 'Approach the museum',
  沿街到市政厅: 'Walk to Town Hall',
  博物馆柱廊: 'Museum portico',
  殉道者纪念碑: 'Martyrs’ Memorial',
  钟面与报时人偶: 'Clock & jacks',
  市政厅立面: 'Town Hall façade',
  博蒙特街庭院里的爱奥尼柱廊: 'The Ionic portico from the Beaumont Street forecourt',
  圣吉尔斯街南端的三面纪念碑: 'The three-sided memorial at the foot of St Giles’',
  卡尔法克斯塔东面的钟面与报时人偶: 'The clock and quarter jacks on the east face',
  从圣奥尔代茨街看市政厅主入口: 'The civic entrance on St Aldate’s',
  夜景: 'Night',
  日景: 'Day',
  切换到夜景: 'Switch to night',
  切换到日景: 'Switch to day',
  光束与光晕: 'Sunbeams & halos',
  阿什莫林博物馆: 'Ashmolean Museum',
  牛津市政厅: 'Oxford Town Hall',
  地标近景: 'Landmark view',
  叹息桥巷: 'Bridge of Sighs',
  金十字庭院: 'Golden Cross',
  佩克沃特庭院: 'Peckwater Quad',
  利登庭院: 'Liddon Quad',
  纽菲尔德学院: 'Nuffield College',
  从新学院巷看赫特福德叹息桥: 'Hertford Bridge from New College Lane',
  从金十字庭院走向市场: 'The Golden Cross courtyard and market passage',
  从庭院望向基督堂图书馆: 'Christ Church Library across Peckwater Quad',
  从利登庭院望向基布尔礼拜堂: 'Keble College Chapel across Liddon Quad',
  从上庭院望向图书馆尖塔: 'The library spire from Nuffield’s Upper Quad',
  牛津市中心: 'Central Oxford',
  口袋牛津: 'Oxford in Pockets',
  城市街景集: 'City collection',
  莫德林学院: 'Magdalen College',
  拉德克利夫广场: 'Radcliffe Square',
  牛津有顶市场: 'Oxford Covered Market',
  基督堂学院: 'Christ Church',
  牛津大学自然史博物馆: 'Oxford University Museum of Natural History',
  牛津城堡与旧监狱: 'Oxford Castle & Prison',
  莫德林: 'Magdalen',
  广场: 'Square',
  市场: 'Market',
  基督堂: 'Christ Ch.',
  博物馆: 'Museum',
  城堡: 'Castle',
  '圆顶阅览室、谢尔登剧院与叹息桥': 'The Radcliffe Camera, Sheldonian Theatre and Bridge of Sighs',
  '从高街穿过有顶市场，到金十字庭院': 'From High Street through the market to Golden Cross',
  '从汤姆庭院，经佩克沃特庭院到草甸楼': 'Tom Quad, Peckwater Quad and the Meadow Building',
  '大塔、回廊与彻韦尔河': 'The Great Tower, cloister and River Cherwell',
  '雨燕塔楼、皮特里弗斯博物馆与基布尔学院': 'The swift tower, Pitt Rivers Museum and Keble College',
  '城堡土丘、监狱河岸与纽菲尔德学院': 'The motte, the prison riverside and Nuffield College',
  走进广场: 'Walk into the square',
  走入市集: 'Walk the market',
  穿过汤姆门: 'Through Tom Gate',
  走近西门: 'Walk to the west door',
  城堡庭院: 'Walk the castle yard',
  '轻点彩色建筑，走近一处街景': 'Choose a coloured building to explore.',
  街面视角: 'Street level',
  回廊庭院: 'Cloister courtyard',
  'Addison’s Walk 河岸': 'Addison’s Walk riverbank',
  地点全景: 'Site overview',
  回廊: 'Cloister',
  河岸: 'Riverbank',
  汤姆钟夜鸣: 'Great Tom at night',
  五月晨唱: 'May Morning',
  清晨开市: 'Market morning',
  '21:05 钟声': '21:05 bells',
  '5 月 1 日清晨 · 大塔上的合唱': '1 May at dawn · The choir on the Great Tower',
  '花摊摆货，廊灯次第点亮': 'Flowers arrive as the aisle lamps come on.',
  开启声音: 'Sound on',
  关闭声音: 'Mute',
  返回日常: 'Leave event',
  合上屋顶: 'Close roof',
  揭开屋顶: 'Lift roof',
  春: 'Spring',
  夏: 'Summer',
  秋: 'Autumn',
  冬: 'Winter',
  春季: 'Spring',
  夏季: 'Summer',
  秋季: 'Autumn',
  冬季: 'Winter',
  全城: 'City',
  天气: 'Weather',
  天气与四季: 'Weather & seasons',
  雨后石板: 'Wet paving',
  降雪与积雪: 'Snowfall & settling',
  自动轮换四季: 'Cycle seasons',
  收起: 'Close',
  操作与地图来源: 'Controls & sources',
  地图署名与资料: 'Map attribution and sources',
  回到全城: 'Return to the city map',
  切换地点: 'Choose a place',
  四季: 'Seasons',
  放大: 'Zoom in',
  缩小: 'Zoom out',
  关闭: 'Close',
  地点机位与活动: 'Views and events',
  '牛津立体街景。拖动旋转，滚轮或双指缩放，可点选地标。':
    '3D Oxford. Drag to orbit, scroll or pinch to zoom, and select a landmark.',
  '照片取景。拖动旋转，滚轮或双指缩放。': 'Photo view. Drag to orbit, scroll or pinch to zoom.',
  浏览器声音暂不可用: 'Audio is unavailable in this browser.',
  北阶与柱廊: 'North steps',
  水池与院墙: 'Mercury Fountain',
  玻璃大厅: 'Glass court',
  雨燕巢口: 'Swift nests',
  土丘顶: 'Motte summit',
  旧监狱: 'Prison range',
  保留地形的丘顶视角: 'From the summit towards St George’s Tower',
  'D 翼拱廊与债务人塔': 'The round Debt­ors’ Tower and D Wing',
  圆顶阅览室北侧门廊: 'The north portico of the Radcliffe Camera',
  墨丘利水池与汤姆庭院: 'Mercury Fountain in Tom Quad',
  铁柱与玻璃分跨屋顶: 'The iron-framed glass roofs',
  '春夏 · 雨燕在通风罩下收翼入巢': 'Spring and summer · Swifts fold their wings and slip under the hoods.',
  '秋冬 · 巢口空置，雨燕已迁离':
    'Autumn and winter · The swifts have migrated and the nest entrances are quiet.',
  地图及资料: 'Maps and sources',
  博德利图书馆: 'Bodleian Libraries',
  市场平面: 'Market plan',
  自然史博物馆: 'Museum of Natural History',
  雨燕研究: 'Swift project',
  城堡与土丘: 'Castle and motte',
};
export const tr = (s) => (current === 'en' ? words[s] || s : s);
export const english = () => current === 'en';
export const bellText = (n) =>
  english() ? '21:05 · Toll ' + n + ' of 101' : '21:05 · 第 ' + n + ' / 101 响';
export const goTo = (name) => (english() ? 'Visit ' + tr(name) : '前往' + name);
const bilingual = {
  credits: [
    '地图署名为 © OpenStreetMap contributors。微缩视角的灵感来自 April Zhu 的 Pocket City。圆顶阅览室、汤姆塔、基督堂石饰、自然史博物馆西立面、谢尔登剧院与赫特福德叹息桥沿用 Oxford Atlas 模型。',
    'Map data © OpenStreetMap contributors. April Zhu’s Pocket City inspired the miniature viewpoint. Six models come from Oxford Atlas: the Radcliffe Camera, Tom Tower, Christ Church stonework, the museum west front, the Sheldonian Theatre and Hertford Bridge.',
  ],
  help: [
    '点彩色建筑或底栏地点进入近景。拖动旋转，滚轮或双指缩放。右键拖动、按住 Shift 拖动或双指平移。点右上角相机进入照片模式，点左上角「恢复界面」或按 Esc 退出。平时按 Esc 回到上一级。',
    'Choose a coloured building or a place below. Drag to orbit, scroll or pinch to zoom, and pan with two fingers, the right mouse button or Shift-drag. The camera in the top right opens Photo mode. Use Show controls or Escape to leave it. Elsewhere, Escape returns to the previous level.',
  ],
  life: [
    '十四处街区共用季节和时钟。点「只看此区」可在当前机位欣赏独立地景。宽街和高街各有一条学院之间的往返步行线路。五月晨唱与汤姆钟使用原创合成声。',
    'All fourteen neighbourhoods share the seasons and the same clock. Choose Pocket only to lift one neighbourhood out of the city. On Broad Street and the High you can walk from one college to its neighbour. May Morning and Great Tom use original synthesised sound.',
  ],
  estimates: [
    '平面采用 OpenStreetMap。未有实测的楼高、巢口尺寸、部分立面、摆设与步道坡面按照片和建筑记录估绘。市场开市和压缩的钟声间隔用于街景演示。',
    'Plans follow OpenStreetMap. Unsurveyed heights, nest openings, parts of the façades, furnishings and slope profiles are estimated from photographs and building records. The market opening and shortened bell intervals are staged for the scene.',
  ],
};
export function applyShell() {
  document.documentElement.lang = english() ? 'en' : 'zh-CN';
  document.title = english() ? 'Oxford in Pockets · Fourteen neighbourhoods' : '口袋牛津 · 十四处街区';
  for (const el of document.querySelectorAll('[data-word]')) el.textContent = tr(el.dataset.word);
  for (const el of document.querySelectorAll('[data-aria]'))
    el.setAttribute('aria-label', tr(el.dataset.aria));
  for (const el of document.querySelectorAll('[data-copy]'))
    el.textContent = bilingual[el.dataset.copy][english() ? 1 : 0];
  document.querySelector('#lang').setAttribute('aria-label', english() ? 'Choose language' : '选择语言');
  document.querySelector('#info').title = tr('操作与地图来源');
  document.querySelector('#photo-mode').title = tr('照片模式');
  document.querySelector('#lang').title = english() ? 'Language' : '语言';
  document
    .querySelectorAll('[data-lang]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === current)));
}
export function languageChooser(onChange) {
  const dialog = document.querySelector('#languages'),
    trigger = document.querySelector('#lang');
  trigger.onclick = () => {
    if (!dialog.open) dialog.showModal();
  };
  for (const b of dialog.querySelectorAll('[data-lang]'))
    b.onclick = () => {
      current = b.dataset.lang;
      try {
        localStorage.setItem(key, current);
      } catch {}
      dialog.close();
      applyShell();
      onChange();
    };
  applyShell();
}
