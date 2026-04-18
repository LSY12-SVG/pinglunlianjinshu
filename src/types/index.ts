export interface Comment {
  id: string;
  content: string;
  author: string;
  avatar: string;
  timestamp: string;
  likes: number;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  intent: CommentIntent;
  leverageScore: number;
  clusterId: string;
  tags: string[];
  replyCount: number;
}

export interface CommentIntent {
  primary: 'request' | 'emotion' | 'suggestion' | 'praise' | 'criticism' | 'question' | 'reference';
  secondary?: string;
  confidence: number;
  description: string;
}

export interface CommentCluster {
  id: string;
  label: string;
  comments: Comment[];
  centroid: { x: number; y: number };
  color: string;
  avgLeverageScore: number;
  dominantIntent: CommentIntent['primary'];
  description: string;
}

export interface LeverageScore {
  overall: number;
  dimensions: {
    novelty: number;
    resonance: number;
    actionability: number;
    scarcity: number;
    emotionalDepth: number;
  };
}

export interface Strategy {
  id: string;
  title: string;
  type: 'conservative' | 'balanced' | 'aggressive';
  description: string;
  keyMoves: string[];
  riskLevel: number;
  estimatedImpact: number;
  scriptOutline: string;
}

export interface ScriptSegment {
  id: string;
  type: 'hook' | 'opening' | 'body' | 'turn' | 'climax' | 'closing' | 'cta';
  content: string;
  aiRewrite?: string;
  sourceComments: string[];
  wordCount: number;
  timestamp: string;
}

export interface Script {
  id: string;
  title: string;
  segments: ScriptSegment[];
  totalWordCount: number;
  strategyType: Strategy['type'];
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackEntry {
  id: string;
  type: 'performance' | 'audience' | 'algorithm';
  metric: string;
  value: number;
  previousValue: number;
  change: number;
  timestamp: string;
  insight: string;
}

export interface AIStatus {
  stage: 'idle' | 'analyzing' | 'processing' | 'generating' | 'complete' | 'error';
  message: string;
  progress?: number;
}

export interface DashboardStats {
  totalComments: number;
  avgLeverageScore: number;
  topIntent: CommentIntent['primary'];
  activeClusters: number;
  scriptsGenerated: number;
  feedbackScore: number;
}

export interface TimeSeriesPoint {
  date: string;
  comments: number;
  leverage: number;
  engagement: number;
}

export type StrategyMode = 'conservative' | 'balanced' | 'aggressive';
