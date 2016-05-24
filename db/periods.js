/**
 * Created by igor-go on 23.05.2016.
 */
var db = require("./db");
var debug = require('debug')('db:periods');

const META = {
    TABLE: "periods",
    COLUMNS: {
        ID: "rowid",
        YEAR: "year",
        MONTH: "month"
    }
};

function getPeriodByDate(date) {
    return new Promise(function (resolve, reject) {
        getPeriodByYearAndMonth(date.getFullYear(), date.getMonth() + 1)
            .then(resolve)
            .catch(reject);
    });
}

function getPeriodByYearAndMonth(year, month) {
    return new Promise(function (resolve, reject) {
        db.get(
            [
                "SELECT", META.COLUMNS.ID,
                "FROM", META.TABLE,
                "WHERE",
                [
                    META.COLUMNS.YEAR + "=$year",
                    META.COLUMNS.MONTH + "=$month"
                ].join(" AND ")
            ].join(" "),
            {
                $year: year,
                $month: month
            },
            function (err, row) {
                if (err) reject(err);
                else {
                    if (row) resolve(row.rowid);
                    else addPeriod(year, month)
                        .then(resolve)
                        .catch(reject);
                }
            }
        );
    });
}

function addPeriod(year, month) {
    return new Promise(function (resolve, reject) {
        debug("Adding a new period for %s.%s", month, year);
        db.run(
            [
                "INSERT INTO",
                META.TABLE, "(",
                [
                    META.COLUMNS.YEAR,
                    META.COLUMNS.MONTH
                ].join(","),
                ") VALUES ($year, $month)"
            ].join(" "),
            {
                $year: year,
                $month: month
            },
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

module.exports.getPeriodByDate = getPeriodByDate;
module.exports.getPeriodByYearAndMonth = getPeriodByYearAndMonth;
module.exports.addPeriod = addPeriod;
module.exports.META = META;
