"use client";
import React, { Suspense, useState, useEffect } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SubmissionSummary, getSubmissionById } from "@/api/submissionApi";
import { getProblemById, ProblemDetail } from "@/api/problemApi";

// submissions/page.tsx 에서 가져온 유틸리티 함수
const getStatusClass = (status: SubmissionSummary["status"] | undefined) => {
  if (!status) return "bg-gray-100 text-gray-800";
  switch (status) {
    case "ACCEPTED":
      return "bg-green-100 text-green-800";
    case "WRONG_ANSWER":
      return "bg-red-100 text-red-800";
    case "TIME_LIMIT_EXCEEDED":
      return "bg-yellow-100 text-yellow-800";
    case "RUNTIME_ERROR":
      return "bg-purple-100 text-purple-800";
    case "INTERNAL_ERROR":
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusKorean = (
  status: SubmissionSummary["status"] | undefined,
): string => {
  if (!status) return "정보 없음";
  const map = {
    ACCEPTED: "정답",
    WRONG_ANSWER: "오답",
    TIME_LIMIT_EXCEEDED: "시간 초과",
    RUNTIME_ERROR: "런타임 오류",
    INTERNAL_ERROR: "내부 오류",
  };
  return map[status] || "알 수 없음";
};

// Extract the content that uses useSearchParams into its own component
const CodingTestResultContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const problemId = searchParams.get("id");
  const submissionId = searchParams.get("submissionId");

  const [isLoadingProblem, setIsLoadingProblem] = useState(true);
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(true);
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [submission, setSubmission] = useState<SubmissionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch problem data
  useEffect(() => {
    if (!problemId) {
      setError("문제 ID가 없습니다.");
      setIsLoadingProblem(false);
      return;
    }

    const fetchProblem = async () => {
      setIsLoadingProblem(true);
      try {
        const data = await getProblemById(problemId);
        setProblem(data);
      } catch (err) {
        console.error("Failed to fetch problem:", err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : "문제 정보를 불러오는데 실패했습니다.";
        setError((prev) => prev || errorMsg); // Set error only if not already set by submission fetch
        toast.error(errorMsg);
      } finally {
        setIsLoadingProblem(false);
      }
    };

    fetchProblem();
  }, [problemId]);

  // Fetch submission result
  useEffect(() => {
    if (!submissionId) {
      setError("제출 ID가 없습니다.");
      setIsLoadingSubmission(false);
      return;
    }

    const fetchSubmission = async () => {
      setIsLoadingSubmission(true);
      try {
        const data = await getSubmissionById(submissionId);
        setSubmission(data);
      } catch (err) {
        console.error("Failed to fetch submission:", err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : "제출 정보를 불러오는데 실패했습니다.";
        setError((prev) => prev || errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsLoadingSubmission(false);
      }
    };

    fetchSubmission();
  }, [submissionId]);

  const handleShareToCommunity = () => {
    if (problemId) {
      router.push(
        `/community/create?fromTest=true&id=${problemId}&submissionId=${submissionId}`,
      );
    } else {
      toast.error("문제 ID가 없어 커뮤니티에 공유할 수 없습니다.");
    }
  };

  // Loading state
  if (isLoadingProblem || isLoadingSubmission) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500">결과를 불러오는 중...</p>
      </div>
    );
  }

  // Error state
  if (error && (!submission || !problem)) {
    // Show general error if core data is missing
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="text-center py-10 px-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 font-medium">오류 발생</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <Link
            href="/coding-test"
            className="mt-4 inline-block px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            코딩 테스트로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="text-center py-10 px-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-600 font-medium">제출 정보 없음</p>
          <p className="text-yellow-500 text-sm mt-1">
            해당 제출 정보를 찾을 수 없습니다.
          </p>
          <Link
            href="/coding-test"
            className="mt-4 inline-block px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            코딩 테스트로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const problemTitleDisplay =
    submission?.problemTitleTranslated ||
    submission?.problemTitle ||
    problem?.title_translated ||
    problem?.title ||
    "제목 정보 없음";
  const score = submission?.status === "ACCEPTED" ? 100 : 0;
  const executionTimeDisplay =
    submission?.executionTime != null
      ? `${submission.executionTime.toFixed(3)} 초`
      : "N/A";
  const memoryUsageDisplay = "N/A"; // API에 메모리 사용량 정보가 현재 없음

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">채점 결과</h1>
        <Link
          href={{
            pathname: "/coding-test/solve",
            query: { id: problemId },
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white hover:bg-gray-50 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          문제로 돌아가기
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2 sm:mb-0">
            {problemTitleDisplay}
          </h2>
          <div className="text-center">
            <div
              className={`text-3xl font-bold ${submission?.status === "ACCEPTED" ? "text-primary" : "text-red-500"}`}
            >
              {score}/100
            </div>
            <div className="text-sm text-gray-500">점수</div>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-md ${getStatusClass(submission?.status)}">
          <p
            className={`text-xl font-semibold text-center ${submission?.status === "ACCEPTED" ? "text-green-700" : submission?.status ? getStatusClass(submission.status).split(" ")[1] : "text-gray-700"}`}
          >
            {getStatusKorean(submission?.status)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-500 mb-1">실행 시간</div>
            <div className="text-lg font-medium text-gray-900">
              {executionTimeDisplay}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-500 mb-1">사용 언어</div>
            <div className="text-lg font-medium text-gray-900">
              {submission?.language || "N/A"}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-500 mb-1">메모리 사용량</div>
            <div className="text-lg font-medium text-gray-900">
              {memoryUsageDisplay}
            </div>
          </div>
        </div>

        {submission?.status !== "ACCEPTED" && submission?.errorMessage && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              오류 정보
            </h3>
            <div className="bg-red-50 p-4 rounded-md border border-red-200">
              <pre className="text-red-700 text-sm whitespace-pre-wrap font-mono">
                {submission.errorMessage}
              </pre>
            </div>
          </div>
        )}

        {/* 테스트 케이스 상세 정보 테이블은 제거됨 */}

        <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
          <Link
            href={`/submissions?problemId=${problemId}&userId=${submission?.userId}`}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 transition text-center"
          >
            제출 현황 보기
          </Link>
          <button
            onClick={handleShareToCommunity}
            disabled={!problemId}
            className="px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            커뮤니티에 풀이 공유
          </button>
        </div>
      </div>
    </div>
  );
};

// Main page component wrapping the content in Suspense
const CodingTestResultPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>코딩 테스트 결과 | ALPACO</title>
        <meta name="description" content="코딩 테스트 결과 페이지" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />

        <main className="flex-grow">
          <Suspense
            fallback={
              <div className="max-w-5xl mx-auto p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-500">페이지 로딩 중...</p>
              </div>
            }
          >
            <CodingTestResultContent />
          </Suspense>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CodingTestResultPage;
