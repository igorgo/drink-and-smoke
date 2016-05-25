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
        MONTH: "month",
        CLOSED: "closed"
    }
};

/**
 * Закрытие периода
 * @param id
 * @returns {Promise}
 */
function closePeriod(id) {
    return new Promise(function (resolve, reject) {
        canClose(id)
            .then(function (can) {
                if (!can) reject(new Error("Невозможно закрыть период, т.к. предыдущий период не закрыт."));
                else {
                    db.run(
                        "UPDATE periods SET closed='Y' where rowid=$id",
                        {$id: id},
                        function (err) {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                }
            })
            .catch(reject);
    });
}

/**
 * Проверка закрываемости периода
 * @param id
 * @returns {Promise<Boolean|Error>}
 */
function canClose(id) {
    return new Promise(function (resolve, reject) {
        findPreviousPeriodById(id)
            .then(checkPeriodClosed)
            .then(function (isClosed) {
                resolve(isClosed);
            })
            .catch(reject);
    });
}

/**
 * Проверка закрытости периода по id (если не найден считаем закрытым)
 * @param id
 * @returns {Promise<Boolean|Error>}
 */
function checkPeriodClosed(id) {
    return new Promise(function (resolve, reject) {
        db.get(
            "SELECT closed FROM periods where rowid=$id",
            {$id:id},
            function(err,row) {
                if (err) reject(err);
                else resolve(((!row || row.closed === "Y")))
            }
        );
    });
}

/**
 * Поиск id периода по дате (0 если не найден)
 * @param date
 * @returns {Promise<Number|Error>}
 */
function getPeriodByDate(date) {
    return new Promise(function (resolve, reject) {
        getPeriodByYearAndMonth(date.getFullYear(), date.getMonth() + 1)
            .then(resolve)
            .catch(reject);
    });
}

/**
 * Поиск id периода по месяцу и году (0 если не найден)
 * @param year
 * @param month
 * @returns {Promise<Number|Error>}
 */
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
                    else resolve(0);
                    /*
                     else addPeriod(year, month)
                     .then(resolve)
                     .catch(reject);
                     */
                }
            }
        );
    });
}

/**
 * Поиск периода (год, месяц) по ID
 * @param id
 * @returns {Promise<resolvePeriod|Error>}
 */
function getPeriodById(id) {
    /**
     * This callback is displayed as a global member.
     * @callback resolvePeriod
     * @param {number} year
     * @param {number} month
     */
    return new Promise(function (resolve, reject) {
        db.get (
            "SELECT year, month FROM periods where rowid = $id",
            {$id: id},
            function (err, row) {
                if (err) reject(err);
                else {
                    if (row) resolve(row.year, row.month);
                    else reject(new Error("Период не найден"));
                }
            });
    });
}

/**
 * Поиск id предыдущего периода по id (0 если не найден)
 * @param id
 * @returns {Promise<Number|Error>}
 */
function findPreviousPeriodById(id) {
    return new Promise(function (resolve, reject) {
        getPeriodById(id)
            .then(findPreviousPeriod)
            .then(resolve)
            .catch(reject);
    });
}

/**
 * Поиск id предыдущего периода по месяцу и году (0 если не найден)
 * @param year
 * @param month
 * @returns {Promise<Number|Error>}
 */
function findPreviousPeriod(year, month) {
    var pMonth, pYear;
    if (month == 1) {
        pMonth = 12;
        pYear = year - 1;
    } else {
        pMonth = month - 1;
        pYear = year;
    }
    return getPeriodByYearAndMonth(pYear, pMonth);
}

/**
 * Поиск id следующего периода по id (0 если не найден)
 * @param id
 * @returns {Promise<Number|Error>}
 */
function findNextPeriodById(id) {
    return new Promise(function (resolve, reject) {
        getPeriodById(id)
            .then(findNextPeriod)
            .then(resolve)
            .catch(reject);
    });
}

/**
 * Поиск id следующего периода по месяцу и году (0 если не найден)
 * @param year
 * @param month
 * @returns {Promise<Number|Error>}
 */
function findNextPeriod(year, month) {
    var pMonth, pYear;
    if (month == 12) {
        pMonth = 1;
        pYear = year + 1;
    } else {
        pMonth = month + 1;
        pYear = year;
    }
    return getPeriodByYearAndMonth(pYear, pMonth);
}

/**
 * Добавление периода
 * @param year
 * @param month
 * @returns {Promise<Number|Error>}
 */
function addPeriod(year, month) {
    return new Promise(function (resolve, reject) {
        debug("Adding a new period for %s.%s", month, year);
        db.run(
            [
                "INSERT INTO",
                META.TABLE, "(",
                [
                    META.COLUMNS.YEAR,
                    META.COLUMNS.MONTH,
                    META.COLUMNS.CLOSED,
                ].join(","),
                ") VALUES ($year, $month, 'N')"
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

/**
 * Открытие периода
 * @param id
 * @returns {Promise}
 */
function openPeriod(id) {
    return new Promise(function (resolve, reject) {
        canOpen(id)
            .then(function (can) {
                if (!can) reject(new Error("Невозможно открыть период, т.к. следующий период закрыт."));
                else {
                    db.run(
                        "UPDATE periods SET closed='N' where rowid=$id",
                        {$id: id},
                        function (err) {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                }
            })
            .catch(reject);
    });
}

/**
 * Проверка открываемости периода
 * @param id
 * @returns {Promise<Boolean|Error>}
 */
function canOpen(id) {
    return new Promise(function (resolve, reject) {
        findNextPeriodById(id)
            .then(checkPeriodOpen)
            .then(function (isOpen) {
                resolve(isOpen);
            })
            .catch(reject);
    });
}

/**
 * Проверка открытости периода по id (если не найден считаем открытым)
 * @param id
 * @returns {Promise<Boolean|Error>}
 */
function checkPeriodOpen(id) {
    return new Promise(function (resolve, reject) {
        db.get(
            "SELECT closed FROM periods where rowid=$id",
            {$id:id},
            function(err,row) {
                if (err) reject(err);
                else resolve(((!row || row.closed === "N")))
            }
        );
    });
}


module.exports.addPeriod = addPeriod;
module.exports.canClose = canClose;
module.exports.canOpen = canOpen;
module.exports.checkPeriodClosed = checkPeriodClosed;
module.exports.checkPeriodOpen = checkPeriodOpen;
module.exports.closePeriod = closePeriod;
module.exports.findNextPeriod = findNextPeriod;
module.exports.findNextPeriodById = findNextPeriodById;
module.exports.findPreviousPeriod = findPreviousPeriod;
module.exports.findPreviousPeriodById = findPreviousPeriodById;
module.exports.getPeriodByDate = getPeriodByDate;
module.exports.getPeriodById = getPeriodById;
module.exports.getPeriodByYearAndMonth = getPeriodByYearAndMonth;
module.exports.openPeriod = openPeriod;
module.exports.META = META;
