var express = require('express');
var router = express.Router();
var db = require("../db/db");
var debug = require('debug')('drink-and-smoke:router');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.post('/logoff', function (req, res) {
    res.status(200).end();
    db.close(function () {
        process.exit(0);
    });
});

module.exports = router;
