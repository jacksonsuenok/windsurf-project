# Jackson的AI食物分析助手

这是一个基于 Google Cloud Vision API 的食物分析网站，可以帮助用户识别食物并获取营养信息。

## 功能特点

- 上传食物图片进行识别
- 获取食物名称和卡路里信息
- 提供营养建议
- 支持拖拽上传
- 支持自定义 API 密钥

## 使用说明

1. 访问网站：[https://[你的GitHub用户名].github.io/windsurf-project/](https://[你的GitHub用户名].github.io/windsurf-project/)
2. 点击上传区域或拖拽图片到上传区域
3. 点击"分析"按钮开始分析
4. 等待分析结果显示

## API 密钥说明

- 网站提供20次免费使用机会
- 超过免费次数后，需要输入自己的 Google Cloud Vision API 密钥
- 获取 API 密钥方法:
  1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
  2. 创建新项目或选择现有项目
  3. 启用 Cloud Vision API
  4. 创建凭据 (API 密钥)

## 技术栈

- HTML5
- CSS3
- JavaScript (原生)
- Google Cloud Vision API

## 本地开发

1. 克隆仓库:
```bash
git clone https://github.com/[你的GitHub用户名]/windsurf-project.git
```

2. 复制配置文件:
```bash
cp config.example.js config.js
```

3. 编辑 config.js，添加你的 API 密钥

4. 使用本地服务器运行项目(例如 VS Code 的 Live Server)
