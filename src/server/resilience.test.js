import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

const RESILIENCE_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 50,
  backoffFactor: 2,
};

async function executeWithRetry(operation, retries = RESILIENCE_CONFIG.maxRetries, delay = RESILIENCE_CONFIG.baseDelayMs) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      if (attempt > retries) {
        throw error;
      }
      await new Promise((res) => setTimeout(res, delay));
      delay *= RESILIENCE_CONFIG.backoffFactor;
    }
  }
}

async function loginService(userFindMock) {
  try {
    const user = await executeWithRetry(userFindMock);
    return { status: 200, data: user };
  } catch (error) {
    return {
      status: 503,
      headers: { "Retry-After": "5" },
      body: {
        status: "degraded",
        message: "Сервіс автентифікації тимчасово переведений у режим деградації через збій БД.",
        retriesExecuted: RESILIENCE_CONFIG.maxRetries,
      },
    };
  }
}

describe("Resilience Engineering & Graceful Degradation (ISO/IEC 25010)", () => {
  test("Positive Check: при успішній відповіді залежності Fallback не активується", async () => {
    const mockDbFind = mock.fn(async () => ({ email: "test@example.com", name: "User" }));

    const result = await loginService(mockDbFind);

    assert.equal(result.status, 200);
    assert.equal(result.data.email, "test@example.com");
    assert.equal(mockDbFind.mock.callCount(), 1);
  });

  test("Resilience Test: при відмові СУБД виконується рівно 3 спроби і повертається статус 503 Fallback", async () => {
    const mockDbFailure = mock.fn(async () => {
      throw new Error("MongoNetworkTimeoutError: connection timed out");
    });

    const result = await loginService(mockDbFailure);

    assert.equal(mockDbFailure.mock.callCount(), RESILIENCE_CONFIG.maxRetries + 1);
    assert.equal(result.status, 503);
    assert.equal(result.headers["Retry-After"], "5");
    assert.equal(result.body.status, "degraded");
    assert.equal(result.body.retriesExecuted, 3);
    assert.ok(result.body.message.includes("режим деградації"));
  });
});