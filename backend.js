var app = require('express').createServer(),
	io = require('socket.io').listen(app),
	rng = require('seedrandom'),
	NERDS = {
		/* contiene tutta la configurazione da condividere coi client
			anche al client. */
		'IP': process.argv[2],
		'SCHEMA': "http",
		'PORT': 8123,
	},
	Table, Player;

NERDS.BASE_URL = NERDS.SCHEMA + "://" + NERDS.IP + ":" + NERDS.PORT + "/";

Table = function() {
	this.id = rng.uid();
	Table._byId[this.id] = this;
	Table._instances.push(this);
};

Table._instances = [];
Table._byId = {}

Table.getById = function(id) {
	return Tables._byId[id];
}

Player = function() {
	this.id = rng.uid();
	Player._byId[this.id] = this;
	Player._instances.push(this);
};

Player._instances = [];
Player._byId = {}

Player.getById = function(id) {
	return Player._byId[id];
}

app.listen(NERDS.PORT);

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/table.html');
});

app.get('/config.js', function(req, res) {
	/* Fornisce un file pseudostatico di configurazione
		per i client. */
	res.header('Content-Type', 'application/javascript');
	res.send('var NERDS = ' + JSON.stringify(NERDS) + ';');
});

app.get('/s/*', function(req, res){
	/* serve tutti i file statici */
	var url = __dirname + "/static/" + req.params[0];
	res.sendfile(url);
});

/*
io.configure(null, function(){
  //io.set('log level', 1);
});
*/
io.of('/table').on('connection', function(socket) {
	socket.on('askgame', function(data) {
		console.log('askgame');
		var table, game = {};
		if (data.table_id) {
			table = Table.getById(data.table_id);
		} else {
			table = new Table();
			console.info("Opening a new table ("+table.id+")");			
		}
		game.id = table.id;
		game.controllerURI = NERDS.BASE_URL + "controller.html?game_id=" + table.id;
		game.gameURI = NERDS.BASE_URL + "table.html?game_id=" + table.id;

		socket.emit('game', game);
	});
});

io.of('/player').on('connection', function(socket) {
	var player = new Player();
	socket.emit('id', {id: player.id});
});
