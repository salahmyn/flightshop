import axios from 'axios';
import { Config } from './config';

const MAX_REQUESTS_COUNT = 10
const INTERVAL_MS = 10
let PENDING_REQUESTS = 0

// create new axios instance
const $http = axios.create({})

// Attach headers

$http.defaults.headers.common["X-RapidAPI-Host"] = Config.API_HOST;
$http.defaults.headers.common["X-RapidAPI-Key"] = Config.API_KEY;

/**
 * Axios Request Interceptor
 */
$http.interceptors.request.use(function (config) {
    return new Promise((resolve) => {
        let interval = setInterval(() => {
            if (PENDING_REQUESTS < MAX_REQUESTS_COUNT) {
                PENDING_REQUESTS++
                clearInterval(interval)
                resolve(config)
            }
        }, INTERVAL_MS)
    })
})
/**
 * Axios Response Interceptor
 */
$http.interceptors.response.use(function (response) {
    PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1)
    return Promise.resolve(response)
}, function (error) {
    PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1)
    return Promise.reject(error)
})
export default $http
