"use client";
import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Changed from next/router

import styles from "../../styles/signup.module.css";
import Image from "next/image";

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
    <div className={styles.container}>
      <Head>
        <title>회원가입 | ALPACO</title>
        <meta name="description" content="ALPACO 회원가입 페이지" />
      </Head>

      {/* 상단 로고 영역 */}
      <header className={styles.header}>
        <Link href="/">
          <div className={styles.logo}>
            <Image
              src="/alpaco-logo.svg"
              alt="ALPACO"
              width={50}
              height={50}
              priority
            />
            <Image
              src="/alpaco-word-logo.svg"
              alt="ALPACO"
              width={150}
              height={50}
              priority
            />
          </div>
        </Link>
      </header>

      {/* 중앙 메인 회원가입 박스 */}
      <main className={styles.main}>
        <div className={styles.formContainer}>
          <h1 className={styles.title}>ALPACO</h1>
          <h2 className={styles.subtitle}>회원가입</h2>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="name">이름</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">이메일</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">비밀번호</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">비밀번호 확인</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
              />
            </div>

            <button type="submit" className={styles.signupButton}>
              회원가입
            </button>

            <div className={styles.loginPrompt}>
              <p>
                이미 계정이 있으신가요?{" "}
                <Link href="/login" className={styles.loginLink}>
                  로그인
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* 하단 영역: 언어 선택, 약관, FAQ 등 */}
      <footer className={styles.footer}>
        <div className={styles.languageSwitch}>
          <button>한국어</button> | <button>English</button>
        </div>
        <div className={styles.footerLinks}>
          <Link href="#">이용약관</Link> |{" "}
          <Link href="#">개인정보 처리방침</Link> |{" "}
          <Link href="#">FAQ/문의</Link>
        </div>
      </footer>
    </div>
  );
};

export default SignupPage;
