/**
 * Executes a function with retry logic.
 * 
 * @param {Function} fn - The async function to execute.
 * @param {Object} options - Retry options.
 * @param {number} options.maxRetries - Maximum number of retries.
 * @param {number} options.initialDelay - Initial delay in milliseconds.
 * @param {number} options.maxDelay - Maximum delay in milliseconds.
 * @param {Function} options.shouldRetry - Function that takes error and returns whether to retry.
 * @param {Function} options.onRetry - Function called before each retry attempt.
 * @returns {Promise<any>} - The result of the function.
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 500,
    maxDelay = 10000,
    shouldRetry = () => true,
    onRetry = () => {},
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error, attempt)) {
        break;
      }
      
      // Calculate exponential backoff with jitter
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt) + Math.random() * 100,
        maxDelay
      );
      
      // Call onRetry callback
      await onRetry(error, attempt, delay);
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
} 