"use client"; // Convert to Client Component

import React, { useState, useEffect, Suspense, useCallback } from "react"; // Add Suspense & useCallback
import Head from "next/head"; // Head import 추가
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import { useSearchParams } from "next/navigation"; // Import useSearchParams
import { getPosts, PostSummary } from "@/api/communityApi"; // Import API function and type
import { toast } from "sonner";
// Import the detail component from its new location
import CommunityDetail from "@/components/community/CommunityDetail";

const POSTS_PAGE_SIZE = 10;

// This component will render the list view
const CommunityList: React.FC = () => {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true); // For initial load
  const [isLoadingMore, setIsLoadingMore] = useState(false); // For "load more" action
  const [error, setError] = useState<string | null>(null);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPostsData = useCallback(
    async (loadMore = false, keyForFetch?: string | null) => {
      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true); // Initial load
      }
      setError(null);

      try {
        const response = await getPosts({
          pageSize: POSTS_PAGE_SIZE,
          lastEvaluatedKey: keyForFetch,
        });

        if (loadMore) {
          setPosts((prevPosts) => [...prevPosts, ...response.items]);
        } else {
          setPosts(response.items);
        }
        setLastEvaluatedKey(response.lastEvaluatedKey);
        setHasMore(
          !!response.lastEvaluatedKey &&
            response.items.length === POSTS_PAGE_SIZE,
        );
      } catch (err) {
        console.error("Failed to fetch posts:", err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : "게시글을 불러오는데 실패했습니다.";
        setError(errorMsg);
        toast.error(errorMsg);
        if (!loadMore) {
          setPosts([]); // Clear posts on initial load error
          setHasMore(false);
        }
      } finally {
        if (loadMore) {
          setIsLoadingMore(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [],
  ); // Empty dependency array means this callback is created once

  useEffect(() => {
    fetchPostsData(false); // Initial fetch
  }, [fetchPostsData]);

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isLoading) {
      // Prevent multiple calls
      fetchPostsData(true, lastEvaluatedKey);
    }
  };

  // List rendering logic
  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-8">
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

      {isLoading && posts.length === 0 ? ( // Show spinner only on initial empty load
        <div className="text-center py-10">
          <LoadingSpinner />
          <p className="text-gray-500">게시글 목록을 불러오는 중...</p>
        </div>
      ) : error && posts.length === 0 ? ( // Show error only if no posts are loaded
        <div className="text-center py-10 px-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 font-medium">오류 발생</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      ) : !isLoading && posts.length === 0 ? ( // No posts and not loading
        <div className="text-center py-10 text-gray-500">
          게시글이 없습니다. 첫 번째 글을 작성해보세요!
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.postId}
              className="bg-white rounded border-l-4 border-l-primary border-t border-r border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
            >
              <Link
                href={{ pathname: "/community", query: { id: post.postId } }}
                className="block py-2 px-3"
              >
                <div className="flex items-center h-8">
                  <span className="bg-gray-100 text-xs font-medium text-gray-600 px-1.5 py-0.5 rounded-full whitespace-nowrap min-w-12 text-center mr-2 flex-shrink-0 my-auto">
                    {post.problemId ? "문제연관" : "자유"}
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
                      <span>{post.commentCount ?? 0}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
      {/* Load More Button */}
      {hasMore && !isLoading && posts.length > 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm disabled:opacity-50"
          >
            {isLoadingMore ? "로딩 중..." : "더 보기"}
          </button>
        </div>
      )}
      {/* Display error message again if it occurs during "load more" */}
      {error && isLoadingMore && (
        <div className="mt-4 text-center text-red-500 text-sm">
          오류: {error}
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
          <Suspense
            fallback={
              <LoadingSpinner fullScreen message="페이지를 불러오는 중..." />
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
