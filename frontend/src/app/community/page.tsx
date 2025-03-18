import React from "react";
import Head from "next/head";
import Header from "../../components/header";
import Footer from "../../components/Footer";
import Link from "next/link";
import styles from "../../styles/community.module.css";

// 가상의 커뮤니티 포스트 데이터
const posts = [
  {
    id: 1,
    title: "다이나믹 프로그래밍 문제 풀이 공유",
    author: "코딩마스터",
    createdAt: "2023-04-15",
    likes: 24,
    comments: 8,
  },
  {
    id: 2,
    title: "그래프 알고리즘 학습 팁",
    author: "알고왕",
    createdAt: "2023-04-14",
    likes: 18,
    comments: 12,
  },
  {
    id: 3,
    title: "코딩 테스트 준비 방법 공유",
    author: "취준생",
    createdAt: "2023-04-10",
    likes: 45,
    comments: 15,
  },
];

const CommunityPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>커뮤니티 | ALPACO</title>
        <meta name="description" content="ALPACO 커뮤니티 페이지" />
      </Head>

      <Header />

      <main className="flex-grow">
        <div className={styles.communityContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>커뮤니티</h1>
            <div className={styles.buttonContainer}>
              <Link href="/" className={styles.backButton}>
                뒤로가기
              </Link>
              <Link href="/community/create" className={styles.createButton}>
                글 작성하기
              </Link>
            </div>
          </div>

          <div className={styles.postList}>
            {posts.map((post) => (
              <div key={post.id} className={styles.postItem}>
                <Link
                  href={`/community/${post.id}`}
                  className="block hover:bg-gray-50 -m-6 p-6 transition-colors"
                >
                  <h2 className={styles.postTitle}>{post.title}</h2>
                  <div className={styles.postMeta}>
                    <span>{post.author}</span>
                    <span className={styles.postMetaDot}>•</span>
                    <span>{post.createdAt}</span>
                  </div>
                  <div className={styles.postStats}>
                    <div className={styles.statItem}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{post.likes}</span>
                    </div>
                    <div className={styles.statItem}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{post.comments}</span>
                    </div>
                  </div>
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

export default CommunityPage;
