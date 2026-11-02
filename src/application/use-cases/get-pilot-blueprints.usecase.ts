import { Inject, Injectable } from '@nestjs/common';
import { INDUSTRY_PORT, type BlueprintV1, type IndustryPort } from 'neocom-domain';

@Injectable()
export class GetPilotBlueprintsUseCase {
  constructor(@Inject(INDUSTRY_PORT) private readonly industry: IndustryPort) {}

  execute(pilotId: number): Promise<BlueprintV1[]> {
    return this.industry.getPilotBlueprints(pilotId);
  }
}
