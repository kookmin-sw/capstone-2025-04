import React from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

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
        <div className="max-w-5xl mx-auto p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">
              커뮤니티
            </h1>
            <div className="flex space-x-2">
              <Link
                href="/"
                className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition text-sm"
              >
                뒤로가기
              </Link>
              <Link
                href="/community/create"
                className="px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary-hover transition text-sm"
              >
                글 작성하기
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded border-l-4 border-l-primary border-t border-r border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
              >
                <Link
                  href={`/community/${post.id}`}
                  className="block py-2 px-3"
                >
                  <div className="flex items-center h-8">
                    <span className="bg-gray-100 text-xs font-medium text-gray-600 px-1.5 py-0.5 rounded-full whitespace-nowrap min-w-12 text-center mr-2 flex-shrink-0 my-auto">
                      알고리즘
                    </span>
                    <h2 className="text-base font-medium text-gray-900 hover:text-primary transition-colors line-clamp-1 mr-2 flex-grow my-auto">
                      {post.title}
                    </h2>
                    <div className="flex items-center text-xs text-gray-500 whitespace-nowrap flex-shrink-0 my-auto">
                      <span className="text-xs truncate max-w-[60px]">
                        {post.author}
                      </span>
                      <span className="mx-1 text-gray-300">•</span>
                      <span className="text-xs hidden sm:inline">
                        {post.createdAt}
                      </span>
                      <span className="text-xs inline sm:hidden">
                        {post.createdAt.split("-")[2]}
                      </span>
                      <span className="mx-1 text-gray-300">•</span>
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 mr-0.5 text-red-400"
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
                      <span className="mx-1 text-gray-300">•</span>
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 mr-0.5 text-blue-400"
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
