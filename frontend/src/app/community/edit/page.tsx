"use client";
import React, { useState, useEffect, Suspense, useCallback } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
// import Link from "next/link"; // Removed unused import
import { useRouter, useSearchParams } from "next/navigation"; // Use useSearchParams instead
import { useAuthenticator } from "@aws-amplify/ui-react";
import { toast } from "sonner";
import { getPostById, updatePost, PostDetail } from "@/api/communityApi";
// import CodeEditor from "@/components/CodeEditor"; // Add if code editing is needed

// Component containing form logic and state
const EditPageContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id"); // Get postId from query parameter ?id=

  const { user, authStatus } = useAuthenticator((context) => [
    context.user,
    context.authStatus,
  ]);
  const isAuthenticated = authStatus === "authenticated";
  const currentUsername = user?.username;

  const [post, setPost] = useState<PostDetail | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false); // Track authorization

  // Fetch existing post data
  const fetchPost = useCallback(async () => {
    if (!id) {
      // Handle case where ID is missing from URL query
      setError("게시글 ID가 URL에 없습니다.");
      toast.error("게시글 ID가 URL에 없습니다.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setIsAuthorized(false); // Reset authorization state

    try {
      const fetchedPost = await getPostById(id);
      setPost(fetchedPost);
      setTitle(fetchedPost.title);
      setContent(fetchedPost.content);

      // Authorization check
      if (isAuthenticated && fetchedPost.author === currentUsername) {
        setIsAuthorized(true);
      } else {
        setError("이 게시글을 수정할 권한이 없습니다.");
        toast.error("이 게시글을 수정할 권한이 없습니다.");
        // Optionally redirect after a delay or immediately
        // router.push(`/community/${id}`);
      }
    } catch (err) {
      console.error("Failed to fetch post for editing:", err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : "게시글 정보를 불러오는데 실패했습니다.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [id, isAuthenticated, currentUsername]); // Removed fetchPost from dependency array

  useEffect(() => {
    if (isAuthenticated) {
      // Only fetch if authenticated
      fetchPost();
    } else {
      setIsLoading(false);
      setError("게시글을 수정하려면 로그인이 필요합니다.");
      toast.error("게시글을 수정하려면 로그인이 필요합니다.");
      // router.push('/auth/login'); // Redirect to login
    }
  }, [id, isAuthenticated, fetchPost]); // Rerun if auth state or id changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || !post) {
      toast.error("수정 권한이 없거나 게시글 정보가 없습니다.");
      return;
    }
    if (!title.trim() || !content.trim()) {
      toast.warning("제목과 내용을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePost(post.postId, { title, content });
      toast.success("게시글이 성공적으로 수정되었습니다.");
      router.push(`/community?id=${post.postId}`); // Use query parameter
    } catch (err) {
      console.error("Failed to update post:", err);
      toast.error(
        err instanceof Error ? err.message : "게시글 수정 중 오류 발생"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (post) {
      router.push(`/community?id=${post.postId}`); // Use query parameter
    } else {
      router.push("/community"); // Fallback if post ID isn't available
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">게시글 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  // Render error/unauthorized state
  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="text-center py-10 px-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 font-medium">오류</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={handleCancel}
            className="mt-4 inline-block px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            {post ? "게시글로 돌아가기" : "목록으로 돌아가기"}
          </button>
        </div>
      </div>
    );
  }

  // Render form only if authorized
  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">게시글 수정</h1>
        <button
          onClick={handleCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition text-sm"
        >
          수정 취소
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <div className="mb-6">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            제목
          </label>
          <input
            type="text"
            id="title"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="content"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            내용
          </label>
          <textarea
            id="content"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            rows={12} // Increased rows for editing
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          ></textarea>
        </div>

        {/* Add CodeEditor section here if needed, similar to create page */}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "수정 중..." : "수정 완료"}
          </button>
        </div>
      </form>
    </div>
  );
};

// Main page component wrapping the content in Suspense
const CommunityEditPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>게시글 수정 | ALPACO 커뮤니티</title>
        <meta name="description" content="ALPACO 커뮤니티 게시글 수정" />
      </Head>

      <Header />

      <main className="flex-grow">
        {/* Use Suspense if EditPageContent uses useSearchParams, otherwise not strictly needed here */}
        {/* For simplicity, keeping Suspense wrapper */}
        <Suspense
          fallback={
            <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          }
        >
          <EditPageContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
};

export default CommunityEditPage;
