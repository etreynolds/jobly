"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    u1Token,
    u3TokenAdmin,
    testJobs
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
    const newJob = {
        title: "Janitor",
        salary: 75000,
        equity: 0,
        companyHandle: 'c3'
    };

    test("ok for admin", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u3TokenAdmin}`);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            job: {
                ...newJob,
                id: expect.any(Number),
                equity: "0"
            }
        });
    });

    test("bad request with missing data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                title: "arborist",
                salary: 40000
            })
            .set("authorization", `Bearer ${u3TokenAdmin}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request with invalid data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                ...newJob,
                salary: "not-a-number",
            })
            .set("authorization", `Bearer ${u3TokenAdmin}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("unauthorized request from non-admin user", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
        expect(resp.body).toEqual({ "error": { "message": "Unauthorized", "status": 401 } });
    });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
    test("ok for anon", async function () {
        const resp = await request(app).get("/jobs");
        expect(resp.body).toEqual({
            jobs:
                [
                    {
                        id: expect.any(Number),
                        title: "Accountant",
                        salary: 70000,
                        equity: "0.2",
                        companyHandle: "c1"
                    },
                    {
                        id: expect.any(Number),
                        title: "Nurse",
                        salary: 60000,
                        equity: "0.1",
                        companyHandle: "c2"
                    },
                    {
                        id: expect.any(Number),
                        title: "Software Engineer",
                        salary: 50000,
                        equity: "0",
                        companyHandle: "c1"
                    }
                ]
        });
    });

    test("ok for request with filters in query parameters", async function () {
        const resp = await request(app).get("/jobs?title=E&minSalary=55000");
        expect(resp.body).toEqual({
            jobs:
                [
                    {
                        id: expect.any(Number),
                        title: "Nurse",
                        salary: 60000,
                        equity: "0.1",
                        companyHandle: "c2"
                    }
                ]
        });
        const resp2 = await request(app).get("/jobs?hasEquity=true");
        expect(resp2.body).toEqual({
            jobs:
                [
                    {
                        id: expect.any(Number),
                        title: "Accountant",
                        salary: 70000,
                        equity: "0.2",
                        companyHandle: "c1"
                    },
                    {
                        id: expect.any(Number),
                        title: "Nurse",
                        salary: 60000,
                        equity: "0.1",
                        companyHandle: "c2"
                    }
                ]
        });
    });

    test("throws proper error for request with bad filters", async function () {
        const resp = await request(app).get("/jobs?minEmployees=2&title=nurse");
        expect(resp.status).toBe(400)
        expect(resp.body).toEqual({
            "error": {
                "message": "minEmployees is not an correct filter parameter. Filter parameters allowed: title, minSalary, and hasEquity",
                "status": 400
            }
        });
    });

    test("fails: test next() handler", async function () {
        // there's no normal failure event which will cause this route to fail ---
        // thus making it hard to test that the error-handler works with it. This
        // should cause an error, all right :)
        await db.query("DROP TABLE jobs CASCADE");
        const resp = await request(app)
            .get("/jobs")
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(500);
    });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
    test("works for anon", async function () {
        const resp = await request(app).get(`/jobs/${testJobs[0].id}`);
        expect(resp.body).toEqual({
            job: {
                id: testJobs[0].id,
                title: "Software Engineer",
                salary: 50000,
                equity: "0",
                companyHandle: "c1"
            },
        });
    });

    test("not found for no such job", async function () {
        const resp = await request(app).get(`/jobs/189462`);
        expect(resp.statusCode).toEqual(404);
    });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
    test("works for admin", async function () {
        const resp = await request(app)
            .patch(`/jobs/${testJobs[1].id}`)
            .send({
                title: "Nurse Practitioner",
            })
            .set("authorization", `Bearer ${u3TokenAdmin}`);
        expect(resp.body).toEqual({
            job: {
                id: testJobs[1].id,
                title: "Nurse Practitioner",
                salary: 60000,
                equity: "0.1",
                companyHandle: "c2"
            },
        });
    });

    test("unauth for anon", async function () {
        const resp = await request(app)
            .patch(`/jobs/${testJobs[1].id}`)
            .send({
                title: "Nursing Assistant",
            });
        expect(resp.statusCode).toEqual(401);
    });

    test("unauth for non_admin", async function () {
        const resp = await request(app)
            .patch(`/jobs/${testJobs[1].id}`)
            .send({
                title: "Nursing Assistant",
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
        expect(resp.body).toEqual({ "error": { "message": "Unauthorized", "status": 401 } });
    });

    test("not found on no such job", async function () {
        const resp = await request(app)
            .patch(`/jobs/184056`)
            .send({
                title: "won't find it",
            })
            .set("authorization", `Bearer ${u3TokenAdmin}`);
        expect(resp.statusCode).toEqual(404);
    });

    test("bad request on id change attempt", async function () {
        const resp = await request(app)
            .patch(`/jobs/${testJobs[1].id}`)
            .send({
                id: 45,
            })
            .set("authorization", `Bearer ${u3TokenAdmin}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request on invalid data", async function () {
        const resp = await request(app)
            .patch(`/jobs/${testJobs[1].id}`)
            .send({
                salary: "not-a-number",
            })
            .set("authorization", `Bearer ${u3TokenAdmin}`);
        expect(resp.statusCode).toEqual(400);
    });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
    test("works for admin", async function () {
        const resp = await request(app)
            .delete(`/jobs/${testJobs[1].id}`)
            .set("authorization", `Bearer ${u3TokenAdmin}`);
        expect(resp.body).toEqual({ deleted: `${testJobs[1].id}` });
    });

    test("unauth for anon", async function () {
        const resp = await request(app)
            .delete(`/jobs/${testJobs[1].id}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("unauth for non-admin", async function () {
        const resp = await request(app)
            .delete(`/jobs/${testJobs[1].id}`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
        expect(resp.body).toEqual({ "error": { "message": "Unauthorized", "status": 401 } });
    });

    test("not found for no such job", async function () {
        const resp = await request(app)
            .delete(`/jobs/546812`)
            .set("authorization", `Bearer ${u3TokenAdmin}`);
        expect(resp.statusCode).toEqual(404);
    });
});
