import axios from 'axios';

/* Points at the FastAPI dev server — change via VITE_API_URL env var for prod */
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
});

/* Full message history is sent each turn — backend is stateless, so the
   frontend is the source of truth for conversation state */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const { data } = await client.post<{ message: string }>('/chat', { messages });
  return data.message;
}

export interface Competitor {
  name: string;
  description: string;
  pricing: string;
  strengths: string[];
  weaknesses: string[];
  sentiment: string;
}

export interface Persona {
  type: string;
  pain_points: string[];
  desires: string[];
}

export interface AnalyseResult {
  competitors: Competitor[];
  personas: Persona[];
  differentiators: string[];
  sources: string[];
}

/* Sends the original idea + full conversation to /analyse.
   The backend runs two LLM calls + a Serper Reddit search and returns
   structured competitor and persona data. */
export async function analyse(idea: string, conversation: ChatMessage[]): Promise<AnalyseResult> {
  const { data } = await client.post<AnalyseResult>('/analyse', { idea, conversation });
  return data;
}

export interface ValidationMetric {
  number: number;
  label: string;
  score: number;
  description: string;
}

export interface ValidateResult {
  gap_statement: string;
  overall_score: number;
  metrics: ValidationMetric[];
  platform_summary: Record<string, string>;
  sources: string[];
  /* "open" = no solution exists, "partial" = workarounds exist but unsatisfying,
     "resolved" = market is well-served — low opportunity */
  resolution_status: 'open' | 'partial' | 'resolved';
  resolution_explanation: string;
}

/* Sends the idea + conversation to /validate.
   The backend searches Reddit, LinkedIn, and Twitter for evidence of the gap,
   then scores 6 validation signals from the results. */
export async function validate(idea: string, conversation: ChatMessage[]): Promise<ValidateResult> {
  const { data } = await client.post<ValidateResult>('/validate', { idea, conversation });
  return data;
}
