// src/components/AmplifyClientProvider.tsx
"use client";

import React, { useEffect, useState } from "react";
import { configureAmplify } from "@/utils/configureAmplify";
import { Authenticator } from "@aws-amplify/ui-react";

const AmplifyClientProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    configureAmplify();
    setIsConfigured(true);
  }, []);

  if (!isConfigured) return null; // 로딩 스피너를 넣어도 OK

  return <Authenticator.Provider>{children}</Authenticator.Provider>;
};

export default AmplifyClientProvider;
