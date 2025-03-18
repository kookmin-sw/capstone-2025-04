import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Header from "../../components/header";
import Footer from "../../components/Footer";
import CodeEditor from "../../components/CodeEditor";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../styles/coding-test.module.css";

const CodingTestProgressPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<
    "python" | "javascript" | "java" | "cpp"
  >("python");

  // State for resizable layout
  const [isResizing, setIsResizing] = useState(false);
  const [problemPanelWidth, setProblemPanelWidth] = useState(40); // 40%
  const resizableContainerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as "python" | "javascript" | "java" | "cpp");
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
  };

  const handleSubmit = () => {
    // 실제 구현에서는 코드를 백엔드로 전송하고 채점 결과를 받아옵니다
    console.log("Submitting code:", code);
    router.push(`/coding-test/result?id=${id}`);
  };

  // Handle resize functionality
  const startResize = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (!isResizing || !resizableContainerRef.current) return;

      const containerRect =
        resizableContainerRef.current.getBoundingClientRect();
      const newWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Limit min/max widths
      if (newWidth >= 20 && newWidth <= 80) {
        setProblemPanelWidth(newWidth);

        // Update handle position
        if (handleRef.current) {
          handleRef.current.style.left = `${newWidth}%`;
        }
      }
    };

    const stopResize = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", stopResize);
    }

    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", stopResize);
    };
  }, [isResizing]);

  // Apply styles for cursor during resizing
  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  }, [isResizing]);

  return (
    <div className={styles.container}>
      <Head>
        <title>코딩 테스트 진행 중 | ALPACO</title>
        <meta name="description" content="코딩 테스트 진행 페이지" />
      </Head>

      <Header />

      <main className={styles.fullscreenMain}>
        <div className={styles.fullscreenWrapper}>
          <div className={styles.fullscreenHeader}>
            <div className="flex justify-between items-center">
              <h1 className={styles.pageTitle}>문제 풀이</h1>
              <Link href="/coding-test/selection" className={styles.backButton}>
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
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                뒤로가기
              </Link>
            </div>
          </div>

          <div
            className={styles.fullscreenResizableContainer}
            ref={resizableContainerRef}
          >
            <div
              className={styles.fullscreenProblemPanel}
              style={{ flex: `0 0 ${problemPanelWidth}%` }}
            >
              <h2 className={styles.cardTitle}>배열에서 가장 큰 수 찾기</h2>
              <p className={styles.problemStatement}>
                정수 배열이 주어졌을 때, 그 배열에서 가장 큰 수를 찾아 반환하는
                함수를 작성하세요.
              </p>
              <div className={styles.exampleContainer}>
                <h3 className={styles.exampleTitle}>입력 예시:</h3>
                <pre className={styles.exampleCode}>5 1 3 5 2 4</pre>
                <h3 className={styles.exampleTitle}>출력 예시:</h3>
                <pre className={styles.exampleCode}>5</pre>
              </div>

              <div>
                <label className={styles.exampleTitle}>언어 선택:</label>
                <select
                  value={language}
                  onChange={handleLanguageChange}
                  className={styles.languageSelector}
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>
              </div>
            </div>

            <div
              ref={handleRef}
              className={`${styles.resizeHandle} ${
                isResizing ? styles.resizeHandleActive : ""
              }`}
              onMouseDown={startResize}
              style={{ left: `${problemPanelWidth}%` }}
            />

            <div className={styles.fullscreenEditorPanel}>
              <div className={styles.fullscreenEditorContainer}>
                <CodeEditor language={language} onChange={handleCodeChange} />
              </div>
              <div className={styles.fullscreenFooter}>
                <button onClick={handleSubmit} className={styles.submitButton}>
                  채점하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CodingTestProgressPage;
