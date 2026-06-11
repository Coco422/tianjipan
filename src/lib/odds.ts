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
  bets: BetForOdds[]
): MarketOdds {
  const totalPool = bets.reduce((sum, b) => sum + b.amount, 0);

  const optionData = options.map((opt) => {
    const betsOnOption = bets.filter((b) => b.optionId === opt.id);
    const winnerPool = betsOnOption.reduce((sum, b) => sum + b.amount, 0);

    return {
      optionId: opt.id,
      label: opt.label,
      totalWagered: winnerPool,
      impliedOdds: winnerPool > 0 ? totalPool / winnerPool : 0,
      impliedProb: totalPool > 0 ? (winnerPool / totalPool) * 100 : 0,
      bettorCount: betsOnOption.length,
    };
  });

  return { totalPool, options: optionData };
}
