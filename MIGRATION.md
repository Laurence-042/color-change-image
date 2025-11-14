# 迁移说明 - Vue CLI 到 Vite

本项目已从 Vue CLI (Vue 2) 迁移到 Vite (Vue 3)。

## 主要变更

### 构建工具
- **旧**: Vue CLI 4.x + Webpack
- **新**: Vite 5.x

### 框架版本
- **旧**: Vue 2.6.11
- **新**: Vue 3.4.0

### UI 框架
- **旧**: Vuetify 2.2.11
- **新**: Vuetify 3.5.0

## 已完成的迁移步骤

1. ✅ 创建 `vite.config.js` 配置文件
2. ✅ 更新 `package.json` 依赖和脚本命令
3. ✅ 将 `index.html` 移动到根目录并更新格式
4. ✅ 更新 `main.js` 使用 Vue 3 的 `createApp` API
5. ✅ 更新 `vuetify.js` 插件配置
6. ✅ 删除旧的配置文件 (`vue.config.js`, `babel.config.js`)

## 新的开发命令

```bash
# 安装依赖
npm install

# 开发模式 (替代 npm run serve)
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# ESLint 检查
npm run lint
```

## 注意事项

### Vue 3 变更
- 组件需要检查 Vue 2 到 Vue 3 的兼容性
- `$vuetify` API 可能有变化，需要测试
- 某些 Vuetify 2 组件在 Vuetify 3 中可能有不同的属性

### 需要手动检查的地方
1. `App.vue` 中的 Vuetify 组件兼容性
2. `$vuetify.theme.isDark` 在 Vuetify 3 中的使用方式
3. 所有工具类文件的兼容性

## 性能提升

使用 Vite 后，你将体验到：
- ⚡ 极快的冷启动
- ⚡ 即时的热模块替换 (HMR)
- ⚡ 更快的构建速度
- 🎯 按需编译，只编译正在开发的代码

## 后续步骤

1. 运行 `npm install` 安装新的依赖
2. 运行 `npm run dev` 启动开发服务器
3. 测试所有功能是否正常工作
4. 根据控制台警告调整代码
