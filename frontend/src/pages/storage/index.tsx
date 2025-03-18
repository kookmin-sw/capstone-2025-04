import React, { useState } from "react";
import Head from "next/head";
import Header from "../../components/header";
import Footer from "../../components/Footer";
import Link from "next/link";
import styles from "../../styles/storage.module.css";

// 가상의 저장된 코딩 테스트 데이터
const savedTests = [
  {
    id: 1,
    title: "배열에서 가장 큰 수 찾기",
    type: "알고리즘 기초",
    date: "2023-04-18",
    status: "완료",
    score: 100,
  },
  {
    id: 2,
    title: "피보나치 수열 구현하기",
    type: "다이나믹 프로그래밍",
    date: "2023-04-16",
    status: "완료",
    score: 85,
  },
  {
    id: 3,
    title: "이진 탐색 트리 구현",
    type: "자료구조",
    date: "2023-04-10",
    status: "진행중",
    score: null,
  },
];

const StoragePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTests = savedTests.filter(
    (test) =>
      test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <Head>
        <title>내 저장소 | ALPACO</title>
        <meta name="description" content="ALPACO 내 저장소" />
      </Head>

      <Header />

      <main className={styles.main}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className={styles.pageHeader}>
            <h1 className={styles.title}>
              <span className={styles.titleIcon}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </span>
              내 저장소
            </h1>
            <div className={styles.headerActions}>
              <div className={styles.searchContainer}>
                <input
                  type="text"
                  placeholder="문제 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
                <div className={styles.searchIcon}>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <Link href="/" className={styles.backButton}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                뒤로가기
              </Link>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <span className={styles.cardIcon}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </span>
                저장된 코딩 테스트
              </h2>
              <p className={styles.cardDescription}>
                저장한 문제들을 언제든지 다시 풀어볼 수 있습니다. 총{" "}
                {filteredTests.length}개의 문제가 있습니다.
              </p>
            </div>

            {filteredTests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className={styles.table}>
                  <thead className={styles.tableHeader}>
                    <tr>
                      <th className={styles.tableHeaderCell}>제목</th>
                      <th className={styles.tableHeaderCell}>유형</th>
                      <th className={styles.tableHeaderCell}>저장 날짜</th>
                      <th className={styles.tableHeaderCell}>상태</th>
                      <th className={styles.tableHeaderCell}>점수</th>
                      <th className={styles.tableHeaderCell}>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTests.map((test) => (
                      <tr key={test.id} className={styles.tableRow}>
                        <td className={styles.tableCell}>
                          <div className={styles.testTitle}>{test.title}</div>
                        </td>
                        <td className={styles.tableCell}>
                          <div className={styles.testType}>{test.type}</div>
                        </td>
                        <td className={styles.tableCell}>
                          <div className={styles.date}>{test.date}</div>
                        </td>
                        <td className={styles.tableCell}>
                          <span
                            className={`${styles.statusBadge} ${
                              test.status === "완료"
                                ? styles.statusCompleted
                                : styles.statusInProgress
                            }`}
                          >
                            {test.status === "완료" ? (
                              <svg
                                className={styles.statusIcon}
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg
                                className={styles.statusIcon}
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            {test.status}
                          </span>
                        </td>
                        <td className={styles.tableCell}>
                          {test.score !== null ? (
                            <div className={styles.progressBar}>
                              <div className={styles.progressTrack}>
                                <div
                                  className={styles.progressFill}
                                  style={{ width: `${test.score}%` }}
                                ></div>
                              </div>
                              <span className={styles.scoreText}>
                                {test.score}/100
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className={styles.tableCell}>
                          <Link
                            href={`/coding-test/progress?id=${test.id}&fromStorage=true`}
                            className={styles.actionButton}
                          >
                            {test.status === "완료" ? (
                              <>
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                다시 풀기
                              </>
                            ) : (
                              <>
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                계속하기
                              </>
                            )}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <svg
                  className={styles.emptyStateIcon}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className={styles.emptyStateTitle}>검색 결과가 없습니다</h3>
                <p className={styles.emptyStateText}>
                  다른 검색어로 시도해보세요
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StoragePage;
