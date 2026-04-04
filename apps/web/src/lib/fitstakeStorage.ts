export type ChallengeType = "quick_demo" | "30day_transformation";

export type ActiveChallengePersisted = {
  type: ChallengeType;
  startDate: string;
  /** Days completed (1 after first successful workout day, … up to 30). */
  currentDay: number;
  /** Local calendar date YYYY-MM-DD of last completed daily workout. */
  lastWorkoutDate: string | null;
  lastChainChallengeId: string;
  /** True after workout requirements met for claiming (quick: after reps; 30d: after day 30 workout). */
  canClaim: boolean;
};

export type CompletedChallengeRecord = {
  name: string;
  completedAt: string;
};

export type FitstakeUserPersistedState = {
  activeChallenge: ActiveChallengePersisted | null;
  completedChallenges: CompletedChallengeRecord[];
};

export function getFitstakeUserKey(walletAddress: string): string {
  return `fitstake_user_${walletAddress}`;
}

export function defaultUserState(): FitstakeUserPersistedState {
  return { activeChallenge: null, completedChallenges: [] };
}

export function loadUserState(
  walletAddress: string,
): FitstakeUserPersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getFitstakeUserKey(walletAddress));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FitstakeUserPersistedState;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.completedChallenges)) return null;
    if (parsed.activeChallenge && parsed.activeChallenge.canClaim === undefined) {
      parsed.activeChallenge = {
        ...parsed.activeChallenge,
        canClaim: false,
      };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveUserState(
  walletAddress: string,
  state: FitstakeUserPersistedState,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getFitstakeUserKey(walletAddress),
    JSON.stringify(state),
  );
}

/** Today's date in local timezone as YYYY-MM-DD. */
export function todayLocalYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
