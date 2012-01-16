(function(){
"use strict";

/*** setup ***/
var version = "1.0.0";

!Data.has("charge-interval") && Data.set("charge-interval", 10);
!Data.has("charge-size") && Data.set("charge-size", 1);

!Data.has("target-block") && Data.set("target-block", []);
!Data.has("target-allow") && Data.set("target-allow", []);

!Data.has("block") && Data.set("block", "<nope.avi>");

chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });


/*** state ***/
var state = window.state = {
	balance: 0,
	meter: 0,
	add: {
		id: -1,
		fn: function(){
			var size = Data.get("charge-size"),
				balance = state.balance + size,
				max = (size * (60 / Data.get("charge-interval"))) * 12;
			
			state.balance = Math.min(balance, max);
		},
		start: function(){
			clearInterval(state.add.id);
			
			state.add.id = setInterval(state.add.fn, 1000 * 60 * Data.get("charge-interval"));
		}
	},
	use: {
		id: -1,
		fn: function(){
			if (--state.meter === 0) {
				clearInterval(state.use.id);
			}
			
			state.use.badge();
		},
		start: function(){
			state.use.id = setInterval(state.use.fn, 1000 * 60);
			
			state.use.badge();
		},
		badge: function(){
			chrome.browserAction.setBadgeText({ text: state.meter ? state.meter.toString() : "" });
		}
	}
};

state.add.start();


/*** monitoring ***/
var check = function(url, tID){
	var orig = url;
	
	if (state.meter > 0 || !((url = url.match(/:\/\/(.+?)\//)) && (url = url[1]))) {
		return;
	}
	
	var block = Data.get("target-block"),
		allow = Data.get("target-allow");
	
	var apply = function(url, rule){
		var index = url.indexOf(rule);
		
		return index !== -1 && index === url.length - rule.length && (index > 0 ? url[index - 1] === "." : true);
	};
	
	var matches = block.some(function(rule){
		if (apply(url, rule)) {
			var allowed = allow.some(function(rule){
				return apply(url, rule);
			});
			
			if (!allowed) {
				return true;
			}
		}
	});
	
	matches && slap(tID, orig);
};

chrome.tabs.onCreated.addListener(function(tab){
	tab.url && check(tab.url, tab.id);
});

chrome.tabs.onUpdated.addListener(function(tID, changed, tab){
	changed.url && check(changed.url, tID);
});


/*** blocking ***/
var slap = function(tID, orig){
	var url = Data.get("block");
	
	if (url === "<nope.avi>") {
		url = "nope.webm";
	} else if (url === "<popup>") {
		url = "popup.html?" + encodeURIComponent(orig);
	}
	
	chrome.tabs.update(tID, {
		url: url
	});
};

})();