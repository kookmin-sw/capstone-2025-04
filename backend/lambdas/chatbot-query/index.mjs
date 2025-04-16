import { createRemoteJWKSet, jwtVerify } from "jose";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

// Helper function to validate JWT
// Caching JWKS fetching is important for performance
let jwksClient = null;
const getJwksClient = (jwksUrl) => {
  if (!jwksClient) {
    jwksClient = createRemoteJWKSet(new URL(jwksUrl));
    console.log("Created JWKS client for:", jwksUrl);
  }
  return jwksClient;
};

const validateJwt = async (token, jwksUrl, issuerUrl, audience) => {
  if (!token) {
    throw new Error("Authorization token missing");
  }
  if (!jwksUrl || !issuerUrl || !audience) {
    throw new Error("Missing Cognito configuration for JWT validation");
  }

  try {
    const client = getJwksClient(jwksUrl);
    const { payload, protectedHeader } = await jwtVerify(token, client, {
      issuer: issuerUrl,
      audience: audience,
    });
    console.log("JWT validated successfully. Payload:", payload);
    // You can return the payload if needed, e.g., payload.sub for user ID
    return payload;
  } catch (err) {
    console.error("JWT Validation Error:", err);
    throw new Error(`JWT validation failed: ${err.message}`);
  }
};

/**
 * Lambda handler for the chatbot query function with SSE streaming.
 */
