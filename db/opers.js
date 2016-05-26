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
 * @typedef {Object} GoodsSubTotals
 * @property {Number} good_id
 * @property {String} good_name
 * @property {Number} sub_quant
 */

/**
 * @typedef {Object} CodesSubTotals
 * @property {Number} prod_id
 * @property {String} prod_code
 * @property {String} prod_name
 * @property {Number} sub_quant
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
                else return periods.getPeriodByDate(date, true);
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

/**
 * Cчитывание операций за период c группировкой по товару
 * @param period
 * @param opertype -- тип операции (приход/расход)
 * @param prodtype -- тип продукта (сигареты/бухло)
 * @returns {Promise<GoodsSubTotals[]>}
 */
function getTotalOpersByGoodsOnPeriod(period, opertype, prodtype) {
    return new Promise(function (resolve, reject) {
        db.all(
            "SELECT o.good AS good_id, g.name AS good_name, sum(o.quant) AS sub_quant " +
            "  FROM opers o " +
            "    INNER JOIN goods g on o.good = g.rowid " +
            "    INNER JOIN prodcodes p on g.prodtype = p.rowid " +
            "  WHERE o.period=$period AND o.type=$opertype AND p.ptype=$prodtype " +
            "  GROUP BY o.good, g.name",
            {
                $period: period,
                $opertype: opertype,
                $prodtype: prodtype
            },
            function (err, rows) {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

/**
 * Сравнение двух строк оборотов
 * @param {CodesSubTotals} a
 * @param {CodesSubTotals} b
 */
function _sortByCode(a,b) {
    return a.prod_code.localeCompare(b.prod_code);
}

/**
 * Считывание операций за период с группировкой по основным коду продукта (количество в литрах/штуках)
 * @param period
 * @param opertype -- тип операции (приход/расход)
 * @param prodtype -- тип продукта (сигареты/бухло)
 * @returns {Promise<CodesSubTotals[]>}
 */
function getTotalOpersByCodesOnPeriod(period, opertype, prodtype) {
    return new Promise(function (resolve, reject) {
        var codesSubTotals;
        getTotalOpersByMainCodesOnPeriod(period, opertype, prodtype)
            .then(function (rows) {
                codesSubTotals = rows;
                return getTotalOpersBySubCodesOnPeriod(period, opertype, prodtype);
            })
            .then(function (rows) {
                codesSubTotals = codesSubTotals.concat(rows);
                codesSubTotals.sort(_sortByCode);
                resolve(codesSubTotals);
            })
            .catch(reject);
    });
}

/**
 * Считывание операций за период с группировкой по основным коду продукта (количество в литрах/штуках)
 * @param period
 * @param opertype -- тип операции (приход/расход)
 * @param prodtype -- тип продукта (сигареты/бухло)
 * @returns {Promise<CodesSubTotals[]>}
 */
function getTotalOpersByMainCodesOnPeriod(period, opertype, prodtype) {
    return new Promise(function (resolve, reject) {
        db.all(
            "SELECT p.rowid AS prod_id, p.code AS prod_code, p.name AS prod_name, sum(o.quant*g.volume) AS sub_quant " +
            "  FROM opers o " +
            "    INNER JOIN goods g on o.good = g.rowid " +
            "    INNER JOIN prodcodes p on g.prodtype = p.rowid " +
            "  WHERE o.period=$period AND o.type=$opertype AND p.ptype=$prodtype " +
            "  GROUP BY p.rowid, p.code, p.name",
            {
                $period: period,
                $opertype: opertype,
                $prodtype: prodtype
            },
            function (err, rows) {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

/**
 * Считывание операций за период с группировкой по сабкоду продукта (количество в литрах/штуках)
 * @param period
 * @param opertype -- тип операции (приход/расход)
 * @param prodtype -- тип продукта (сигареты/бухло)
 * @returns {Promise<CodesSubTotals[]>}
 */
function getTotalOpersBySubCodesOnPeriod(period, opertype, prodtype) {
    return new Promise(function (resolve, reject) {
        db.all(
            "SELECT p.rowid AS prod_id, p.subcode AS prod_code, p.name AS prod_name, sum(o.quant*g.volume) AS sub_quant " +
            "  FROM opers o " +
            "    INNER JOIN goods g on o.good = g.rowid " +
            "    INNER JOIN prodcodes p on g.prodtype = p.rowid " +
            "  WHERE o.period=$period AND o.type=$opertype AND p.ptype=$prodtype AND p.subcode IS NOT NULL " +
            "  GROUP BY p.rowid, p.subcode, p.name",
            {
                $period: period,
                $opertype: opertype,
                $prodtype: prodtype
            },
            function (err, rows) {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}



// todo: Считывание операций за период с группировкой по коду продукта (количество в литрах/штуках)
// todo: Считывание операций за период с группировкой по сабкоду продукта (количество в литрах/штуках) (в названии добавить "у тому числі ")


module.exports.addIncome = addIncome;
module.exports.addOutcome = addOutcome;
module.exports.deleteOper = deleteOper;
module.exports.modifyOper = modifyOper;
module.exports.getTotalOpersByGoodsOnPeriod = getTotalOpersByGoodsOnPeriod;
module.exports.getTotalOpersByCodesOnPeriod = getTotalOpersByCodesOnPeriod;
