import { LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { AppModule } from './app.module.js';

const nestVersion = (
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../node_modules/@nestjs/core/package.json', import.meta.url)),
      'utf8',
    ),
  ) as { version: string }
).version;

const START_YELLOW = '\x1b[33m\x1b[1m';
const START_GREEN = '\x1b[32m\x1b[1m';
const START_RED = '\x1b[31m\x1b[1m';
const END_ENHANCED = '\x1b[0m';

function loggers(level: string): LogLevel[] {
  if (level === 'info' || level === 'log') {
    return ['fatal', 'error', 'warn', 'log'];
  }
  if (level === 'prod') {
    return ['fatal', 'error', 'warn'];
  }
  return ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'];
}

function printData(configService: ConfigService) {
  const port = configService.get<number>('PORT') || 3000;
  const logLevel = process.env.LOGLEVEL;
  console.log('Nest JS Server version: ' + START_GREEN + nestVersion + END_ENHANCED);
  console.log('Reading environment: ' + START_YELLOW + process.env.ENVIRONMENT + END_ENHANCED);
  console.log('Running environment: ' + START_YELLOW + process.env.NODE_ENV + END_ENHANCED);
  console.log('Version: ' + START_YELLOW + process.env.VERSION + END_ENHANCED);
  console.log('LogLevel: ' + START_RED + logLevel + END_ENHANCED);
  console.log('Listening on port: ' + START_YELLOW + port + END_ENHANCED);
}

async function bootstrap() {
  let logLevel = process.env.LOGLEVEL;
  if (logLevel === undefined) {
    logLevel = 'debug';
  }
  const app = await NestFactory.create(AppModule, { logger: loggers(logLevel) });
  app.use(cookieParser());
  const configService = app.get(ConfigService);
  const port = Number(configService.get('PORT')) || 3000;
  await app.listen(port);

  const bannerFile = configService.get<string>('BANNER');
  printData(configService);
  if (bannerFile === undefined) {
    console.log('BANNER NOT DEFINED.');
  } else {
    console.log(await readFile(bannerFile, 'utf8'));
  }
  console.log(START_GREEN + '>>> Server Ready for Connections <<<' + END_ENHANCED);
}

await bootstrap();
