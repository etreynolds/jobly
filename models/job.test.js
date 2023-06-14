"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    testJobs
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
    const newJob = {
        title: "Janitor",
        salary: 75000,
        equity: 0,
        companyHandle: 'c3'
    };

    test("works", async function () {
        let job = await Job.create(newJob);
        expect(job).toEqual({ ...newJob, id: expect.any(Number), equity: "0" });

        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${job.id}`);
        expect(result.rows).toEqual([
            {
                id: job.id,
                title: "Janitor",
                salary: 75000,
                equity: "0",
                company_handle: 'c3'
            },
        ]);
    });
});

/************************************** findAll */

describe("findAll", function () {
    test("works: no filter", async function () {
        let jobs = await Job.findAll();
        expect(jobs).toEqual([
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
            },

        ]);
    });
});

/************************************** findFiltered */

describe("findFiltered: find jobs with filtering parameters", function () {
    test("works: filtering by title regardless of capitalization match", async function () {
        const jobs1 = await Job.findFiltered({ title: 'nurse' });
        const jobs2 = await Job.findFiltered({ title: 'NuRsE' });
        const expectedJobs = [{
            id: expect.any(Number),
            title: "Nurse",
            salary: 60000,
            equity: "0.1",
            companyHandle: "c2"
        }];
        expect(jobs1).toEqual(expectedJobs);
        expect(jobs2).toEqual(expectedJobs);
    });

    test("works: filtering by partial title", async function () {
        const jobs = await Job.findFiltered({ title: 'ware' });
        expect(jobs).toEqual([
            {
                id: expect.any(Number),
                title: "Software Engineer",
                salary: 50000,
                equity: "0",
                companyHandle: "c1"
            }
        ]);
    });

    test("works: filtering by minSalary", async function () {
        const jobs1 = await Job.findFiltered({ minSalary: 60000 });
        const jobs2 = await Job.findFiltered({ minSalary: 61000 });
        const job1 = {
            id: expect.any(Number),
            title: "Nurse",
            salary: 60000,
            equity: "0.1",
            companyHandle: "c2"
        };
        const job2 = {
            id: expect.any(Number),
            title: "Accountant",
            salary: 70000,
            equity: "0.2",
            companyHandle: "c1"
        };
        expect(jobs1).toEqual([job2, job1]);
        expect(jobs2).toEqual([job2]);
    });

    test("works: filtering by hasEquity", async function () {
        const jobs1 = await Job.findFiltered({ hasEquity: true });
        const jobs2 = await Job.findFiltered({ hasEquity: false });
        const job1 = {
            id: expect.any(Number),
            title: "Nurse",
            salary: 60000,
            equity: "0.1",
            companyHandle: "c2"
        };
        const job2 = {
            id: expect.any(Number),
            title: "Accountant",
            salary: 70000,
            equity: "0.2",
            companyHandle: "c1"
        };
        const job3 = {
            id: expect.any(Number),
            title: "Software Engineer",
            salary: 50000,
            equity: "0",
            companyHandle: "c1"
        };
        expect(jobs1).toEqual([job2, job1]);
        expect(jobs2).toEqual([job2, job1, job3]);
    });
});

/************************************** get */

describe("get", function () {
    test("works", async function () {
        let job = await Job.get(testJobs[0].id);
        expect(job).toEqual({
            id: expect.any(Number),
            title: "Software Engineer",
            salary: 50000,
            equity: "0",
            companyHandle: "c1"
        });
    });

    test("not found if no such job", async function () {
        try {
            await Job.get(9564230);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/************************************** update */

describe("update", function () {
    const updateData = {
        title: "Software Developer",
        salary: 60000,
        equity: 0.05
    };

    test("works", async function () {
        let job = await Job.update(testJobs[0].id, updateData);
        expect(job).toEqual({
            id: testJobs[0].id,
            companyHandle: "c1",
            ...updateData,
            equity: "0.05"
        });

        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = '${testJobs[0].id}'`);
        expect(result.rows).toEqual([{
            id: testJobs[0].id,
            title: "Software Developer",
            salary: 60000,
            equity: "0.05",
            company_handle: "c1"
        }]);
    });

    test("works: null fields", async function () {
        const updateDataSetNulls = {
            title: "Full-Stack Developer",
            salary: null,
            equity: null
        };

        let job = await Job.update(testJobs[0].id, updateDataSetNulls);
        expect(job).toEqual({
            id: testJobs[0].id,
            companyHandle: "c1",
            ...updateDataSetNulls,
        });

        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${testJobs[0].id}`);
        expect(result.rows).toEqual([{
            id: testJobs[0].id,
            title: "Full-Stack Developer",
            salary: null,
            equity: null,
            company_handle: "c1",
        }]);
    });

    test("not found if no such job", async function () {
        try {
            await Job.update(5642368, updateData);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request with no data", async function () {
        try {
            await Job.update(testJobs[0].id, {});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/************************************** remove */

describe("remove", function () {
    test("works", async function () {
        await Job.remove(testJobs[0].id);
        const res = await db.query(
            `SELECT id FROM jobs WHERE id='${testJobs[0].id}'`);
        expect(res.rows.length).toEqual(0);
    });

    test("not found if no such job", async function () {
        try {
            await Job.remove(5646264);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});