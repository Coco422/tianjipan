export interface OptionOdds {
  optionId: string;
  label: string;
  totalWagered: number;
  impliedOdds: number;
  impliedProb: number;
  bettorCount: number;
}

export interface MarketOdds {
  totalPool: number;
  rakeAmount: number;
  distributable: number;
  options: OptionOdds[];
}

interface BetForOdds {
  optionId: string;
  amount: number;
}

interface OptionForOdds {
  id: string;
  label: string;
}

export function calculateOdds(
  options: OptionForOdds[],
  bets: BetForOdds[],
  rakePercent: number = 5
): MarketOdds {
  const totalPool = bets.reduce((sum, b) => sum + b.amount, 0);
  const rakeAmount = Math.floor((totalPool * rakePercent) / 100);
  const distributable = totalPool - rakeAmount;

  const optionData = options.map((opt) => {
    const betsOnOption = bets.filter((b) => b.optionId === opt.id);
    const winnerPool = betsOnOption.reduce((sum, b) => sum + b.amount, 0);

    return {
      optionId: opt.id,
      label: opt.label,
      totalWagered: winnerPool,
      impliedOdds: winnerPool > 0 ? distributable / winnerPool : 0,
      impliedProb: totalPool > 0 ? (winnerPool / totalPool) * 100 : 0,
      bettorCount: betsOnOption.length,
    };
  });

  return { totalPool, rakeAmount, distributable, options: optionData };
}
