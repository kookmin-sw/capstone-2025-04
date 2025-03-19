"use client"; // Add this to mark as client component

import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Changed from next/router
import SimpleHeader from "@/components/SimpleHeader";

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // 실제 로그인 로직
      console.log("로그인 시도:", { email, password });
      // 로그인 성공 가정
      router.push("/");
    } catch (err) {
      setError(`로그인에 실패했습니다: ${(err as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Head>
        <title>로그인 | ALPACO</title>
        <meta name="description" content="ALPACO 로그인 페이지" />
      </Head>

      {/* 상단 로고 영역 */}
      <SimpleHeader />

      {/* 중앙 메인 로그인 박스 */}
      <main className="flex-1 flex justify-center items-center">
        <div className="max-w-md w-full p-8 border border-gray-200 rounded-lg bg-white text-center shadow-md">
          <h1 className="text-2xl font-bold mb-1">ALPACO</h1>
          <h2 className="text-base mb-8 text-gray-600">로그인</h2>
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-600 p-3 rounded-md mb-4 text-left">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="text-left">
              <label htmlFor="email" className="block mb-2 font-medium">
                아이디 (이메일)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                className="w-full p-3 border border-gray-300 rounded-md text-base focus:outline-none focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]"
              />
            </div>
            <div className="text-left">
              <label htmlFor="password" className="block mb-2 font-medium">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full p-3 border border-gray-300 rounded-md text-base focus:outline-none focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]"
              />
            </div>

            <button
              type="submit"
              className="mt-4 py-3 bg-[var(--primary-color)] text-white border-none rounded-md cursor-pointer font-medium hover:bg-[var(--primary-hover)]"
            >
              로그인
            </button>

            {/* 비밀번호 재설정/찾기 페이지로 이동시키려면 아래를 Link로 변경하거나 onClick 등으로 처리 */}
            <div className="mt-4 text-right">
              <a
                href="#"
                className="text-sm text-[var(--primary-color)] hover:underline"
              >
                비밀번호를 잊으셨나요?
              </a>
            </div>

            <button
              type="button"
              className="mt-3 py-3 bg-transparent border border-[var(--primary-color)] rounded-md cursor-pointer font-medium text-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-white"
              onClick={() => router.push("/signup")}
            >
              계정 만들기
            </button>
          </form>
        </div>
      </main>

      {/* 하단 영역: 언어 선택, 약관, FAQ 등 */}
      <footer className="p-4 border-t border-gray-200 text-center">
        <div className="mb-2">
          <button className="bg-transparent border-none text-gray-600 cursor-pointer hover:underline">
            한국어
          </button>{" "}
          |
          <button className="bg-transparent border-none text-gray-600 cursor-pointer hover:underline">
            English
          </button>
        </div>
        <div className="text-gray-600">
          <Link
            href="#"
            className="text-gray-600 no-underline mx-2 hover:underline"
          >
            이용약관
          </Link>{" "}
          |{" "}
          <Link
            href="#"
            className="text-gray-600 no-underline mx-2 hover:underline"
          >
            개인정보 처리방침
          </Link>{" "}
          |{" "}
          <Link
            href="#"
            className="text-gray-600 no-underline mx-2 hover:underline"
          >
            FAQ/문의
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
