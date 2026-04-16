//Here we set up many values around the game instead of hardcoding them in the scene

export const GAME_CONFIG = {
	ARENA: {
		WIDTH: 30,					// Total X-axis length
		DEPTH: 14,					// Total Z-axis length
		LIMIT_Z: 7,					// Z-boundary for ball bouncing (Half of DEPTH)
		SCORE_X: 15,				// X-boundary for scoring (Half of WIDTH)
		WALL_THICKNESS: 0.1,		// Thickness of the walls
	},
	PADDLE: {
		WIDTH: 1.0,					// Width of the paddle
		HEIGHT: 0.5,				// Height of the paddle
		DEPTH: 4.0,					// Depth of the paddle
		POS_X: 12,					// Distance from the center line
		POS_Y: 0.25,				// Distance from the center line (Y-axis)
		POS_Z: 0,					// Distance from the center line (Z-axis)
		LIMIT_Z: 5,					// Maximum movement range up/down
		COLOR: 0x312bfb,			// Color of the paddle
		BASE_SPEED: 0.1,			// Base speed of the paddle
		AI_DEADZONE: 0.1,			// Deadzone for AI paddle movement
	},
	BALL: {
		RADIUS: 0.4,				// Radius of the ball
		SPAWN_Y: 0.4,				// Y-position at spawn
		BASE_SPEED: 0.12,			// Base speed of the ball
		RESET_VELOCITY_X: 0.15,		// Velocity to reset the ball to after scoring
		RESET_VELOCITY_Z_MAX: 0.12,	// Velocity to reset the ball to after scoring
	},
	POWERUP: {
		RADIUS: 0.6,				// Radius of the power-up
		SPAWN_Y: 0.4,				// Y-position at spawn
		DURATION_MS: 5000,			// How long the power-up stays on screen before vanishing
		SPAWN_INTERVAL_MS: 10000,	// How often the power-up spawns
		SPEED_MULTIPLIER: 1.5,		// Multiplier for the speed of the power-up
		SLOW_MULTIPLIER: 0.6,		// Multiplier for the slowdown of the power-up
	},
	PHYSICS: {
		PADDLE_SPEED_INC: 1.05,		// Multiplier for the speed of the paddle
		IMPACT_FACTOR: 0.15,		// Multiplier for the impact of the ball on the paddle
		SCORE_DELAY_MS: 1000,		// Delay before scoring
	}
};
