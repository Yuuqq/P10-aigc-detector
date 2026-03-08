# P10 Spec - AIGC 洗稿特征本地探测雷达

## 1. Summary

- **Project ID**: P10
- **Project Name**: AIGC 洗稿特征本地探测雷达
- **Goal**: 利用统计规律（字词熵、句式模式、标点分布）本地离线预判文本是否由 AI 生成
- **User Persona**: 新闻编辑 / 核查员

## 2. Scope

- **In scope**:
  - 利用统计规律（字词熵、句式模式、标点分布）本地离线预判文本是否由 AI 生成
- **Out of scope**:
  - 后端代理或服务端逻辑
  - API Key 持久化存储

## 3. UX

- **Core workflow**: 用户输入 → 前端处理 → 结果展示
- **Inputs**: 待检测文本
- **Outputs**: AI 生成概率评分 + 特征雷达图
- **States**: empty (初始) / loading (处理中) / error (失败) / success (完成)

## 4. Functional Requirements

1. FR-1: 利用统计规律（字词熵、句式模式、标点分布）本地离线预判文本是否由 AI 生成
2. FR-2: 结果可视化展示
3. FR-3: 错误状态可见提示

## 5. Non-Functional Requirements

- **Performance**: 核心任务 3 分钟内完成
- **Accessibility**: 键盘导航、aria-label、焦点可见、WCAG AA 对比度
- **Privacy**: 本地处理优先，不默认上传数据
- **Browser support**: 现代 Chromium (Chrome 110+)

## 6. Dependencies

- **Libraries/CDNs**: 无外部依赖
- **Local data**: 无

## 7. Risks & Mitigations

- **Risk**: 统计方法误报率较高
- **Mitigation**: 明确标注仅为辅助参考，不作为最终判定依据

## 8. Acceptance Criteria

- [ ] 至少 4 项特征可视化
- [ ] 输出综合风险等级
- [ ] 页面包含“仅辅助”免责声明
- [ ] 纯静态页面可部署 GitHub Pages
- [ ] 移动端可用
- [ ] 隐私提示清晰可见
