//Here we set up many values around the game instead of hardcoding them in the scene

export const GAME_CONFIG = {
	ARENA: {
		WIDTH: 30,			// Total X-axis length
		DEPTH: 14,			// Total Z-axis length
		LIMIT_Z: 7,			// Z-boundary for ball bouncing (Half of DEPTH)
		SCORE_X: 15			// X-boundary for scoring (Half of WIDTH)
	},
	PADDLE: {
		WIDTH: 1.0,			// Width of the paddle
		HEIGHT: 0.5,			// Height of the paddle
		DEPTH: 4.0,			// Depth of the paddle
		POS_X: 12,			// Distance from the center line
		POS_Y: 0.25,		// Distance from the center line (Y-axis)
		POS_Z: 0,			// Distance from the center line (Z-axis)
		LIMIT_Z: 5,			// Maximum movement range up/down
		COLOR: 0x312bfb		// Color of the paddle
	},
	BALL: {
		RADIUS: 0.4,			// Radius of the ball
		SPAWN_Y: 0.4,			// Y-position at spawn
		BASE_SPEED: 0.15		// Base speed of the ball
	}
};
