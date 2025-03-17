// components/Header.tsx
import Link from "next/link";
import React from "react";

import styles from "../styles/components/Header.module.css";

const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.container}`}>
        <div className={styles.logo}>
          <Link href="/">ALPACO</Link>
        </div>
        <nav className={styles.nav}>
          <Link href="/community" className={styles.navLink}>
            커뮤니티
          </Link>
          <Link href="/coding-test" className={styles.navLink}>
            코딩 테스트
          </Link>
          <Link href="/storage" className={styles.navLink}>
            내 저장소
          </Link>
          <Link href="/login" className={styles.navLink}>
            로그인
          </Link>
          <Link href="/signup" className={styles.navLink}>
            회원가입
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
