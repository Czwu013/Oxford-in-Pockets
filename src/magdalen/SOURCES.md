# 地理数据、建筑参考与素材

## 平面与范围

- 地理底图为 © OpenStreetMap contributors，采用 ODbL 1.0。源码随附 OSM 摘录及由它生成的地理数据，可用于复算、对齐和再制作。底图取自已有 OSM XML 缓存，独立裁切、投影和建模。取用的两组数据为城东街区和彻韦尔河水域关系。地图绘制日期、元素最后编辑日期和模型制作日期含义不同。[OpenStreetMap 署名与许可](https://www.openstreetmap.org/copyright) · [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) · [水域关系 1046961](https://www.openstreetmap.org/relation/1046961) · [桥面轮廓 1154991954](https://www.openstreetmap.org/way/1154991954)
- 建模原点为 51.75190° N、1.24645° W。以切片尺度作局部等距近似，x 向东、z 向南、y 向上。西缘循街区，东南缘保留莫德林桥的整段映射桥面及其两端街道。北边包含完整 New Building、前方草坪和靠学院的河岸步道。边界的东西、南北轴向跨度约 327 × 353 米。
- 学院主场图用于核对 St John’s Quad、入口、礼拜堂、各塔、回廊和 New Building。园区图用于核对 Holywell Mill Stream、河汊、鹿园、植物园和 Addison’s Walk 的真实相对位置。两图均以原始比例和北箭头为准。[2021 年学院主场图](https://www.magd.ox.ac.uk/wp-content/uploads/2022/02/Magdalen-Main-Site-July-2021.pdf) · [学院庭院与园区图](https://www.magd.ox.ac.uk/wp-content/uploads/2022/09/Magdalen-Maps.pdf)
- 将主场图栅格化到 1500 × 1061 像素，以回廊内院四角配准，再用八个独立的建筑中心或步桥中心复核。两塔模型平面中心相距约 57.1 米。图像核验页列出中心差值。学院图是访客示意平面图，中心点由人工选取，这一比较包含图面简化和取点误差。
- 局部地形、水位、桥面拱度、河岸坡度、建筑标高、树高与冠幅为视觉建模参数。120 株树中有 6 株按摘录内树点定位，其余为避开院落、道路、河面和建筑的示意配置。所有位置在四季间固定。

## 学院、桥与晨唱

- 学院大塔修复记录给出 144 英尺，约 43.9 米。模型中塔身层间标高、旗杆、礼拜堂窗格、回廊雕刻、屋面与其余建筑高度取自多角度图像的比例估算。建筑模块的 `sources.md` 列明每处依据，包括桥侧河岸建筑的保护调查实照。[大塔修复](https://www.magd.ox.ac.uk/news/raising-the-standard-the-restoration-of-the-great-towers-weather-vanes/) · [回廊、塔顶与北院照片](https://www.magd.ox.ac.uk/news/may-morning-2/) · [学院访客图像](https://www.magd.ox.ac.uk/visiting-magdalen-college/)
- 莫德林桥的模型在两条汊流上各有三个过水拱，两岸边另有四个小拱，中央岛面留一处椭圆拱。过水分隔取自 OSM 水域在桥轴上的六个实际区间。桥台、桥面两侧外扩、桥头接路取自 OSM 桥面与路网。护栏、券石分块及券顶高度参考摄影与历史图纸估绘。源码里的 135.67 米是 OSM 标记桥段的两路轴端点直线距离，历史书目另有桥长记载，两种取点口径的具体差异待核实。首版保留了两端接地道路。[Historic England 登记](https://historicengland.org.uk/listing/the-list/list-entry/1369360) · [T. W. M. Jaine 的桥梁研究与图纸](https://www.oxoniensia.org/volumes/1971/jaine.pdf) · [Oxford History 桥、High Street 及塔照片](https://www.oxfordhistory.org.uk/high/tour/north/magdalen_bridge.html) · [近距离券石与碑记](https://oxfordhistory.org.uk/streets/inscriptions/central/magdalen_bridge.html) · [Juan Gutiérrez Andrés 拍摄的中央拱](https://commons.wikimedia.org/wiki/File:Magdalen_Bridge_central_elliptical_arch.jpg)
- 5 月 1 日晨唱时，唱诗班登上大塔，听众在 High Street 聚集。本版用原创无词四声部与程序合成人声表现现场感。曲谱、声部和混音可编辑。学院、档案馆和摄影师的照片只作造型参考。[学院对传统的记述](https://www.magd.ox.ac.uk/news/a-45-year-dream-comes-true/) · [学院五月晨唱活动](https://www.magd.ox.ac.uk/news/may-morning-2/)

## 视觉与软件

第二版新增的鸟模型、关节运动、叶片、雪花和路沿雪堆使用本项目的程序几何。地表存雪根据静态网格的上表面、受遮挡情况、坡度及材质计算。积雪的增长速度、风、栖点和飞行活动是观察用的艺术设定。

- 微缩旋转视角与四季观察参考 April Zhu 的 Pocket City。模型、底座、界面、笔触、图标、人物与声音为本项目制作。[April Zhu · Pocket City](https://april-zhu.com/pocketcity)
- Three.js r180 按 MIT 许可使用，许可全文在 `THREE-LICENSE.txt`，也嵌入了离线 HTML。esbuild 仅用于构建。系统字体由浏览器本机提供。[Three.js r180](https://github.com/mrdoob/three.js/tree/r180) · [esbuild](https://esbuild.github.io/)
