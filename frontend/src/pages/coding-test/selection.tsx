import React from "react";
import Head from "next/head";
import Header from "../../components/header";
import Footer from "../../components/Footer";
import Link from "next/link";
import styles from "../../styles/coding-test.module.css";

// 가상의 테스트 데이터
const testOptions = [
  {
    id: 1,
    title: "알고리즘 기초",
    description: "배열, 문자열, 해시 등 기본적인 자료구조를 활용한 문제",
    difficulty: "초급",
  },
  {
    id: 2,
    title: "다이나믹 프로그래밍",
    description: "DP를 이용한 최적화 문제 풀이",
    difficulty: "중급",
  },
  {
    id: 3,
    title: "그래프 탐색",
    description: "BFS, DFS를 활용한 그래프 문제",
    difficulty: "중급",
  },
];

const CodingTestSelectionPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>코딩 테스트 선택 | ALPACO</title>
        <meta name="description" content="코딩 테스트 선택 페이지" />
      </Head>

      <Header />

      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>코딩 테스트 선택</h1>
            <Link href="/coding-test" className={styles.backButton}>
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

          <div className={styles.selectionGrid}>
            {testOptions.map((test) => (
              <div key={test.id} className={styles.testCard}>
                <div className={styles.testCardHeader}>
                  <h2 className={styles.testTitle}>{test.title}</h2>
                  <span className={styles.difficultyBadge}>
                    {test.difficulty}
                  </span>
                </div>
                <p className={styles.testDescription}>{test.description}</p>
                <Link
                  href={`/coding-test/progress?id=${test.id}`}
                  className={styles.startButton}
                >
                  시작하기
                </Link>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CodingTestSelectionPage;
