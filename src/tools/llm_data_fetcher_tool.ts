/**
 * LLM Data Fetcher Tool for the MCP Server
 * Fetches LLM data from starwind.dev with rate limiting
 */

/**
 * Interface for LLM data fetcher arguments
 */
export interface LlmDataFetcherArgs {
	/** Whether to fetch the full LLM data (defaults to false) */
	full?: boolean;
}

// Cache implementation
interface CacheEntry {
	data: string;
	timestamp: number;
	expiresAt: number;
}

class DataCache {
	private cache: Map<string, CacheEntry> = new Map();

	/**
	 * Get data from cache if available and not expired
	 * @param key Cache key
	 * @returns Cached data or undefined if not found/expired
	 */
	get(key: string): string | undefined {
		const entry = this.cache.get(key);
		if (!entry) {
			return undefined;
		}

		// Check if entry has expired
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return undefined;
		}

		return entry.data;
	}

	/**
	 * Store data in cache with TTL
	 * @param key Cache key
	 * @param data Data to cache
	 * @param ttlSeconds Time to live in seconds
	 */
	set(key: string, data: string, ttlSeconds: number): void {
		const now = Date.now();
		this.cache.set(key, {
			data,
			timestamp: now,
			expiresAt: now + ttlSeconds * 1000,
		});
	}

	/**
	 * Get information about cache entry
	 * @param key Cache key
	 * @returns Info about cache entry or undefined if not found
	 */
	getInfo(key: string): { age: number; remainingTtl: number } | undefined {
		const entry = this.cache.get(key);
		if (!entry) {
			return undefined;
		}

		const now = Date.now();
		return {
			age: Math.floor((now - entry.timestamp) / 1000), // seconds
			remainingTtl: Math.floor((entry.expiresAt - now) / 1000), // seconds
		};
	}
}

// Cache TTL values in seconds
const CACHE_TTL = {
	STANDARD_LLM_DATA: 60 * 60, // 1 hour
	FULL_LLM_DATA: 60 * 60 * 3, // 3 hours
};

// Create cache instance
const dataCache = new DataCache();

// Rate limiting implementation
class RateLimiter {
	private lastCallTimes: number[] = [];
	private maxCallsPerMinute: number;

	constructor(maxCallsPerMinute: number = 3) {
		this.maxCallsPerMinute = maxCallsPerMinute;
	}

	/**
	 * Check if a call can be made based on rate limits
	 * @returns true if call is allowed, false if rate limited
	 */
	canMakeCall(): boolean {
		const now = Date.now();
		const oneMinuteAgo = now - 60 * 1000;

		// Remove timestamps older than one minute
		this.lastCallTimes = this.lastCallTimes.filter((time) => time > oneMinuteAgo);

		// Check if we've reached the limit
		return this.lastCallTimes.length < this.maxCallsPerMinute;
	}

	/**
	 * Record a new call
	 */
	recordCall(): void {
		this.lastCallTimes.push(Date.now());
	}

	/**
	 * Get the maximum number of calls allowed per minute
	 */
	getMaxCallsPerMinute(): number {
		return this.maxCallsPerMinute;
	}

	/**
	 * Get the number of remaining calls allowed in the current minute
	 */
	getRemainingCalls(): number {
		return this.maxCallsPerMinute - this.lastCallTimes.length;
	}

	/**
	 * Get the time in seconds until the rate limit resets
	 */
	getResetTimeSeconds(): number {
		if (this.lastCallTimes.length === 0) {
			return 0;
		}
		return Math.ceil(60 - (Date.now() - this.lastCallTimes[0]) / 1000);
	}
}

// Create a single rate limiter instance for this tool
const rateLimiter = new RateLimiter(3); // 3 calls per minute

/**
 * LLM Data Fetcher tool definition
 */
export const llmDataFetcherTool = {
	name: "fetch_llm_data",
	description:
		"Fetches LLM data from starwind.dev (rate limited to 3 requests per minute, with caching)",
	inputSchema: {
		type: "object",
		properties: {
			full: {
				type: "boolean",
				description: "Whether to fetch the full LLM data (defaults to false)",
			},
		},
		required: [],
	},
	handler: async (args: LlmDataFetcherArgs) => {
		// Determine which URL to use
		const isFull = args.full === true;
		const url = isFull ? "https://starwind.dev/llms-full.txt" : "https://starwind.dev/llms.txt";
		const cacheKey = `llm_data_${isFull ? "full" : "standard"}`;
		const cacheTtl = isFull ? CACHE_TTL.FULL_LLM_DATA : CACHE_TTL.STANDARD_LLM_DATA;

		// Check cache first
		const cachedData = dataCache.get(cacheKey);
		if (cachedData) {
			const cacheInfo = dataCache.getInfo(cacheKey);

			return {
				url,
				data: cachedData,
				timestamp: new Date().toISOString(),
				source: "cache",
				cacheInfo: {
					age: cacheInfo?.age + " seconds",
					remainingTtl: cacheInfo?.remainingTtl + " seconds",
				},
				rateLimitInfo: {
					requestsRemaining: rateLimiter.getRemainingCalls(),
					resetAfter: rateLimiter.getResetTimeSeconds() + " seconds",
				},
			};
		}

		// If not in cache, check rate limiting
		if (!rateLimiter.canMakeCall()) {
			throw new Error(
				"Rate limit exceeded. Please try again later (limit: 3 requests per minute).",
			);
		}

		// Record this call
		rateLimiter.recordCall();

		try {
			// Use native fetch
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
			}

			const data = await response.text();

			// Store in cache
			dataCache.set(cacheKey, data, cacheTtl);

			return {
				url,
				data,
				timestamp: new Date().toISOString(),
				source: "network",
				cacheInfo: {
					ttl: cacheTtl + " seconds",
				},
				rateLimitInfo: {
					requestsRemaining: rateLimiter.getRemainingCalls(),
					resetAfter: rateLimiter.getResetTimeSeconds() + " seconds",
				},
			};
		} catch (error: any) {
			throw new Error(`Error fetching LLM data: ${error.message}`);
		}
	},
};
