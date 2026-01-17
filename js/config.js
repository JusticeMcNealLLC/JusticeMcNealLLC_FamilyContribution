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
    LOGIN_URL: '/login.html',
    PORTAL_URL: '/portal/index.html',
    ADMIN_URL: '/admin/index.html',
    
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
