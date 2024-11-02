import { createSavePoint, getAllSavePoints } from "@/common/api/timeMachine";
import { RESP_CODES } from "@/common/constants";
import { useLoginedEnv } from "@/utils/vitest"
import { describe, expect, it } from "vitest";

const getEnv = useLoginedEnv();

describe("savepoints", () => {
  it("create a new savepoint", async () => {
    const env = getEnv();
    const resp = await createSavePoint({ location: env.settings.location.value, label: "test1" });
    expect(resp.code).toEqual(RESP_CODES.SUCCESS);
  })

  it("should get all savepoints", async () => {
    const env = getEnv();
    const resp = await getAllSavePoints({ location: env.settings.location.value });
    expect(resp.code).toEqual(RESP_CODES.SUCCESS);
  })
})