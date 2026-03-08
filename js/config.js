// Supabase Configuration
// Replace these with your actual Supabase project values

const SUPABASE_URL = 'https://jcrsfzcabzdeqixbewgf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcnNmemNhYnpkZXFpeGJld2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NDI0MzEsImV4cCI6MjA4NDAxODQzMX0.yZvjcuMUqf-0ktDeh_wWhd9vuar2htDeE279sUHPNpA';

// Initialize Supabase client (using supabaseClient to avoid conflict with CDN's window.supabase)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// App Configuration
const APP_CONFIG = {
    // Contribution limits
    MIN_AMOUNT: 30,
    MAX_AMOUNT: 250,
    
    // URLs
    LOGIN_URL: '/auth/login.html',
    PORTAL_URL: '/portal/index.html',
    ADMIN_URL: '/admin/index.html',
    ONBOARDING_URL: '/portal/onboarding.html',
    
    // Supabase Edge Function base URL
    FUNCTIONS_URL: `${SUPABASE_URL}/functions/v1`,
};

// Helper to get full function URL
function getFunctionUrl(functionName) {
    return `${APP_CONFIG.FUNCTIONS_URL}/${functionName}`;
}

// Helper to call Edge Functions with auth
async function callEdgeFunction(functionName, body = {}) {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Session error: ' + sessionError.message);
    }
    
    if (!session) {
        console.error('No session found');
        throw new Error('Not authenticated - please log in again');
    }

    console.log('Calling function:', functionName, 'with session user:', session.user.email);

    const response = await fetch(getFunctionUrl(functionName), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();
    
    console.log('Function response:', response.status, data);

    if (!response.ok) {
        throw new Error(data.error || 'Function call failed');
    }

    return data;
}

// Format currency
function formatCurrency(cents) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(cents / 100);
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

// Show error message
function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
    }
}

// Hide error message
function hideError(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = '';
        el.classList.add('hidden');
    }
}

// Show success message
function showSuccess(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
    }
}

// Set button loading state
function setButtonLoading(button, loading, originalText = 'Submit') {
    if (loading) {
        button.disabled = true;
        button.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        `;
    } else {
        button.disabled = false;
        button.textContent = originalText;
    }
}

// ─── Brand Logo Loader ─────────────────────────────────────
// Finds all [data-brand-logo] containers and replaces JM text
// fallback with the uploaded brand logo from Supabase Storage.
// Markup pattern:
//   <div data-brand-logo class="...gradient...">
//       <span data-brand-fallback>JM</span>
//       <img data-brand-img class="hidden" alt="Logo">
//   </div>
var _brandLogoCache = null;

async function loadBrandLogos() {
    try {
        // Fetch + cache the logo info
        if (_brandLogoCache === undefined) return;   // already tried, nothing found
        if (!_brandLogoCache) {
            var res = await supabaseClient.storage
                .from('profile-pictures')
                .list('brand', { limit: 20 });

            if (!res.data || !res.data.length) { _brandLogoCache = undefined; return; }

            var match = res.data.find(function(f) { return f.name.startsWith('logo-transparent'); });
            if (!match) match = res.data.find(function(f) { return f.name.startsWith('logo-solid'); });
            if (!match) { _brandLogoCache = undefined; return; }

            var urlRes = supabaseClient.storage
                .from('profile-pictures')
                .getPublicUrl('brand/' + match.name);

            if (!urlRes.data || !urlRes.data.publicUrl) { _brandLogoCache = undefined; return; }

            _brandLogoCache = {
                url: urlRes.data.publicUrl + '?v=' + Date.now(),
                isTransparent: match.name.startsWith('logo-transparent'),
            };
        }

        var info = _brandLogoCache;
        var containers = document.querySelectorAll('[data-brand-logo]');

        containers.forEach(function(container) {
            var fallback = container.querySelector('[data-brand-fallback]');
            var imgEl    = container.querySelector('[data-brand-img]');
            if (!imgEl || imgEl.src) return;  // already loaded or missing

            var img = new Image();
            img.onload = function() {
                imgEl.src = info.url;
                imgEl.classList.remove('hidden');
                if (fallback) fallback.classList.add('hidden');

                if (info.isTransparent) {
                    container.classList.remove(
                        'bg-gradient-to-br', 'from-brand-500', 'to-brand-700',
                        'via-brand-600', 'to-brand-800'
                    );
                    container.style.background = 'transparent';
                    container.style.boxShadow = 'none';
                }
            };
            img.src = info.url;
        });
    } catch (e) {
        // Keep JM fallback
    }
}
