let lineChart = null;
let barChart = null;
const fieldSelect = document.getElementById('fieldSelect');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const updateBtn = document.getElementById('updateBtn');
const errorToast = document.getElementById('errorMessage');
const weatherBtn = document.getElementById('weatherBtn');
const cityInput = document.getElementById('cityInput');
const weatherStatus = document.getElementById('weatherStatus');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginClose = document.getElementById('loginClose');
const registerClose = document.getElementById('registerClose');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
let authToken = localStorage.getItem('authToken');
let currentUser = null;
const today = new Date();
const past30 = new Date();
past30.setDate(today.getDate() - 30);
startDateInput.value = past30.toISOString().split('T')[0];
endDateInput.value = today.toISOString().split('T')[0];
function showError(msg) {
    errorToast.textContent = msg;
    errorToast.style.display = 'block';
    clearTimeout(showError._t);
    showError._t = setTimeout(hideError, 5200);
}

function hideError() {
    errorToast.style.display = 'none';
}

function openModal(modal) {
    modal.classList.remove('hidden');
}

function closeModal(modal) {
    modal.classList.add('hidden');
}

function authHeaders(extra = {}) {
    return authToken ? { ...extra, Authorization: `Bearer ${authToken}` } : extra;
}

function showAuthButtons() {
    loginBtn.classList.remove('hidden');
    registerBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    userInfo.classList.add('hidden');
}

function showUserInfo() {
    loginBtn.classList.add('hidden');
    registerBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    userInfo.classList.remove('hidden');
    userInfo.textContent = `Привет, ${currentUser?.username || 'пользователь'}!`;
}

function resetUI() {
    weatherStatus.textContent = '';
    if (lineChart) lineChart.destroy();
    if (barChart) barChart.destroy();
    document.getElementById('avgValue').textContent = '-';
    document.getElementById('minValue').textContent = '-';
    document.getElementById('maxValue').textContent = '-';
    document.getElementById('stdDevValue').textContent = '-';
}
async function fetchData() {
    const field = fieldSelect.value;
    const start = startDateInput.value;
    const end = endDateInput.value;

    try {
        const [dataRes, metricsRes] = await Promise.all([
            fetch(`/api/measurements?field=${encodeURIComponent(field)}&start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`),
            fetch(`/api/measurements/metrics?field=${encodeURIComponent(field)}`)
        ]);

        const data = await dataRes.json();
        const metrics = await metricsRes.json();

        if (!dataRes.ok) throw new Error(data.error || 'Failed to fetch data');
        if (!metricsRes.ok) throw new Error(metrics.error || 'Failed to fetch metrics');

        updateCharts(data, field);
        updateMetrics(metrics.metrics);
        hideError();
    } catch (err) {
        showError(err.message);
    }
}

function updateCharts(data, field) {
    const labels = data.map(d => new Date(d.timestamp).toLocaleDateString());
    const values = data.map(d => d[field]);

    if (lineChart) lineChart.destroy();
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    lineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: field,
                data: values,
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.18)',
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.10)' }, ticks: { color: '#9aa4b2' } },
                x: { grid: { display: false }, ticks: { color: '#9aa4b2' } }
            }
        }
    });

    if (barChart) barChart.destroy();
    const barCtx = document.getElementById('barChart').getContext('2d');
    barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: field,
                data: values,
                backgroundColor: 'rgba(16, 185, 129, 0.75)',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.10)' }, ticks: { color: '#9aa4b2' } },
                x: { grid: { display: false }, ticks: { color: '#9aa4b2' } }
            }
        }
    });
}

function updateMetrics(metrics) {
    document.getElementById('avgValue').textContent = metrics.average;
    document.getElementById('minValue').textContent = metrics.min;
    document.getElementById('maxValue').textContent = metrics.max;
    document.getElementById('stdDevValue').textContent = metrics.stdDev;
}
async function verifyToken() {
    if (!authToken) return false;
    try {
        const res = await fetch('/auth/verify', {
            headers: authHeaders()
        });
        if (!res.ok) throw new Error('bad token');
        const data = await res.json();
        currentUser = data.user;
        showUserInfo();
        return true;
    } catch {
        logout();
        return false;
    }
}

async function login(username, password) {
    const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken);
    showUserInfo();
}

async function register(username, email, password) {
    const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Register failed');
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken);
    showUserInfo();
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    showAuthButtons();
    hideError();
    resetUI();
}

// --- Events ---
updateBtn.addEventListener('click', async () => {
    if (!authToken) {
        showError('Пожалуйста, войдите в систему');
        return;
    }
    await fetchData();
});

weatherBtn.addEventListener('click', async () => {
    if (!authToken) {
        showError('Пожалуйста, войдите в систему');
        return;
    }
    const city = (cityInput.value || '').trim();
    if (!city) {
        showError('Введите город (например: Kokshetau)');
        return;
    }

    weatherStatus.textContent = 'Записываю...';
    try {
        const res = await fetch('/api/measurements/weather', {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ city })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed');
        weatherStatus.textContent = `Готово: ${result.data.temp}°C, ${result.data.city} (humidity ${result.data.humidity}%)`;
        await fetchData();
    } catch (err) {
        weatherStatus.textContent = '';
        showError(err.message);
    }
});

loginBtn.addEventListener('click', () => openModal(loginModal));
registerBtn.addEventListener('click', () => openModal(registerModal));
logoutBtn.addEventListener('click', logout);

loginClose.addEventListener('click', () => closeModal(loginModal));
registerClose.addEventListener('click', () => closeModal(registerModal));

window.addEventListener('click', (e) => {
    if (e.target === loginModal) closeModal(loginModal);
    if (e.target === registerModal) closeModal(registerModal);
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    try {
        await login(username, password);
        closeModal(loginModal);
        await fetchData();
    } catch (err) {
        showError(err.message);
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    try {
        await register(username, email, password);
        closeModal(registerModal);
        await fetchData();
    } catch (err) {
        showError(err.message);
    }
});

// --- Boot ---
(async function init() {
    if (authToken) {
        const ok = await verifyToken();
        if (ok) {
            await fetchData();
            return;
        }
    }
    showAuthButtons();
})();
