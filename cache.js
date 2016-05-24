/**
 * Created by igor-go on 23.05.2016.
 */
var NodeCache = require( "node-cache" );
var appCache = new NodeCache();

const PROD_CODES = {
    ALCOHOL: "AlcoholCodes",
    TOBACCO: "TobaccoCodes",
    ALL: "AllCodes"
};

const GOODS = {
    ALCOHOL: "AlcoholGoods",
    TOBACCO: "TobaccoGoods",
    ALL: "AllGoods"
};


module.exports.cache = appCache;
module.exports.PROD_CODES = PROD_CODES;
module.exports.GOODS = GOODS;



