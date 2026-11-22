# 项目地图

宽街的专门建筑、门洞、钟面与街具在 `src/broad-street.js`。十四处的独立地形由 `src/pocket-scope.js` 按现有边界生成。宽街的机位和往返路径在 `src/data/views.js`，估绘的树位在 `src/data/broad-planting.json`。

新学院与默顿学院的专门几何分别在 `src/new-college.js` 和 `src/merton-college.js`。有厚度的钟楼、耳堂和门洞使用 `src/college-masonry.js`。地图归属、分体屋顶、廊道和花园地貌由 `geo/prepare-quarters.py` 编译。新学院的栎树使用独立的阔叶常绿树型。昼夜切换在 `src/main.js`，光束、光晕与街灯在 `src/sunlight.js`，春秋落叶在 `src/windfall.js`。市政厅和阿什莫林街区的专门几何由 `src/civic-buildings.js` 与 `src/civic-masonry.js` 生成。

先读 `README.md` 的模块表和 `SOURCES.md`。地理构建顺序为 `prepare.py`、`prepare-details.py`、`prepare-quarters.py`。建筑分工与街区归属分别维护，地理所有权用于确定彩色范围。莫德林以独立版场地为边界。数据中的 X 向东、Z 向南，单位为米。`src/navigation.js` 管理相机，`src/main.js` 串联季节、事件和界面。`src/language.js` 管理两种界面语言。`build.mjs` 输出单一离线 HTML。浏览器与地理核验入口在 `scripts/`。

高街的皇后学院与大学学院共用 src/high-street.js、src/data/views.js 和 geo/prepare-quarters.py。竖屏地点选择器与底栏使用同一份 siteOrder。现版浏览器检查在 scripts/verify-fourteen.cjs。README.md 为英文入口，README.zh-CN.md 为中文说明。
