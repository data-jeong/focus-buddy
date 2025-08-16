# Focus Buddy - ADHD 스마트 일정 관리

ADHD를 위한 할 일 관리, 시간표, 알림 기능을 제공하는 생산성 도구입니다.

## 주요 기능

- ✅ **할 일 관리**: 우선순위 설정, 마감일 관리, 실시간 동기화
- 📅 **시간표/일정 관리**: 주간 캘린더 뷰, 반복 일정 설정
- 🔔 **웹 푸시 알림**: 일정 리마인더, 할 일 마감 알림
- 📱 **Google Calendar 연동**: 기존 일정과 자동 동기화
- 🌙 **다크모드 지원**: 시스템 설정 연동
- ⚡ **실시간 업데이트**: Supabase를 통한 실시간 데이터 동기화
- 🎯 **ADHD 친화적 UI**: 집중력 향상을 위한 깔끔한 인터페이스

## 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **알림**: Web Push API
- **캘린더**: Google Calendar API
- **UI Components**: Radix UI, Lucide Icons

## 설치 및 실행

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone [repository-url]
cd focus-buddy
npm install
```

### 2. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 파일 내용 실행
3. Authentication > Providers에서 Google OAuth 활성화

### 3. Google Calendar API 설정

1. [Google Cloud Console](https://console.cloud.google.com)에서 새 프로젝트 생성
2. Google Calendar API 활성화
3. OAuth 2.0 Client ID 생성
4. Authorized redirect URIs에 `http://localhost:3000/api/auth/google/callback` 추가

### 4. VAPID Keys 생성 (Web Push용)

```bash
npm run generate-vapid
```

### 5. 환경 변수 설정

`.env.local` 파일을 수정하여 실제 값 입력:

```env
# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Calendar API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Web Push (VAPID Keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your-email@example.com
```

### 6. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 프로젝트 구조

```
focus-buddy/
├── app/                      # Next.js App Router
│   ├── api/                 # API Routes
│   ├── auth/                # 인증 페이지
│   └── dashboard/           # 대시보드 페이지들
├── components/              # React 컴포넌트
│   ├── dashboard/          # 대시보드 컴포넌트
│   └── modals/             # 모달 컴포넌트
├── lib/                     # 유틸리티 함수
│   └── supabase/           # Supabase 클라이언트
├── public/                  # 정적 파일
│   └── sw.js              # Service Worker
├── supabase/               # 데이터베이스 스키마
└── types/                  # TypeScript 타입 정의
```

## 사용 방법

1. **회원가입/로그인**: 이메일 또는 Google 계정으로 로그인
2. **할 일 추가**: 대시보드에서 "할 일 추가" 버튼 클릭
3. **일정 관리**: 시간표 페이지에서 드래그&드롭으로 일정 추가
4. **알림 설정**: 설정 페이지에서 푸시 알림 활성화
5. **Google Calendar 연동**: 설정에서 Google Calendar 연결

## 배포

### Vercel 배포 (권장)

1. [Vercel](https://vercel.com)에 GitHub 저장소 연결
2. 환경 변수 설정
3. 자동 배포

### 수동 배포

```bash
npm run build
npm start
```

## 라이선스

MIT

## 기여

Pull Request와 이슈는 언제나 환영합니다!