// =============================================================================
// API Client - Omochi Backend Integration
// =============================================================================

const API_BASE_URL = 'https://yje5anw6qd.execute-api.ap-northeast-1.amazonaws.com/prod';

// Auto-detect local development (CORS proxy needed for localhost)
const IS_LOCAL_DEV = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
const CORS_PROXY = 'https://corsproxy.io/?url=';

function _getApiUrl(endpoint) {
    const url = `${API_BASE_URL}${endpoint}`;
    return IS_LOCAL_DEV ? `${CORS_PROXY}${encodeURIComponent(url)}` : url;
}

// Track if a refresh is in progress to avoid concurrent refreshes
let _isRefreshing = false;
let _refreshPromise = null;

/**
 * Core API request function with auto-auth and token refresh
 */
async function apiRequest(endpoint, options = {}) {
    const url = _getApiUrl(endpoint);
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Attach auth token if available and not explicitly skipped
    if (!options.skipAuth) {
        const token = localStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    const fetchOptions = {
        ...options,
        headers
    };

    let response;
    try {
        response = await fetch(url, fetchOptions);
    } catch (err) {
        console.error('API request failed:', err);
        throw err;
    }

    // If 401 and not already a retry, attempt token refresh
    if (response.status === 401 && !options._isRetry && !options.skipAuth) {
        const refreshed = await _tryRefreshToken();
        if (refreshed) {
            const newToken = localStorage.getItem('access_token');
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, { ...fetchOptions, headers, _isRetry: true });
        }
    }

    return response;
}

/**
 * Attempt to refresh the access token using the refresh token.
 * Deduplicates concurrent refresh attempts.
 */
async function _tryRefreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    // If already refreshing, wait for the existing promise
    if (_isRefreshing && _refreshPromise) {
        return _refreshPromise;
    }

    _isRefreshing = true;
    _refreshPromise = (async () => {
        try {
            const response = await fetch(_getApiUrl('/api/auth/refresh-token/'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access);
                if (data.refresh) {
                    localStorage.setItem('refresh_token', data.refresh);
                }
                return true;
            } else {
                // Refresh token is invalid/expired - clear auth
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                return false;
            }
        } catch (err) {
            console.error('Token refresh failed:', err);
            return false;
        } finally {
            _isRefreshing = false;
            _refreshPromise = null;
        }
    })();

    return _refreshPromise;
}

// Convenience methods

async function apiGet(endpoint) {
    return apiRequest(endpoint, { method: 'GET' });
}

async function apiPost(endpoint, body) {
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

async function apiPut(endpoint, body) {
    return apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
}

async function apiDelete(endpoint) {
    return apiRequest(endpoint, { method: 'DELETE' });
}
