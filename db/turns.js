/**
 * Created by igor-go on 23.05.2016.
 */
var db = require("./db");
var debug = require('debug')('db:turns');
var remns = require("./remns");
var opers = require("./opers");
var periods = require("./periods");
var numeral = require('numeral');

/**
 * Построение товарной оборотки за период по типу продукта
 * @param period
 * @param prodtype
 * @returns {Promise<Line[]>}
 */
function buildGoodsTurns(period, prodtype) {
    debug("Start to build turns of '%s' on period(%d)", prodtype, period);
    var Line = function (row) {
        this.nGood = row.ngood;
        var measure = (row.sprodtype === 'A') ? ' л' : ' шт';
        this.sGood = row.sgood + ' (' + row.volume + measure + ')';
        this.start = 0;
        this.debet = 0;
        this.credit = 0;
        this.finish = 0;
    };

    var remn, income, outcome;
    var turns = [];
    var pRemn = new Promise(function (resolve, reject) {
        remns.getRemns(period, prodtype).then(function (r) {
            debug('querying remns %o', r);
            remn = r;
            resolve();
        }).catch(reject);
    });
    var pIncome = new Promise(function (resolve, reject) {
        opers.getTotalOpersByGoodsOnPeriod(period, 'I', prodtype).then(function (r) {
            debug('querying income %o', r);
            income = r;
            resolve();
        }).catch(reject);
    });
    var pOutcome = new Promise(function (resolve, reject) {
        opers.getTotalOpersByGoodsOnPeriod(period, 'O', prodtype).then(function (r) {
            debug('querying outcome %o', r);
            outcome = r;
            resolve();
        }).catch(reject);
    });
    debug('async query of pRemn, pIncome, pOutcome');
    return new Promise(function (resolve, reject) {

        Promise.all([pRemn, pIncome, pOutcome])
            .then(function () {
                if (remn) {
                    remn.forEach(function (v) {
                        var line = new Line(v);
                        line.start = v.quant;
                        turns.push(line);
                    });
                }
                debug('remns added to turns - %o', turns);
                if (income) {
                    income.forEach(function (v) {
                        var i = turns.findIndex(function (e) {
                            return e.nGood == v.ngood;
                        });
                        if (i >= 0) turns[i].debet = v.quant;
                        else {
                            var line = new Line(v);
                            line.debet = v.quant;
                            turns.push(line);
                        }
                    });
                }
                debug('income added to turns - %o', turns);
                if (outcome) {
                    outcome.forEach(function (v) {
                        var i = turns.findIndex(function (e) {
                            return e.nGood == v.ngood;
                        });
                        if (i >= 0) turns[i].credit = v.quant;
                        else {
                            var line = new Line(v);
                            line.credit = v.quant;
                            turns.push(line);
                        }
                    });
                }
                debug('outcome added to turns - %o', turns);
                turns.forEach(function (v) {
                    v.finish = v.start + v.debet - v.credit;
                });
                debug('calc finish remns of turns - %o', turns);
                turns.sort(function (v1, v2) {
                    return v1.sGood.toString().localeCompare(v2.sGood.toString());
                });
                debug('sort turns - %o', turns);
                resolve(turns);
            }).catch(reject);
    });

}

function buildGoodsTurnsByDate(date, prodtype) {
    return new Promise(function (resolve, reject) {
        periods.getPeriodByDate(date)
            .then(function (period) {
                if (period == 0) resolve([]);
                else return buildGoodsTurns(period, prodtype);
            })
            .then(resolve)
            .catch(reject);
    });
}

function buildProdReport(period, prodtype) {
    var Line = function (row) {
        this.id = row.prod_id;
        this.code = row.prod_code;
        this.name = row.prod_name;
        this.start = 0;
        this.debet = 0;
        this.credit = 0;
        this.finish = 0;
    };

    var remn, income, outcome;
    var turns = [];

    var pRemn = new Promise(function (resolve, reject) {
        remns.getProdRemns(period, prodtype).then(function (r) {
            debug('querying remns %o', r);
            remn = r;
            resolve();
        }).catch(reject);
    });
    var pIncome = new Promise(function (resolve, reject) {
        opers.getTotalOpersByCodesOnPeriod(period, 'I', prodtype).then(function (r) {
            debug('querying income %o', r);
            income = r;
            resolve();
        }).catch(reject);
    });
    var pOutcome = new Promise(function (resolve, reject) {
        opers.getTotalOpersByCodesOnPeriod(period, 'O', prodtype).then(function (r) {
            debug('querying outcome %o', r);
            outcome = r;
            resolve();
        }).catch(reject);
    });

    return new Promise(function (resolve, reject) {
        Promise.all([pRemn, pIncome, pOutcome])
            .then(function () {
                if (remn) {
                    remn.forEach(function (v) {
                        var line = new Line(v);
                        line.start = v.sub_quant;
                        turns.push(line);
                    });
                }
                debug('remns added to turns - %o', turns);
                if (income) {
                    income.forEach(function (v) {
                        var i = turns.findIndex(function (e) {
                            return e.id == v.prod_id;
                        });
                        if (i >= 0) turns[i].debet = v.sub_quant;
                        else {
                            var line = new Line(v);
                            line.debet = v.sub_quant;
                            turns.push(line);
                        }
                    });
                }
                debug('income added to turns - %o', turns);
                if (outcome) {
                    outcome.forEach(function (v) {
                        var i = turns.findIndex(function (e) {
                            return e.id == v.prod_id;
                        });
                        if (i >= 0) turns[i].credit = v.sub_quant;
                        else {
                            var line = new Line(v);
                            line.credit = v.sub_quant;
                            turns.push(line);
                        }
                    });
                }
                debug('outcome added to turns - %o', turns);
                numeral.language('ru', {
                    delimiters: {
                        thousands: ' ',
                        decimal: ','
                    }
                });
                numeral.language('ru');
                turns.forEach(function (v) {
                    v.finish = v.start + v.debet - v.credit;
                    var divider = (prodtype === 'A') ? 10000 : 1000000;
                    v.start = numeral(v.start / divider).format('0.000000');
                    v.debet = numeral(v.debet / divider).format('0.000000');
                    v.credit = numeral(v.credit / divider).format('0.000000');
                    v.finish = numeral(v.finish / divider).format('0.000000');
                });
                debug('calc finish remns of turns - %o', turns);
                turns.sort(function (v1, v2) {
                    return v1.code.toString().localeCompare(v2.code.toString());
                });
                debug('sort turns - %o', turns);
                resolve(turns);
            }).catch(reject);
    });

}

function buildProdReportByDate(date, prodtype) {
    return new Promise(function (resolve, reject) {
        periods.getPeriodByDate(date)
            .then(function (period) {
                if (period == 0) resolve([]);
                else return buildProdReport(period, prodtype);
            })
            .then(resolve)
            .catch(reject);
    });
}

module.exports.buildGoodsTurns = buildGoodsTurns;
module.exports.buildProdReport = buildProdReport;
module.exports.buildGoodsTurnsByDate = buildGoodsTurnsByDate;
module.exports.buildProdReportByDate = buildProdReportByDate;
