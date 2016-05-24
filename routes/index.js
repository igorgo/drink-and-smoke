var express = require('express');
var router = express.Router();
//var db = require("../db/db");
var debug = require('debug')('drink-and-smoke:router');
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.get('/data/periods/getbydate/:date', function (req, res, next) {
    require("../db/periods").getPeriodByDate(new Date(req.params.date))
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch(next);
});

router.get('/data/prodcodes/:type', function (req, res, next) {
    require("../db/prodcodes").getProdCodes(req.params.type)
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch(next);
});


module.exports = router;