export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    // --- JWT Validation ---
    const region = process.env.COGNITO_REGION || process.env.AWS_REGION; // Use specific Cognito region or default AWS region
    const jwksUrl = process.env.COGNITO_JWKS_URL;
    const issuerUrl = process.env.COGNITO_ISSUER_URL;
    const audience = process.env.COGNITO_APP_CLIENT_ID;

    try {
      // Read JWT from the custom header (access case-insensitively)
      const authHeader =
        event.headers?.["x-custom-auth-token"] ||
        event.headers?.["X-Custom-Auth-Token"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Missing or invalid X-Custom-Auth-Token header");
      }
      const token = authHeader.substring(7); // Remove "Bearer " prefix
      await validateJwt(token, jwksUrl, issuerUrl, audience);
      console.log("JWT is valid.");
    } catch (error) {
      console.error("Authentication Error:", error);
      // Set HTTP status code for unauthorized - requires metadata wrapper
      const metadata = {
        statusCode: 401, // Or 403
        headers: {
          "Content-Type": "application/json", // Error is JSON
        },
      };
      // Apply metadata before writing
      responseStream = awslambda.HttpResponseStream.from(
        responseStream,
        metadata
      );
      responseStream.write(
        JSON.stringify({
          error: "Unauthorized",
          details: error.message,
        })
      );
      responseStream.end();
      return; // Stop execution
    }

    // --- Set SSE Headers ---
    // IMPORTANT: Headers must be set *before* writing the first chunk
    const sseMetadata = {
      statusCode: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        // Add CORS headers if needed, although CloudFront might handle this
        // "Access-Control-Allow-Origin": "*"
      },
    };
    responseStream = awslambda.HttpResponseStream.from(
      responseStream,
      sseMetadata
    );

    // --- Request Body Parsing ---
    let requestBody;
    try {
      // CloudFront invoking Function URL passes body directly
      if (event.body) {
        requestBody =
          typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      } else {
        // Fallback for direct invoke testing?
        requestBody = event;
      }

      if (
        !requestBody ||
        typeof requestBody !== "object" ||
        !requestBody.newMessage
      ) {
        throw new Error(
          "Request body is missing, invalid, or missing 'newMessage' field."
        );
      }
    } catch (error) {
      console.error("Error parsing request body:", error);
      // Format error as SSE event
      const errorPayload = JSON.stringify({
        error: "Invalid request body.",
        details: error.message,
      });
      responseStream.write(`data: ${errorPayload}\n\n`);
      responseStream.end();
      return; // Stop further execution
    }

    const { problemDetails, userCode, history, newMessage } = requestBody;

    // --- Langchain/Google Initialization ---
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    const modelName = process.env.GOOGLE_AI_MODEL_ID;

    if (!googleApiKey) {
      console.error("Missing required environment variable: GOOGLE_AI_API_KEY");
      const errorPayload = JSON.stringify({
        error: "Configuration error: Missing Google API key.",
      });
      responseStream.write(`data: ${errorPayload}\n\n`);
      responseStream.end();
      return; // Stop execution
    }

    // Ensure all parameters are strings and properly defined
    console.log("Google API Key:", googleApiKey);
    console.log("Model Name:", modelName);
    const llm = new ChatGoogleGenerativeAI({
      apiKey: String(googleApiKey),
      modelName: String(modelName),
      maxOutputTokens: 9126,
      streaming: true,
    });

    // --- Prompt Construction Logic ---
    const systemPrompt = `You are an AI assistant embedded in a coding test platform called ALPACO. Your goal is to help users solve programming problems without giving away the direct solution or writing complete code for them. Focus on providing hints, explaining concepts, clarifying problem statements, and suggesting debugging strategies based on the user's code and the problem description. Do NOT provide the final answer or complete code snippets that solve the problem. Be encouraging and supportive. The user is currently working on the problem titled '${
      problemDetails?.title || "Unknown Problem"
    }'.`;

    const formattedHistory = history || [];
    const contextString = `Problem Description:\n${
      problemDetails?.description || "Not available"
    }\n\nUser Code:\n${userCode || "Not provided"}`;

    const chatHistoryMessages = formattedHistory.map((msg) =>
      msg.role === "user"
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    );

    const latestUserMessage = new HumanMessage(
      `${newMessage}\n\nContext:\n${contextString}`
    );

    const messages = [
      new SystemMessage(systemPrompt),
      ...chatHistoryMessages,
      latestUserMessage,
    ];

    console.log("--- Langchain Messages Prepared ---");
    // console.log(JSON.stringify(messages, null, 2)); // Can be verbose

    // --- LLM Invocation and SSE Streaming Response ---
    try {
      console.log(`Invoking Google model: ${modelName} via Langchain...`);

      // Add retry mechanism with exponential backoff
      let retryCount = 0;
      const maxRetries = 5;
      let lastError = null;

      const stream = await llm.stream(messages);
      console.log("Streaming response from Google model...");

      for await (const chunk of stream) {
        // Check content format
        let textContent = "";
        if (typeof chunk.content === "string") {
          textContent = chunk.content;
        } else if (
          Array.isArray(chunk.content) &&
          chunk.content.length > 0 &&
          typeof chunk.content[0] === "object" &&
          chunk.content[0].type === "text"
        ) {
          // Handle structure like [{ type: 'text', text: '...' }]
          textContent = chunk.content[0].text || "";
        } else {
          // Handle other potential structures or log unexpected format
          console.log(
            "Received chunk with unexpected content format:",
            chunk.content
          );
        }

        if (textContent) {
          const ssePayload = JSON.stringify({ token: textContent });
          const sseMessage = `data: ${ssePayload}\n\n`;
          // console.log("Writing SSE chunk:", sseMessage.trim()); // Log SSE message
          responseStream.write(sseMessage);
        } else {
          // console.log("Received chunk without printable content:", chunk);
        }
      }
      console.log("Google model stream finished.");
      // Send a final [DONE] message (optional, depends on frontend implementation)
      responseStream.write(`data: [DONE]\n\n`);

      // If we get here, the stream completed successfully, so exit the retry loop
    } catch (error) {
      console.error(
        "!!! All retry attempts failed during LLM stream invocation/processing:",
        error
      );
      const errorPayload = JSON.stringify({
        error: "Failed to get response from LLM",
        details: error.message || "Unknown error",
      });
      // Try writing error as SSE event, but headers might be sent
      try {
        responseStream.write(`data: ${errorPayload}\n\n`);
      } catch (writeError) {
        console.error("Failed to write final error to stream:", writeError);
      }
    } finally {
      console.log("Ending response stream.");
      responseStream.end();
    }
  }
);

/* Original non-streaming handler structure (for reference)
export const handler = async (event, context) => {
  // ... parsing and setup ...

  // Placeholder response
  const responseBody = {
    message: "Received context, preparing prompt (placeholder).",
    parsedInput: {
      problemTitle: problemDetails?.title,
      hasCode: !!userCode,
      historyLength: formattedHistory.length,
      newMessage: formattedUserMessage,
    }
  };

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(responseBody),
  };
};
*/
