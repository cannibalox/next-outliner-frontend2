import { fetchWebpageTitle } from "@/common/api/misc";
import { useLoginedEnv } from "@/utils/vitest";
import { describe, it, expect } from 'vitest';

useLoginedEnv();

describe("fetch web url title", async () => {
  it("should fetch title", async () => {
    const resp = await fetchWebpageTitle({ webpageUrl: "www.baidu.com" });
    expect(resp.data?.title).toEqual("百度一下，你就知道");
  });
})