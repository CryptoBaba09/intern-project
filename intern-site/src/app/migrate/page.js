import MigrateView from "./MigrateView";

export const metadata = {
  title: "Migrate v1 → v2",
  description:
    "Swap v1 $INTERN for the live v2 token, fixed 1:1. Unstake from the old contract first if needed — this walks you through both steps.",
};

export default function MigratePage() {
  return <MigrateView />;
}
