import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getEnabledLayers,
  getLogLevel,
  isLayerEnabled,
  LayerLogger,
  resetLayerLoggingConfig,
} from './layer-logging.js';

describe('layer-logging', () => {
  afterEach(() => {
    resetLayerLoggingConfig();
    vi.unstubAllEnvs();
  });

  it('defaults to all layers and log severity', () => {
    vi.stubEnv('LOGLEVEL', '');
    vi.stubEnv('LOG_LAYERS', '');
    resetLayerLoggingConfig();
    expect(getLogLevel()).toBe('log');
    expect(getEnabledLayers().size).toBe(5);
    expect(isLayerEnabled('outbound')).toBe(true);
  });

  it('parses LOG_LAYERS subset', () => {
    vi.stubEnv('LOG_LAYERS', 'outbound,inbound');
    resetLayerLoggingConfig();
    expect(isLayerEnabled('outbound')).toBe(true);
    expect(isLayerEnabled('inbound')).toBe(true);
    expect(isLayerEnabled('application')).toBe(false);
    expect(isLayerEnabled('http')).toBe(false);
  });

  it('accepts LOGLEVEL=debug alias info→log', () => {
    vi.stubEnv('LOGLEVEL', 'debug');
    resetLayerLoggingConfig();
    expect(getLogLevel()).toBe('debug');
    vi.stubEnv('LOGLEVEL', 'info');
    resetLayerLoggingConfig();
    expect(getLogLevel()).toBe('log');
  });

  it('dtoConverted is a no-op when layer disabled', () => {
    vi.stubEnv('LOG_LAYERS', 'http');
    vi.stubEnv('LOGLEVEL', 'debug');
    resetLayerLoggingConfig();
    const logger = LayerLogger.for('outbound', 'Test');
    expect(() =>
      logger.dtoConverted({ from: 'ESI', to: 'Dto', count: 1, ids: [1] }),
    ).not.toThrow();
  });
});
