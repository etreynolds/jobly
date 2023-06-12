const { BadRequestError } = require("../expressError");

/** sqlForPartialUpdate helps partially update a database row from any table.
 *
 * Parameters:
 * 
 * dataToUpdate must be an object with keys and values corresponding to rows to update.
 *
 * jsToSql must be an object that serves as an index that translates the JS key name
 * to the SQL column name if different
 * Example: { numEmployees: "num_employees", logoUrl: "logo_url" }
 * If the JS key name and SQL column name are identical no entry is necessary
 * 
 * 
 * Returns { setCols, values }
 * 
 * setCols is a string to be placed after SET in the caller's SQL query
 * 
 * values is an array with the values used for the query to replace $1, $2... in the query.
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
    `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

/** Combine where clauses used for filtering
 * 
 * Parameter: An array of where clauses without 'WHERE' or 'AND' keywords
 * 
 * Returns: A string of combined where clauses with "WHERE" and 'AND' keywords
 * 
 */

function combineWhereClauses(clauseArray) {
  if (!clauseArray[0]) {
    return '';
  }
  let whereString = `WHERE ${clauseArray[0]}`;
  for (let i = 1; i < clauseArray.length; i++) {
    whereString += ` AND ${clauseArray[i]}`;
  }
  return whereString;
}

module.exports = { sqlForPartialUpdate, combineWhereClauses };
