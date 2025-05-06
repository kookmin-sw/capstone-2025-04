import { StructuredOutputParser } from "@langchain/core/output_parsers"; // <-- Re-add this import
import { TestSpecsOutputSchema } from "./schema.mjs";
import { testDesignPromptTemplate } from "./prompt.mjs";

/**
 * Creates a Test Design chain using StructuredOutputParser.
 *
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The test design chain.
 */
export function createTestDesignChain(llm) {
  // Instantiate the parser
  const parser = StructuredOutputParser.fromZodSchema(TestSpecsOutputSchema);
  // Pipe the prompt, LLM, and then the parser
  return testDesignPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Attempts to recover a truncated JSON array from the LLM output.
 * 
 * @param {string} rawText - Raw LLM output that might be truncated
 * @returns {string|null} Recovered JSON string or null if recovery failed
 */
function recoverTruncatedJson(rawText) {
  try {
    // Remove markdown code blocks if present
    let cleanedText = rawText.replace(/^```json\s*\n?([\s\S]*?)\n?```$/g, '$1').trim();
    // Also handle generic markdown blocks
    cleanedText = cleanedText.replace(/^```\s*\n?([\s\S]*?)\n?```$/g, '$1').trim();
    
    // Try to parse as-is first
    try {
      JSON.parse(cleanedText);
      return cleanedText; // If it parses successfully, return cleaned text
    } catch (initialError) {
      // Continue with recovery attempts
      console.log("JSON parsing failed, attempting recovery");
    }
    
    // Check if it starts with a bracket but doesn't end with one
    if (cleanedText.trim().startsWith('[') && !cleanedText.trim().endsWith(']')) {
      console.log("Found truncated JSON array, attempting to close it");
      
      // Find the last complete object (which ends with '}')
      const lastCompleteObjectEnd = cleanedText.lastIndexOf('}');
      
      if (lastCompleteObjectEnd > 0) {
        // Extract everything up to the last complete object and add a closing bracket
        const recoveredJson = cleanedText.substring(0, lastCompleteObjectEnd + 1) + ']';
        console.log("Recovered JSON by closing array after last complete object");
        
        // Validate if the recovered JSON is valid
        try {
          const parsed = JSON.parse(recoveredJson);
          if (Array.isArray(parsed)) {
            console.log(`Successfully recovered array with ${parsed.length} items`);
            return recoveredJson;
          } else {
            console.log("Recovered structure is not an array");
            return null;
          }
        } catch (recoveryError) {
          console.log("Recovery failed, recovered JSON is still invalid:", recoveryError.message);
          return null;
        }
      }
    }
    
    return null; // Recovery failed
  } catch (error) {
    console.error("Error in JSON recovery attempt:", error);
    return null;
  }
}

/**
 * Runs the test design step (Step 2).
 *
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {Object} params.intent - The intent object from step 1.
 * @param {string} params.intent_json - JSON string of the intent object.
 * @param {string} params.difficulty - The difficulty level for the problem.
 * @param {string} params.language - The target programming language.
 * @returns {Promise<Object>} The designed test specifications.
 */
export async function runTestDesign(
  llm,
  { intent, intent_json, difficulty, language },
) {
  // Create the chain
  const chain = createTestDesignChain(llm);
  // We still need a parser instance here to get the format instructions for the prompt
  const parser = StructuredOutputParser.fromZodSchema(TestSpecsOutputSchema);

  // Extract input_schema_description from intent
  const input_schema_description = intent.input_schema_description || 
      "Input format not explicitly defined, derive from problem intent.";

  // Re-add format_instructions to the input object
  const input = {
    intent_json,
    difficulty,
    language,
    input_schema_description,
    format_instructions: parser.getFormatInstructions(), // <-- Add this back
  };

  try {
    // Invoke the chain. The output should already be parsed by the chain's last step.
    const testSpecs = await chain.invoke(input);
    
    console.log("DEBUG - testDesign raw result:", JSON.stringify(testSpecs));

    // Validate the output type (should be an array based on the schema)
    if (!Array.isArray(testSpecs)) {
      console.error("Test Design Output is not an array:", testSpecs);
      // Attempt to log raw output if parsing failed within the chain/parser
      if (typeof testSpecs === "string") {
        console.log("Raw LLM output (likely):", testSpecs);
      }
      throw new Error(
        "Test Design step did not return a valid array of test specifications.",
      );
    }
    
    console.log("DEBUG - testDesign success, array length:", testSpecs.length);
    if (testSpecs.length > 0) {
      console.log("DEBUG - first test case:", JSON.stringify(testSpecs[0]));
    }

    return {
      testSpecs,
      testSpecsJson: JSON.stringify(testSpecs),
    };
  } catch (error) {
    console.error("Error in test design step (StructuredOutputParser):", error);
    // Attempt to log raw output if attached to the error
    if (error.llmOutput) {
      console.log("Raw LLM output on error:", error.llmOutput);
      
      // Attempt to recover truncated JSON
      const recoveredJson = recoverTruncatedJson(error.llmOutput);
      if (recoveredJson) {
        try {
          const parsedRecovery = JSON.parse(recoveredJson);
          console.log(`Recovery successful! Parsed ${parsedRecovery.length} test cases.`);
          
          return {
            testSpecs: parsedRecovery,
            testSpecsJson: recoveredJson,
            wasRecovered: true
          };
        } catch (recoveryParseError) {
          console.error("Failed to parse recovered JSON:", recoveryParseError);
        }
      } else {
        console.log("JSON recovery attempt failed");
      }
    } else if (error.cause?.llmOutput) {
      console.log(
        "Raw LLM output on error (from cause):",
        error.cause.llmOutput,
      );
      // Try recovery for this case too
      const recoveredJson = recoverTruncatedJson(error.cause.llmOutput);
      if (recoveredJson) {
        try {
          const parsedRecovery = JSON.parse(recoveredJson);
          console.log(`Recovery successful! Parsed ${parsedRecovery.length} test cases.`);
          
          return {
            testSpecs: parsedRecovery,
            testSpecsJson: recoveredJson,
            wasRecovered: true
          };
        } catch (recoveryParseError) {
          console.error("Failed to parse recovered JSON:", recoveryParseError);
        }
      }
    } else if (error.output) {
      // The parser might attach the failed output here
      console.log("Raw LLM output from parser error:", error.output);
      // Try recovery here too if it's a string
      if (typeof error.output === 'string') {
        const recoveredJson = recoverTruncatedJson(error.output);
        if (recoveredJson) {
          try {
            const parsedRecovery = JSON.parse(recoveredJson);
            console.log(`Recovery successful! Parsed ${parsedRecovery.length} test cases.`);
            
            return {
              testSpecs: parsedRecovery,
              testSpecsJson: recoveredJson,
              wasRecovered: true
            };
          } catch (recoveryParseError) {
            console.error("Failed to parse recovered JSON:", recoveryParseError);
          }
        }
      }
    }
    throw error; // Re-throw the error to be handled by the pipeline
  }
}
