This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm install
npm run dev
# or

yarn install
yarn dev

# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

frontend/
├── public/ # 정적 파일 (favicon, logo 등)
├── src/
│ ├── api/ # API 요청 관련 함수 (AWS API Gateway 연동)
│ ├── components/ # 재사용 가능한 UI 컴포넌트
│ ├── hooks/ # 커스텀 React Hooks
│ ├── pages/ # Next.js 페이지 라우트
│ ├── styles/ # Tailwind + 글로벌 스타일링
│ ├── utils/ # 공통 유틸리티 함수
│ ├── app/ # (App Router 사용 시) 레이아웃 및 페이지 관리
├── .env.local # 환경 변수 파일
├── next.config.js # Next.js 설정 파일
├── tailwind.config.js # Tailwind 설정 파일
├── tsconfig.json # TypeScript 설정 파일
├── package.json # 프로젝트 의존성 관리
├── README.md # 프로젝트 설명
