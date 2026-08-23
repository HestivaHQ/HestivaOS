import {
  calculateConsumablesMinor,
  calculateDeploymentMinor,
  calculateEquipmentReserveMinor,
  calculateLabourMinor,
  calculateMinimumContributionMinor,
  calculateOverheadMinor,
  resolveApprovedCleanerHours,
} from './approved-quote-cost-model';
import type {
  QuoteOperationalCostCandidate,
  QuoteOperationalCostProvider,
  QuotePricingSubmission,
} from './quote-operational-cost-source';

export type AllocatedRouteDistanceResult = {
  allocatedRouteKm: number | null;
  provenance?: string;
};

export type AllocatedRouteDistanceResolver = {
  resolve(submission: QuotePricingSubmission): Promise<AllocatedRouteDistanceResult> | AllocatedRouteDistanceResult;
};

export type ApprovedQuoteOperationalCostProviderOptions = {
  coidaRate: number | null;
  routeDistanceResolver: AllocatedRouteDistanceResolver;
};

/**
 * Production-oriented implementation of the approved six-bucket quote cost model.
 * It deliberately fails closed when a factual dependency is unavailable: cleaner-hours,
 * the actual COIDA assessed rate, or allocated actual-road route kilometres.
 */
export class ApprovedQuoteOperationalCostProvider implements QuoteOperationalCostProvider {
  constructor(private readonly options: ApprovedQuoteOperationalCostProviderOptions) {}

  async resolve(submission: QuotePricingSubmission): Promise<QuoteOperationalCostCandidate> {
    const cleanerHours = resolveApprovedCleanerHours(submission);
    const route = await this.options.routeDistanceResolver.resolve(submission);
    const candidate: QuoteOperationalCostCandidate = { provenance: {} };

    if (cleanerHours.kind === 'READY') {
      candidate.consumablesMinor = calculateConsumablesMinor(
        submission.request.primaryService.canonicalService ?? '',
        cleanerHours.cleanerHours,
      );
      candidate.equipmentVehicleReserveMinor = calculateEquipmentReserveMinor(cleanerHours.cleanerHours);
      candidate.overheadMinor = calculateOverheadMinor(cleanerHours.cleanerHours);
      candidate.provenance!.consumablesMinor = 'approved-consumables-model:v1';
      candidate.provenance!.equipmentVehicleReserveMinor = 'approved-equipment-reserve:v1';
      candidate.provenance!.overheadMinor = 'approved-overhead-model:v1';

      if (this.options.coidaRate !== null) {
        candidate.labourMinor = calculateLabourMinor(cleanerHours.cleanerHours, this.options.coidaRate);
        candidate.provenance!.labourMinor = `approved-labour-model:v1;coida-rate=${this.options.coidaRate}`;
      } else {
        candidate.provenance!.labourMinor = 'approved-labour-model:v1;coida-rate=unresolved';
      }
    } else {
      const provenance = `${cleanerHours.provenance};${cleanerHours.reason}`;
      candidate.provenance!.labourMinor = provenance;
      candidate.provenance!.consumablesMinor = provenance;
      candidate.provenance!.equipmentVehicleReserveMinor = provenance;
      candidate.provenance!.overheadMinor = provenance;
    }

    if (route.allocatedRouteKm !== null) {
      candidate.deploymentMinor = calculateDeploymentMinor(route.allocatedRouteKm);
      candidate.provenance!.deploymentMinor = route.provenance ?? 'allocated-road-route-km:v1';
    } else {
      candidate.provenance!.deploymentMinor = route.provenance ?? 'allocated-road-route-km:unresolved';
    }

    const firstFive = [
      candidate.labourMinor,
      candidate.deploymentMinor,
      candidate.consumablesMinor,
      candidate.equipmentVehicleReserveMinor,
      candidate.overheadMinor,
    ];
    if (firstFive.every((value): value is number => typeof value === 'number')) {
      const costTotal = firstFive.reduce((sum, value) => sum + value, 0);
      candidate.minimumContributionMinor = calculateMinimumContributionMinor(costTotal);
      candidate.provenance!.minimumContributionMinor = 'approved-minimum-contribution:v1;20pct-margin-or-R100';
    } else {
      candidate.provenance!.minimumContributionMinor = 'approved-minimum-contribution:v1;dependent-costs-unresolved';
    }

    return candidate;
  }
}

export class UnavailableAllocatedRouteDistanceResolver implements AllocatedRouteDistanceResolver {
  resolve(): AllocatedRouteDistanceResult {
    return {
      allocatedRouteKm: null,
      provenance: 'allocated-road-route-km:resolver-not-configured',
    };
  }
}
