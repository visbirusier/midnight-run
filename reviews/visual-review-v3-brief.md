# v3 视觉实现参考与资产核验

日期：2026-10-21。只读检查了现有 `src/game.js`、`src/tokyo-scene.js`、v2 截图，以及 `dist/assets/coupe.glb` 和署名文件。没有修改游戏源码、下载新模型或发布。此文件用于接下来的 v3 实图复评。

## 优先完成的视觉变化

1. **先让每种车有独立轮廓。** 现版玩家 Ferrari 与盒状程序对手的精细度差距，是近景最显眼的不一致。不要只改同一外壳的颜色和灯条；至少分成 GT3 的圆润车顶/高后肩、Revuelto 的低宽楔形/尖锐侧面、普通交通车的高车厢三类。先保证侧视、后三分之四、普通追车三个角度都能区分，再做徽标和内饰。
2. **真实路网的收益应体现为路口与街块。** 主代理已选取东京塔通—环三—日比谷—爱宕约 2.8 km 的 OSM 路线与建筑轮廓。下一步最有价值的是连接真实支路口、路缘转角、人行道、停止线、斑马线与转弯半径；建筑立面不要继续按赛道里程均匀排成墙。建筑高度缺失时可以估算，但不能将这些楼高称作实测。
3. **行人必须属于人行空间。** 建议近处同时可见 8–12 个，身高约 1.6–1.85 m，沿人行道窄路径走动，留出约 0.6 m 路缘缓冲；转弯时改变朝向、不同步摆臂，停留在店门/信号灯旁的少量角色可持伞。远处可合批简化。避免用等间距站姿胶囊堆出人流，也避免让人物在机动车道或护栏中穿行。
4. **接触画面要有明确的体积边界。** 现版碰撞只是触发减速和横移，仍可能在冷却期间发生车体重叠。视觉验收需看追尾、并排挤压、弯道内侧、建筑墙角各一次：车辆分离后有稳定间距，保险杠、车轮和护栏不互穿。碰撞尺寸需随每款模型的长宽调整，不能让更长更宽的 Revuelto 沿用所有旧阈值。

## 最多三个车型方向

| 方向 | 官方设计锚点与实现重点 | 来源与使用范围 |
| --- | --- | --- |
| **911 GT3（992.2，普通固定尾翼版）** | 连续圆弧车顶、明显后肩、圆/椭圆主灯内部四点灯组；鹅颈支架从上方连接固定尾翼；两根中央黑色排气；前 20 / 后 21 英寸车轮。先做圆润车体，不能变成方顶轿跑；不要混入 GT3 RS 夸张空气套件，也不要把无固定尾翼的 Touring 当成同一外观。 | [Porsche 官方气动与设计](https://newsroom.porsche.com/en/press-kits/911-GT3/Aerodynamics-and-design.html)、[992.2 官方车型说明](https://www.porsche.com/stories/innovation/new-2025-porsche-911-gt3/)。这里只用作原创近似造型的设计参考，未取得可自由打包的官方 3D 资产。 |
| **Lamborghini Revuelto** | 低、宽、长的楔形；沿车身贯穿的中轴线；Y 形前后灯；侧面凹形进气与舱体之间形成清晰负空间；外露发动机与后甲板，尾翼包围中央排气区域。官方图册尺寸为长 4.947 m、宽 2.033 m（不含镜）、高 1.160 m、轴距 2.779 m，可作为体量比例基准。 | [Lamborghini 官方车型页](https://www.lamborghini.com/en-en/models/revuelto-models/revuelto)、[官方中文图册](https://www.lamborghini.com/original/DAM/lamborghini/facelift_2019/model_detail/revuelto/2024/brochure/06_24/REVUELTO_DIGITAL_BROCHURE_CN_2024.pdf)。这里只作设计参考；自建应标注“inspired by”，不称官方模型或精确复刻。 |
| **Nissan GT-R 2023 低面数资产候选** | 适合作为日本跑车方向；作者资产为 5,180 faces、3,288 vertices。下载后才可评判轮组是否可独立转动、材质分组与轮廓质量。 | [Low Poly Nissan GTR，kulonee](https://sketchfab.com/3d-models/low-poly-nissan-gtr-ea74e3d38e924d9c9e1fff1733523f40)。公开 API 已核验 `isDownloadable=true`、**CC BY 4.0**，但没有验证到免登录文件直链，未下载。可不让本轮实现依赖它。 |

第三方模型许可说明只针对作者发布的模型版权，不能理解为车厂授权。CC BY 4.0 允许再分发和修改，要求保留作者、来源、许可链接并说明修改；在应用 About/Credits 与本地许可文件中一起保留即可，不应声称厂商背书。[CC BY 4.0 原文](https://creativecommons.org/licenses/by/4.0/)

## 已核验的资产与边界

- **GT-R**：2026-10-21 从 [Sketchfab 公共 API](https://api.sketchfab.com/v3/models/ea74e3d38e924d9c9e1fff1733523f40) 返回许可 URL `http://creativecommons.org/licenses/by/4.0/`，明确标注允许商业使用、需作者署名。其页面“Download”不等于免登录可取文件；[官方下载 API 文档](https://sketchfab.com/developers/download-api/downloading-models)要求用户认证后生成临时下载地址。本轮没有使用用户账户或下载令牌。
- **现有 Ferrari**：本地 GLB 大小 1,681,572 bytes，按 glTF indices 统计约 358,788 triangles；压缩体积小不意味着渲染面数少，不能直接复制给全部交通车。现有 `CREDITS.txt` 记录作者 vicent091036 与 CC BY 4.0；[Three.js 官方示例](https://threejs.org/examples/webgl_materials_car.html)仍可核对作者署名，但原 Sketchfab 模型 API 当前返回 404，不能声称原许可页面在本轮重新核验成功。
- 检索到的 1970 年代 Porsche 911 虽有低面数 CC BY 4.0 资产，**不进入本轮当前车型建议**，也不能冒充 992.2 GT3。

## v3 需要的复评证据

只需提交：每种车一张侧视/后三分之四图；东京路线一个真实路口、一段带行人的人行道、一张地标与街块关系图；以及一个包含追尾和贴护栏转弯的短连续片段。Mac 应用与 Web 用相同视角对照一次，确认打包后字体、资源路径、材质和渲染质量一致。截图确认外观，连续片段确认接触稳定性，均不代替用户审美接受。
