"use client";
import React, { useState, useEffect, Suspense } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { fetchUserAttributes } from "aws-amplify/auth";
import { toast } from "sonner";
import { createPost } from "@/api/communityApi";
import { getSubmissionById } from "@/api/submissionApi"; // Import submission API without unused type

// New component containing all form logic and state
const CreatePageContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromTest = searchParams.get("fromTest") === "true";
  const problemIdFromQuery = searchParams.get("problemId");
  const submissionIdFromQuery = searchParams.get("submissionId");
  const problemTitleFromQuery = searchParams.get("problemTitle")
    ? decodeURIComponent(searchParams.get("problemTitle") as string)
    : "";
  const languageFromQuery = searchParams.get("language") || "plaintext";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);

  // problemId to be submitted with the post
  const [problemIdForPost, setProblemIdForPost] = useState<string | undefined>(
    undefined,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { authStatus } = useAuthenticator((context) => [context.authStatus]);
  const isAuthenticated = authStatus === "authenticated";

  useEffect(() => {
    if (fromTest && problemIdFromQuery) {
      setProblemIdForPost(problemIdFromQuery); // Set problemId for the post
    }

    if (fromTest && submissionIdFromQuery) {
      setIsLoadingSubmission(true);
      const fetchCode = async () => {
        try {
          console.log(
            `Fetching submission ${submissionIdFromQuery} for community create page`,
          );
          const submissionData = await getSubmissionById(submissionIdFromQuery);

          const problemTitleToUse =
            problemTitleFromQuery ||
            `문제 ${problemIdFromQuery?.substring(0, 8)}...`;
          setTitle(`[문제 풀이] ${problemTitleToUse}`);

          const lang =
            languageFromQuery || submissionData.language || "plaintext";
          const codeBlock = `\`\`\`${lang}\n${submissionData.userCode || "// 코드를 찾을 수 없습니다."}\n\`\`\``;
          const initialContent = `이 문제(${problemTitleToUse})에 대한 제 풀이입니다.

<details>
<summary>제출 코드 보기 (클릭하여 확장)</summary>

${codeBlock}

</details>

---
(여기에 설명을 추가하세요)
`;
          setContent(initialContent);
        } catch (error) {
          console.error("Failed to fetch submission code:", error);
          toast.error("제출 코드를 불러오는데 실패했습니다.");
          // Fallback content if code fetch fails
          const problemTitleToUse =
            problemTitleFromQuery ||
            `문제 ${problemIdFromQuery?.substring(0, 8)}...`;
          setTitle(`[문제 풀이] ${problemTitleToUse}`);
          setContent(
            `이 문제(${problemTitleToUse})에 대한 제 풀이입니다.\n\n(코드 로딩 실패)`,
          );
        } finally {
          setIsLoadingSubmission(false);
        }
      };
      fetchCode();
    } else if (fromTest && problemIdFromQuery) {
      // Only problemId and title are available, no submissionId
      const problemTitleToUse =
        problemTitleFromQuery ||
        `문제 ${problemIdFromQuery?.substring(0, 8)}...`;
      setTitle(`[문제 풀이] ${problemTitleToUse}`);
      setContent(
        `이 문제(${problemTitleToUse})에 대한 풀이입니다.\n\n(코드를 직접 붙여넣어주세요)`,
      );
    }
  }, [
    fromTest,
    problemIdFromQuery,
    submissionIdFromQuery,
    problemTitleFromQuery,
    languageFromQuery,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("게시글을 작성하려면 로그인이 필요합니다.");
      router.push("/auth/login"); // Redirect to login
      return;
    }
    if (!title.trim() || !content.trim()) {
      toast.warning("제목과 내용을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userAttributes = await fetchUserAttributes();
      const author =
        userAttributes.nickname ||
        userAttributes.preferred_username ||
        userAttributes.name ||
        "익명";

      const payload: {
        title: string;
        content: string;
        problemId?: string;
        author: string;
      } = {
        title,
        content,
        author,
      };
      if (problemIdForPost) {
        payload.problemId = problemIdForPost;
      }

      console.log("Sending payload to createPost:", payload);

      const response = await createPost(payload);
      toast.success("게시글이 성공적으로 등록되었습니다.");

      if (response && response.postId) {
        router.push(`/community?id=${response.postId}`);
      } else {
        router.push("/community");
      }
    } catch (err) {
      console.error("Failed to create post:", err);
      toast.error(
        err instanceof Error ? err.message : "게시글 등록 중 오류 발생",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/community");
  };

  if (isLoadingSubmission) {
    return (
      <div className="max-w-6xl mx-auto p-6 sm:p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500">제출 정보 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">게시글 작성</h1>
        <Link
          href="/community"
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
        >
          뒤로가기
        </Link>
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
            내용 (Markdown 지원)
          </label>
          <textarea
            id="content"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[200px] font-mono text-sm"
            rows={15}
            placeholder="내용을 입력하세요. 코드 블록은 \`\`\`언어명 ... \`\`\` 형식으로 작성할 수 있습니다."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          ></textarea>
          <p className="mt-1 text-xs text-gray-500">
            코드 블록 예시: &lt;details&gt;&lt;summary&gt;코드
            보기&lt;/summary&gt;
            <br />
            &#96;&#96;&#96;python
            <br />
            print(&quot;hello&quot;)
            <br />
            &#96;&#96;&#96;
            <br />
            &lt;/details&gt;
          </p>
        </div>
        {/* Removed language selection and "include code" checkbox as it's now part of the content */}

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
            {isSubmitting ? "등록 중..." : "게시글 등록"}
          </button>
        </div>
      </form>
    </div>
  );
};

// Main page component wrapping the content in Suspense
const CommunityCreatePage: React.FC = () => {
  return (
    <>
      <Head>
        <title>게시글 작성 | ALPACO 커뮤니티</title>
        <meta name="description" content="ALPACO 커뮤니티 게시글 작성" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />

        <main className="flex-grow">
          <Suspense fallback={<div>Loading page content...</div>}>
            <CreatePageContent />
          </Suspense>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CommunityCreatePage;
