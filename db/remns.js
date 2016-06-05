/**
 * Created by igorgo on 03.06.2016.
 */
var db = require("./db");
var debug = require('debug')('db:remns');

/**
 * @typedef {Object} RemnRow
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
 * Считывание остатков на дату
 * @param {Number} period
 * @param {String} prodtype
 * @returns {Promise<RemnRow>}
 */
function getRemns(period, prodtype) {
    return new Promise(function (resolve, reject) {
        const SELECT_CLAUSE = "SELECT r.good AS ngood, r.quant, " +
            "g.name AS sgood, g.volume, g.prodtype AS nprodcode, " +
            "coalesce(p.subcode,p.code) AS sprodcode, p.name AS sprodname, p.ptype AS sprodtype";
        const FROM_CLOUSE = "FROM remns r" +
            "    INNER JOIN goods g ON r.good = g.rowid " +
            "    INNER JOIN prodcodes p ON g.prodtype = p.rowid ";
        const WHERE_CLOSE = (prodtype) ? "WHERE r.period = $period AND p.ptype=$prodtype" : "WHERE r.period = $period";
        var sql = [SELECT_CLAUSE, FROM_CLOUSE, WHERE_CLOSE].join(' ');
        var params = (prodtype) ? {$period: period, $prodtype: prodtype} : {$period: period};

        function callback(err, rows) {
            if (err) reject(err);
            else resolve(rows);
        }

        db.all(sql, params, callback);
    });
}

function clearRemns(period) {
    return new Promise(function (resolve, reject) {
        db.run("DELETE FROM remns WHERE period = $period", {$period: period}, function (err) {
            if (err) reject(err);
            else resolve();
        });
    });
}

function makeRemnsOnNextPeriod(period) {
    var periods = require("./periods");
    var turns = require("./turns");
    return new Promise(function (resolve, reject) {
        var nextPeriod;
        periods.findNextPeriodById(period, true)
            .then(function (p) {
                nextPeriod = p;
                return clearRemns(nextPeriod);
            })
            .then(function () {
                return turns.buildGoodsTurns(period);
            })
            .then(function (turnsArray) {
                debug('TURNS_ARRAY: %o', turnsArray);
                if (turnsArray) {
                    turnsArray.forEach(function (v) {
                        if (v.finish != 0) db.run(
                            "INSERT INTO remns (good, quant, period) VALUES ($good, $quant, $period)",
                            {$good: v.nGood, $quant: v.finish, $period: nextPeriod}
                        );
                    })
                }
                resolve();
            })
            .catch(reject);
    });
}

function getProdRemns(period, prodtype) {
    return new Promise(function (resolve, reject) {
        var codesSubTotals;
        Promise.all([getRemnsByMainCodes(period, prodtype), getRemnsBySubCodes(period, prodtype)])
            .then(function (v) {
                resolve(v[0].concat(v[1]));
            })
            .catch(reject);
    });
}

function getRemnsByMainCodes(period, prodtype) {
    return new Promise(function (resolve, reject) {
        var sql =
            " SELECT PR.rowid AS prod_id, GR.prod_code, PR.name AS prod_name, GR.sub_quant " +
            " FROM ( " +
            "      SELECT p.code AS prod_code, sum(r.quant*g.volume) AS sub_quant " +
            "      FROM remns r " +
            "           INNER JOIN goods g ON r.good = g.rowid " +
            "           INNER JOIN prodcodes p ON g.prodtype = p.rowid " +
            "      WHERE r.period = $period AND p.ptype=$prodtype " +
            "      GROUP BY p.code " +
            " ) GR INNER JOIN prodcodes PR on GR.prod_code = PR.CODE AND PR.subcode IS NULL ";
        var params = {$period: period, $prodtype: prodtype};

        function callback(err, rows) {
            if (err) reject(err);
            else resolve(rows);
        }

        db.all(sql, params, callback);
    });
}

function getRemnsBySubCodes(period, prodtype) {
    return new Promise(function (resolve, reject) {
        var SELECT_CLAUSE = "SELECT p.rowid AS prod_id, p.subcode AS prod_code, 'у тому числі ' || p.name AS prod_name, 'N' AS main_sign, sum(r.quant*g.volume) AS sub_quant ";
        var FROM_CLAUSE = "FROM remns r" +
            "    INNER JOIN goods g ON r.good = g.rowid " +
            "    INNER JOIN prodcodes p ON g.prodtype = p.rowid ";
        var WHERE_CLAUSE = "WHERE r.period = $period AND p.ptype=$prodtype AND p.subcode IS NOT NULL";
        var GROUP_CLAUSE = "GROUP BY p.rowid, p.subcode, p.name";
        var sql = [SELECT_CLAUSE, FROM_CLAUSE, WHERE_CLAUSE, GROUP_CLAUSE].join(' ');
        var params = {$period: period, $prodtype: prodtype};

        function callback(err, rows) {
            if (err) reject(err);
            else resolve(rows);
        }

        db.all(sql, params, callback);
    });
}

module.exports.getRemns = getRemns;
module.exports.getProdRemns = getProdRemns;
module.exports.makeRemnsOnNextPeriod = makeRemnsOnNextPeriod;