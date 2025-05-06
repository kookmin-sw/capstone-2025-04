import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { IntentOutputSchema } from "./schema.mjs";
import { intentAnalysisPromptTemplate } from "./prompt.mjs";

/**
 * Creates an Intent Extraction chain.
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @returns {import("@langchain/core/runnables").RunnableSequence} The intent extraction chain.
 */
export function createIntentAnalysisChain(llm) {
  const parser = StructuredOutputParser.fromZodSchema(IntentOutputSchema);
  return intentAnalysisPromptTemplate.pipe(llm).pipe(parser);
}

/**
 * Attempts to fix common JSON parsing errors in LLM outputs
 * 
 * @param {string} rawText - The raw text from LLM
 * @returns {string} Cleaned text that should be valid JSON
 */
function cleanJsonOutput(rawText) {
  // Remove markdown code blocks if present
  let cleanedText = rawText.replace(/```json\n|\n```/g, '');
  
  // Fix the specific "Ventilation" issue seen in key_constraints array
  // Look for instances where unquoted text appears after a properly quoted string
  cleanedText = cleanedText.replace(/"(.*?)"(\s+\w+)"(,|])/g, '"$1"$3');
  
  // More general fix for extra text in array elements
  // This regex looks for text that's not inside quotes and appears after a string in an array
  cleanedText = cleanedText.replace(/(".*?")([^",\]\n}]*)("|\]|,)/g, '$1$3');
  
  // Fix specific issue with malformed arrays where strings are missing commas
  cleanedText = cleanedText.replace(/(".*?")\s+(".*?")/g, '$1, $2');
  
  return cleanedText;
}

/**
 * Runs the intent analysis step (Step 1).
 * 
 * @param {ChatGoogleGenerativeAI} llm - The language model to use.
 * @param {Object} params - Parameters for the chain.
 * @param {string} params.user_prompt - The user's original prompt.
 * @param {string} params.difficulty - The difficulty level for the problem.
 * @returns {Promise<Object>} The extracted intent.
 */
export async function runIntentAnalysis(llm, { user_prompt, difficulty }) {
  const parser = StructuredOutputParser.fromZodSchema(IntentOutputSchema);
  
  const input = {
    user_prompt,
    difficulty,
    format_instructions: parser.getFormatInstructions(),
  };
  
  try {
    // First try the normal chain
    const chain = createIntentAnalysisChain(llm);
    const intent = await chain.invoke(input);
    
    // Ensure input_schema_details exists with proper default values
    intent.input_schema_details = intent.input_schema_details || {};
    
    // Set defaults if not provided by the LLM
    if (!intent.input_schema_details.hasOwnProperty('allows_duplicates_in_collections')) {
      intent.input_schema_details.allows_duplicates_in_collections = false;
    }
    
    if (!intent.input_schema_details.hasOwnProperty('can_revisit_nodes_in_paths')) {
      intent.input_schema_details.can_revisit_nodes_in_paths = false;
      
      // Only apply minimal fallback detection for graph problems
      if (
        intent.concepts && 
        (intent.concepts.some(concept => 
          concept.toLowerCase().includes('graph') || 
          concept.toLowerCase().includes('tree') || 
          concept.toLowerCase().includes('network')
        ))
      ) {
        // Very minimal fallback for graph problems if LLM didn't specify
        const lowercaseGoal = intent.goal.toLowerCase();
        if (
          lowercaseGoal.includes('cycle') || 
          lowercaseGoal.includes('path') || 
          lowercaseGoal.includes('circuit')
        ) {
          // Only if the goal clearly indicates paths/cycles
          intent.input_schema_details.can_revisit_nodes_in_paths = true;
        }
      }
    }
    
    return {
      intent,
      intentJson: JSON.stringify(intent),
    };
  } catch (error) {
    // If there's an error, try to get the raw output
    console.log("Error in intent analysis:", error.message);
    
    if (error.llmOutput) {
      console.log("Raw LLM Output:", error.llmOutput);
      
      // Check specific known error patterns
      if (error.message.includes("Expected ',' or ']' after array element")) {
        console.log("Detected array formatting error - attempting recovery");
      }
      
      try {
        // Try to clean and parse the JSON manually
        const cleanedJson = cleanJsonOutput(error.llmOutput);
        console.log("Cleaned JSON:", cleanedJson);
        
        // Show a diff of what was changed for debugging
        const originalLines = error.llmOutput.split('\n');
        const cleanedLines = cleanedJson.split('\n');
        for (let i = 0; i < Math.max(originalLines.length, cleanedLines.length); i++) {
          if (originalLines[i] !== cleanedLines[i]) {
            console.log(`Line ${i+1} diff - Original: "${originalLines[i] || ''}"`);
            console.log(`Line ${i+1} diff - Cleaned: "${cleanedLines[i] || ''}"`);
          }
        }
        
        try {
          const intent = JSON.parse(cleanedJson);
          console.log("Successfully parsed cleaned JSON");
          
          // Validate against our schema
          const validatedIntent = IntentOutputSchema.parse(intent);
          console.log("Successfully validated against schema");
          
          // Ensure input_schema_details exists with proper default values for recovered intent
          validatedIntent.input_schema_details = validatedIntent.input_schema_details || {};
          
          // Set defaults if not provided by the LLM
          if (!validatedIntent.input_schema_details.hasOwnProperty('allows_duplicates_in_collections')) {
            validatedIntent.input_schema_details.allows_duplicates_in_collections = false;
          }
          
          if (!validatedIntent.input_schema_details.hasOwnProperty('can_revisit_nodes_in_paths')) {
            validatedIntent.input_schema_details.can_revisit_nodes_in_paths = false;
            
            // Only apply minimal fallback detection for graph problems
            if (
              validatedIntent.concepts && 
              (validatedIntent.concepts.some(concept => 
                concept.toLowerCase().includes('graph') || 
                concept.toLowerCase().includes('tree') || 
                concept.toLowerCase().includes('network')
              ))
            ) {
              // Very minimal fallback for graph problems if LLM didn't specify
              const lowercaseGoal = validatedIntent.goal.toLowerCase();
              if (
                lowercaseGoal.includes('cycle') || 
                lowercaseGoal.includes('path') || 
                lowercaseGoal.includes('circuit')
              ) {
                // Only if the goal clearly indicates paths/cycles
                validatedIntent.input_schema_details.can_revisit_nodes_in_paths = true;
              }
            }
          }
          
          return {
            intent: validatedIntent,
            intentJson: JSON.stringify(validatedIntent),
            wasRecovered: true
          };
        } catch (jsonError) {
          console.log("JSON parse error:", jsonError.message);
          // Provide more details about where the parsing failed
          if (jsonError instanceof SyntaxError) {
            const errorPosition = jsonError.message.match(/position (\d+)/);
            if (errorPosition && errorPosition[1]) {
              const pos = parseInt(errorPosition[1]);
              const errorContext = cleanedJson.substring(
                Math.max(0, pos - 20), 
                Math.min(cleanedJson.length, pos + 20)
              );
              console.log(`JSON error context: "...${errorContext}..."`);
            }
          }
          throw jsonError;
        }
      } catch (parseError) {
        console.log("Failed to recover JSON:", parseError.message);
        
        // Add useful metadata to the original error
        const enhancedError = new Error(`Intent analysis failed: ${error.message}. Recovery failed: ${parseError.message}`);
        enhancedError.llmOutput = error.llmOutput;
        enhancedError.originalError = error;
        enhancedError.recoveryError = parseError;
        throw enhancedError;
      }
    }
    
    // Re-throw if we couldn't recover
    throw new Error(`Intent analysis failed: ${error.message}`);
  }
} 