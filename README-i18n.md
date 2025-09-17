# DOM Blocker - 国际化版本

## 概述

DOM Blocker 现在支持中英文国际化，用户可以根据浏览器语言设置自动切换界面语言。

## 功能特性

- 🌍 **多语言支持**: 支持中文（简体）和英文
- 🎯 **智能语言检测**: 根据浏览器语言设置自动选择界面语言
- 🔧 **完整国际化**: 包括所有UI文本、错误消息、通知等
- 📱 **响应式设计**: 保持原有的响应式界面设计

## 语言支持

### 英文 - 默认语言
- 扩展名称: DOM Blocker
- 完整的英文界面和提示信息
- 符合国际用户习惯的交互设计

### 中文（简体）
- 扩展名称: DOM 元素拦截器
- 完整的中文界面和提示信息
- 符合中文用户习惯的交互设计

## 技术实现

### 文件结构
```
locales/
├── en/
│   └── messages.json    # 英文语言包
└── zh/
    └── messages.json    # 中文语言包
```

### 配置说明

1. **默认语言设置**: 在 `package.json` 中设置 `default_locale: "en"`
2. **扩展信息国际化**: 使用 `__MSG_extensionName__` 和 `__MSG_extensionDescription__`
3. **代码中文本国际化**: 使用 `chrome.i18n.getMessage()` API

### 使用示例

```typescript
// 获取国际化文本
const title = chrome.i18n.getMessage("popupTitle")
const buttonText = chrome.i18n.getMessage("startPicking")

// 错误消息国际化
console.error(chrome.i18n.getMessage("deleteElementFailed"), error)
```

## 语言切换

### 🌍 自动语言切换 (推荐)
插件会根据以下优先级自动选择语言：

1. **浏览器语言设置** (最高优先级)
2. **系统语言设置** 
3. **默认语言** (fallback: 英文)

#### 如何更改浏览器语言设置：
1. 打开Chrome设置 (chrome://settings/)
2. 点击"高级" → "语言"
3. 添加或调整语言优先级：
   - 添加"中文(简体)"并设为第一优先级 → 扩展显示中文
   - 添加"English"并设为第一优先级 → 扩展显示英文
4. 重启Chrome浏览器
5. 重新加载扩展

#### 语言检测逻辑：
- `zh-CN`, `zh-TW`, `zh-HK` → 显示中文界面
- `en-US`, `en-GB`, `en` → 显示英文界面  
- 其他语言 → 使用默认语言(英文)

### 🔧 手动切换
如果自动切换不生效，可以尝试：
1. 清除浏览器缓存
2. 重新安装扩展
3. 检查扩展权限设置

## 开发说明

### 添加新的语言
1. 在 `locales/` 目录下创建新的语言文件夹（如 `ja` 代表日语）
2. 复制 `messages.json` 文件并翻译所有消息
3. 确保所有消息键值保持一致

### 添加新的文本
1. 在 `locales/zh/messages.json` 中添加新的消息键值对
2. 在 `locales/en/messages.json` 中添加对应的英文翻译
3. 在代码中使用 `chrome.i18n.getMessage("newMessageKey")`

### 构建和测试
```bash
# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# 打包扩展
pnpm package
```

## 消息键值列表

### 基础信息
- `extensionName`: 扩展名称
- `extensionDescription`: 扩展描述
- `popupTitle`: 弹窗标题

### 用户界面
- `startPicking`: 开始拾取按钮
- `stopPicking`: 停止拾取按钮
- `currentPageElements`: 当前页面元素标题
- `noElementsPicked`: 无元素提示
- `visible`/`hidden`: 元素状态
- `show`/`hide`/`delete`: 操作按钮

### 提示信息
- `pickingModeActive`: 拾取模式激活提示
- `pickingInstructions`: 拾取操作说明
- `pickingTip1-4`: 拾取提示信息

### 错误消息
- `deleteElementFailed`: 删除元素失败
- `toggleVisibilityFailed`: 切换可见性失败
- `startPickingFailed`: 开始拾取失败
- 等等...

## 注意事项

1. **消息键值一致性**: 确保所有语言包中的消息键值完全一致
2. **文本长度**: 不同语言的文本长度可能不同，注意UI布局适配
3. **文化差异**: 考虑不同文化背景下的用户习惯和表达方式
4. **测试覆盖**: 确保所有语言版本都经过充分测试

## 更新日志

### v1.0.0 - 国际化版本
- ✅ 添加中英文语言支持
- ✅ 实现完整的UI文本国际化
- ✅ 添加错误消息和通知的国际化
- ✅ 设置英文为默认语言
- ✅ 优化用户体验和界面设计

---

**开发者**: zoolee1021@163.com  
**版本**: 1.0.0  
**最后更新**: 2025年1月
