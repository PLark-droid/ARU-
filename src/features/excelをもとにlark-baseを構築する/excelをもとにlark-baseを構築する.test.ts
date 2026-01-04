/**
 * ExcelをもとにLark Baseを構築する - Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExcelをもとにlarkBaseを構築する } from './index.js';

describe('ExcelをもとにlarkBaseを構築する', () => {
  let instance: ExcelをもとにlarkBaseを構築する;

  beforeEach(() => {
    instance = new ExcelをもとにlarkBaseを構築する({ debug: false });
  });

  it('should initialize successfully', async () => {
    await expect(instance.initialize()).resolves.not.toThrow();
  });

  it('should execute without errors', async () => {
    await instance.initialize();
    await expect(instance.execute()).resolves.not.toThrow();
  });

  it('should cleanup resources', async () => {
    await instance.initialize();
    await instance.execute();
    await expect(instance.cleanup()).resolves.not.toThrow();
  });
});
