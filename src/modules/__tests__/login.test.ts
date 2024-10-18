import { describe, it, expect, vi } from 'vitest';
import { defineModule, buildModules } from '../../common/module';
import { backendApi } from '../backendApi';
import { settings } from '../settings';
import { RESP_CODES } from '@/common/constants';

describe('login module', async () => {
  it('should successfully log in with correct credentials', async () => {
    const env = await buildModules({backendApi, settings});
    env.settings.serverUrl.value = 'localhost:8081';
    const result = await env.backendApi.login({ password: "Stardust's Next Outliner 2017949" });
    expect(result.data).toBeDefined();
  });

  it('should fail to log in with incorrect password', async () => {
    const env = await buildModules({backendApi, settings});
    env.settings.serverUrl.value = 'localhost:8081';
    const result = await env.backendApi.login({ password: "incorrect password" });
    expect(result.code).toBe(RESP_CODES.PASSWORD_INCORRECT);
  });
});
