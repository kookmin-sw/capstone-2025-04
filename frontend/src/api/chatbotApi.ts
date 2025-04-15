import { fetchAuthSession } from "aws-amplify/auth";
// import type { ProblemDetail } from "@/types/problem"; // Use the actual path or define placeholder

// Placeholder type if import fails
interface ProblemDetailPlaceholder {
  id: string | number;
  title: string;
  description?: string; // Add other relevant fields used in Lambda
}

// Define message structure (consistent with Chatbot.tsx)
interface ChatMessage {
  role: "user" | "assistant" | "model"; // Add 'model' role if used
  content: string;
}

// Define the context expected by the backend
interface ChatContext {
  problemDetails: ProblemDetailPlaceholder | null; // Use placeholder type
  userCode: string;
  history: ChatMessage[];
}

// Define the structure of the data expected in an SSE message
interface ChatStreamPayload {
  token?: string;
  error?: string;
  details?: string;
}

// Define the callback function types
type OnDataCallback = (token: string) => void;
type OnErrorCallback = (error: Error) => void;
type OnCompleteCallback = () => void;

// Get API URL from environment variable
const API_ENDPOINT = process.env.NEXT_PUBLIC_CHATBOT_API_ENDPOINT;

if (!API_ENDPOINT) {
  console.error(
    "Error: NEXT_PUBLIC_CHATBOT_API_ENDPOINT environment variable is not set."
  );
  // Throw an error to prevent API calls without a configured endpoint
  throw new Error("Chatbot API endpoint is not configured.");
}

/**
 * Calculates the SHA256 hash of a string.
 * @param text The string to hash.
 * @returns A promise that resolves to the hex-encoded SHA256 hash.
 */
async function calculateSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  return hashHex;
}

/**
 * Sends a message to the chatbot backend and streams the response via SSE.
 *
 * @param context The chat context including problem details, user code, and history.
 * @param message The new message from the user.
 * @param callbacks Object containing onData, onError, onComplete callbacks.
 */
export const streamChatbotResponse = async (
  context: ChatContext,
  message: string,
  callbacks: {
    onData: OnDataCallback;
    onError: OnErrorCallback;
    onComplete: OnCompleteCallback;
  }
): Promise<void> => {
  const { onData, onError, onComplete } = callbacks;

  try {
    // 1. Get JWT token
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    if (!idToken) {
      throw new Error("User is not authenticated or ID token is missing.");
    }

    // 2. Construct Payload & Calculate SHA256
    const payload = {
      ...context,
      newMessage: message,
    };
    const payloadString = JSON.stringify(payload);
    const sha256Hash = await calculateSHA256(payloadString);
    console.log("Payload SHA256:", sha256Hash);

    // 3. Use Fetch API for SSE Streaming
    console.log("Connecting to SSE endpoint:", API_ENDPOINT);
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`, // Standard header (commented out)
        "X-Custom-Auth-Token": `Bearer ${idToken}`, // Use custom header for JWT
        "x-amz-content-sha256": sha256Hash,
      },
      body: payloadString,
    });

    if (!response.ok) {
      // Handle non-2xx errors (e.g., 401 Unauthorized, 500 Internal Server Error)
      const errorText = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error("Response body is missing for streaming.");
    }

    // 4. Process SSE Stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = ""; // Buffer to handle partial messages

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("SSE stream finished.");
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process buffer line by line for SSE messages (data: ...\n\n)
      let eolIndex; // End Of Line index for \n\n
      while ((eolIndex = buffer.indexOf("\n\n")) >= 0) {
        const message = buffer.substring(0, eolIndex).trim();
        buffer = buffer.substring(eolIndex + 2); // Remove message and \n\n from buffer

        if (message.startsWith("data:")) {
          const dataContent = message.substring(5).trim(); // Get content after "data:"

          if (dataContent === "[DONE]") {
            console.log("Received [DONE] signal.");
            // The stream might end naturally after this, but we handle it explicitly
            // No further 'onData' calls expected.
            continue; // Process next message in buffer if any
          }

          try {
            const parsed: ChatStreamPayload = JSON.parse(dataContent);
            if (parsed.token) {
              onData(parsed.token);
            } else if (parsed.error) {
              console.error("Backend SSE error message:", parsed);
              onError(new Error(parsed.details || parsed.error));
              // Consider closing the connection / stopping further processing on backend error
            }
          } catch (e) {
            console.error("Failed to parse SSE data content:", dataContent, e);
            onError(new Error(`Failed to parse stream data: ${dataContent}`));
          }
        }
        // Ignore non-data lines (comments starting with ':') if any
      }
    }
    // End of stream
    onComplete();
  } catch (error) {
    console.error("Error in streamChatbotResponse:", error);
    const err =
      error instanceof Error ? error : new Error("An unknown error occurred");
    onError(err);
    // Ensure completion is called even on error to stop loading states etc.
    onComplete();
  }
};
