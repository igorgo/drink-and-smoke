/**
 * Created by igorgo on 25.05.2016.
 */

var db = require("./db");
var debug = require('debug')('db:opers');
var periods = require("./periods");

/**
 * @typedef {Object} OpersRow
 * @property {String} date
 * @property {Number} good
 * @property {Number} period
 * @property {Number} quant
 * @property {String} type
 */

/**
 * Добавление прихода
 * @param date
 * @param good
 * @param quant
 * @returns {Promise.<Number>}
 */
function addIncome(date, good, quant) {
    return addOper(date, good, quant, "I");
}

/**
 * Добавление расхода
 * @param date
 * @param good
 * @param quant
 * @returns {Promise.<Number>}
 */
function addOutcome(date, good, quant) {
    return addOper(date, good, quant, "O");
}

/**
 * Добавление операции
 * @param {Date} date
 * @param {Number} good
 * @param {Number} quant
 * @param {String}type
 * @returns {Promise<Number>}
 */
function addOper(date, good, quant, type) {
    var period;
    return new Promise(function (resolve, reject) {
        periods.getPeriodByDate(date, true)
            .then(function (p) {
                period = p;
                return periods.checkPeriodClosed(period);
            })
            .then(function (isClosed) {
                if (isClosed) reject(new Error("Добавление операций в закрытом периоде невозможно."));
                else db.run(
                    "INSERT INTO opers (date, good, period, quant, type) VALUES ($date, $good, $period, $quant, $type)",
                    {
                        $date: date.yyyymmdd(),
                        $good: good,
                        $period: period,
                        $quant: quant,
                        $type: type
                    },
                    function (err) {
                        if (err) reject(err);
                        else resolve(this.lastID)
                    }
                );
            })
            .catch(reject);
    });
}

/**
 * Считывание записи операции
 * @param id
 * @returns {Promise<OpersRow>}
 */
function getOperById(id) {
    return new Promise(function (resolve, reject) {
        db.get(
            "select o.date, o.good, o.period, o.quant, o.type from opers o where o.rowid=$id",
            {$id: id},
            function (err, row) {
                if (err) reject(err);
                else if (row) resolve(row);
                else reject(new Error("Операция не найдена."))
            }
        );
    });
}

/**
 * Удаление операции
 * @param {Number} id
 * @returns {Promise<>}
 */
function deleteOper(id) {
    return new Promise(function (resolve, reject) {
        getOperById(id)
            .then(function (row) {
                return periods.checkPeriodClosed(row.period);
            })
            .then(function (isClosed) {
                if (isClosed) reject(new Error("Удаление операций в закрытом периоде невозможно."));
                else db.run(
                    "DELETE FROM opers where rowid=$id",
                    {$id: id},
                    function (err) {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            })
            .catch(reject);
    });
}

/**
 * Исправление операции
 * @param id
 * @param date
 * @param good
 * @param quant
 * @returns {Promise<>}
 */
function modifyOper(id, date, good, quant) {
    return new Promise(function (resolve, reject) {
        var oldPeriod, newPeriod;
        getOperById(id)
            .then(function (row) {
                oldPeriod = row.period;
                return periods.checkPeriodOpen(oldPeriod);
            })
            .then(function (isClosed) {
                if (isClosed) reject(new Error("Исправление операции в закрытом периоде невозможно."));
                else return periods.getPeriodByDate(date,true);
            })
            .then(periods.checkPeriodOpen)
            .then(function (isClosed) {
                if (isClosed) reject(new Error("Новая дата операции попадает в закрытый период. Исправление невозможно."));
                else db.run(
                    "UPDATE opers SET date = $date, good = $good, period = $period, quant  = $quant WHERE rowid = $id",
                    {
                        $date: date.yyyymmdd(),
                        $good: good,
                        $period: newPeriod,
                        $quant: quant,
                        $id: id
                    },
                    function (err) {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            })
            .catch(reject);
    });
}

//todo: считывание операций расхода за период (группировка по товару)
//todo: считывание операций прихода за период (группировка по товару)

module.exports.addIncome = addIncome;
module.exports.addOutcome = addOutcome;
module.exports.deleteOper = deleteOper;
module.exports.modifyOper = modifyOper;
