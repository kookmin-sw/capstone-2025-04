"use client";
import React, { useState, useEffect, Suspense, useCallback, useRef } from "react"; // Import useRef
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { toast } from "sonner";
import { getPostById, updatePost, PostDetail } from "@/api/communityApi";

// Component containing form logic and state
const EditPageContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { user, authStatus } = useAuthenticator((context) => [
    context.user,
    context.authStatus,
  ]);
  const isAuthenticated = authStatus === "authenticated";
  const currentUserId = user?.userId;

  const [post, setPost] = useState<PostDetail | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Loading state for the *initial* fetch
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Ref to prevent fetching multiple times if dependencies change rapidly during init
  const isFetching = useRef(false);

  // Fetch existing post data - useCallback ensures stable function identity unless deps change
  const fetchPost = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetching.current) {
        console.log("fetchPost skipped: Already fetching.");
        return;
    }

    // Guard against running if dependencies aren't ready
    if (!id || !isAuthenticated || !currentUserId) {
      console.log(`fetchPost skipped: id=${!!id}, isAuthenticated=${isAuthenticated}, currentUserId=${!!currentUserId}`);
      // If authenticated but userId isn't available yet, don't set loading to false, wait for userId
      if (!currentUserId && isAuthenticated) {
          // Keep isLoading true until userId is available or auth fails
      } else {
         setIsLoading(false); // Set loading false if definitively cannot fetch (no id, not auth)
      }
      return;
    }

    console.log("fetchPost triggered...");
    isFetching.current = true; // Mark as fetching
    setIsLoading(true); // Set loading true for this fetch attempt
    setError(null);
    setIsAuthorized(false);

    try {
      console.log(`Fetching post with ID: ${id}`);
      const fetchedPost = await getPostById(id);
      console.log("Fetched post data:", fetchedPost);

      // Check if still mounted/relevant before setting state
      // (Although React usually handles this, it's safer in async callbacks)
      // For simplicity, we'll assume it's fine for now.

      setPost(fetchedPost);
      setTitle(fetchedPost.title);
      setContent(fetchedPost.content);

      if (fetchedPost.userId === currentUserId) {
        console.log("Authorization successful.");
        setIsAuthorized(true);
      } else {
        console.warn(`Authorization failed: Post UserID (${fetchedPost.userId}) !== Current UserID (${currentUserId})`);
        setError("이 게시글을 수정할 권한이 없습니다.");
        // toast.error("이 게시글을 수정할 권한이 없습니다."); // Toast can be annoying on load
        setIsAuthorized(false);
      }
    } catch (err) {
      console.error("Failed to fetch post for editing:", err);
      const errorMsg = err instanceof Error ? err.message : "게시글 정보를 불러오는데 실패했습니다.";
      setError(errorMsg);
      toast.error(errorMsg);
      setIsAuthorized(false);
    } finally {
      console.log("fetchPost finished.");
      isFetching.current = false; // Mark fetching as complete
      setIsLoading(false); // Reset loading state
    }
  }, [id, isAuthenticated, currentUserId]); // Dependencies for useCallback identity

  // Effect to trigger fetchPost based on changing conditions
  useEffect(() => {
    console.log(`Edit page useEffect running. ID: ${id}, AuthStatus: ${authStatus}, UserID: ${!!currentUserId}`);

    // Conditions to fetch: We have an ID, auth is confirmed, and we have the user ID.
    if (id && authStatus === 'authenticated' && currentUserId) {
      console.log("Conditions met, calling fetchPost.");
      fetchPost();
    } else if (authStatus !== 'configuring' && authStatus !== 'authenticated') {
      // If auth is resolved but not authenticated
      setError("게시글을 수정하려면 로그인이 필요합니다.");
      setIsLoading(false);
      setIsAuthorized(false);
    } else if (!id && authStatus !== 'configuring') {
      // If auth is resolved but ID is missing
      setError("게시글 ID가 URL에 없습니다.");
      setIsLoading(false);
      setIsAuthorized(false);
    } else {
        // Still configuring auth, waiting for userId, or missing ID
        console.log("Waiting for conditions to be met...");
        // Keep loading true until conditions are met or auth definitively fails
    }

  // --- CORRECTED Dependency Array ---
  // Run when the conditions for fetching *might* have changed.
  // `fetchPost` is included because its identity changes when its own dependencies change.
  }, [id, authStatus, currentUserId, fetchPost]); // REMOVED `isLoading`


  // handleSubmit remains the same
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleSubmit triggered.");

    if (isSubmitting) {
        console.warn("handleSubmit blocked: Already submitting.");
        return;
    }
    if (!isAuthenticated || !isAuthorized || !post) {
      const reason = !isAuthenticated ? "Not authenticated" : !isAuthorized ? "Not authorized" : "Post data missing";
      console.error(`handleSubmit blocked: ${reason}`);
      toast.error("수정 권한이 없거나 게시글 정보가 없습니다.");
      return;
    }
    if (!title.trim() || !content.trim()) {
      console.warn("handleSubmit blocked: Title or content empty.");
      toast.warning("제목과 내용을 모두 입력해주세요.");
      return;
    }

    console.log("Setting isSubmitting to true.");
    setIsSubmitting(true);

    try {
      console.log(`Calling updatePost for postId: ${post.postId}`);
      await updatePost(post.postId, { title, content });
      console.log("updatePost successful.");
      toast.success("게시글이 성공적으로 수정되었습니다.");
      console.log(`Attempting to navigate to /community?id=${post.postId}`);
      router.push(`/community?id=${post.postId}`);
    } catch (err) {
      console.error("Failed to update post:", err);
      toast.error( err instanceof Error ? err.message : "게시글 수정 중 오류 발생" );
      console.log("Setting isSubmitting to false in catch block.");
      setIsSubmitting(false);
    } finally {
      console.log("Setting isSubmitting to false in finally block.");
      // Might already be unmounted if navigation happens quickly,
      // but React handles setState on unmounted components gracefully (with warnings).
       if (!isFetching.current) { // Only reset if not actively fetching (safety)
            setIsSubmitting(false);
       }
    }
  };

  // handleCancel remains the same
  const handleCancel = () => {
    if (post) {
      router.push(`/community?id=${post.postId}`);
    } else {
      router.push("/community");
    }
  };

  // --- Render Logic ---

  // Render loading state FIRST (most common initial state)
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

  // THEN Render error/unauthorized state if loading is finished
  if (error || !isAuthorized) {
     const displayError = !isAuthenticated && !error ? "게시글을 수정하려면 로그인이 필요합니다." : error || "수정 권한이 없습니다.";
    return (
      <div className="max-w-6xl mx-auto p-6 sm:p-8">
        <div className="text-center py-10 px-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 font-medium">접근 불가</p>
          <p className="text-red-500 text-sm mt-1">{displayError}</p>
          <button
            onClick={handleCancel}
            className="mt-4 inline-block px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            {id ? "게시글로 돌아가기" : "목록으로 돌아가기"} {/* Use id check */}
          </button>
        </div>
      </div>
    );
  }

  // FINALLY Render form only if authorized, no error, and not loading
  return (
     <div className="max-w-6xl mx-auto p-6 sm:p-8">
       {/* Header/Cancel Button */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">게시글 수정</h1>
        <button
          onClick={handleCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition text-sm"
        >
          수정 취소
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm p-6"
      >
         {/* Title Input */}
         <div className="mb-6">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1"> 제목 </label>
          <input
            type="text" id="title" disabled={isSubmitting} required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:bg-gray-100"
            placeholder="제목을 입력하세요" value={title} onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Content Textarea */}
        <div className="mb-6">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1"> 내용 </label>
          <textarea
            id="content" rows={12} disabled={isSubmitting} required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:bg-gray-100"
            placeholder="내용을 입력하세요" value={content} onChange={(e) => setContent(e.target.value)}
          ></textarea>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button type="button" onClick={handleCancel} disabled={isSubmitting}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            취소
          </button>
          <button type="submit" disabled={isSubmitting || !title.trim() || !content.trim()}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "수정 중..." : "수정 완료"}
          </button>
        </div>
      </form>
    </div>
  );
};

// Main Page Component (No changes needed here)
const CommunityEditPage: React.FC = () => {
   return (
    <>
      <Head>
        <title>게시글 수정 | ALPACO 커뮤니티</title>
        <meta name="description" content="ALPACO 커뮤니티 게시글 수정" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
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
    </>
  );
};

export default CommunityEditPage;