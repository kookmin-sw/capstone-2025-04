import React from "react";
import Link from "next/link";
import Image from "next/image";

const SimpleHeader: React.FC = () => {
  return (
    <header className="flex justify-start items-center p-4 w-full">
      <Link href="/">
        <div className="flex flex-row items-center gap-8">
          <Image
            src="/alpaco-logo.svg"
            alt="ALPACO"
            width={50}
            height={50}
            priority
          />
          <Image
            src="/alpaco-word-logo.svg"
            alt="ALPACO"
            width={150}
            height={50}
            priority
          />
        </div>
      </Link>
    </header>
  );
};

export default SimpleHeader;
