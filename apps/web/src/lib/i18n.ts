export type Locale = "tr" | "en";

export const DEFAULT_LOCALE: Locale = "tr";

const STORAGE_KEY = "fitstake_locale";

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "en" || v === "tr") return v;
  return null;
}

export function writeStoredLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale);
}

export function localeToBcp47(locale: Locale): string {
  return locale === "en" ? "en-US" : "tr-TR";
}

type Vars = Record<string, string | number>;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  );
}

/** Flat message keys for TR / EN */
const MESSAGES: Record<Locale, Record<string, string>> = {
  tr: {
    squatTrackerLoading: "Yükleniyor…",
    errWalletProgram: "Cüzdan bağlı değil veya imza yok.",
    confirmBackActiveWorkout:
      "Aktif antrenmanı bırakmak istediğinden emin misin? İlerleme kaybolacak ve stake edilen SOL geri alınamaz.",
    confirmBackChallenge:
      "Aktif challenge'dan çıkmak istediğinden emin misin? Stake edilen SOL geri alınamaz.",
    quickChallengeName:
      "Hızlı Demo — {exercise} (+{trophy} 🏆)",
    alertQuickComplete:
      "Tebrikler! Görevi tamamladın. +{trophy} kupa kazandın! Ödülünü çekebilirsin.",
    challengeName30Day: "30 Günlük Dönüşüm",
    alert30Complete:
      "30 günlük program tamamlandı! +{trophy} kupa! Ödülünü çekebilirsin.",
    alert30DayProgress:
      "Gün {day}/30 tamamlandı. +{trophy} kupa! Yarın tekrar görüşürüz!",
    errWallet: "Cüzdan bağlı değil.",
    errPickChallenge: "Önce bir challenge seçin.",
    errNoChallengeId: "Aktif challenge kimliği yok. Önce stake yapın.",
    errNotEligible: "Henüz ödül için uygun değilsin.",
    alertClaimSuccess: "Tebrikler! Ödül cüzdanına yattı!",
    stakeProcessing: "Ağa İşleniyor…",
    stakeCta: "Challenge'a Katıl (0.1 SOL Stake)",
    claimProcessing: "Ağa İşleniyor…",
    claimCta: "Ödülünü Çek",
    claimTitle30NotDone:
      "30 günlük programı bitirip günlük hedefleri tamamladıktan sonra ödül çekilebilir.",
    claimTitleNeedComplete: "Önce görevi tamamlayın.",
    heroTagline: "Stake et, hareket et, kazan. Web3 ile fitness challenge.",
    profileLoading: "Profil verileri yükleniyor…",
    profileTitle: "Profilim",
    profileStorageNote: "Veriler bu cihazda saklanır (localStorage).",
    trophyPoints: "Kupa puanı",
    totalChallenges: "Toplam tamamlanan challenge",
    activeProgram: "Aktif program",
    active30Day: "30 Günlük Dönüşüm — Gün {day}/30",
    quickDemo: "Hızlı Demo",
    pickChallenge: "Challenge seç",
    cardQuickBadge: "Anında",
    cardQuickTitle: "Hızlı Demo (Anında Ödül)",
    cardQuickBody:
      "0.1 SOL stake, 5 tekrar, ardından hemen claim. MVP akışı.",
    cardQuickTrophy: "🏆 Squat: +5 kupa · Şınav: +10 kupa",
    card30Badge: "Uzun vade",
    card30Title: "30 Günlük Dönüşüm",
    card30Body:
      "Her gün 10 squat hedefi, 30 gün boyunca. Ödül, 30 gün tamamlanınca (UI kuralı). Stake: mevcut sözleşme {stake} (kartta 0.5 SOL hedefli ürün vizyonu).",
    card30Trophy: "🏆 Her gün: +15 kupa (toplam 450)",
    prepQuick: "Hızlı Demo — hazırlan",
    prep30: "30 Günlük — hazırlan",
    backToList: "Challenge listesine dön",
    ariaExercise: "Egzersiz seçimi",
    exercisePushup: "Şınav",
    backHome: "Ana Sayfaya Dön",
    msg30ClaimReady:
      "30 günlük programı tamamladın. Aşağıdan ödülünü çekebilirsin.",
    msg30DoneToday: "Bugünün hedefini tamamladın. Yarın görüşürüz!",
    startTodayGoal: "Bugünkü hedefi başlat (10 tekrar)",
    resumeWorkout: "Antrenmanı sürdür",
    rewardHint30:
      "Ödül: 30 gün tamamlandıktan sonra (şu an {day}/30).",
    langTr: "TR",
    langEn: "EN",
    profileBtn: "Profil",
    pastAchievements: "Geçmiş başarılar",
    completedLabel: "Tamamlanan:",
    noChallengesYet: "Henüz kayıtlı challenge yok.",
    ariaProfileHistory: "Tamamlanan challenge geçmişi",
    squatTrackerExercise: "Egzersiz:",
    squatTrackerRep: "Tekrar:",
    squatTrackerPlusRep: "+1 tekrar!",
    squatPhaseSquat: "Alt faz algılandı (diz açısı)",
    squatPhasePushup: "Alt faz algılandı (dirsek açısı)",
    squatLabelSquat: "Squat",
    squatLabelPushup: "Şınav (Push-up)",
    squatCameraPrep:
      "Kamera Hazırlanıyor: Tüm vücudunuz kadraja girecek şekilde uzaklaşın... {seconds}",
    squatErrCamera: "Kamera veya MediaPipe hatası",
  },
  en: {
    squatTrackerLoading: "Loading…",
    errWalletProgram: "Wallet not connected or cannot sign.",
    confirmBackActiveWorkout:
      "Leave the active workout? Progress will be lost and staked SOL cannot be recovered.",
    confirmBackChallenge:
      "Leave the active challenge? Staked SOL cannot be recovered.",
    quickChallengeName: "Quick Demo — {exercise} (+{trophy} 🏆)",
    alertQuickComplete:
      "Nice! Challenge complete. +{trophy} trophy points! You can claim your reward.",
    challengeName30Day: "30-Day Transformation",
    alert30Complete:
      "30-day program complete! +{trophy} trophy points! You can claim your reward.",
    alert30DayProgress:
      "Day {day}/30 done. +{trophy} trophy points! See you tomorrow!",
    errWallet: "Wallet not connected.",
    errPickChallenge: "Pick a challenge first.",
    errNoChallengeId: "No active challenge ID. Stake first.",
    errNotEligible: "You are not eligible for the reward yet.",
    alertClaimSuccess: "Congrats! Reward sent to your wallet!",
    stakeProcessing: "Processing…",
    stakeCta: "Join challenge (0.1 SOL stake)",
    claimProcessing: "Processing…",
    claimCta: "Claim reward",
    claimTitle30NotDone:
      "You can claim after finishing the 30-day program and daily targets.",
    claimTitleNeedComplete: "Complete the task first.",
    heroTagline: "Stake, move, win. Fitness challenges on Web3.",
    profileLoading: "Loading profile…",
    profileTitle: "My profile",
    profileStorageNote: "Data is stored on this device (localStorage).",
    trophyPoints: "Trophy points",
    totalChallenges: "Challenges completed",
    activeProgram: "Active program",
    active30Day: "30-Day Transformation — Day {day}/30",
    quickDemo: "Quick Demo",
    pickChallenge: "Choose a challenge",
    cardQuickBadge: "Instant",
    cardQuickTitle: "Quick Demo (instant reward)",
    cardQuickBody:
      "0.1 SOL stake, 5 reps, then claim right away. MVP flow.",
    cardQuickTrophy: "🏆 Squat: +5 pts · Push-up: +10 pts",
    card30Badge: "Long term",
    card30Title: "30-Day Transformation",
    card30Body:
      "10 squats per day for 30 days. Reward unlocks when 30 days are complete (UI rule). Stake: current program {stake} (0.5 SOL product vision on card).",
    card30Trophy: "🏆 +15 pts per day (450 total)",
    prepQuick: "Quick Demo — get ready",
    prep30: "30-Day — get ready",
    backToList: "Back to challenge list",
    ariaExercise: "Exercise selection",
    exercisePushup: "Push-up",
    backHome: "Back to home",
    msg30ClaimReady:
      "You finished the 30-day program. Claim your reward below.",
    msg30DoneToday: "Today’s goal is done. See you tomorrow!",
    startTodayGoal: "Start today’s goal (10 reps)",
    resumeWorkout: "Continue workout",
    rewardHint30: "Reward: after 30 days complete (currently {day}/30).",
    langTr: "TR",
    langEn: "EN",
    profileBtn: "Profile",
    pastAchievements: "Past achievements",
    completedLabel: "Completed:",
    noChallengesYet: "No completed challenges yet.",
    ariaProfileHistory: "Completed challenge history",
    squatTrackerExercise: "Exercise:",
    squatTrackerRep: "Reps:",
    squatTrackerPlusRep: "+1 rep!",
    squatPhaseSquat: "Bottom phase detected (knee angle)",
    squatPhasePushup: "Bottom phase detected (elbow angle)",
    squatLabelSquat: "Squat",
    squatLabelPushup: "Push-up",
    squatCameraPrep:
      "Preparing camera: step back so your full body is in frame... {seconds}",
    squatErrCamera: "Camera or MediaPipe error",
  },
};

export function createTranslator(locale: Locale) {
  return function t(key: keyof typeof MESSAGES.tr, vars?: Vars): string {
    const raw = MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
    return interpolate(raw, vars);
  };
}

export type TranslateFn = ReturnType<typeof createTranslator>;
