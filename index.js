process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();

var express = require('express'),
	request = require('request'),
	_ = require('lodash'),
	low = require('lowdb'),
	xml2js = require('xml2js'),
	schedule = require('node-schedule');

var app = express()
var config = require('config');
var db = low('db.json');

var sites = config.rssFeeds;

var rule = new schedule.RecurrenceRule();
rule.hour = 0;
rule.minute = 10;

var j = schedule.scheduleJob(rule, function(){
	console.log("Starting scheduled rss index job");
	for (var i = 0; i < sites.length; i++) {
		request(sites[i], function (error, response, body) {			
			if (!error && response.statusCode == 200) {
				xml2js.parseString(body, {explicitArray : false},  function(err, result) {
					console.log("Parsed xml to js");
					var items = result.rss.channel.item;
					console.log(items);
					for (var itemId = 0; itemId < items.length; itemId++) {
						var itemExist = db('posts').find({ link: items[itemId].link });
						
						if(!itemExist)
							db('posts').push(items[itemId]);
					};
				});
			}
		})
	};
});

 
app.get('/', function (req, res) {

	var result = db('posts')
				  	.chain()
				  	.sortBy(function(item) {
						return - (new Date(item.pubDate).getTime());
					})
				  	.take(10)				  	
				  	.value();

	res.send(result);
});

app.get('/category/:category', function(req, res) {
	var category = req.params.category;
	console.log("Looking for category: " + category);

	var result = db('posts')
				.chain()
			  	.sortBy(function(item) {
					return - (new Date(item.pubDate).getTime());
				})
				.where({'category': [category]})
				.value()				
	
	res.send(result);
});
 
var server = app.listen(3000, function() {
	var port = server.address().port;
	console.log('Application listening at port %s', port);
});