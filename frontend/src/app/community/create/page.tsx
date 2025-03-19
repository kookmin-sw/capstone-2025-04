"use client";
import React, { useState, useEffect } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import CodeEditor from "@/components/CodeEditor";

const CommunityCreatePage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromTest = searchParams.get("fromTest");
  const id = searchParams.get("id");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<
    "python" | "javascript" | "java" | "cpp"
  >("python");
  const [includeCode, setIncludeCode] = useState(!!fromTest);

  useEffect(() => {
    // 테스트 결과에서 넘어온 경우 초기 값 설정
    if (fromTest && id) {
      setTitle(`[문제 풀이] 배열에서 가장 큰 수 찾기`);
      setContent(
        "이 문제는 배열에서 가장 큰 수를 찾는 문제였습니다. 다음과 같은 접근 방식으로 해결했습니다..."
      );
      // 코드 내용도 설정 가능
    }
  }, [fromTest, id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 게시글 등록 로직 구현
    router.push("/community");
  };

  const handleCancel = () => {
    router.push("/community");
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>게시글 작성 | ALPACO 커뮤니티</title>
        <meta name="description" content="ALPACO 커뮤니티 게시글 작성" />
      </Head>

      <Header />

      <main className="flex-grow">
        <div className="max-w-5xl mx-auto p-8">
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
                내용
              </label>
              <textarea
                id="content"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                rows={8}
                placeholder="내용을 입력하세요"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="mb-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="includeCode"
                  className="h-4 w-4 text-primary focus:ring-primary/40 rounded"
                  checked={includeCode}
                  onChange={(e) => setIncludeCode(e.target.checked)}
                />
                <label
                  htmlFor="includeCode"
                  className="ml-2 text-sm font-medium text-gray-700"
                >
                  코드 포함하기
                </label>
              </div>

              {includeCode && (
                <div className="mb-4">
                  <label
                    htmlFor="language-select"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    언어 선택:
                  </label>
                  <select
                    id="language-select"
                    value={language}
                    onChange={(e) =>
                      setLanguage(
                        e.target.value as
                          | "python"
                          | "javascript"
                          | "java"
                          | "cpp"
                      )
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    aria-label="프로그래밍 언어 선택"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>

                  <div className="mt-4">
                    <CodeEditor
                      language={language}
                      onChange={handleCodeChange}
                      initialCode={code}
                    />
                  </div>
                </div>
              )}
            </div>

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
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition"
              >
                게시글 등록
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CommunityCreatePage;
