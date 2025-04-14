import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { ChatBedrockConverse } from "@langchain/aws";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { PassThrough } from "stream";

// AWS SDK v3 Streaming helper
// Note: The 'awslambda' global is provided by the AWS Lambda Node.js runtime environment
// when the function is configured for response streaming. No explicit declaration is needed.

/**
 * Placeholder Lambda handler for the chatbot query function.
 */
export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    let requestBody;
    try {
      // Handle direct invoke (event is the payload) vs API Gateway (event.body is the payload)
      if (event.body) {
        // API Gateway: Parse the stringified body
        requestBody =
          typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      } else {
        // Direct Invoke: Event itself is the payload
        requestBody = event;
      }

      // Check if the determined requestBody is valid and has the essential field
      if (!requestBody || typeof requestBody !== "object") {
        throw new Error("Request body is missing, empty, or not an object.");
      }
      if (!requestBody.newMessage) {
        throw new Error("Missing required field: newMessage");
      }
      // Optional: Add checks for problemDetails, history if they are strictly required
    } catch (error) {
      console.error("Error parsing request body:", error);
      // Fix: Write error to stream and end it properly for streamifyResponse
      try {
        responseStream.write(
          JSON.stringify({
            error: "Invalid request body.",
            details: error.message,
          }) + "\n"
        );
      } catch (writeError) {
        console.error("Failed to write parsing error to stream:", writeError);
      } finally {
        responseStream.end();
      }
      return; // Stop further execution after handling the parsing error
    }

    const { problemDetails, userCode, history, newMessage } = requestBody;

    // --- Langchain/Bedrock Initialization ---

    // Check for required environment variables
    const region = process.env.AWS_REGION;
    const modelId = process.env.BEDROCK_MODEL_ID;

    if (!region || !modelId) {
      console.error(
        "Missing required environment variables: AWS_REGION or BEDROCK_MODEL_ID"
      );
      // Write error to stream and exit
      responseStream.write(
        JSON.stringify({
          error: "Configuration error: Missing required environment variables.",
        }) + "\n"
      );
      responseStream.end();
      return; // Stop execution
    }

    // Note: BedrockRuntimeClient might not be explicitly needed by ChatBedrockConverse
    // if it internally uses the default credential provider chain. Let's keep it for now.
    // const client = new BedrockRuntimeClient({ region });

    // Instantiate ChatBedrockConverse
    const llm = new ChatBedrockConverse({
      model: modelId,
      streaming: true,
      region: region,
      // Add modelKwargs to control generation parameters
      modelKwargs: {
        max_tokens: 1024, // Limit output tokens to prevent timeouts
        // temperature: 0.7, // Optional: Adjust creativity
      },
    });

    // --- Prompt Construction Logic ---

    // 1. Define the System Prompt
    const systemPrompt = `You are an AI assistant embedded in a coding test platform called ALPACO. Your goal is to help users solve programming problems without giving away the direct solution or writing complete code for them. Focus on providing hints, explaining concepts, clarifying problem statements, and suggesting debugging strategies based on the user's code and the problem description. Do NOT provide the final answer or complete code snippets that solve the problem. Be encouraging and supportive. The user is currently working on the problem titled '${
      problemDetails?.title || "Unknown Problem"
    }'.`;

    // 2. Format Chat History (Placeholder for now, will integrate with Langchain later)
    const formattedHistory = history || []; // Assuming history is already in [{ role: 'user' | 'assistant', content: '...' }] format

    // 3. Format the latest User Message
    const formattedUserMessage = newMessage || "";

    // 4. Combine Context (Logging for now)
    console.log("--- Prompt Components ---");
    console.log("System Prompt:", systemPrompt);
    console.log("Problem Details:", JSON.stringify(problemDetails, null, 2));
    console.log("User Code:", userCode);
    console.log(
      "Formatted History:",
      JSON.stringify(formattedHistory, null, 2)
    );
    console.log("Formatted User Message:", formattedUserMessage);
    console.log("--- End Prompt Components ---");

    // --- Prepare Messages for Langchain ---
    const systemMessage = new SystemMessage(systemPrompt);

    // Combine problem details and user code into a context string
    // TODO: Add smarter context inclusion/summarization if needed for token limits
    const contextString = `Problem Description:
${problemDetails?.description || "Not available"}

User Code:
${userCode || "Not provided"}`;

    // Convert history to AIMessage and HumanMessage objects
    const chatHistoryMessages = formattedHistory.map((msg) => {
      if (msg.role === "user") {
        return new HumanMessage(msg.content);
      }
      // Assuming any non-user role is 'assistant'
      return new AIMessage(msg.content);
    });

    const latestUserMessage = new HumanMessage(
      `${newMessage}\n\nContext:\n${contextString}`
    );

    const messages = [systemMessage, ...chatHistoryMessages, latestUserMessage];

    console.log("--- Langchain Messages ---");
    console.log(JSON.stringify(messages, null, 2));
    console.log("--- End Langchain Messages ---");

    // --- LLM Invocation and Streaming Response ---
    try {
      console.log("Attempting to call llm.stream...");
      const stream = await llm.stream(messages);
      console.log("llm.stream call succeeded, starting stream processing.");

      // Iterate through the stream from Langchain/Bedrock
      for await (const chunk of stream) {
        if (chunk?.content) {
          const token = chunk.content;
          // Format the chunk as JSON and write to the response stream
          const responseChunk = {
            token: token, // Use the extracted token
          };
          const chunkString = JSON.stringify(responseChunk) + "\n";
          console.log("Writing chunk to stream:", chunkString.trim()); // Log the actual string being written
          responseStream.write(chunkString);
        } else {
          console.log("Received empty chunk from stream."); // Log if chunk or chunk.content is empty/null
        }
      }
      console.log("Stream finished.");
    } catch (error) {
      console.error(
        "!!! Error during LLM stream invocation or processing:",
        error
      );
      // Write an error message to the stream if possible
      // Note: Headers might already be sent
      try {
        responseStream.write(
          JSON.stringify({
            error: "Failed to get response from LLM.",
            details: error.message || "Unknown error",
          }) + "\n"
        );
      } catch (writeError) {
        console.error("Failed to write error to stream:", writeError);
      }
    } finally {
      // End the response stream
      console.log("Executing finally block, ending response stream.");
      responseStream.end();
    }

    // Note: No return value needed for streamifyResponse handlers
    // The response is written directly to responseStream
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
