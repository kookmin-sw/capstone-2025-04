// src/components/AmplifyClientProvider.tsx
"use client";

import React, { useEffect } from "react";
import { configureAmplify } from "@/utils/configureAmplify";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css"; // Import default Amplify UI styles

const AmplifyClientProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    configureAmplify();
  }, []);

  // Wrap the children with Authenticator.Provider to make auth state available via hooks
  return <Authenticator.Provider>{children}</Authenticator.Provider>;
};

export default AmplifyClientProvider;
