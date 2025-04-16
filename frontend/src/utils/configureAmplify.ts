// src/utils/configureAmplify.ts
import { Amplify, ResourcesConfig } from "aws-amplify";

// Fetch configuration values from environment variables
// These MUST be prefixed with NEXT_PUBLIC_ to be available client-side
const cognitoUserPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const cognitoClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN; // Full domain from Cognito (e.g., alpaco-auth-prod-kmu.auth.ap-northeast-2.amazoncognito.com)
const awsRegion = process.env.NEXT_PUBLIC_AWS_REGION;
const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL;

// Ensure all required variables are present
if (
  !cognitoUserPoolId ||
  !cognitoClientId ||
  !cognitoDomain ||
  !awsRegion ||
  !appBaseUrl
) {
  console.error("Missing Cognito configuration in environment variables!");
  // Optionally throw an error or handle this case appropriately
}

const awsconfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: cognitoUserPoolId || "",
      userPoolClientId: cognitoClientId || "",
      loginWith: {
        oauth: {
          domain: cognitoDomain || "",
          // Make sure these match EXACTLY what's in your Cognito App Client settings (variables.tf)
          scopes: ["openid", "email", "profile"],
          redirectSignIn: appBaseUrl ? [`${appBaseUrl}/auth/callback`] : [], // 로그인 후 홈으로
          redirectSignOut: appBaseUrl ? [`${appBaseUrl}/auth/login`] : [], // 로그아웃 후 로그인 페이지로
          responseType: "code", // Use Authorization Code Grant
        },
      },
    },
  },
  // Add other Amplify categories config if needed (API, Storage, etc.)
};

// Function to configure Amplify only once
let configured = false;
export const configureAmplify = () => {
  if (!configured && cognitoUserPoolId) {
    // Check both
    console.log("Configuring Amplify with:", awsconfig);
    Amplify.configure(awsconfig);
    configured = true;
  } else if (!cognitoUserPoolId) {
    console.warn(
      "Amplify configuration skipped: Missing environment variables (User Pool or Identity Pool)."
    );
  }
};
