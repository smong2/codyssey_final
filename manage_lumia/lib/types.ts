export const stats = ["knowledge", "expression", "skill", "exploration", "magic"] as const;
export type Stat = (typeof stats)[number];
export const statLabels: Record<Stat, string> = {
  knowledge: "지식",
  expression: "표현력",
  skill: "솜씨",
  exploration: "탐험",
  magic: "마법",
};

export type Period = "day" | "week" | "month";

export interface UserSummary {
  uid: string;
  email: string | null;
  createdAt: string;
  lastPlayedAt: string | null;
  totalCompletedRuns: number;
}

export interface UserDetail {
  uid: string;
  email: string | null;
  profile: {
    createdAt: string;
    lastPlayedAt: string | null;
  };
  meta: {
    unlockedCharacterIds: string[];
    unlockedPetIds: string[];
    acquiredBadgeIds: string[];
    unlockedRoomBackgroundIds: string[];
    seenEndingIds: string[];
  };
  statistics: {
    totalCompletedRuns: number;
    totalClassCount: number;
    totalAdventureCount: number;
    totalRestCount: number;
    totalMinigamePlayCount: number;
    totalMinigameClearCount: number;
    totalNpcEncounterCount: number;
    completedNpcStoryCount: number;
    totalSpecialItemDiscoveryCount: number;
    totalLocationDiscoveryCount: number;
  };
  slots: {
    slotId: number;
    status: string;
    completedRunCount?: number;
    lastCompletedCharacterId?: string | null;
    lastEndingId?: string | null;
    lastSavedAt?: string | null;
    activeRun?: {
      characterId?: string;
      week?: number;
      day?: number;
      phase?: string;
      stats?: Partial<Record<Stat, number>>;
    } | null;
  }[];
  endingRecords: {
    endingRecordId: string;
    endingId: string;
    characterId: string;
    slotId: number;
    completedAt: string;
    letter: { content: string; generationStatus: string };
  }[];
}

export interface Analytics {
  period: Period;
  startDate: string;
  endDate: string;
  complete: boolean;
  missingDates: string[];
  currentUsers: {
    totalUserCount: number;
    playedUserCount: number;
    completedUserCount: number;
    totalCompletedRuns: number;
    averageCompletedRunsPerUser: number;
    recent7ActiveUserCount: number;
    recent30ActiveUserCount: number;
    currentUnlockHoldings: Record<string, Record<string, number>>;
  };
  metrics: {
    newUserCount: number;
    activeUserCount: number;
    activityCounts: Record<string, number>;
    minigame: {
      playCount: number;
      failCount: number;
      successCount: number;
      greatCount: number;
      successRatio: number | null;
      byGameId: Record<string, {
        playCount: number;
        fail: number;
        success: number;
        great: number;
        successRatio: number | null;
      }>;
    };
    story: Record<string, number>;
    run: {
      completedRunCount: number;
      firstCompletedRunUserCount: number;
      endingViewCounts: Record<string, number>;
      finalStatAverages: Partial<Record<Stat, number | null>>;
      finalStatGte300Ratios: Partial<Record<Stat, number | null>>;
      finalStatGte500Ratios: Partial<Record<Stat, number | null>>;
    };
    unlocks: { newByTypeAndId: Record<string, Record<string, number>> };
    latestGeneratedAt: string | null;
  };
}

export interface Balance {
  rewardMultiplier: Record<Stat, number>;
  version: number;
  updatedAt: string | null;
  updatedBy: string;
}
