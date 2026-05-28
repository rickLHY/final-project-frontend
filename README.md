# 台灣高鐵網路訂票系統 — Frontend

React + TypeScript 前端，串接 [後端 API](https://github.com/rickLHY/database-final-project)，部署於 Vercel。

## 技術棧

| 項目 | 版本 |
|------|------|
| React | 19 |
| TypeScript | 6 |
| Vite | 8 |
| React Compiler | 1.0 (babel plugin) |

CSS 純手刻，無 UI framework。

## 功能頁面

| 頁面 | 說明 |
|------|------|
| 訂票（時刻表與票價 / 網路訂票） | 選出發站、抵達站、日期，查詢班次並進行選座訂票 |
| 自由座等候時間 | 選日期與出發站，查詢各班次自由座剩餘數量與壅擠程度 |
| 疏運期銷售資訊 | 選日期區間，查詢各班次售票率與剩餘座位 |
| 我的訂單 | 查看訂單明細、付款、退票、取消訂單、匯出 CSV |
| 候補 | 登記候補、查看候補狀態、取消候補 |
| 訂位代號查詢 | 不需登入，輸入 8 碼代號查詢票況 |

### 驗證

- Email / 密碼 登入與註冊
- Google OAuth（Google Identity Services `renderButton` 流程）

## 本地開發

### 前置需求

- Node.js 18+
- 後端服務運行中（本機或 ngrok）

### 步驟

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env，填入後端 URL 與 Google Client ID

# 3. 啟動開發伺服器
npm run dev
```

開發伺服器預設在 `http://localhost:5173`。

### 環境變數

| 變數 | 說明 |
|------|------|
| `VITE_API_BASE_URL` | 後端 API base URL（e.g. `https://xxx.ngrok-free.dev`） |
| `BACKEND_TARGET` | Vite proxy 使用的後端 URL（本地開發同上） |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID |

## 建置與部署

```bash
npm run build   # 輸出至 dist/
npm run preview # 本地預覽 build 結果
```

### Vercel 部署

推送至 `main` branch 即自動觸發 Vercel deploy。

需在 Vercel 儀表板 → **Settings → Environment Variables** 設定上方三個環境變數。

Google Cloud Console 的 **Authorized JavaScript origins** 需加入：
- `https://<your-vercel-domain>.vercel.app`
- `http://localhost:5173`（本地開發用）

## 專案結構

```
src/
├── components/
│   ├── Header.tsx          # 頂部導覽列（語言切換、會員狀態）
│   └── Footer.tsx
├── contexts/
│   └── AuthContext.tsx     # 全域登入狀態
├── pages/
│   ├── SearchPage.tsx      # 訂票主頁（含自由座 / 疏運期 inline tabs）
│   ├── SeatSelection.tsx   # 選座頁
│   ├── BookingConfirm.tsx  # 訂單確認頁
│   ├── PaymentPage.tsx     # 付款頁
│   ├── MyBookings.tsx      # 我的訂單
│   ├── Waitlist.tsx        # 候補清單
│   └── AuthPage.tsx        # 登入 / 註冊
├── services/
│   └── api.ts              # 所有後端 API 呼叫
├── types/
│   └── index.ts            # TypeScript 型別定義
├── styles/                 # 各頁面 CSS
├── i18n.tsx                # 多語系（繁中 / English / 日本語）
└── App.tsx                 # 路由狀態機
```

## 多語系

支援繁體中文、English、日本語，語系偏好儲存於 `localStorage`。翻譯字典位於 [`src/i18n.tsx`](src/i18n.tsx)。

## API Proxy

開發時 Vite 會將 `/api/backend/*` proxy 至 `BACKEND_TARGET`，避免 CORS 問題。  
`vercel.json` 設定所有路由 rewrite 至 `index.html` 以支援 SPA。
