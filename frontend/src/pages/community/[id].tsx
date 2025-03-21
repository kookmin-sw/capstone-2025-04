import React, { useState } from "react";
import Head from "next/head";
import Header from "../../components/header";
import Footer from "../../components/Footer";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../styles/community.module.css";

// 가상의 커뮤니티 포스트 상세 데이터
const getPost = (id: string | string[] | undefined) => ({
  id: Number(id) || 1,
  title: "다이나믹 프로그래밍 문제 풀이 공유",
  content:
    "최근에 풀었던 다이나믹 프로그래밍 문제에 대한 해결 방법을 공유합니다. 이 문제는 처음에는 어려워 보였지만, 부분 문제로 나누어 생각하니 쉽게 풀 수 있었습니다...",
  author: "코딩마스터",
  createdAt: "2023-04-15",
  likes: 24,
  comments: [
    {
      id: 1,
      author: "알고왕",
      content: "아주 좋은 풀이네요! 저도 이 방법으로 풀어봐야겠습니다.",
      createdAt: "2023-04-16",
    },
    {
      id: 2,
      author: "취준생",
      content: "설명이 정말 깔끔합니다. 도움이 많이 됐어요.",
      createdAt: "2023-04-17",
    },
  ],
});

const CommunityDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const post = getPost(id);
  const [newComment, setNewComment] = useState("");

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 댓글 제출 로직 구현
    alert("댓글이 등록되었습니다.");
    setNewComment("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>{post.title} | ALPACO 커뮤니티</title>
        <meta name="description" content={`ALPACO 커뮤니티 - ${post.title}`} />
      </Head>

      <Header />

      <main className="flex-grow">
        <div className={styles.communityContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>게시글</h1>
            <Link href="/community" className={styles.backButton}>
              뒤로가기
            </Link>
          </div>

          <article className={styles.postDetailContainer}>
            <h2 className={styles.postDetailTitle}>{post.title}</h2>

            <div className={styles.postDetailMeta}>
              <span>{post.author}</span>
              <span className={styles.postMetaDot}>•</span>
              <span>{post.createdAt}</span>
              <span className={styles.postMetaDot}>•</span>
              <span className={styles.statItem}>
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
              </span>
            </div>

            <div className={styles.postContent}>
              <p>{post.content}</p>
            </div>

            <div className={styles.commentSection}>
              <h3 className={styles.commentHeader}>
                댓글 ({post.comments.length})
              </h3>

              {post.comments.map((comment) => (
                <div key={comment.id} className={styles.commentItem}>
                  <div className={styles.commentMeta}>
                    <span className={styles.commentAuthor}>
                      {comment.author}
                    </span>
                    <span className={styles.commentDate}>
                      {comment.createdAt}
                    </span>
                  </div>
                  <p className={styles.commentContent}>{comment.content}</p>
                </div>
              ))}

              <form
                onSubmit={handleCommentSubmit}
                className={styles.commentForm}
              >
                <h4 className={styles.commentFormTitle}>댓글 작성</h4>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  placeholder="댓글을 입력하세요"
                  value={newComment}
                  onChange={handleCommentChange}
                  required
                ></textarea>
                <div className="flex justify-end mt-2">
                  <button type="submit" className={styles.submitButton}>
                    등록하기
                  </button>
                </div>
              </form>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CommunityDetailPage;
