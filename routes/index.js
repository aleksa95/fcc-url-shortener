var express = require('express'),
    mongodb = require('mongodb'),
    shortid = require('shortid');
    router  = express.Router(),
    fetch   = require('node-fetch'),
    URL     = require('url-parse');

const databaseURL = process.env.MONGOLAB_URI;    
const MongoClient = mongodb.MongoClient;

function render (res, message, url, shortUrl) {
    res.render('output', { message: message, url: url, shortUrl: shortUrl })
}

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/:shortid', (req, res) => {
    var shortIdParam = req.params.shortid,
        error = "This url is not on the database.",
        baseURL = `${req.protocol}://${req.get('host')}/`;

    MongoClient.connect(databaseURL, function (err, db) {
        if (err) 
            console.log('Unable to connect to the mongoDB server. Error:', err);

        var collection = db.collection('urls');

        collection.find({_id: shortIdParam}).toArray(function(err, items) {
            if (err)
                console.log(err);
            
            if (items.length > 0) {
                db.close();
                res.redirect(items[0]['original_url']);
            } else {
                db.close();
                render(res, error, '', baseURL + shortIdParam);
                
            }                        
        });
    });     
});

router.get('/new/*', (req, res) => {
    var regex = new RegExp("^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_\+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?"),
        errorMessage = "Wrong url format, make sure you have a valid protocol and real site.",
        errorMessageExisting = "There is already a short version of this url",
        baseURL = `${req.protocol}://${req.get('host')}/`,
        originalUrl = req.params[0];

    if (!regex.test(originalUrl)) {
        render(res, errorMessage, originalUrl);
    }

    var urlObject = new URL(originalUrl);
    var host = `${urlObject.protocol}//${urlObject.hostname}/`;

    fetch(host, { method : "HEAD"})
        .then(function(response) {
            MongoClient.connect(databaseURL, function (err, db) {
                if (err) 
                    console.log('Unable to connect to the mongoDB server. Error:', err);

                var collection = db.collection('urls');

                collection.find({original_url: originalUrl}).toArray(function(err, items) {
                    if (err)
                        console.log(err);
                    
                    if (items.length > 0) {
                        db.close();
                        render(res, errorMessageExisting, items[0]['original_url'], items[0]['short_url']);
                    } else {
                        var shortID = shortid.generate();
                        var shortUrl = baseURL + shortID;
                        var databaseItem = {original_url: originalUrl, short_url: shortUrl, _id: shortID};

                        collection.insert(databaseItem, (err, result) => {
                            if (err)
                                console.log(err);
                            
                            console.log(result);  
                            db.close();
                            render(res, '', originalUrl, shortUrl);
                        });
                    }                        
                });
            }); 
         })
        .catch(function(err) {
            render(res, errorMessage, originalUrl);
        });
});

module.exports = router;
