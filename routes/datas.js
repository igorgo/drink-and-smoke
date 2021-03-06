/**
 * Created by igorgo on 28.05.2016.
 */


var express = require('express');
var router = express.Router();
var debug = require('debug')('drink-and-smoke:router');

var dbGoods = require("../db/goods"),
    dbOpers = require("../db/opers"),
    dbPeriods = require("../db/periods"),
    dbProds = require("../db/prodcodes");
dbTurns = require("../db/turns");

router.post('/periods/close/:date', function (req, res, next) {
    var period = {};
    dbPeriods.getPeriodByDate(new Date(req.params.date), false)
        .then(function (id) {
            period.id = id;
            return dbPeriods.closePeriod(period.id);
        })
        .then(function () {
            return Promise.all([
                dbPeriods.checkPeriodClosed(period.id),
                dbPeriods.canClose(period.id),
                dbPeriods.canOpen(period.id)
            ]);
        })
        .then(function (v) {
            period.closed = v[0];
            period.canClose = v[1];
            period.canOpen = v[2];
            res.status(200).json(period);
        })
        .catch(next);
});

router.post('/periods/open/:date', function (req, res, next) {
    var period = {};
    dbPeriods.getPeriodByDate(new Date(req.params.date), false)
        .then(function (id) {
            period.id = id;
            return dbPeriods.openPeriod(period.id);
        })
        .then(function () {
            return Promise.all([
                dbPeriods.checkPeriodClosed(period.id),
                dbPeriods.canClose(period.id),
                dbPeriods.canOpen(period.id)
            ]);
        })
        .then(function (v) {
            period.closed = v[0];
            period.canClose = v[1];
            period.canOpen = v[2];
            res.status(200).json(period);
        })
        .catch(next);
});

router.get('/periods/:date', function (req, res, next) {
    var period = {};

    dbPeriods.getPeriodByDate(new Date(req.params.date), false)
        .then(function (id) {
            period.id = id;
            return Promise.all([
                dbPeriods.checkPeriodClosed(period.id),
                dbPeriods.canClose(period.id),
                dbPeriods.canOpen(period.id)
            ]);
        })
        .then(function (v) {
            period.closed = v[0];
            period.canClose = v[1];
            period.canOpen = v[2];
            res.status(200).json(period);
        })
        .catch(next);
});

router.get('/prodcodes/:type', function (req, res, next) {
    dbProds.getProdCodes(req.params.type)
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch(next);
});

router.get("/goods/:type", function (req, res, next) {
    debug("/goods/:type");
    var t = (req.params) ? req.params.type : undefined;
    dbGoods.getGoods(t.toString())
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch(next);

});

router.get("/goods", function (req, res, next) {
    debug("/goods/:type");
    var t = (req.params) ? req.params.type : undefined;
    dbGoods.getGoods()
        .then(function (result) {
            res.status(200).json(result);
        })
        .catch(next);
});

router.put("/goods", function (req, res, next) {
    debug("PUT /goods");
    dbGoods.addGood(
        req.body.name,
        req.body.volume,
        req.body.code
    ).then(function (row) {
        res.status(200).json(row);
    }).catch(function (err) {
        debug(err);
        res.status(500).send("Дублирование наименования товара");
    });
});

router.get("/operday/:type/:date", function (req, res, next) {
    var type = req.params.type;
    var date = new Date(req.params.date);
    debug("GET /operday/%s/%s", type, date);
    dbOpers.getOpersByDate(date, type)
        .then(function (rows) {
            res.status(200).json(rows);
        })
        .catch(next);

});

router.put("/opers/income", function (req, res, next) {
    debug("PUT data/opers/income");
    var date = new Date(req.body.date),
        good = req.body.good,
        quant = req.body.quant;
    debug("date : %s\ngood: %i\nquant: %f", date, good, quant);
    dbOpers.addIncome (date, good, quant)
        .then(dbOpers.getOperById)
        .then(function (row) {
            res.status(200).json(row);
        })
        .catch(next);
});

router.put("/opers/outcome", function (req, res, next) {
    debug("PUT data/opers/outcome");
    var date = new Date(req.body.date),
        good = req.body.good,
        quant = req.body.quant;
    debug("date : %s\ngood: %i\nquant: %f", date, good, quant);
    dbOpers.addOutcome (date, good, quant)
        .then(dbOpers.getOperById)
        .then(function (row) {
            res.status(200).json(row);
        })
        .catch(next);
});

router.post("/opers/:id", function (req, res, next) {
    debug("POST data/opers");
    var id = req.params.id,
        date = new Date(req.body.date),
        good = req.body.good,
        quant = req.body.quant;
    debug("id: %d\ndate : %s\ngood: %d\nquant: %f", id, date, good, quant);
    dbOpers.modifyOper (id, date, good, quant)
        .then(dbOpers.getOperById)
        .then(function (row) {
            res.status(200).json(row);
        })
        .catch(function (err) {
            debug(err);
            res.status(500).send(err.message);
        });
});

router.delete("/opers/:id", function (req, res, next) {
    debug("DELETE data/opers");
    var id = req.params.id;
    debug("id: %d", id);
    dbOpers.deleteOper(id)
        .then(function (row) {
            res.status(200).end();
        })
        .catch(function (err) {
            debug(err);
            res.status(500).send(err.message);
        });
});

router.get('/turns/:type/:date', function (req, res, next) {
    var type = req.params.type;
    var date = new Date(req.params.date);
    debug("GET /turns/%s/%s", type, date);
    dbTurns.buildGoodsTurnsByDate(date, type)
        .then(function (rows) {
            debug("TURNS BUILDED - %o", rows);
            res.status(200).json(rows);
        })
        .catch(next);
});

router.get('/report/:type/:date', function (req, res, next) {
    var type = req.params.type;
    var date = new Date(req.params.date);
    debug("GET /report/%s/%s", type, date);
    dbTurns.buildProdReportByDate(date, type)
        .then(function (rows) {
            debug("REPORT BUILDED - %o", rows);
            res.status(200).json(rows);
        })
        .catch(next);
});

router.get('/period');

module.exports = router;