"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate, combineWhereClauses } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
    /** Create a job (from data), update db, return new job data.
     *
     * data should be { title, salary, equity, companyHandle }
     *
     * Returns { id, title, salary, equity, companyHandle }
     * */

    static async create({ title, salary, equity, companyHandle }) {
        const result = await db.query(
            `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [
                title,
                salary,
                equity,
                companyHandle,
            ],
        );
        const job = result.rows[0];

        return job;
    }

    /** Find all jobs.
     *
     * Returns [{ id, title, salary, equity, companyHandle }, ...]
     * */

    static async findAll(where = '') {
        const jobsRes = await db.query(
            `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           ${where}
           ORDER BY id DESC`);
        return jobsRes.rows;
    }

    static async findFiltered(queryObj) {
        const whereClauses = [];
        for (const key in queryObj) {
            // Write SQL where clauses for each filter parameter
            switch (key) {
                case 'title':
                    const title = queryObj.title;
                    // Where clause that looks for case-insensitive version of string
                    whereClauses.push(`UPPER(title) LIKE UPPER('%${title}%')`);
                    break;
                case 'minSalary':
                    whereClauses.push(`salary >= ${queryObj.minSalary}`);
                    break;
                case 'hasEquity':
                    if (queryObj.hasEquity) {
                        whereClauses.push(`equity > 0`);
                    }
                    break;
                default:
                    throw new BadRequestError(`${key} is not an correct filter parameter. Filter parameters allowed: title, minSalary, and hasEquity`);
            }
        }
        const whereString = combineWhereClauses(whereClauses);
        // Query using findAll and return results
        return this.findAll(whereString);
    }

    /** Given a job id, return data about job.
     *
     * Returns { id, title, salary, equity, companyHandle, jobs }
     *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
     *
     * Throws NotFoundError if not found.
     **/

    static async get(id) {
        const companyRes = await db.query(
            `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
            [id]);

        const job = companyRes.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);

        return job;
    }

    /** Update job data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain all the
     * fields; this only changes provided ones.
     *
     * Data can include: {title, salary, equity, companyHandle}
     *
     * Returns {id, title, salary, equity, companyHandle}
     *
     * Throws NotFoundError if not found.
     */

    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                companyHandle: "company_handle",
            });
        const handleVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${handleVarIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);

        return job;
    }

    /** Delete given job from database; returns undefined.
     *
     * Throws NotFoundError if job not found.
     **/

    static async remove(id) {
        const result = await db.query(
            `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
            [id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);
    }
}


module.exports = Job;
