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

Table = function(socket) {
	this.id = rng.uid();
	this.socket = socket;
	this.players = {};
	Table._byId[this.id] = this;
	Table._instances.push(this);
};

Table._instances = [];
Table._byId = {}

Table.getById = function(id) {
	if (! Table.hasOwnProperty(id)) {
		console.warn('Unable to find table by id ('+id+')');
	}
	return Table._byId[id];
}

Table.prototype.addPlayer = function(player) {
	this.players[player.id] = player;
};

Table.prototype.directionChange = function(player, dir) {
	this.socket.emit('directionChange', {playerId: player.id, direction: dir});
};

Player = function(socket, table) {
	this.id = rng.uid();
	this.table = table;
	this.socket = socket;
	this.direction = null;
	this.score = null;
	Player._byId[this.id] = this;
	Player._instances.push(this);
	console.log('new player on table '+table.id);
};

Player._instances = [];
Player._byId = {}

Player.getById = function(id) {
	return Player._byId[id];
}

Player.prototype.changeDirection = function(dir) {
	// fixme: validation
	var player = this;
	this.direction = dir;
	// notify the table of the direction change
	this.table.directionChange(player, dir);
}

app.listen(NERDS.PORT);

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/table.html');
});

app.get('/controller.html', function (req, res) {
	res.sendfile(__dirname + '/controller.html');
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


io.configure(null, function(){
  io.set('log level', 0);
});

io.of('/table').on('connection', function(socket) {
	socket.on('askgame', function(data) {
		console.log('askgame ('+data.tableId+')');
		var table, game = {};
		if (data.tableId) {
			table = Table.getById(data.tableId);
		} else {
			table = new Table(socket);
			console.info("Opening a new table ("+table.id+")");			
		}
		game.id = table.id;
		game.controllerURI = NERDS.BASE_URL + "controller.html?tableId=" + table.id;
		game.gameURI = NERDS.BASE_URL + "table.html?tableId=" + table.id;

		socket.emit('game', game);
	});
});

io.of('/controller').on('connection', function(socket) {
	socket.on('joingame', function(data) {
		console.log('joingame ('+data.playerName+')');
		var table = Table.getById(data.tableId),
			player = new Player(socket, table);
		socket.emit('game', {playerId: player.id});
	});
	socket.on('directionChange', function(data) {
		var player = Player.getById(data.playerId);
		player.changeDirection(data.direction);
		
	});
});
