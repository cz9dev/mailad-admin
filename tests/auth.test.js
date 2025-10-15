// tests/auth.test.js
const request = require("supertest");
const app = require("../app");

describe("Authentication", () => {
  it("should reject login without credentials", async () => {
    const response = await request(app).post("/auth/login").send({});

    expect(response.status).toBe(401);
  });
});
