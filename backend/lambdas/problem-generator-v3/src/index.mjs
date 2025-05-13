import { pipeline } from "./services/pipeline.mjs";


export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    await pipeline(event, responseStream);
  }
); 