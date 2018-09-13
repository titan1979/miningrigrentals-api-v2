import axios from 'axios';
import crypto from 'crypto';

/**
 An importable Javascript class to make REST requests to the MiningRigRentals API
 */
const v1 = 'v1';
const v2 = 'v2';
class MiningRigRentals {
	/**
	 * Create a new MiningRigRentals class from the constructor using your MRR api key and secret
	 * @param {Object} apiSettings
	 * @param {string} apiSettings.key - mining rig rentals api key
	 * @param {string} apiSettings.secret - mining rig rentals api secret
	 */
	constructor(apiSettings) {
		this.baseURL = 'https://www.miningrigrentals.com/api/';

		if (apiSettings && apiSettings.key && apiSettings.secret) {
			this.key = apiSettings.key;
			this.secret = apiSettings.secret;
			this.prevNonce = (new Date().getTime())
		}
	}
	/* ------------ Information API ----------- */
	/**
	 * Test connectivity and return information about you
	 * @returns {Promise<Object>}
	 */
	 async whoami() {
		let endpoint = '/whoami';
		let api = this.initAPI(endpoint);
		try {
			return (await api.get(endpoint)).data;
		} catch (err) {
			throw this.createError(endpoint, 'GET', err)
		}
	};
	/**
	 * Get a list of MRR rig servers
	 * @returns {Promise<Object>}
	 */
	async getServers() {
		let endpoint = '/info/servers';
		let api = this.initAPI(endpoint);
		try {
			return (await api.get(endpoint)).data;
		} catch (err) {
			throw this.createError(endpoint, 'GET', err)
		}
	};

	/**
	 * Get all algos and statistics for them (suggested price, unit information, current rented hash/etc)
	 * @param {string} [currency='BTC'] - Currency to use for price info *Ticker. Options: BTC, ETH, LTC, DASH
	 * @returns {Promise<Object>}
	 */
	async getAlgos(currency) {
		let endpoint = `/info/algos`, params;
		if (currency) {
			params = {
				currency: currency
			}
		}
		let api = this.initAPI(endpoint, params);
		try {
			return (await api.get(endpoint)).data;
		} catch (err) {
			throw this.createError(endpoint, 'GET', err)
		}
	};
	/**
	 *
	 * @param {string} algo - the name of the algorithm you wish to search by. Ex: 'scrypt'
	 * @param {string} [currency='BTC'] - Currency to use for price info. Options: BTC, ETH, LTC, DASH
	 * @returns {Promise<*>}
	 */
	async getAlgo(algo, currency) {
		let endpoint = `/info/algos/${algo}`, params;
		if (currency) {
			params = {
				currency: currency
			}
		}
		let api = this.initAPI(endpoint, params);
		try {
			return (await api.get(endpoint)).data;
		} catch (err) {
			throw this.createError(endpoint, 'GET', err)
		}
	};
	/* ------------ Account API ----------- */
	//@ToDO: add v1 account API methods

	/* ------------ Rig API ----------- */
	//@ToDo: finish getRig jsdoc (add the rest of the parameters)
	/**
	 *
	 * @param  {object} options - input fields/query parameters
	 * @param {string} options.type - Rig type, eg: sha256, scrypt, x11, etc
	 * @param
	 * @returns {Promise<*>}
	 */
	async getRig(options) {
		let endpoint = '/rig';
		let params = {};
		if (options) {
			for (let opt in options) {
				params[opt] = options[opt]
			}
		}
		let api = this.initAPI(endpoint, params);
		try {
			return (await api.get(endpoint)).data;
		} catch (err) {
			throw this.createError(endpoint, 'GET', err)
		}
	}
	/* ------------ Rental API ----------- */
	/**
	 * Lists rentals
	 * @param {Object} [options] - input fields/query parameters
	 * @param {string} [options.type=renter] - Type is one of [owner,renter] -- owner means rentals on your rigs, renter means rentals you purchased
	 * @param {string} [options.algo] - Filter by algo, see /info/algos
	 * @param {boolean} [options.history=false] - true = Show completed rentals, false = Active rentals
	 * @param {number} [options.rig] - Show rentals related to a specific rig ID
	 * @param {number} [options.start=0] - Start number (for pagination)
	 * @param {number} [options.limit=25] - Limit number (for pagination)
	 * @returns {Promise<*>}
	 */
	async getRental(options) {
		let endpoint = '/rental';
		let params = {};
		if (options) {
			for (let opt in options) {
				params[opt] = options[opt]
			}
		}
		let api = this.initAPI(endpoint, params);
		try {
			return (await api.get(endpoint)).data;
		} catch (err) {
			throw this.createError(endpoint, 'GET', err)
		}
	}

	/* ------------ AXIOS INITIATION ----------- */
	/**
	 * Initialize a new instance of axios with desired endpoint
	 * @param {string} endpoint - the endpoint you wish to hit WITHOUT THE TRAILING SLASH; ex: /rig/14
	 * @param {Object} [params] - extra parameters to be passed along to the API
	 * @param {string} [version='v2'] - specify the mining rig rental api version you want to hit; defaults v2
	 * @returns {AxiosInstance}
	 */
	initAPI(endpoint, params, version = v2) {
		let nonce = this.generateNonce();
		let hmac_digest = this.createHMACSignature(endpoint, nonce);
		return (
			new axios.create({
				baseURL: `${this.baseURL}${version}/`,
				headers: {
					'x-api-key': this.key,
					'x-api-sign': hmac_digest,
					'x-api-nonce': nonce,
					'Access-Control-Allow-Origin': '*',
				},
				params: params
			})
		)
	};
	/**
	 * Create a SHA1 HMAC signature required for every mrr api call (see more at 'https://www.miningrigrentals.com/apidocv2')
	 * @param {string} endpoint - the endpoint your wish to hit without the trailing slash
	 * @param {number} nonce - a nonce that increments with each call
	 * @returns {string} hmacSig - the HMAC signature in hex
	 */
	createHMACSignature(endpoint, nonce) {
		const concatString = `${this.key}${nonce}${endpoint}`;
		return crypto.createHmac('sha1', this.secret).update(concatString).digest('hex');
	};
	/**
	 * Generate a nonce needed to build the HMAC signature
	 * @returns {number} - the current UNIX time + the previous Nonce
	 */
	generateNonce() {
		this.prevNonce += (new Date()).getTime();
		return this.prevNonce
	};

	/* ----------------- Utilities ----------------- */
	/**
	 * Utility function to provide users with in depth error messaging for debugging
	 * @param url - the api endpoint
	 * @param type - the type of request (GET, POST, PUT, etc)
	 * @param error - the caught error
	 * @returns {Error}
	 */
	createError = (url, type, error) => {
		var extraErrorText = "";

		if (error && error.response){
			if (error.response.status)
				extraErrorText += error.response.status + " "
			if (error.response.statusText)
				extraErrorText += error.response.statusText + " | "
			if (error.response.data)
				extraErrorText += JSON.stringify(error.response.data)
		} else {
			extraErrorText = error.toString()
		}

		return new Error("Unable to " + type + " " + url + ": " + extraErrorText)
	}

}

export default MiningRigRentals
