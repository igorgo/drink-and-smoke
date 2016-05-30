var express = require('express');
var router = express.Router();
//var db = require("../db/db");
var debug = require('debug')('drink-and-smoke:router');
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});



module.exports = router;
