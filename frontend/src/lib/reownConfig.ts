// Deliberately has zero imports from @reown/appkit — this must stay cheap
// enough to evaluate synchronously as part of the app's core chunk, so
// ReplicourtProvider can decide whether to even attempt loading the (large)
// wallet SDK chunk without waiting on it first. See WalletProvider.tsx for
// where the actual SDK gets pulled in.
export const REOWN_PROJECT_ID = import.meta.env.VITE_REOWN_PROJECT_ID as string | undefined;
export const REOWN_ENABLED = Boolean(REOWN_PROJECT_ID);
