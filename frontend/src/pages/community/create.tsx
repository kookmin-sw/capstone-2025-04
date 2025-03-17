import React, { useState, useEffect } from "react";
import Head from "next/head";
import Header from "../../components/header";
import Footer from "../../components/Footer";
import Link from "next/link";
import { useRouter } from "next/router";
import CodeEditor from "../../components/CodeEditor";
import styles from "../../styles/community.module.css";

const CommunityCreatePage: React.FC = () => {
  const router = useRouter();
  const { fromTest, id } = router.query;

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
        <div className={styles.communityContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>게시글 작성</h1>
            <Link href="/community" className={styles.backButton}>
              뒤로가기
            </Link>
          </div>

          <form onSubmit={handleSubmit} className={styles.createForm}>
            <div className={styles.formGroup}>
              <label htmlFor="title" className={styles.formLabel}>
                제목
              </label>
              <input
                type="text"
                id="title"
                className={styles.formInput}
                placeholder="제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="content" className={styles.formLabel}>
                내용
              </label>
              <textarea
                id="content"
                className={styles.formTextarea}
                rows={8}
                placeholder="내용을 입력하세요"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              ></textarea>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="includeCode"
                  className={styles.checkbox}
                  checked={includeCode}
                  onChange={(e) => setIncludeCode(e.target.checked)}
                />
                <label htmlFor="includeCode" className={styles.formLabel}>
                  코드 포함하기
                </label>
              </div>

              {includeCode && (
                <div className="mb-4">
                  <label className={styles.formLabel}>언어 선택:</label>
                  <select
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
                    className={styles.formInput}
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

            <div className={styles.buttonGroup}>
              <button
                type="button"
                onClick={handleCancel}
                className={styles.cancelButton}
              >
                취소
              </button>
              <button type="submit" className={styles.submitButton}>
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
