"use client"; // Convert to Client Component

import React, { useState, useEffect, Suspense } from "react"; // Add Suspense
import Head from "next/head"; // Head import 추가
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useSearchParams } from "next/navigation"; // Import useSearchParams
import { getPosts, PostSummary } from "@/api/communityApi"; // Import API function and type
// Import the detail component from its new location
import CommunityDetail from "@/components/community/CommunityDetail";

// Metadata export 제거됨
// export const metadata: Metadata = {
//   title: "커뮤니티 | ALPACO",
//   description: "ALPACO 커뮤니티 페이지",
// };

// Remove static dummy data

// This component will render the list view
const CommunityList: React.FC = () => {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedPosts = await getPosts();
        setPosts(fetchedPosts);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : "게시글을 불러오는데 실패했습니다.";
        setError(errorMsg);
        // TODO: toast.error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // List rendering logic (extracted from the original return statement)
  return (
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

      {isLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">게시글 목록을 불러오는 중...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 px-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 font-medium">오류 발생</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          게시글이 없습니다. 첫 번째 글을 작성해보세요!
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.postId} // Use postId from API
              className="bg-white rounded border-l-4 border-l-primary border-t border-r border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
            >
              <Link
                href={{ pathname: "/community", query: { id: post.postId } }} // Use object href
                className="block py-2 px-3"
              >
                <div className="flex items-center h-8">
                  {/* TODO: Add category/tag if available from API */}
                  <span className="bg-gray-100 text-xs font-medium text-gray-600 px-1.5 py-0.5 rounded-full whitespace-nowrap min-w-12 text-center mr-2 flex-shrink-0 my-auto">
                    {post.job_id ? "문제연관" : "자유"}{" "}
                    {/* Example based on job_id */}
                  </span>
                  <h2 className="text-base font-medium text-gray-900 hover:text-primary transition-colors line-clamp-1 mr-2 flex-grow my-auto">
                    {post.title}
                  </h2>
                  <div className="flex items-center text-xs text-gray-500 whitespace-nowrap flex-shrink-0 my-auto">
                    <span className="text-xs truncate max-w-[60px]">
                      {post.author}
                    </span>
                    <span className="mx-1 text-gray-300">•</span>
                    {/* Display date simply for now, consider formatting library later */}
                    <span className="text-xs hidden sm:inline">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs inline sm:hidden">
                      {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                      })}
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
                      {/* Use likesCount from API */}
                      <span>{post.likesCount ?? 0}</span>
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
                      {/* Use commentCount from API */}
                      <span>{post.commentCount ?? 0}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// This component reads the search params and decides whether to show list or detail
const CommunityContent: React.FC = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (id) {
    // If ID exists in query params, show the detail view
    return <CommunityDetail id={id} />;
  } else {
    // Otherwise, show the list view
    return <CommunityList />;
  }
};

// Main page component wraps the content in Suspense
const CommunityPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>커뮤니티 | ALPACO</title>
        <meta name="description" content="ALPACO 커뮤니티 페이지" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />

        <main className="flex-grow">
          {/* Wrap the content that uses useSearchParams in Suspense */}
          <Suspense
            fallback={
              <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            }
          >
            <CommunityContent />
          </Suspense>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CommunityPage;
