"use client";
import React from "react";
import Head from "next/head";
import Header from "../../../components/header";
import Footer from "../../../components/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Changed from next/router
import styles from "../../../styles/coding-test.module.css";

const CodingTestResultPage: React.FC = () => {
  const router = useRouter();
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");

  // 가상의 테스트 결과 데이터
  const testResult = {
    success: true,
    score: 90,
    executionTime: "0.05s",
    memoryUsage: "5.2MB",
    testCases: [
      {
        id: 1,
        input: "5\n1 3 5 2 4",
        expected: "5",
        actual: "5",
        result: "성공",
      },
      { id: 2, input: "3\n7 2 9", expected: "9", actual: "9", result: "성공" },
      {
        id: 3,
        input: "4\n10 20 30 40",
        expected: "40",
        actual: "40",
        result: "성공",
      },
    ],
  };

  const handleShareToCommunity = () => {
    router.push("/community/create?fromTest=true&id=" + id);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>코딩 테스트 결과 | ALPACO</title>
        <meta name="description" content="코딩 테스트 결과 페이지" />
      </Head>

      <Header />

      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>채점 결과</h1>
            <Link
              href={`/coding-test/progress?id=${id}`}
              className={styles.backButton}
            >
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

          <div className={styles.resultCard}>
            <div className={styles.resultHeader}>
              <h2 className={styles.resultTitle}>배열에서 가장 큰 수 찾기</h2>
              <div className={styles.scoreDisplay}>
                <div className={styles.scoreValue}>{testResult.score}/100</div>
                <div className={styles.scoreLabel}>점수</div>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>실행 시간</div>
                <div className={styles.statValue}>
                  {testResult.executionTime}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>메모리 사용량</div>
                <div className={styles.statValue}>{testResult.memoryUsage}</div>
              </div>
            </div>

            <h3 className={styles.cardTitle}>테스트 케이스 결과</h3>
            <div className="overflow-x-auto">
              <table className={styles.resultTable}>
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>입력</th>
                    <th>기대 출력</th>
                    <th>실제 출력</th>
                    <th>결과</th>
                  </tr>
                </thead>
                <tbody>
                  {testResult.testCases.map((testCase) => (
                    <tr key={testCase.id}>
                      <td>{testCase.id}</td>
                      <td>{testCase.input}</td>
                      <td>{testCase.expected}</td>
                      <td>{testCase.actual}</td>
                      <td>
                        <span
                          className={
                            testCase.result === "성공"
                              ? styles.resultSuccess
                              : styles.resultFailure
                          }
                        >
                          {testCase.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleShareToCommunity}
                className={styles.shareButton}
              >
                커뮤니티에 올리기
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CodingTestResultPage;
