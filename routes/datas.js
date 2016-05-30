/**
 * Created by igorgo on 28.05.2016.
 */


var express = require('express');
var router = express.Router();
var debug = require('debug')('drink-and-smoke:router');

router.get('/periods/getbydate/:date', function (req, res, next) {
    require("../db/periods").getPeriodByDate(new Date(req.params.date))
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch(next);
});

router.get('/prodcodes/:type', function (req, res, next) {
    require("../db/prodcodes").getProdCodes(req.params.type)
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch(next);
});

router.get("/goods/:type", function (req, res, next) {
    debug("/goods/:type");
    var t = (req.params) ? req.params.type : undefined;
    require("../db/goods").getGoods(t.toString())
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch(next);

});

router.put("/goods", function (req, res, next) {
    debug("PUT /goods");
    require("../db/goods").addGood(
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

module.exports = router;