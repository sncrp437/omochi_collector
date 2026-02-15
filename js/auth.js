// =============================================================================
// Authentication Module - Omochi Backend Integration
// =============================================================================

// Post-login sync flag
window._pendingCollect = null; // kept for backwards compatibility with my-collections.js override

/**
 * Check if user is currently logged in
 */
function isLoggedIn() {
    return !!localStorage.getItem('access_token');
}

/**
 * Get stored user object
 */
function getUser() {
    try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Login with email and password
 */
async function login(email, password) {
    const response = await apiRequest('/api/auth/login-user/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true
    });

    const data = await response.json();

    if (!response.ok) {
        throw data;
    }

    // Store tokens and user
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
}

/**
 * Register a new user, then auto-login
 */
async function register(formData) {
    const response = await apiRequest('/api/auth/register/', {
        method: 'POST',
        body: JSON.stringify(formData),
        skipAuth: true
    });

    const data = await response.json();

    if (!response.ok) {
        throw data;
    }

    // Registration does NOT return tokens - must login after
    await login(formData.email, formData.password);

    return data;
}

/**
 * Request password reset email
 */
async function requestPasswordReset(email) {
    const response = await apiRequest('/api/auth/reset-password/', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true
    });

    const data = await response.json();

    if (!response.ok) {
        throw data;
    }

    return data;
}

/**
 * Logout - clear all auth data
 */
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    if (typeof invalidateStockedVenuesCache === 'function') {
        invalidateStockedVenuesCache();
    }
    updateAuthUI();
}

// =============================================================================
// Auth Modal Management
// =============================================================================

/**
 * Show the auth modal in login or register mode
 */
function showAuthModal(mode) {
    const modal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (!modal) return;

    modal.classList.add('show');

    if (mode === 'register') {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
    }

    // Clear previous errors
    _clearAuthErrors();
}

/**
 * Hide the auth modal
 */
function hideAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('show');
    _clearAuthErrors();
    _clearAuthForms();
}

/**
 * Initialize auth modal event listeners
 */
function initAuthModal() {
    // Close modal
    const closeBtn = document.getElementById('authModalClose');
    const overlay = document.getElementById('authModalOverlay');
    if (closeBtn) closeBtn.addEventListener('click', hideAuthModal);
    if (overlay) overlay.addEventListener('click', hideAuthModal);

    // Toggle between login/register
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthModal('register');
        });
    }
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthModal('login');
        });
    }

    // Login form submission
    const loginSubmitBtn = document.getElementById('loginSubmit');
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', _handleLogin);
    }

    // Register form submission
    const registerSubmitBtn = document.getElementById('registerSubmit');
    if (registerSubmitBtn) {
        registerSubmitBtn.addEventListener('click', _handleRegister);
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Update UI based on current auth state
    updateAuthUI();
}

/**
 * Handle login form submission
 */
async function _handleLogin() {
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    const errorEl = document.getElementById('loginError');
    const submitBtn = document.getElementById('loginSubmit');

    if (!email || !password) {
        if (errorEl) errorEl.textContent = t('loginError') || 'Please fill in all fields';
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('auth-btn-loading');
        }
        await login(email, password);

        // Show success state briefly before closing
        _showAuthSuccess(() => {
            hideAuthModal();
            updateAuthUI();
            _handlePendingCollect();
        });
    } catch (err) {
        if (submitBtn) submitBtn.classList.remove('auth-btn-loading');
        if (errorEl) {
            if (err instanceof Error) {
                errorEl.textContent = t('networkError') || 'Network error. Please check your connection.';
            } else {
                errorEl.textContent = err.detail || t('loginError') || 'Invalid email or password';
            }
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('auth-btn-loading');
        }
    }
}

/**
 * Handle register form submission
 */
async function _handleRegister() {
    const errorEl = document.getElementById('registerError');
    const submitBtn = document.getElementById('registerSubmit');

    const formData = {
        email: document.getElementById('regEmail')?.value?.trim(),
        first_name: document.getElementById('regFirstName')?.value?.trim(),
        last_name: '---',
        phone_number: document.getElementById('regPhone')?.value?.trim(),
        password: document.getElementById('regPassword')?.value,
        password_confirm: document.getElementById('regPasswordConfirm')?.value,
        address: {
            prefecture: document.getElementById('regPrefecture')?.value?.trim(),
            city: '---',
            detail: '---'
        }
    };

    // Basic client-side validation
    if (!formData.email || !formData.first_name || !formData.password || !formData.password_confirm) {
        if (errorEl) errorEl.textContent = t('registerError') || 'Please fill in all required fields';
        return;
    }

    if (formData.password !== formData.password_confirm) {
        if (errorEl) errorEl.textContent = t('passwordMismatch') || 'Passwords do not match';
        return;
    }

    if (formData.password.length < 6 || formData.password.length > 12) {
        if (errorEl) errorEl.textContent = t('passwordLength') || 'Password must be 6-12 characters';
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('auth-btn-loading');
        }
        await register(formData);

        // Show success state briefly before closing
        _showAuthSuccess(() => {
            hideAuthModal();
            updateAuthUI();
            _handlePendingCollect();
        });
    } catch (err) {
        if (submitBtn) submitBtn.classList.remove('auth-btn-loading');
        if (errorEl) {
            if (err instanceof Error) {
                errorEl.textContent = t('networkError') || 'Network error. Please check your connection.';
            } else {
                const messages = _parseApiErrors(err);
                errorEl.textContent = messages || t('registerError') || 'Registration failed';
            }
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('auth-btn-loading');
        }
    }
}

