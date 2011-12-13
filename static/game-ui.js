YUI.add('snake-ui', function(Y) {

	Y.Array.scramble = function(arr) {
		/* Sort randomly an array in place.*/
		arr.sort(function(a, b) { return (Math.floor(Math.random() * 100) % 2) ? -1 : 1; });
		return arr;
	}

    var STATI = {
            INIT: 0,
            PLAY: 1,
            PAUSE: 2,
            OVER: 3
        },
        TILE_TYPES = {
        	FREE: 0,
        	APPLE: 1,
        	BUSY: 2,
        	OUT: 3
        },
        TILES_NUM = 40,
        TILES_SIZE = 10, //px
        BASE_SPEED = 700,
        DIRS = {
            // maps to keycodes
            L:	37,
            R:	39,
            U:	38,
            D:	40
        },
        STEPS = {
            37: [-1, 0],
            39: [+1, 0],
            38: [0, -1],
            40: [0, +1]
        };

	var N = Y.namespace('NERDS');
	N.SNAKE_DIRS = DIRS;
	
	N.SnakeModel = Y.Base.create('SnakeModel', Y.Model, [], {
		initializer: function(cfg) {
			// FIXME: break if ! pit
			this.pit = cfg.pit; 
		 	// positions on the pit.
		 	// FIXME: I must know the snake composition and the direction,
		 	//	to set its initial value.
			this._snake = cfg.pit.laySnake();
			Y.log('New Snake created');
			cfg.pit.addSnake(this);
			this.on('directionChange', function(e) {
				/* direction change allowed only if changes axis (ie.: vertical to horizontal) */
			    var axis = (e.prevVal === DIRS.L || e.prevVal === DIRS.R) ? 'H' : 'V',
			        nextAxis = (e.newVal === DIRS.L || e.newVal === DIRS.R) ? 'H' : 'V';
			    // Validate the desired direction and stores it in the object for the next cycle.
			    if (axis !== nextAxis) {
			    	e.preventDefault();
			    }
			});
		},
        moveSnake: function() {
        	var head = this._snake[0].slice(),
        		direction = this.get('direction'),
				nextHead = this.pit.getNextTile(head, direction),
				tileType = this.pit.typeOf(nextHead);
			if (tileType === TILE_TYPES.BUSY) {
				// oh no, I'm dead.
				this.set('status', 'dead');
				return;
			}
			// let's go ahead.
			this._snake.unshift(nextHead);
			if (hasApple) {
				// Yay! +1!
				this.set('score', this.get('score') + 1);
				// drop another apple
				this.pit.dropApple();
			} else {
				// move the snake.
				this._snake.pop();
			}

        },
        
	}, {
		ATTRS: {
		// Add custom model attributes here. These attributes will contain your
		// model's data. See the docs for Y.Attribute to learn more about defining
		// attributes.

			direction: {
				/* Where shoud I move on the next frame?*/
				value: null,
			},

			playerName: {
				value: 'Player'
			},
			
			playerId: {
				writeOnce: "initOnly"
			},
		
			color: {
				valueFn: function() {
					return "#000000";
				}
			},
			
			score: {
				value: 0
			},
			
			status: {
				value: 'alive'
			},
			
		}
	});
	
	N.PitModel = Y.Base.create('PitModel', Y.Model, [], {
		initializer: function(cfg) {
			var W = this.get('width'),
				H = this.get('height');
			// laydown the initial grid
			/*
					X . . . W
				Y
				. [[0, 0, 0],
				.  [0, 0, 0],
				.  [0, 0, 0]]
				H
			*/
			this._grid = [];
			for (var y = 0; y < H; y++) {
				var row = [];
				for (var x = 0; x < W; x++) {
					row.push(0);
				}
				this._grid.push(row);
			}
			this._snakes = [];
			this._snakesByPlayerId = {};
			Y.log('Created new Pit, gameId: '+cfg.gameId);
		},
		addSnake: function(snake) {
			Y.log('Snake added to the pit (player: '+snake.get('playerId')+')');
			this._snakes.push(snake);
			this._snakesByPlayerId[snake.get('playerId')] = snake;
		},
		laySnake: function(l) {
			/* Given a length, return the snake in forms of addresses:
				[[y0, x0], [y1, x1], [y2, x2]]
			*/
			l = l || 3;
			var freeTileFound, address, snake, steps,
				W = this.get('width'),
				H = this.get('height');
			do {
				address = [Math.floor(Math.random() * H), Math.floor(Math.random() * W)];
				Y.log("Looking for a free spot: "+address);
				freeTileFound = this.isFree(address);
			} while (! freeTileFound)
			Y.log("Found at: "+address);
			
			// ottengo un array con le chiavi delle 4 direzioni
			// sparpagliato.
			steps = Y.Array.scramble(Y.Object.keys(STEPS));
			
			Y.Array.every(steps, function(step) {
				Y.log('Checking if direction '+step+' is free to go for '+l+' tiles');
				// Iteration stops if the supplied function does not return a truthy value.
				var dir = STEPS[step],
					next, all = 0, allClear;
				// going with the outer-scope variable snake.
				snake = [address];
				while (snake.length <= l) {
					next = [address[0] + dir[0], address[1] + dir[1]]
					snake.push(next);
					// add 1 if "next" is free
					all += (this.isFree(next)) ? 1 : 0;
				}
				// all !== l means that one of the tiles searched is not free.
				if (all === l) {
					Y.log('Yes! This path is clear.');
				}
				return all !== l;
			}, this);
			if (! snake) {
				throw "I'm pityfull, the pit is full";
			}
			Y.log("laySnake found this path to be clear: "+snake);
			return snake;
		},
		getNextTile: function(head, dir) {
			var W = this.get('width'),
				H = this.get('height'),
				nextTile = [head[0] + STEPS[dir][0], head[1] + STEPS[dir][1]];
			/* round trip: horizontal */
			if (nextTile[0] > H) {
				nextTile[0] = 0;
			} else if (nextTile[0] < 0) {
				nextTile[0] = H;
			}
			/* round trip: vertical */
			if (nextTile[1] > W) {
				nextTile[1] = 0;
			} else if (nextTile[1] < 0) {
				nextTile[1] = W;
			}
			Y.log("getNextTile("+head+", "+dir+") = "+nextTile);
			return nextTile;
		},
		isFree: function(address) {
			return this.typeOf(address) === TILE_TYPES.FREE;		
		},
		typeOf: function(address) {
			var x = address[0],
				y = address[1],
				item;
			if (x < this.get('width') && y < this.get('height')) {
				item = this._grid[y][x];
				return (Y.Lang.isNumber(item)) ? item : TILE_TYPES.BUSY;
			} else {
				return;
			}
		},
		getPlayerSnake: function(playerId) {
			return this._snakesByPlayerId[playerId];
		},
		dropApple: function() {},
	}, {
		ATTRS: {
			width: {writeOnce: "initOnly"},
			height: {writeOnce: "initOnly"},
			applePosition: {},
			gameId: {},
		}
	});
	Y.log('snake-ui loaded');
}, '1.0.0', {requires: ['base', 'app', 'event']});
