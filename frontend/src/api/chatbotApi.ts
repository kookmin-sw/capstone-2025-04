import { fetchAuthSession } from "aws-amplify/auth";
// import type { ProblemDetail } from "@/types/problem"; // Use the actual path or define placeholder

// Placeholder type if import fails
interface ProblemDetailPlaceholder {
  id: string | number;
  title: string;
  // Add other relevant fields
}

// Define message structure (consistent with Chatbot.tsx)
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Define the context expected by the backend
interface ChatContext {
  problemDetails: ProblemDetailPlaceholder | null; // Use placeholder type
  userCode: string;
  history: ChatMessage[];
}

// Get API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_CHATBOT_API_BASE_URL;

if (!API_URL) {
  console.error(
    "Error: NEXT_PUBLIC_CHATBOT_API_BASE_URL environment variable is not set."
  );
  // Potentially throw an error or provide a default mock URL for development
}

/**
 * Sends a message to the chatbot backend API and streams the response.
 *
 * @param context The chat context including problem details, user code, and history.
 * @param message The new message from the user.
 * @returns An async generator yielding the streamed tokens from the response.
 */
export async function* sendChatMessage(
  context: ChatContext,
  message: string
): AsyncGenerator<string, void, undefined> {
  if (!API_URL) {
    yield "Error: API URL not configured.";
    return;
  }

  console.log("Sending request to:", API_URL);

  try {
    // 1. Get JWT token
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();

    if (!idToken) {
      throw new Error("User is not authenticated or ID token is missing.");
    }

    // 2. Construct Payload
    const payload = {
      ...context,
      newMessage: message,
    };

    // 3. Make Fetch Call
    const fullApiUrl = `${API_URL}/query`; // Construct the full URL
    console.log("Sending POST request to:", fullApiUrl);
    const response = await fetch(fullApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`
      );
    }

    // 4. Process Stream
    if (!response.body) {
      throw new Error("Response body is missing.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process buffer line by line (assuming newline-delimited JSON)
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last partial line in the buffer

      for (const line of lines) {
        if (line.trim() === "") continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.token) {
            yield parsed.token;
          } else if (parsed.error) {
            // Handle potential errors streamed from the backend
            console.error("Backend error:", parsed.error);
            yield `Error: ${parsed.error}`; // Or handle differently
            // Potentially break or throw depending on desired behavior
          }
          // Handle other potential message types if needed
        } catch (e) {
          console.error("Failed to parse streamed chunk:", line, e);
          // Decide how to handle parsing errors (e.g., yield an error message, skip)
        }
      }
    }

    // Process any remaining data in the buffer (if the stream doesn't end with a newline)
    if (buffer.trim() !== "") {
      try {
        const parsed = JSON.parse(buffer);
        if (parsed.token) {
          yield parsed.token;
        } else if (parsed.error) {
          console.error("Backend error:", parsed.error);
          yield `Error: ${parsed.error}`;
        }
      } catch (e) {
        console.error("Failed to parse final streamed chunk:", buffer, e);
      }
    }
  } catch (error) {
    console.error("Error in sendChatMessage:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    yield `Error: ${errorMessage}`;
    // Consider re-throwing or handling the error appropriately for the UI
  }
}
