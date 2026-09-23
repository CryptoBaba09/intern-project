import CacheView from "./CacheView";

export const metadata = {
  title: "Cache — Deposit, Borrow, or Earn Yield | $INTERN",
  description:
    "Cache, the Yield & Borrow Intern: deposit USDG to earn real yield, or post a tokenized stock as collateral to borrow USDG against it, or supply USDG directly and earn from real borrowers. Non-custodial. 0.2% skimmed once, burned into $INTERN.",
};

export default function CachePage() {
  return <CacheView />;
}
