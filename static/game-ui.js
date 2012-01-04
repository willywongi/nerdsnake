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
		 	
		 	// The positions on the pit is given during construction
		 	//	from the pit itself. Only the pit can build snake instances.
		 	
			this.on('directionChange', function(e) {
				/* direction change allowed only if changes axis (ie.: vertical to horizontal) */
			    var axis = (e.prevVal === DIRS.L || e.prevVal === DIRS.R) ? 'H' : 'V',
			        nextAxis = (e.newVal === DIRS.L || e.newVal === DIRS.R) ? 'H' : 'V';
			    // Validate the desired direction and stores it in the object for the next cycle.
			    if (axis !== nextAxis) {
			    	e.preventDefault();
			    }
			});
			this.publish('move', {
				defaultFn: this._moveDefFn,
				context: this,
				emitFacade: true
			});
		},
        _moveDefFn: function() {
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
			this.pit._grid[nextHead[1]][nextHead[0]] = this;
			if (tileType === TILE_TYPES.APPLE) {
				// Yay! +1!
				this.set('score', this.get('score') + 1);
				// drop another apple
				this.pit.dropApple();
			} else {
				// move the snake.
				var tail = this._snake.pop();
				this.pit._grid[tail[1]][tail[0]] = 0
				
			}
			//Y.log(this._snake);
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
			this.publish('frame', {
					defaultFn: this._defFrame,
					context: this,
					emitFacade: true
				});
			Y.log('Created new Pit, gameId: '+cfg.gameId);
			
			this.engine = Y.later(500, this, function() {
					this.fire('frame');
				}, [], true);
			
			N.PitModel._pits[cfg.gameId] = this;
			
		},
		_defFrame: function() {
			/* at each frame the snakes advance, if someone eats the apple
				a new apple is layed down. */
			for (var i = 0, j = this._snakes.length; i < j; i++) {
				this._snakes[i].fire('move');
			}
		},
		addSnake: function(data, l) {
			/*
				data = {
					playerId:,
					playerName:,
				}
			
			*/
			Y.log('Snake added to the pit (player: '+data.playerId+')');
			/* Given a length, return the snake in forms of addresses:
				[[y0, x0], [y1, x1], [y2, x2]]
			*/
			l = l || 3;
			var freeTileFound, address, snake, dirs, transform,
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
			dirs = Y.Array.scramble(Y.Object.keys(STEPS));
			
			Y.Array.every(dirs, function(d) {
				Y.log('Checking if direction '+d+' is free to go for '+l+' tiles');
				var transform = STEPS[d];
				// Iteration stops if the supplied function does not return a truthy value.
				var next, all = 0, allClear;
				// going with the outer-scope variable snake.
				snake = [address];
				while (snake.length <= l) {
					next = [address[0] + transform[0], address[1] + transform[1]]
					snake.unshift(next);
					// add 1 if "next" is free
					all += (this.isFree(next)) ? 1 : 0;
				}
				// all !== l means that one of the tiles searched is not free.
				if (all === l) {
					Y.log('Yes! This path is clear.');
					// Set the right direction for the snake
					dir = d;
					
				}
				return all !== l;
			}, this);
			if (! snake) {
				throw "I'm pityfull, the pit is full";
			}
			Y.log("laySnake found this path to be clear: "+snake);
			var snakeModel = new N.SnakeModel(data);
			snakeModel._snake = snake;
			snakeModel.set('direction', dir);

			this._snakes.push(snakeModel);
			this._snakesByPlayerId[snakeModel.get('playerId')] = snakeModel;
			//snakeModel.after('move', this._snake2grid, this, snakeModel);
			this.fire('snakeAdded', snakeModel);
			return snakeModel;
		},
		_snake2grid: function(e, snakeModel) {
			/* aggiorna la griglia interna con le referenze ai vari snake */
			if (snakeModel.get('status') == 'dead') {
				return;
			}
			for (var adr, i=0, j=snakeModel._snake.length; i<j; i++) {
				adr = snakeModel._snake[i];
				this._grid[adr[1]][adr[0]] = snakeModel;
			}
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
			//Y.log("getNextTile("+head+", "+dir+") = "+nextTile);
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
		dropApple: function() {
			var apple = this._apple,
				address,
				W = this.get('width'),
				H = this.get('height');
			while (true) {
				address = [Math.floor(Math.random() * H), Math.floor(Math.random() * W)];
				if (this.isFree(address)) {
					break;
				}
			}
			this._apple = address;
			this._grid[address[1]][address[0]] = TILE_TYPES.APPLE;
		},
	}, {
		ATTRS: {
			width: {writeOnce: "initOnly"},
			height: {writeOnce: "initOnly"},
			applePosition: {},
			gameId: {},
		},
		_pits: {},
		getById: function(gameId) {
			return N.PitModel._pits[gameId];
		}
	});
	
	N.PitView = Y.Base.create('PitView', Y.View, [], {
		container: "<div />",
		initializer: function () {
			var pit = this.model;
			pit.after('frame', this.renderFrame, this);
		},
		render: function(node) {
            var W = this.model.get('width'),
                H = this.model.get('height'),
                s = this.get('tilesSize'),
                //container = Y.Node.create(this.container),
                canvas = Y.Node.create('<canvas></canvas>');
 
			canvas.setAttribute('width', W*s);
			canvas.setAttribute('height', H*s);
			//container.append(canvas);
			this.canvas = Y.Node.getDOMNode(canvas).getContext('2d');
			Y.one(node || 'body').appendChild(canvas);
			Y.log('created canvas of '+W+'x'+H);
		},
		renderFrame: function() {
            var c = this.canvas,
            	s = this.get('tilesSize'),
            	sm;
			this._clearBoard();
			for (var row, y = 0, H = this.model._grid.length; y < H; y++) {
				row = this.model._grid[y];
				for (var x = 0, W = row.length; x < W; x++) {
					sm = row[x];
					if (sm && sm.get) {
						c.save();
						c.fillStyle = sm.get('color');
				        c.fillRect(x*s, y*s, s, s);
				        c.restore();
					}
				} 
			}
		},
        _clearBoard: function() {
        	var s = this.get('tilesSize'),
        		w = this.model.get('width'),
        		h = this.model.get('height'),
        		ctx = this.canvas;
            ctx.clearRect(0, 0, s*w, s*h);
		}		
	}, {
		ATTRS: {
			tilesSize: { value: 10 }
		}
	});
	
	
}, '1.0.0', {requires: ['base', 'app', 'event']});
