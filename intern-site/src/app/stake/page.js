import StakeView from "./StakeView";

export const metadata = {
  title: "Stake",
  description:
    "Stake $INTERN to earn a time-weighted, pro-rata share of BE streamed from every creator fee claim. Non-custodial — unstake any time.",
};

export default function StakePage() {
  return <StakeView />;
}
