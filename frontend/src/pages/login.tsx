import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import "../styles/globals.css";
import styles from "../styles/login.module.css";
import Image from "next/image";

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
    <div className={styles.container}>
      <Head>
        <title>로그인 | ALPACO</title>
        <meta name="description" content="ALPACO 로그인 페이지" />
      </Head>

      {/* 상단 로고 영역 */}
      <header className={styles.header}>
        <Link href="/">
          <div className={styles.logo}>
            {/* 로고 이미지는 /public 폴더 아래에 넣어두고, 경로를 맞춰주세요. */}
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

      {/* 중앙 메인 로그인 박스 */}
      <main className={styles.main}>
        <div className={styles.formContainer}>
          <h1 className={styles.title}>ALPACO</h1>
          <h2 className={styles.subtitle}>로그인</h2>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="email">아이디 (이메일)</label>
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <button type="submit" className={styles.loginButton}>
              로그인
            </button>

            {/* 비밀번호 재설정/찾기 페이지로 이동시키려면 아래를 Link로 변경하거나 onClick 등으로 처리 */}
            <div className={styles.resetPasswordLink}>
              <a href="#">비밀번호를 잊으셨나요?</a>
            </div>

            <button
              type="button"
              className={styles.createAccountButton}
              onClick={() => router.push("/signup")}
            >
              계정 만들기
            </button>
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

export default LoginPage;
