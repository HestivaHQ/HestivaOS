import type {
  QuoteOperationalCostCandidate,
  QuoteOperationalCostComponent,
  QuoteOperationalCostProvider,
  QuotePricingSubmission,
} from './quote-operational-cost-source';

export type QuoteOperationalCostComponentResult = {
  amountMinor: number | null | undefined;
  provenance?: string;
};

export type QuoteOperationalCostComponentResolver = (
  submission: QuotePricingSubmission,
) => Promise<QuoteOperationalCostComponentResult> | QuoteOperationalCostComponentResult;

export type QuoteOperationalCostResolvers = Record<
  QuoteOperationalCostComponent,
  QuoteOperationalCostComponentResolver
>;

/**
 * Composes independent authoritative cost subsystems into one booking-level snapshot.
 * Resolver implementations own the business method for their category; this class only
 * combines results and preserves provenance. Missing values stay missing so downstream
 * validation can fail closed.
 */
export class CompositeQuoteOperationalCostProvider implements QuoteOperationalCostProvider {
  constructor(private readonly resolvers: QuoteOperationalCostResolvers) {}

  async resolve(submission: QuotePricingSubmission): Promise<QuoteOperationalCostCandidate> {
    const entries = await Promise.all(
      Object.entries(this.resolvers).map(async ([component, resolver]) => {
        const result = await resolver(submission);
        return [component as QuoteOperationalCostComponent, result] as const;
      }),
    );

    const candidate: QuoteOperationalCostCandidate = { provenance: {} };

    for (const [component, result] of entries) {
      if (result.amountMinor !== undefined && result.amountMinor !== null) {
        candidate[component] = result.amountMinor;
      }
      if (result.provenance) {
        candidate.provenance![component] = result.provenance;
      }
    }

    return candidate;
  }
}
