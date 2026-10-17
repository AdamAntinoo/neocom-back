import { Controller, Get, Param, ParseIntPipe, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { BlueprintListService } from '../../../async/blueprint-list.service.js';
import { SseFanoutService, type SseMessage } from '../../../async/sse-fanout.service.js';

@Controller('v1/pilots/:pilotId/manufacture')
export class V1BlueprintListController {
  constructor(
    private readonly blueprints: BlueprintListService,
    private readonly fanout: SseFanoutService,
  ) {}

  /** HTTP list — returns partial/stale immediately; enrichment continues in background. */
  @Get('blueprints')
  list(@Param('pilotId', ParseIntPipe) pilotId: number) {
    return this.blueprints.getList(pilotId);
  }

  /** Scoped SSE stream for enrichment push (BASSE-001, BASSE-007). */
  @Sse('blueprints/events')
  events(@Param('pilotId', ParseIntPipe) pilotId: number): Observable<SseMessage> {
    return this.fanout.stream(this.blueprints.scopeKey(pilotId));
  }
}
