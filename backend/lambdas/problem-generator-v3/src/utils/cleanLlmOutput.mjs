/**
 * Cleans raw LLM output based on the expected output type.
 * 
 * NOTE: This utility is being gradually deprecated in favor of structured output
 * using Zod schemas and the `withStructuredOutput` pattern from LangChain.
 * New chains should be created with structured output methods.
 * 
 * @param {string} output - The raw output from the LLM.
 * @param {string} type - The type of output to clean. Supported types: 'code', 'text', 'json'.
 * @returns {string} - The cleaned output.
 */
export function cleanLlmOutput(output, type) {
  if (!output) {
    return '';
  }

  let cleanedOutput = output.trim();

  switch (type.toLowerCase()) {
    case 'code':
      // Remove code markdown blocks if present
      cleanedOutput = cleanedOutput
        .replace(/```[a-z]*\n/g, '') // Remove opening code block markers
        .replace(/```\s*$/g, ''); // Remove closing code block markers
      break;
    
    case 'text':
      // Handle markdown or other formatting for text
      cleanedOutput = cleanedOutput
        .replace(/^```markdown\n/g, '') // Remove markdown code block start
        .replace(/^```md\n/g, '') // Remove md code block start
        .replace(/```\s*$/g, ''); // Remove closing code block markers
      break;
    
    case 'json':
      // Extract valid JSON from the output
      const jsonMatch = cleanedOutput.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        cleanedOutput = jsonMatch[1];
      } else {
        // Try to find JSON object without code blocks
        const possibleJson = cleanedOutput.match(/(\{[\s\S]*\})/);
        if (possibleJson && possibleJson[1]) {
          cleanedOutput = possibleJson[1];
        }
      }
      break;
    
    default:
      // No specific cleaning for unknown types
      break;
  }

  return cleanedOutput.trim();
} 