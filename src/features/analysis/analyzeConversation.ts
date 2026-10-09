import { ParsedMessage } from '../conversation/conversationTypes';
import { AnalysisResult } from './analysisTypes';
import { runAnalysisPipeline } from './analysisPipeline';

export { runAnalysisPipeline };
export type { PipelineExecutionResult } from './analysisPipeline';

/**
 * Executes the complete conversation intelligence pipeline.
 * Coordinates finding extraction, prioritization, and integrity validation.
 */
export function analyzeConversation(messages: ParsedMessage[]): AnalysisResult {
  const result = runAnalysisPipeline(messages);
  return result.analysis;
}
