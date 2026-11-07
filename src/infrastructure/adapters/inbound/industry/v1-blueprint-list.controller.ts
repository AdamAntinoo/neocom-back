import { Controller, Get, Inject, Param, ParseIntPipe, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  BLUEPRINT_LIST,
  type BlueprintListPort,
} from '@Domain/ports/blueprint-list.port.js';
import { SseFanoutService, type SseMessage } from '@Outbound/sse-fanout/sse-fanout.service.js';

/** Manufacture async list + SSE (BASSE-006). Distinct from sync Industry GET /v1/pilots/:pilotId/blueprints. */
@Controller('v1/pilots/:pilotId/manufacture')
export class V1BlueprintListController {
  constructor(
    @Inject(BLUEPRINT_LIST) private readonly blueprints: BlueprintListPort,
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
