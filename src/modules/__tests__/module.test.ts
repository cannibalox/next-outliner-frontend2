import { describe, it, expect } from 'vitest';
import { defineModule, buildModules } from '../../common/module';

describe('wireModules', () => {
  it('should correctly wire and build modules', async () => {
    const moduleA = defineModule(
      'moduleA',
      {},
      () => ({ valueA: 'A' })
    );

    const moduleB = defineModule(
      'moduleB',
      { moduleaaa: moduleA },
      ({ moduleaaa }) => ({ valueB: moduleaaa.valueA + 'B' })
    );

    const moduleC = defineModule(
      'moduleC',
      { moduleA, moduleB },
      ({ moduleA, moduleB }) => ({ valueC: moduleA.valueA + moduleB.valueB + 'C' })
    );

    const wiredModules = await buildModules({
      moduleA,
      moduleB,
      moduleC
    });

    expect(wiredModules.moduleA.valueA).toBe('A');
    expect(wiredModules.moduleB.valueB).toBe('AB');
    expect(wiredModules.moduleC.valueC).toBe('AABC');
  });
});
