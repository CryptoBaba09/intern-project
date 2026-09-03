import InferenceCreditsView from "./InferenceCreditsView";

export const metadata = {
  title: "Inference Credits",
  description:
    "Preview: staked $INTERN would earn a pro-rata share of real LLM inference credit (Claude, GPT, Gemini via OpenRouter), burning an equal dollar of $INTERN per credit issued. Not live yet.",
};

export default function InferenceCreditsPage() {
  return <InferenceCreditsView />;
}
