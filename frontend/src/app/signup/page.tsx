"use client";
import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Changed from next/router

import SimpleHeader from "@/components/SimpleHeader";

const SignupPage: React.FC = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    try {
      // 여기에 실제 회원가입 로직을 구현
      console.log("회원가입 시도:", { name, email, password });

      // 회원가입 성공 가정
      router.push("/login");
    } catch (err) {
      setError(
        `회원가입에 실패했습니다: ${
          err instanceof Error ? err.message : "알 수 없는 오류"
        }`
      );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Head>
        <title>회원가입 | ALPACO</title>
        <meta name="description" content="ALPACO 회원가입 페이지" />
      </Head>

      {/* 상단 로고 영역 */}
      <SimpleHeader />

      {/* 중앙 메인 회원가입 박스 */}
      <main className="flex-1 flex justify-center items-center">
        <div className="max-w-md w-full p-8 border border-gray-200 rounded-lg bg-white text-center shadow-md">
          <h1 className="text-2xl font-bold mb-1">ALPACO</h1>
          <h2 className="text-base mb-8 text-gray-600">회원가입</h2>
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-600 p-3 rounded-md mb-4 text-left">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="text-left">
              <label htmlFor="name" className="block mb-2 font-medium">
                이름
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full p-3 border border-gray-300 rounded-md text-base focus:outline-none focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]"
              />
            </div>

            <div className="text-left">
              <label htmlFor="email" className="block mb-2 font-medium">
                이메일
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
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full p-3 border border-gray-300 rounded-md text-base focus:outline-none focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]"
              />
            </div>

            <div className="text-left">
              <label
                htmlFor="confirmPassword"
                className="block mb-2 font-medium"
              >
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                className="w-full p-3 border border-gray-300 rounded-md text-base focus:outline-none focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]"
              />
            </div>

            <button
              type="submit"
              className="mt-4 py-3 bg-[var(--primary-color)] text-white border-none rounded-md cursor-pointer font-medium hover:bg-[var(--primary-hover)]"
            >
              회원가입
            </button>

            <div className="mt-4 text-gray-600">
              <p>
                이미 계정이 있으신가요?{" "}
                <Link
                  href="/login"
                  className="text-[var(--primary-color)] no-underline hover:underline"
                >
                  로그인
                </Link>
              </p>
            </div>
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

export default SignupPage;
