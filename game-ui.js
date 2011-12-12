YUI.add('snake-ui', function(Y) {

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
            LEFT:   37,
            RIGHT:  39,
            UP:     38,
            DOWN:   40
        },
        STEPS = {
            37: [-1, 0],
            39: [+1, 0],
            38: [0, -1],
            40: [0, +1]
        };

	var N = YUI.namespace('NERDS');
	
	N.SnakeModel = Y.Base.create('SnakeModel', Y.Model, [], {
		initializer: function(cfg) {
			// FIXME: break if ! pit
			this.pit = cfg.pit; 
		 	// positions on the pit.
			this._snake = pit.laySnake();
			
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
				validator: function(e) {
					/* direction change allowed only if changes axis (ie.: vertical to horizontal) */
				    var axis = (e.prevVal === DIRS.LEFT || e.prevVal === DIRS.RIGHT) ? 'H' : 'V',
				        nextAxis = (e.newVal === DIRS.LEFT || e.newVal === DIRS.RIGHT) ? 'H' : 'V';
				    // Validate the desired direction and stores it in the object for the next cycle.
				    return (axis !== nextAxis)
				}
			},

			playerName: {
				value: 'Player'
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
		},
		laySnake: function(l) {
			l = l || 3;
			
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
			return nextTile;
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
		dropApple: function() {},
	}, ATTRS: {
		width: {writeOnce: "initOnly"},
		height: {writeOnce: "initOnly"},
		applePosition: {}
	});

}, '1.0.0', {require: ['app', 'event']});
