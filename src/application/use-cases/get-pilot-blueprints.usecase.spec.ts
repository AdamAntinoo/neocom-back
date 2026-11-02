import { describe, expect, it, vi } from 'vitest';
import { BlueprintV1, type IndustryPort } from 'neocom-domain';
import { GetPilotBlueprintsUseCase } from './get-pilot-blueprints.usecase.js';

describe('GetPilotBlueprintsUseCase', () => {
  it('returns blueprints from the industry port', async () => {
    const sample = new BlueprintV1({
      blueprintId: 1,
      blueprintTypeId: 10,
      blueprintTypeName: '',
      outputTypeId: 0,
      outputTypeName: '',
      runs: 5,
      materialEfficiency: 10,
      timeEfficiency: 20,
      maxRuns: 0,
    });
    const industry: IndustryPort = {
      getPilotBlueprints: vi.fn().mockResolvedValue([sample]),
    };
    const useCase = new GetPilotBlueprintsUseCase(industry);
    await expect(useCase.execute(42)).resolves.toEqual([sample]);
    expect(industry.getPilotBlueprints).toHaveBeenCalledWith(42);
  });
});
