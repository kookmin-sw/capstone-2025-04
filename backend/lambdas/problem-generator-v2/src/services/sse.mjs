import { GENERATOR_VERBOSE } from "../utils/constants.mjs";

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
  return awslambda.HttpResponseStream.from(responseStream, sseMetadata);
}

/**
 * Sends an SSE message to the response stream.
 * 
 * @param {awslambda.HttpResponseStream} stream - The response stream.
 * @param {string} eventType - The event type (e.g., 'status', 'result', 'error').
 * @param {object} payload - The JSON payload for the event.
 */
export function sendSse(stream, eventType, payload) {
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
 * @param {string} errorMessage - The error message.
 */
export function sendError(stream, errorMessage) {
  sendSse(stream, "error", { payload: errorMessage });
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