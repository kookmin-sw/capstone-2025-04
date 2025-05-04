"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useRouter } from "next/navigation";
// Assuming sonner is installed: npm install sonner
// You'll need to add <Toaster /> in your layout.tsx or a parent component.
import { toast } from "sonner";
import {
  getPostById,
  getComments,
  likePost,
  createComment,
  deletePost,
  deleteComment,
  PostDetail,
  Comment,
} from "@/api/communityApi"; // Import API functions and types
// Remove dummy data function

interface CommunityDetailProps {
  id: string;
}
const CommunityDetail: React.FC<CommunityDetailProps> = ({ id }) => {
  const router = useRouter();
  const { user, authStatus } = useAuthenticator((context) => [
    context.user,
    context.authStatus,
  ]);
  const isAuthenticated = authStatus === "authenticated";
  console.log("user:", user);
  const currentUserId = user?.userId; // Or use signInDetails?.loginId depending on config

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [errorPost, setErrorPost] = useState<string | null>(null);
  const [errorComments, setErrorComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null
  ); // Track which comment is being deleted

  // Fetch post and comments data
  const fetchData = useCallback(async () => {
    setIsLoadingPost(true);
    setIsLoadingComments(true);
    setErrorPost(null);
    setErrorComments(null);

    try {
      const postPromise = getPostById(id);
      const commentsPromise = getComments(id);

      const [postResult, commentsResult] = await Promise.allSettled([
        postPromise,
        commentsPromise,
      ]);

      // Handle Post Result
      if (postResult.status === "fulfilled") {
        setPost(postResult.value);
        setLikeCount(postResult.value.likesCount ?? 0);
        // Check if current user liked this post
        setIsLiked(
          !!currentUserId &&
            postResult.value.likedUsers?.includes(currentUserId)
        );
      } else {
        console.error("Failed to fetch post:", postResult.reason);
        setErrorPost(
          postResult.reason instanceof Error
            ? postResult.reason.message
            : "게시글 정보를 불러오는데 실패했습니다."
        );
        toast.error(errorPost || "게시글 정보를 불러오는데 실패했습니다.");
      }

      // Handle Comments Result
      if (commentsResult.status === "fulfilled") {
        setComments(commentsResult.value.comments);
        setCommentCount(commentsResult.value.commentCount);
      } else {
        console.error("Failed to fetch comments:", commentsResult.reason);
        setErrorComments(
          commentsResult.reason instanceof Error
            ? commentsResult.reason.message
            : "댓글을 불러오는데 실패했습니다."
        );
        toast.error(errorComments || "댓글을 불러오는데 실패했습니다.");
      }
    } catch (err) {
      // Catch any unexpected error during Promise.allSettled or setup
      console.error("Unexpected error fetching data:", err);
      const errorMsg =
        err instanceof Error ? err.message : "데이터 로딩 중 오류 발생";
      setErrorPost(errorMsg); // Show a general error if setup fails
      setErrorComments(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingPost(false);
      setIsLoadingComments(false);
    }
  }, [id, currentUserId, errorPost, errorComments]); // Add dependencies

  useEffect(() => {
    if (id) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Run effect when id changes

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
  };

  // Handle Comment Submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("댓글을 작성하려면 로그인이 필요합니다.");
      // Optionally redirect to login: router.push('/auth/login');
      return;
    }
    if (!newComment.trim()) {
      toast.warning("댓글 내용을 입력해주세요.");
      return;
    }

    setIsSubmittingComment(true);
    try {
      await createComment(id, { content: newComment });
      toast.success("댓글이 성공적으로 등록되었습니다.");
      setNewComment(""); // Clear input
      // Refetch comments to show the new one
      const updatedCommentsData = await getComments(id);
      setComments(updatedCommentsData.comments);
      setCommentCount(updatedCommentsData.commentCount);
    } catch (err) {
      console.error("Failed to submit comment:", err);
      toast.error(
        err instanceof Error ? err.message : "댓글 등록 중 오류가 발생했습니다."
      );
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle Like Toggle
  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error("좋아요를 누르려면 로그인이 필요합니다.");
      return;
    }
    if (!post) return;

    setIsLiking(true);
    try {
      const response = await likePost(post.postId);
      setIsLiked(response.isLiked);
      setLikeCount(response.likesCount);
      toast.success(response.message);
    } catch (err) {
      console.error("Failed to toggle like:", err);
      toast.error(
        err instanceof Error ? err.message : "좋아요 처리 중 오류 발생"
      );
    } finally {
      setIsLiking(false);
    }
  };

  // Handle Post Deletion
  const handleDeletePost = async () => {
    if (!isAuthenticated || !post || post.userId !== currentUserId) {
      toast.error("게시글을 삭제할 권한이 없습니다.");
      return;
    }

    if (window.confirm("정말로 이 게시글과 모든 댓글을 삭제하시겠습니까?")) {
      setIsDeletingPost(true);
      try {
        await deletePost(post.postId);
        toast.success("게시글이 성공적으로 삭제되었습니다.");
        router.push("/community"); // Navigate back to list
      } catch (err) {
        console.error("Failed to delete post:", err);
        toast.error(
          err instanceof Error ? err.message : "게시글 삭제 중 오류 발생"
        );
      } finally {
        setIsDeletingPost(false);
      }
    }
  };

  // Handle Comment Deletion
  const handleDeleteComment = async (commentId: string) => {
    // Find the comment to check author - requires comments to be loaded
    const commentToDelete = comments.find((c) => c.commentId === commentId);
    if (
      !isAuthenticated ||
      !commentToDelete ||
      commentToDelete.userId !== currentUserId
    ) {
      toast.error("댓글을 삭제할 권한이 없습니다.");
      return;
    }

    if (window.confirm("정말로 이 댓글을 삭제하시겠습니까?")) {
      setDeletingCommentId(commentId); // Indicate which comment is being deleted
      try {
        await deleteComment(id, commentId);
        toast.success("댓글이 성공적으로 삭제되었습니다.");
        // Refetch comments or filter locally
        setComments((prevComments) =>
          prevComments.filter((comment) => comment.commentId !== commentId)
        );
        setCommentCount((prev) => prev - 1); // Decrement count
      } catch (err) {
        console.error("Failed to delete comment:", err);
        toast.error(
          err instanceof Error ? err.message : "댓글 삭제 중 오류 발생"
        );
      } finally {
        setDeletingCommentId(null); // Reset deleting indicator
      }
    }
  };

  // --- Render Logic ---

  if (isLoadingPost) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (errorPost) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="text-center py-10 px-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 font-medium">오류 발생</p>
          <p className="text-red-500 text-sm mt-1">{errorPost}</p>
          <Link
            href="/community"
            className="mt-4 inline-block px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center text-gray-500">
        게시글을 찾을 수 없습니다.
      </div>
    );
  }

  const isAuthor = isAuthenticated && post.userId === currentUserId;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">게시글</h1>
        {/* Update Back link to always go to the list view */}
        <Link
          href="/community"
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition text-sm"
        >
          목록으로
        </Link>
      </div>

      <article className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex-grow mr-4">
              {post.title}
            </h2>
            {/* Edit/Delete Buttons for Author */}
            {isAuthor && (
              <div className="flex space-x-2 flex-shrink-0">
                {/* Update Edit link to use query parameter */}
                <Link
                  href={{
                    pathname: "/community/edit",
                    query: { id: post.postId },
                  }} // Use object href
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
                >
                  수정
                </Link>
                <button
                  onClick={handleDeletePost}
                  disabled={isDeletingPost}
                  className="px-3 py-1 text-sm border border-red-300 rounded-md text-red-600 bg-white hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingPost ? "삭제 중..." : "삭제"}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center text-sm text-gray-500 mb-6">
            <span>{post.author}</span>
            <span className="mx-2 text-gray-300">•</span>
            <span>{new Date(post.createdAt).toLocaleString()}</span>
            {post.updatedAt && (
              <>
                <span className="mx-2 text-gray-300">•</span>
                <span className="text-xs italic">
                  (수정됨: {new Date(post.updatedAt).toLocaleString()})
                </span>
              </>
            )}
            <span className="mx-2 text-gray-300">•</span>
            {/* Like Button */}
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center p-1 rounded hover:bg-red-50 transition disabled:opacity-50 ${
                isLiked ? "text-red-500" : "text-gray-400 hover:text-red-400"
              }`}
              aria-label={isLiked ? "Unlike post" : "Like post"}
            >
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
              <span>{likeCount}</span>
            </button>
          </div>

          {/* Post Content */}
          <div
            className="prose prose-sm max-w-none text-gray-700 mb-8" // Using prose for potential markdown later
          >
            {/* Render content safely. If it's markdown, use a library like react-markdown */}
            <p className="whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* Comments Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              댓글 ({commentCount})
            </h3>

            {isLoadingComments ? (
              <div className="text-center py-4 text-gray-500">
                댓글 로딩 중...
              </div>
            ) : errorComments ? (
              <div className="text-center py-4 text-red-500">
                {errorComments}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                아직 댓글이 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.commentId}
                    className="border-b border-gray-100 pb-4 last:border-0"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium text-gray-900 text-sm">
                          {comment.author}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {/* Delete Button for Comment Author */}
                      {isAuthenticated &&
                        comment.userId === currentUserId && (
                          <button
                            onClick={() =>
                              handleDeleteComment(comment.commentId)
                            }
                            disabled={deletingCommentId === comment.commentId}
                            className="text-xs text-red-500 hover:text-red-700 transition disabled:opacity-50"
                            aria-label="Delete comment"
                          >
                            {deletingCommentId === comment.commentId
                              ? "삭제중..."
                              : "삭제"}
                          </button>
                        )}
                    </div>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Comment Form */}
            {isAuthenticated ? (
              <form onSubmit={handleCommentSubmit} className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">
                  댓글 작성
                </h4>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                  rows={3}
                  placeholder="댓글을 입력하세요..."
                  value={newComment}
                  onChange={handleCommentChange}
                  disabled={isSubmittingComment}
                  required
                ></textarea>
                <div className="flex justify-end mt-3">
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newComment.trim()}
                    className="px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingComment ? "등록 중..." : "댓글 등록"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 text-center p-4 bg-gray-50 rounded-md border">
                <p className="text-sm text-gray-600">
                  댓글을 작성하려면{" "}
                  <Link
                    href="/auth/login"
                    className="text-primary hover:underline font-medium"
                  >
                    로그인
                  </Link>
                  이 필요합니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
};

export default CommunityDetail;
