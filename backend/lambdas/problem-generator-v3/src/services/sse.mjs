import { GENERATOR_VERBOSE } from "../utils/constants.mjs";

// Mock awslambda object for local testing
const mockAwsLambda = {
  HttpResponseStream: {
    from: (responseStream, metadata) => {
      // Just return the original stream in local testing with the metadata attached
      responseStream.metadata = metadata;
      return responseStream;
    },
  },
};

// Use the AWS Lambda object if available, otherwise use mock
const lambdaRuntime =
  typeof awslambda !== "undefined" ? awslambda : mockAwsLambda;

/**
 * Initializes an SSE response stream with appropriate headers.
 *
 * @param {awslambda.ResponseStream} responseStream - The raw Lambda response stream.
 * @returns {awslambda.HttpResponseStream} Configured HTTP response stream.
 */
export function initializeSseStream(responseStream) {
  const sseMetadata = {
    statusCode: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      // CORS headers can be added here if needed
    },
  };
  return lambdaRuntime.HttpResponseStream.from(responseStream, sseMetadata);
}

/**
 * Sends an SSE message to the response stream.
 *
 * @param {awslambda.HttpResponseStream} stream - The response stream.
 * @param {string} eventType - The event type (e.g., 'status', 'result', 'error').
 * @param {object} payload - The JSON payload for the event.
 */
export function sendSse(stream, eventType, payload) {
  // v2와 동일한 형식으로 수정
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  stream.write(message);

  if (GENERATOR_VERBOSE) {
    console.log(`SSE Sent: ${eventType} - Payload:`, payload);
  }
}

/**
 * Sends a status update via SSE.
 *
 * @param {awslambda.HttpResponseStream} stream - The response stream.
 * @param {number} step - The current step number.
 * @param {string} message - The status message.
 */
export function sendStatus(stream, step, message) {
  sendSse(stream, "status", { step, message });
}

/**
 * Sends an error message via SSE.
 *
 * @param {awslambda.HttpResponseStream} stream - The response stream.
 * @param {string|Error} error - The error message or Error object.
 */
export function sendError(stream, error) {
  // Convert Error objects or anything else to a string message
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "object"
        ? JSON.stringify(error)
        : String(error);

  sendSse(stream, "error", { payload: errorMessage });
  console.error("Error in pipeline:", errorMessage);
}

/**
 * Sends a final result via SSE.
 *
 * @param {awslambda.HttpResponseStream} stream - The response stream.
 * @param {object} result - The result object.
 */
export function sendResult(stream, result) {
  sendSse(stream, "result", { payload: result });
}

/**
 * Sends a heartbeat/keep-alive message to maintain SSE connection.
 *
 * @param {awslambda.HttpResponseStream} stream - The response stream.
 */
export function sendHeartbeat(stream) {
  sendSse(stream, "heartbeat", { timestamp: new Date().toISOString() });
}

/**
 * Creates a heartbeat interval to maintain SSE connection during long operations.
 * Call clearInterval on the returned value to stop the heartbeat.
 *
 * @param {awslambda.HttpResponseStream} stream - The response stream.
 * @param {number} intervalMs - Heartbeat interval in milliseconds (default: 30000ms = 30s).
 * @returns {NodeJS.Timeout} Interval ID that can be cleared.
 */
export function startHeartbeat(stream, intervalMs = 30000) {
  return setInterval(() => {
    try {
      sendHeartbeat(stream);
    } catch (error) {
      console.warn("Failed to send heartbeat:", error);
    }
  }, intervalMs);
}
