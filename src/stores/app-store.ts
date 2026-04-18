import { create } from 'zustand';
import { AIStatus, Comment, CommentCluster, StrategyMode } from '@/types';
import { mockComments, mockClusters } from '@/data/mock';

interface AppState {
  // AI Status
  aiStatus: AIStatus;
  setAIStatus: (status: AIStatus) => void;

  // Comments data
  comments: Comment[];
  setComments: (comments: Comment[]) => void;
  clusters: CommentCluster[];
  setClusters: (clusters: CommentCluster[]) => void;
  isUsingImportedData: boolean;

  // Selected comment
  selectedComment: Comment | null;
  setSelectedComment: (comment: Comment | null) => void;

  // Strategy mode
  strategyMode: StrategyMode;
  setStrategyMode: (mode: StrategyMode) => void;

  // Comment map filters
  intentFilter: string | null;
  setIntentFilter: (intent: string | null) => void;
  clusterFilter: string | null;
  setClusterFilter: (cluster: string | null) => void;

  // Hovered element
  hoveredCommentId: string | null;
  setHoveredCommentId: (id: string | null) => void;

  // Script editing
  editingSegmentId: string | null;
  setEditingSegmentId: (id: string | null) => void;

  // Import modal
  importModalOpen: boolean;
  setImportModalOpen: (open: boolean) => void;

  // Import progress
  importStatus: AIStatus;
  setImportStatus: (status: AIStatus) => void;
}

export const useAppStore = create<AppState>((set) => ({
  aiStatus: { stage: 'idle', message: '' },
  setAIStatus: (status) => set({ aiStatus: status }),

  comments: mockComments,
  setComments: (comments) => set({ comments, isUsingImportedData: true }),
  clusters: mockClusters,
  setClusters: (clusters) => set({ clusters }),
  isUsingImportedData: false,

  selectedComment: null,
  setSelectedComment: (comment) => set({ selectedComment: comment }),

  strategyMode: 'balanced',
  setStrategyMode: (mode) => set({ strategyMode: mode }),

  intentFilter: null,
  setIntentFilter: (intent) => set({ intentFilter: intent }),
  clusterFilter: null,
  setClusterFilter: (cluster) => set({ clusterFilter: cluster }),

  hoveredCommentId: null,
  setHoveredCommentId: (id) => set({ hoveredCommentId: id }),

  editingSegmentId: null,
  setEditingSegmentId: (id) => set({ editingSegmentId: id }),

  importModalOpen: false,
  setImportModalOpen: (open) => set({ importModalOpen: open }),

  importStatus: { stage: 'idle', message: '' },
  setImportStatus: (status) => set({ importStatus: status }),
}));
