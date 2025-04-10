import React from "react";

interface AlpacoLogoProps {
  logoColor?: string; // 로고 모양 자체의 색상
  bgColor?: string; // 배경 사각형 색상 (선택적)
  width?: number | string;
  height?: number | string;
}

const AlpacoLogo: React.FC<AlpacoLogoProps> = ({
  logoColor = "#FFFFFF", // 로고 모양 기본값을 흰색으로 가정
  bgColor = "#00b8db",
  width = 100,
  height = 100,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 512 512"
    fill="none"
  >
    <g clipPath="url(#clip0_4_16)">
      {/* 배경 사각형: bgColor 적용 */}
      <path
        d="M0 40C0 17.9086 17.9086 0 40 0H472C494.091 0 512 17.9086 512 40V472C512 494.091 494.091 512 472 512H40C17.9086 512 0 494.091 0 472V40Z"
        fill={bgColor}
      />
      {/* 로고 모양: logoColor 적용 */}
      <path
        d="M313.906 393L302.969 364.68H218.203L236.172 313.312H283.047L213.711 133.82H297.891L401.211 393H313.906ZM111.758 393L204.336 145.539L242.617 248.469L195.156 393H111.758Z"
        fill={logoColor}
      />
    </g>
    <defs>
      <clipPath id="clip0_4_16">
        <rect width="512" height="512" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

export default AlpacoLogo;

// 사용 예시: 스마트 블루 배경에 흰색 로고
// <AlpacoLogo bgColor="rgb(99 102 241)" logoColor="#FFFFFF" />
// 사용 예시: 기본값 사용 (primary-color 배경에 흰색 로고)
// <AlpacoLogo />
