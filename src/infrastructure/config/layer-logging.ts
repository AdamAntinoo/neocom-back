import { Logger } from '@nestjs/common';

/**
 * Hexagonal / request layers that can be toggled independently via env.
 *
 * Configure with:
 * - `LOGLEVEL` — Nest-style floor: `error` | `warn` | `log` | `debug` | `verbose` (default `log`)
 * - `LOG_LAYERS` — comma list of layers to enable, or `*` / `all` (default `*`)
 *
 * Examples:
 * - `LOG_LAYERS=outbound` — only outbound adapter logs
 * - `LOG_LAYERS=inbound,outbound,http` — adapters + request middleware
 */
export type LogLayer =
  'http' | 'inbound' | 'application' | 'domain' | 'outbound';

const ALL_LAYERS: readonly LogLayer[] = [
  'http',
  'inbound',
  'application',
  'domain',
  'outbound',
] as const;

export type LogSeverity = 'error' | 'warn' | 'log' | 'debug' | 'verbose';

const SEVERITY_RANK: Record<LogSeverity, number> = {
  error: 0,
  warn: 1,
  log: 2,
  debug: 3,
  verbose: 4,
};

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value != null && value.trim() !== '' ? value.trim() : undefined;
}

function parseLogLevel(raw: string | undefined): LogSeverity {
  const key = (raw ?? 'log').toLowerCase();
  if (
    key === 'error' ||
    key === 'warn' ||
    key === 'log' ||
    key === 'debug' ||
    key === 'verbose'
  ) {
    return key;
  }
  // Accept common alias from .env.application
  if (key === 'info') {
    return 'log';
  }
  return 'log';
}

function parseEnabledLayers(raw: string | undefined): ReadonlySet<LogLayer> {
  if (raw == null || raw === '*' || raw.toLowerCase() === 'all') {
    return new Set(ALL_LAYERS);
  }
  const enabled = new Set<LogLayer>();
  for (const part of raw.split(',')) {
    const layer = part.trim().toLowerCase() as LogLayer;
    if ((ALL_LAYERS as readonly string[]).includes(layer)) {
      enabled.add(layer);
    }
  }
  return enabled;
}

let cachedLevel: LogSeverity | undefined;
let cachedLayers: ReadonlySet<LogLayer> | undefined;

/** Re-read env (tests / hot reload). */
export function resetLayerLoggingConfig(): void {
  cachedLevel = undefined;
  cachedLayers = undefined;
}

export function getLogLevel(): LogSeverity {
  if (cachedLevel === undefined) {
    cachedLevel = parseLogLevel(readEnv('LOGLEVEL') ?? readEnv('LOG_LEVEL'));
  }
  return cachedLevel;
}

export function getEnabledLayers(): ReadonlySet<LogLayer> {
  if (cachedLayers === undefined) {
    cachedLayers = parseEnabledLayers(readEnv('LOG_LAYERS'));
  }
  return cachedLayers;
}

export function isLayerEnabled(layer: LogLayer): boolean {
  return getEnabledLayers().has(layer);
}

function severityAllowed(severity: LogSeverity): boolean {
  return SEVERITY_RANK[severity] <= SEVERITY_RANK[getLogLevel()];
}

/**
 * Nest Logger scoped to a hexagonal layer. No-ops when the layer is disabled
 * or when the message severity is below `LOGLEVEL`.
 */
export class LayerLogger {
  private readonly nest: Logger;

  constructor(
    private readonly layer: LogLayer,
    context: string,
  ) {
    this.nest = new Logger(`${layer}:${context}`);
  }

  static for(layer: LogLayer, context: string): LayerLogger {
    return new LayerLogger(layer, context);
  }

  error(message: unknown, ...optional: unknown[]): void {
    if (isLayerEnabled(this.layer) && severityAllowed('error')) {
      this.nest.error(message as never, ...(optional as never[]));
    }
  }

  warn(message: unknown, ...optional: unknown[]): void {
    if (isLayerEnabled(this.layer) && severityAllowed('warn')) {
      this.nest.warn(message as never, ...(optional as never[]));
    }
  }

  log(message: unknown, ...optional: unknown[]): void {
    if (isLayerEnabled(this.layer) && severityAllowed('log')) {
      this.nest.log(message as never, ...(optional as never[]));
    }
  }

  debug(message: unknown, ...optional: unknown[]): void {
    if (isLayerEnabled(this.layer) && severityAllowed('debug')) {
      this.nest.debug(message as never, ...(optional as never[]));
    }
  }

  verbose(message: unknown, ...optional: unknown[]): void {
    if (isLayerEnabled(this.layer) && severityAllowed('verbose')) {
      this.nest.verbose(message as never, ...(optional as never[]));
    }
  }

  /**
   * Record an origin → DTO conversion (adapter / converter).
   * Logs a compact summary — not full payloads.
   */
  dtoConverted(detail: {
    from: string;
    to: string;
    count?: number;
    ids?: ReadonlyArray<string | number>;
    fields?: Record<string, unknown>;
  }): void {
    this.debug('dto.converted', {
      layer: this.layer,
      from: detail.from,
      to: detail.to,
      ...(detail.count !== undefined ? { count: detail.count } : {}),
      ...(detail.ids !== undefined ? { ids: detail.ids.slice(0, 20) } : {}),
      ...(detail.fields !== undefined ? { fields: detail.fields } : {}),
    });
  }
}
