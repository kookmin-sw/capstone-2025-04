import React from "react";
import Link from "next/link";
import AlpacoWordLogo from "./AlpacoWordLogo";
import AlpacoLogo from "./AlpacoLogo";

const SimpleHeader: React.FC = () => {
  return (
    <header className="flex items-center justify-center p-4 w-full">
      <div className="flex flex-row items-center text-primary transition-transform duration-200 hover:scale-105">
        <Link href="/" className="flex flex-row items-center gap-2">
          <AlpacoLogo width={50} height={50} />
          <AlpacoWordLogo height={40} />
        </Link>
      </div>
    </header>
  );
};

export default SimpleHeader;
