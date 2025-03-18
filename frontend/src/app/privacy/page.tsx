import React from "react";
import Head from "next/head";
import Header from "../../components/header";
import Footer from "../../components/Footer";
import Link from "next/link";
import styles from "../../styles/privacy.module.css";

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>개인정보 처리방침 | ALPACO</title>
        <meta name="description" content="ALPACO 개인정보 처리방침" />
      </Head>

      <Header />

      <main className="flex-grow">
        <div className={styles.privacyContainer}>
          <div className={styles.privacyHeader}>
            <h1 className={styles.privacyTitle}>개인정보 처리방침</h1>
            <Link href="/" className={styles.homeLink}>
              홈으로
            </Link>
          </div>

          <div className={styles.privacyContent}>
            <div className={styles.privacySection}>
              <h2 className={styles.privacySectionTitle}>제1조 (목적)</h2>
              <p className={styles.privacyParagraph}>
                {/* 추가적인 정책 내용을 여기에 계속해서 추가할 수 있습니다 */}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPage;
