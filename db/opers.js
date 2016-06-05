/**
 * Created by igorgo on 25.05.2016.
 */

var db = require("./db");
var debug = require('debug')('db:opers');
var periods = require("./periods");

/**
 * @typedef {Object} OperRow
 * @property {Number} id
 * @property {Number} ngood
 * @property {Number} period
 * @property {Number} quant
 * @property {String} sgood
 * @property {Number} nprodcode
 * @property {String} sprodcode
 * @property {String} closed
 */

const SQL_GET_OPERS_SELECT =
        "SELECT " +
        "    o.rowid AS id, o.good AS ngood, o.period, o.quant, " +
        "    g.name || ' - ' || g.volume AS sgood, g.prodtype AS nprodcode, " +
        "    coalesce(p.subcode,p.code) || ' - ' || p.name AS sprodcode, " +
        "    r.closed ",
    SQL_GET_OPERS_FROM =
        "  FROM opers o " +
        "    INNER JOIN goods g ON o.good = g.rowid " +
        "    INNER JOIN prodcodes p ON g.prodtype = p.rowid " +
        "    INNER JOIN periods r ON o.period = r.rowid ";


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
 * @returns {Promise<OperRow>}
 */
function getOperById(id) {
    const SQL_WHERE = "WHERE o.rowid=$id";
    debug("Querying oper id=%d", id);
    return new Promise(function (resolve, reject) {
        db.get(
            [SQL_GET_OPERS_SELECT, SQL_GET_OPERS_FROM, SQL_WHERE].join(" "),
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
 * @returns {Promise<Number>}
 */
function modifyOper(id, date, good, quant) {
    return new Promise(function (resolve, reject) {
        var oldPeriod, newPeriod;
        getOperById(id)
            .then(function (row) {
                oldPeriod = row.period;
                return periods.checkPeriodOpen(oldPeriod);
            })
            .then(function (isOpen) {
                if (!isOpen) reject(new Error("Исправление операции в закрытом периоде невозможно."));
                else return periods.getPeriodByDate(date, true);
            })
            .then(function (periodId) {
                newPeriod = periodId;
                return periods.checkPeriodOpen(newPeriod);
            })
            .then(function (isOpen) {
                if (!isOpen) reject(new Error("Новая дата операции попадает в закрытый период. Исправление невозможно."));
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
                        else resolve(id);
                    }
                );
            })
            .catch(reject);
    });
}

/**
 * @typedef {Object} GoodsSubTotals
 * @property {Number} ngood
 * @property {String} sgood
 * @property {Number} quant
 * @property {Number} volume
 * @property {Number} nprodcode
 * @property {String} sprodcode
 * @property {String} sprodname
 * @property {String} sprodtype
 */

/**
 * Cчитывание операций за период c группировкой по товару
 * @param period
 * @param opertype -- тип операции (приход/расход)
 * @param prodtype -- тип продукта (сигареты/бухло)
 * @returns {Promise<GoodsSubTotals[]>}
 */
function getTotalOpersByGoodsOnPeriod(period, opertype, prodtype) {
    return new Promise(function (resolve, reject) {
        var SELECT_CLAUSE = "SELECT o.good AS ngood, g.name AS sgood, sum(o.quant) AS quant, " +
            "g.volume AS volume, g.prodtype AS nprodcode, coalesce(p.subcode,p.code) AS sprodcode, " +
            "p.name AS sprodname, p.ptype AS sprodtype";
        var FROM_CLAUSE = "  FROM opers o " +
            "    INNER JOIN goods g on o.good = g.rowid " +
            "    INNER JOIN prodcodes p on g.prodtype = p.rowid ";
        var WHERE_CLOSE = (prodtype) ?
            "  WHERE o.period=$period AND o.type=$opertype AND p.ptype=$prodtype " :
            "  WHERE o.period=$period AND o.type=$opertype ";
        var GROUP_CLAUSE = "  GROUP BY o.good, g.name, g.volume, g.prodtype, p.subcode, p.code, p.name, p.ptype";
        var sql = [SELECT_CLAUSE, FROM_CLAUSE, WHERE_CLOSE, GROUP_CLAUSE].join(' ');
        var params = (prodtype) ?
        {
            $period: period,
            $opertype: opertype,
            $prodtype: prodtype
        } :
        {
            $period: period,
            $opertype: opertype
        };
        db.all(sql, params, function (err, rows) {
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
function _sortByCode(a, b) {
    return a.prod_code.localeCompare(b.prod_code);
}

/**
 * @typedef {Object} CodesSubTotals
 * @property {Number} prod_id
 * @property {String} prod_code
 * @property {String} prod_name
 * @property {Number} sub_quant
 */

/**
 * Считывание операций за период с группировкой по коду продукта (количество в литрах/штуках)
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
 * Считывание операций за период с группировкой по основному коду продукта (количество в литрах/штуках)
 * @param period
 * @param opertype -- тип операции (приход/расход)
 * @param prodtype -- тип продукта (сигареты/бухло)
 * @returns {Promise<CodesSubTotals[]>}
 */
function getTotalOpersByMainCodesOnPeriod(period, opertype, prodtype) {
    return new Promise(function (resolve, reject) {
        var sql =
            " SELECT PR.rowid AS prod_id, GR.prod_code, PR.name AS prod_name, GR.sub_quant " +
            " FROM " +
            " ( " +
            " SELECT p.code AS prod_code, sum(o.quant*g.volume) AS sub_quant " +
            "   FROM opers o " +
            "     INNER JOIN goods g on o.good = g.rowid " +
            "     INNER JOIN prodcodes p on g.prodtype = p.rowid " +
            "   WHERE o.period=$period AND o.type=$opertype AND p.ptype=$prodtype " +
            "   GROUP BY p.code " +
            " ) GR INNER JOIN prodcodes PR on GR.prod_code = PR.CODE AND PR.subcode IS NULL ";

        db.all(
            sql,
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
            "SELECT p.rowid AS prod_id, p.subcode AS prod_code, 'у тому числі ' || p.name AS prod_name, 'N' AS main_sign, sum(o.quant*g.volume) AS sub_quant " +
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

/**
 * Список операций на дату
 * @param {Date} date
 * @param {String<I|O>} opertype
 * @returns {Promise<OperRow[]>}
 */
function getOpersByDate(date, opertype) {
    const SQL_WHERE = "WHERE o.date=$date and o.type=$opertype";
    const SQL_ORDER = "ORDER BY o.rowid DESC";
    return new Promise(function (resolve, reject) {
        db.all([SQL_GET_OPERS_SELECT, SQL_GET_OPERS_FROM, SQL_WHERE, SQL_ORDER].join(" "),
            {
                $date: date.yyyymmdd(),
                $opertype: opertype.toUpperCase()
            },
            function (err, rows) {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

module.exports.addIncome = addIncome;
module.exports.addOutcome = addOutcome;
module.exports.deleteOper = deleteOper;
module.exports.modifyOper = modifyOper;
module.exports.getTotalOpersByGoodsOnPeriod = getTotalOpersByGoodsOnPeriod;
module.exports.getTotalOpersByCodesOnPeriod = getTotalOpersByCodesOnPeriod;
module.exports.getOpersByDate = getOpersByDate;
module.exports.getOperById = getOperById;
