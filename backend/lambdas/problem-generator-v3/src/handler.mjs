import { pipeline } from "./services/pipeline.mjs";

/**
 * Main Lambda handler function, properly streamified for SSE responses.
 * 
 * @param {object} event - The Lambda event object.
 * @param {awslambda.ResponseStream} responseStream - The Lambda response stream.
 * @param {object} context - The Lambda context object.
 */
export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    await pipeline(event, responseStream);
  }
); 