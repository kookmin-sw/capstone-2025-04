import React from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import styles from "@/styles/coding-test.module.css";

const CodingTestPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>코딩 테스트 | ALPACO</title>
        <meta name="description" content="코딩 테스트 페이지" />
      </Head>

      <Header />

      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>코딩 테스트</h1>
            <Link href="/" className={styles.backButton}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              뒤로가기
            </Link>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              원하는 테스트 유형을 선택하세요
            </h2>
            <p className={styles.cardDescription}>
              다양한 난이도와 주제별 코딩 테스트에 도전하고 실력을 향상시켜
              보세요. 알고리즘 실력을 키우고 면접 준비에 도움이 됩니다.
            </p>
            <Link
              href="/coding-test/selection"
              className={styles.primaryButton}
            >
              테스트 선택하기
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CodingTestPage;
