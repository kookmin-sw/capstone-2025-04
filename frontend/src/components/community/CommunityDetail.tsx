"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter'; // Use AsyncLight for smaller bundle
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Choose a style
import {
  getPostById,
  getComments,
  likePost,
  createComment,
  deletePost,
  deleteComment,
  PostDetail,
  Comment,
} from "@/api/communityApi";
import { fetchUserAttributes } from "aws-amplify/auth";

// Register languages you expect to use (optional, but good for bundle size if you know them)
// SyntaxHighlighter.registerLanguage('javascript', require('react-syntax-highlighter/dist/esm/languages/prism/javascript'));
// SyntaxHighlighter.registerLanguage('python', require('react-syntax-highlighter/dist/esm/languages/prism/python'));
// SyntaxHighlighter.registerLanguage('java', require('react-syntax-highlighter/dist/esm/languages/prism/java'));
// SyntaxHighlighter.registerLanguage('cpp', require('react-syntax-highlighter/dist/esm/languages/prism/cpp'));
// SyntaxHighlighter.registerLanguage('bash', require('react-syntax-highlighter/dist/esm/languages/prism/bash'));
// SyntaxHighlighter.registerLanguage('markdown', require('react-syntax-highlighter/dist/esm/languages/prism/markdown'));


interface CommunityDetailProps {
  id: string;
}

const COMMENTS_PAGE_SIZE = 5;

