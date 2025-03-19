"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

// 더미 데이터를 반환하는 함수
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

interface CommunityDetailProps {
  id: string;
}
const CommunityDetail: React.FC<CommunityDetailProps> = ({ id }) => {
  // TODO: Implement API integration for fetching community post details
  const [post, setPost] = useState(getPost(id));

  useEffect(() => {
    // Keeping the dummy data for now until API is ready
    // Future implementation will fetch actual data from API
    setPost(getPost(id));

    // Commented out API call to prevent errors
    /*
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/community/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setPost(data);
                } else {
                    console.error("Failed to fetch data from lambda");
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
        */
  }, [id]);

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
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">게시글</h1>
        <Link
          href="/community"
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
        >
          뒤로가기
        </Link>
      </div>

      <article className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {post.title}
          </h2>

          <div className="flex items-center text-sm text-gray-500 mb-6">
            <span>{post.author}</span>
            <span className="mx-2 text-gray-300">•</span>
            <span>{post.createdAt}</span>
            <span className="mx-2 text-gray-300">•</span>
            <span className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1 text-red-400"
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

          <div className="text-gray-600 mb-8">
            <p>{post.content}</p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              댓글 ({post.comments.length})
            </h3>

            {post.comments.map((comment) => (
              <div
                key={comment.id}
                className="border-b border-gray-100 pb-4 mb-4 last:border-0"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">
                    {comment.author}
                  </span>
                  <span className="text-sm text-gray-500">
                    {comment.createdAt}
                  </span>
                </div>
                <p className="text-gray-600">{comment.content}</p>
              </div>
            ))}

            <form onSubmit={handleCommentSubmit} className="mt-6">
              <h4 className="text-md font-medium text-gray-900 mb-2">
                댓글 작성
              </h4>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                rows={3}
                placeholder="댓글을 입력하세요"
                value={newComment}
                onChange={handleCommentChange}
                required
              ></textarea>
              <div className="flex justify-end mt-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      </article>
    </div>
  );
};

export default CommunityDetail;