/**
 * After successful login/register, sync local collections to API
 */
async function _handlePendingCollect() {
    // Sync any unsynced local collections to the API
    if (typeof syncLocalCollectionsToApi === 'function') {
        await syncLocalCollectionsToApi();
    }

    // Sync guest memos, tags, and folders to the Tags API
    try {
        if (typeof syncLocalMemosToApi === 'function') {
            await syncLocalMemosToApi();
        }
    } catch (err) { console.warn('Memo sync failed:', err); }

    try {
        if (typeof syncLocalTagsToApi === 'function') {
            await syncLocalTagsToApi();
        }
    } catch (err) { console.warn('Tag sync failed:', err); }

    try {
        if (typeof syncLocalFoldersToApi === 'function') {
            await syncLocalFoldersToApi();
        }
    } catch (err) { console.warn('Folder sync failed:', err); }

    try {
        if (typeof syncLocalVisitsToApi === 'function') {
            await syncLocalVisitsToApi();
        }
    } catch (err) { console.warn('Visit sync failed:', err); }

    // Invalidate folder caches to force refresh from API
    if (typeof invalidateFolderCache === 'function') {
        invalidateFolderCache();
    }

    // Invalidate stocked venues cache (server has authoritative data after sync)
    if (typeof invalidateStockedVenuesCache === 'function') {
        invalidateStockedVenuesCache();
    }
}

/**
 * Show a brief success animation in the auth modal, then call onComplete
 */
function _showAuthSuccess(onComplete) {
    const modalContent = document.querySelector('#authModal .auth-modal-content');
    if (!modalContent) {
        if (onComplete) onComplete();
        return;
    }

    // Replace modal content with success state
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';

    const successEl = document.createElement('div');
    successEl.className = 'auth-success-overlay';
    successEl.innerHTML = `
        <div class="auth-success-icon"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="auth-success-text">${t('loggedIn') || 'Logged in!'}</div>
    `;
    modalContent.appendChild(successEl);

    setTimeout(() => {
        successEl.remove();
        if (onComplete) onComplete();
    }, 800);
}

/**
 * Update UI elements based on auth state
 */
function updateAuthUI() {
    const loggedIn = isLoggedIn();
    const user = getUser();

    // Show/hide logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = loggedIn ? 'block' : 'none';

    // Update user display if exists
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
        userDisplay.textContent = loggedIn && user ? user.first_name || user.email : '';
    }

    // Update auth status indicator (green dot)
    const authStatus = document.getElementById('authStatus');
    if (authStatus) {
        if (loggedIn) {
            authStatus.classList.add('logged-in');
        } else {
            authStatus.classList.remove('logged-in');
        }
    }

    // Update settings drawer account sections
    const accountGuest = document.getElementById('settingsAccountGuest');
    const accountUser = document.getElementById('settingsAccountUser');
    const userNameEl = document.getElementById('settingsUserName');
    const userEmailEl = document.getElementById('settingsUserEmail');

    if (accountGuest) accountGuest.style.display = loggedIn ? 'none' : 'block';
    if (accountUser) accountUser.style.display = loggedIn ? 'block' : 'none';

    if (loggedIn && user) {
        if (userNameEl) userNameEl.textContent = user.first_name || user.email.split('@')[0];
        if (userEmailEl) userEmailEl.textContent = user.email;
    }
}

/**
 * Parse API error responses into a readable string
 */
function _parseApiErrors(err) {
    if (typeof err === 'string') return err;
    if (err.detail) return err.detail;

    // Field-level errors: {field: ["error message"]}
    const messages = [];
    for (const [field, errors] of Object.entries(err)) {
        if (Array.isArray(errors)) {
            messages.push(`${errors.join(', ')}`);
        } else if (typeof errors === 'string') {
            messages.push(errors);
        } else if (typeof errors === 'object') {
            // Nested object (e.g., address errors)
            for (const [subField, subErrors] of Object.entries(errors)) {
                if (Array.isArray(subErrors)) {
                    messages.push(`${subErrors.join(', ')}`);
                }
            }
        }
    }
    return messages.join('. ') || null;
}

/**
 * Clear error messages in auth forms
 */
function _clearAuthErrors() {
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');
    if (loginError) loginError.textContent = '';
    if (registerError) registerError.textContent = '';
}

/**
 * Clear auth form inputs
 */
function _clearAuthForms() {
    const inputs = document.querySelectorAll('.auth-form input');
    inputs.forEach(input => { input.value = ''; });
}

// Initialize auth modal when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthModal);
} else {
    initAuthModal();
}