const CommunityDetail: React.FC<CommunityDetailProps> = ({ id }) => {
  const router = useRouter();
  const { user, authStatus } = useAuthenticator((context) => [
    context.user,
    context.authStatus,
  ]);
  const isAuthenticated = authStatus === "authenticated";
  const currentUserId = user?.userId;

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [errorPost, setErrorPost] = useState<string | null>(null);
  const [errorComments, setErrorComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );

  const [commentsLastEvaluatedKey, setCommentsLastEvaluatedKey] = useState<
    string | null
  >(null);
  const [hasMoreComments, setHasMoreComments] = useState(true);

  const fetchPostData = useCallback(async () => {
    setIsLoadingPost(true);
    setErrorPost(null);
    try {
      const postResult = await getPostById(id);
      setPost(postResult);
      setLikeCount(postResult.likesCount ?? 0);
      setIsLiked(
        !!currentUserId && !!postResult.likedUsers?.includes(currentUserId),
      );
    } catch (err) {
      console.error("Failed to fetch post:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "게시글 정보를 불러오는데 실패했습니다.";
      setErrorPost(msg);
      toast.error(msg);
    } finally {
      setIsLoadingPost(false);
    }
  }, [id, currentUserId]);

  const fetchPaginatedComments = useCallback(
    async (loadMore = false, keyForFetch?: string | null) => {
      if (loadMore) {
        setIsLoadingMoreComments(true);
      } else {
        setIsLoadingComments(true);
        setComments([]);
      }
      setErrorComments(null);

      try {
        const response = await getComments(id, {
          pageSize: COMMENTS_PAGE_SIZE,
          lastEvaluatedKey: keyForFetch,
        });

        if (loadMore) {
          setComments((prevComments) => [
            ...prevComments,
            ...response.comments,
          ]);
        } else {
          setComments(response.comments);
        }
        setCommentsLastEvaluatedKey(response.lastEvaluatedKey);
        setHasMoreComments(
          !!response.lastEvaluatedKey &&
            response.comments.length === COMMENTS_PAGE_SIZE,
        );
      } catch (err) {
        console.error("Failed to fetch comments:", err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : "댓글을 불러오는데 실패했습니다.";
        setErrorComments(errorMsg);
        toast.error(errorMsg);
        if (!loadMore) {
          setComments([]);
          setHasMoreComments(false);
        }
      } finally {
        if (loadMore) {
          setIsLoadingMoreComments(false);
        } else {
          setIsLoadingComments(false);
        }
      }
    },
    [id],
  );

  useEffect(() => {
    if (id) {
      fetchPostData();
      fetchPaginatedComments(false);
    }
  }, [id, fetchPostData, fetchPaginatedComments]);

  const handleLoadMoreComments = () => {
    if (hasMoreComments && !isLoadingMoreComments && !isLoadingComments) {
      fetchPaginatedComments(true, commentsLastEvaluatedKey);
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("댓글을 작성하려면 로그인이 필요합니다.");
      router.push("/auth/login");
      return;
    }
    if (!newComment.trim()) {
      toast.warning("댓글 내용을 입력해주세요.");
      return;
    }

    setIsSubmittingComment(true);
    try {
      const userAttributes = await fetchUserAttributes();
      const author =
        userAttributes.nickname ||
        userAttributes.preferred_username ||
        userAttributes.name ||
        "익명";
      await createComment(id, { content: newComment, author });
      toast.success("댓글이 성공적으로 등록되었습니다.");
      setNewComment("");
      fetchPaginatedComments(false);
      fetchPostData();
    } catch (err) {
      console.error("Failed to submit comment:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "댓글 등록 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error("좋아요를 누르려면 로그인이 필요합니다.");
      router.push("/auth/login");
      return;
    }
    if (!post || !currentUserId) {
      toast.error(
        "사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.",
      );
      return;
    }

    setIsLiking(true);
    try {
      const response = await likePost(post.postId);
      setIsLiked(response.isLiked);
      setLikeCount(response.likesCount);
      setPost((prevPost) =>
        prevPost
          ? {
              ...prevPost,
              likesCount: response.likesCount,
              likedUsers: response.likedUsers,
            }
          : null,
      );
      toast.success(response.message);
    } catch (err) {
      console.error("Failed to toggle like:", err);
      toast.error(
        err instanceof Error ? err.message : "좋아요 처리 중 오류 발생",
      );
    } finally {
      setIsLiking(false);
    }
  };

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
        router.push("/community");
      } catch (err) {
        console.error("Failed to delete post:", err);
        toast.error(
          err instanceof Error ? err.message : "게시글 삭제 중 오류 발생",
        );
      } finally {
        setIsDeletingPost(false);
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
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
      setDeletingCommentId(commentId);
      try {
        await deleteComment(id, commentId);
        toast.success("댓글이 성공적으로 삭제되었습니다.");
        fetchPaginatedComments(false);
        fetchPostData();
      } catch (err) {
        console.error("Failed to delete comment:", err);
        toast.error(
          err instanceof Error ? err.message : "댓글 삭제 중 오류 발생",
        );
      } finally {
        setDeletingCommentId(null);
      }
    }
  };

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

  const markdownComponents = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeText = String(children).replace(/\n$/, '');
      if (!inline && match) {
        return (
          <SyntaxHighlighter
            style={oneLight} // Or oneLight, or any other theme
            language={match[1]}
            PreTag="div"
            {...props}
            className="rounded-md border bg-gray-50 text-sm my-2" // Custom class for the container
            customStyle={{ margin: '0', padding: '0.75rem' }} // Override default margin/padding
            codeTagProps={{ style: { fontFamily: 'var(--font-mono)', fontSize: '0.875rem' } }} // Style for the inner <code>
          >
            {codeText}
          </SyntaxHighlighter>
        );
      }
      return (
        <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded-sm text-sm mx-0.5" {...props}>
          {children}
        </code>
      );
    },
    // Optional: customize other elements if needed by prose
    h1: ({ ...props }) => <h1 className="text-2xl font-bold my-4" {...props} />,
    h2: ({ ...props }) => <h2 className="text-xl font-semibold my-3" {...props} />,
    h3: ({ ...props }) => <h3 className="text-lg font-semibold my-2" {...props} />,
    p: ({ ...props }) => <p className="my-2 leading-relaxed" {...props} />,
    ul: ({ ...props }) => <ul className="list-disc pl-5 my-2" {...props} />,
    ol: ({ ...props }) => <ol className="list-decimal pl-5 my-2" {...props} />,
    li: ({ ...props }) => <li className="my-1" {...props} />,
    blockquote: ({ ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-600" {...props} />,
    table: ({ ...props }) => <table className="min-w-full border-collapse border border-gray-300 my-3" {...props} />,
    th: ({ ...props }) => <th className="border border-gray-300 px-3 py-1.5 bg-gray-100 text-left font-medium" {...props} />,
    td: ({ ...props }) => <td className="border border-gray-300 px-3 py-1.5" {...props} />,
    a: ({ ...props }) => <a className="text-primary hover:underline" {...props} />,
    details: ({ ...props }) => <details className="border border-gray-200 rounded-md my-2 p-2" {...props} />,
    summary: ({ ...props }) => <summary className="font-medium cursor-pointer py-1" {...props} />,
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">게시글</h1>
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
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex-grow mr-4">
                {post.title}
              </h2>
              {post.problemId && (
                <Link
                  href={`/coding-test/solve?id=${post.problemId}`}
                  className="text-sm text-primary hover:underline mt-1 inline-block"
                >
                  [연관 문제 보기: {post.problemId.substring(0, 8)}...]
                </Link>
              )}
            </div>
            {isAuthor && (
              <div className="flex space-x-2 flex-shrink-0">
                <Link
                  href={{
                    pathname: "/community/edit",
                    query: { id: post.postId },
                  }}
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
            {post.updatedAt &&
              post.updatedAt !== post.createdAt && (
                <>
                  <span className="mx-2 text-gray-300">•</span>
                  <span className="text-xs italic">
                    (수정됨: {new Date(post.updatedAt).toLocaleString()})
                  </span>
                </>
              )}
            <span className="mx-2 text-gray-300">•</span>
            <button
              onClick={handleLike}
              disabled={isLiking || !currentUserId}
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

          <div className="text-gray-700 mb-8"> 
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={markdownComponents}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              댓글 ({post.commentCount !== undefined ? post.commentCount : 0})
            </h3>

            {isLoadingComments && comments.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                댓글 로딩 중...
              </div>
            ) : errorComments && comments.length === 0 ? (
              <div className="text-center py-4 text-red-500">
                {errorComments}
              </div>
            ) : !isLoadingComments &&
              comments.length === 0 &&
              post.commentCount === 0 ? (
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
                      {isAuthenticated && comment.userId === currentUserId && (
                        <button
                          onClick={() => handleDeleteComment(comment.commentId)}
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

            {hasMoreComments && !isLoadingComments && comments.length > 0 && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleLoadMoreComments}
                  disabled={isLoadingMoreComments}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition text-sm disabled:opacity-50"
                >
                  {isLoadingMoreComments ? "댓글 로딩 중..." : "댓글 더 보기"}
                </button>
              </div>
            )}
            {errorComments && isLoadingMoreComments && (
              <div className="mt-4 text-center text-red-500 text-sm">
                오류: {errorComments}
              </div>
            )}

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