# Focus Buddy 🎯

[![Version](https://img.shields.io/badge/version-0.1.6-blue.svg)](https://github.com/data-jeong/focus-buddy/releases)
[![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

개인 생산성을 극대화하는 모던 웹 애플리케이션. 할일 관리, 일정 관리, 포커스 타이머를 통합한 올인원 생산성 도구입니다.

## 🚀 Live Demo

[https://focus-buddy-navy.vercel.app](https://focus-buddy-navy.vercel.app)

## ✨ 주요 기능

### 📝 할일 관리 (Todo)
- 우선순위별 할일 관리 (높음/중간/낮음)
- 우선순위 필터링 및 정렬 기능
- 드래그 앤 드롭으로 할일 순서 변경
- 오늘의 할일 위젯
- 마감일 설정 및 관리
- 완료 상태 추적
- 실시간 동기화
- 자동 새로고침 (완료 시)

### 📅 일정 관리 (Schedule)
- 주간 캘린더 뷰
- 반복 일정 설정 (매일/주중/주말/주간/월간/연간)
- 색상 커스터마이징
- 드래그 앤 드롭으로 일정 생성
- 현재 시간 기준 자동 시간 설정
- 종일 일정 지원

### ⏱️ 포커스 타이머
- 뽀모도로 테크닉 (25분 집중, 5분 휴식)
- 짧은 집중 (15분) / 긴 집중 (50분) 모드
- 작업별 시간 추적
- 세션 통계 및 분석
- 자동 휴식 시간 전환
- 완료 버튼 클릭 시 자동 새로고침

### 🎨 사용자 경험
- 🌙 다크모드 지원
- 📱 반응형 디자인 (모바일/태블릿/데스크톱)
- 💾 실시간 데이터 동기화
- 🔐 안전한 사용자 인증
- 📧 이메일 인증 재발송 기능
- 👁️ 비밀번호 표시/숨김 토글
- 🔄 60초 재발송 쿨다운
- 💬 사용자 피드백 시스템
- 🎯 "시간을 지배하는 자가 미래를 만든다" 철학

## 🛠️ 기술 스택

### Frontend
- **Framework**: [Next.js 15.4.6](https://nextjs.org/) - React 기반 풀스택 프레임워크
- **Language**: [TypeScript](https://www.typescriptlang.org/) - 타입 안정성
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - 유틸리티 우선 CSS
- **UI Components**: [Radix UI](https://www.radix-ui.com/) - 접근성 우선 컴포넌트
- **Icons**: [Lucide React](https://lucide.dev/) - 모던 아이콘 세트
- **Date**: [date-fns](https://date-fns.org/) - 날짜 처리 라이브러리

### Backend
- **Database**: [Supabase](https://supabase.com/) PostgreSQL
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage

### Deployment
- **Platform**: [Vercel](https://vercel.com/)
- **Analytics**: Vercel Analytics
- **CI/CD**: GitHub Actions

## 📦 설치 및 실행

### 사전 요구사항
- Node.js 18.0 이상
- npm 또는 yarn
- Supabase 계정

### 1. 저장소 클론
```bash
git clone https://github.com/data-jeong/focus-buddy.git
cd focus-buddy
```

### 2. 의존성 설치
```bash
npm install
# 또는
yarn install
```

### 3. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 내용을 추가:
```env
# App URL (이메일 인증 리다이렉트용)
NEXT_PUBLIC_APP_URL=https://your-app-domain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **중요**: `NEXT_PUBLIC_APP_URL`은 프로덕션 환경에서 실제 도메인으로 설정해야 이메일 인증이 정상 작동합니다.

### 4. 데이터베이스 마이그레이션
```bash
# Supabase 대시보드에서 SQL 에디터를 열고
# supabase/migrations/ 폴더의 SQL 파일들을 순서대로 실행
```

### 5. Supabase 이메일 설정 (프로덕션)
Supabase Dashboard에서:
1. **Authentication → URL Configuration**로 이동
2. **Site URL**: 프로덕션 URL 입력 (예: `https://focus-buddy-navy.vercel.app`)
3. **Redirect URLs**에 추가:
   - `https://your-domain.com/**`
   - `https://your-domain.com/auth/callback`

### 6. 개발 서버 실행
```bash
npm run dev
# 또는
yarn dev
```

로컬 개발: [http://localhost:3000](http://localhost:3000)
프로덕션: [https://focus-buddy-navy.vercel.app](https://focus-buddy-navy.vercel.app)

## 📁 프로젝트 구조

```
focus-buddy/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   ├── auth/              # 인증 페이지
│   └── dashboard/         # 대시보드 페이지
├── components/            # React 컴포넌트
│   ├── dashboard/         # 대시보드 컴포넌트
│   ├── modals/           # 모달 컴포넌트
│   └── ui/               # UI 컴포넌트
├── lib/                   # 유틸리티 및 설정
│   ├── constants/        # 상수 정의
│   ├── supabase/         # Supabase 클라이언트
│   └── utils/            # 유틸리티 함수
├── supabase/             # Supabase 설정
│   └── migrations/       # 데이터베이스 마이그레이션
└── public/               # 정적 파일
```

## 🚀 배포

### Vercel 배포 (권장)

1. [Vercel](https://vercel.com)에 GitHub 저장소 연결
2. 환경 변수 설정
3. 자동 배포 활성화

### 수동 빌드

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

## 🤝 기여하기

기여는 언제나 환영합니다! 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 연락처

- **Developer**: Data Jeong
- **GitHub**: [@data-jeong](https://github.com/data-jeong)
- **Email**: lightyear94122@gmail.com

## 🙏 감사의 말

Focus Buddy를 사용해주셔서 감사합니다! 피드백은 언제나 환영입니다.
