/**
 * Anyway Agent Tracking Demo Logic
 * 
 * 1. Generates mock Run data (representing "Runs" of a Deliverable).
 * 2. Renders the main Monitor Dashboard.
 * 3. Handles "Drill-down" interaction to show Trace Details.
 */

// --- Mock Data Generation ---

// "Deliverables" are the products/agents being sold. "Runs" are instances of them.
const DELIVERABLES = ["Market Analysis Agent", "Code Review Bot", "SEO Generator", "Data Extractor", "Customer Support AI"];
const CUSTOMERS = ["Acme Corp", "TechStart Inc", "Global AI", "Indie Dev #42", "Apollo Agency"];

const STEPS = [
    { name: "Input Validation", type: "system", baseCost: 0, duration: 0.05 },
    { name: "Context Retrieval (Vector DB)", type: "tool", baseCost: 0.002, duration: 0.3 },
    { name: "LLM Reasoning (GPT-4)", type: "llm", baseCost: 0.03, duration: 2.5 },
    { name: "Web Search (SerpAPI)", type: "tool", baseCost: 0.01, duration: 1.2 },
    { name: "Response Formatting", type: "system", baseCost: 0, duration: 0.1 }
];

function generateRuns(count = 15) {
    const runs = [];
    for (let i = 0; i < count; i++) {
        const isSuccess = Math.random() > 0.1; // 90% success rate
        const stepCount = Math.floor(Math.random() * 4) + 2; // 2-5 steps
        const trace = [];
        let totalCost = 0;
        let totalTokens = 0;
        let totalDuration = 0;

        // Generate Trace Steps
        for (let j = 0; j < stepCount; j++) {
            const stepTemplate = STEPS[Math.floor(Math.random() * STEPS.length)];
            const duration = stepTemplate.duration * (0.8 + Math.random() * 0.4); // Variance
            const cost = stepTemplate.baseCost > 0 ? stepTemplate.baseCost * (0.9 + Math.random() * 0.2) : 0;
            const tokens = stepTemplate.type === 'llm' ? Math.floor(Math.random() * 1000) + 200 : 0;
            
            trace.push({
                id: `step_${i}_${j}`,
                name: stepTemplate.name,
                type: stepTemplate.type,
                status: (j === stepCount - 1 && !isSuccess) ? "failed" : "success",
                duration: duration.toFixed(2),
                cost: cost.toFixed(4),
                tokens: tokens,
                details: stepTemplate.type === 'llm' ? `Model: gpt-4-turbo\nInput: ${tokens} tokens` : "System operation"
            });

            totalCost += cost;
            totalDuration += duration;
            totalTokens += tokens;
        }

        const deliverableName = DELIVERABLES[Math.floor(Math.random() * DELIVERABLES.length)];
        const customerName = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];

        runs.push({
            id: `RUN-${10000 + i}`,
            timestamp: new Date(Date.now() - i * 1000 * 60 * 45).toLocaleString(), // Spread over time
            deliverable: deliverableName,
            customer: customerName,
            status: isSuccess ? "success" : "failed",
            cost: totalCost.toFixed(4),
            duration: totalDuration.toFixed(2),
            tokens: totalTokens,
            trace: trace,
            output: isSuccess ? `{\n  "result": "Analysis complete",\n  "agent": "${deliverableName}",\n  "data_points": ${Math.floor(Math.random() * 10)}\n}` : `{\n  "error": "Timeout",\n  "code": 504\n}`
        });
    }
    return runs;
}

function generateApiKeys() {
    return [
        { id: 1, name: "testesttest", key: "ak_*************3Wg", secret: "************************************************", created: "2025-12-23" },
        { id: 2, name: "testtest", key: "ak_*************Zl0s", secret: "************************************************", created: "2025-12-19" },
        { id: 3, name: "staging", key: "ak_*************ED_4", secret: "************************************************", created: "2025-10-23" },
        { id: 4, name: "uat-key", key: "ak_*************E3Dg", secret: "************************************************", created: "2025-10-22" },
        { id: 5, name: "mor-test", key: "ak_*************nEzM", secret: "************************************************", created: "2025-10-13" },
        { id: 6, name: "dev-key", key: "ak_*************0iNs", secret: "************************************************", created: "2025-09-09" }
    ];
}

const state = {
    runs: generateRuns(),
    selectedRun: null,
    apiKeys: generateApiKeys(),
    currentView: 'dashboard'
};

// --- DOM Elements ---
const tableBody = document.getElementById('runsTableBody');
const tracePanel = document.getElementById('tracePanel');
const backdrop = document.getElementById('tracePanelBackdrop');
const closeBtn = document.getElementById('closePanelBtn');
const chartContainer = document.getElementById('mainChart');

// New DOM Elements
const dashboardView = document.getElementById('dashboardView');
const apiKeysView = document.getElementById('apiKeysView');
const settingsIcon = document.getElementById('settingsIcon');
const settingsDropdown = document.getElementById('settingsDropdown');
const menuApiKeys = document.getElementById('menuApiKeys');
const apiKeysTableBody = document.getElementById('apiKeysTableBody');
const navDashboard = document.getElementById('nav-dashboard');

// --- Rendering Logic ---

function renderTable() {
    tableBody.innerHTML = state.runs.map(run => `
        <tr onclick="openRunDetail('${run.id}')" data-testid="row-${run.id}">
            <td class="id-cell">${run.id}</td>
            <td>${run.timestamp.split(',')[0]}</td>
            <td>
                <div style="font-weight:500">${run.deliverable}</div>
                <div style="font-size:11px; color:var(--text-secondary)">${run.customer}</div>
            </td>
            <td><span class="status-badge ${run.status}">${run.status}</span></td>
            <td>${run.trace.length} steps</td>
            <td>${run.tokens}</td>
            <td class="cost-cell">$${run.cost}</td>
            <td><button class="view-btn">Trace</button></td>
        </tr>
    `).join('');
}

function renderChart() {
    // Simple visual bar chart
    chartContainer.innerHTML = '';
    const bars = 24;
    for(let i=0; i<bars; i++) {
        const height = 20 + Math.random() * 80;
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${height}%`;
        chartContainer.appendChild(bar);
    }
}

function openRunDetail(id) {
    const run = state.runs.find(r => r.id === id);
    if (!run) return;

    state.selectedRun = run;

    // Populate Panel Data
    document.getElementById('detailDeliveryId').textContent = run.id;
    const statusEl = document.getElementById('detailStatus');
    statusEl.textContent = run.status;
    statusEl.className = `status-badge ${run.status}`;
    
    document.getElementById('detailCost').textContent = `$${run.cost}`;
    document.getElementById('detailDuration').textContent = `${run.duration}s`;
    document.getElementById('detailTokens').textContent = run.tokens;
    document.getElementById('detailOutput').textContent = run.output;

    // Render Trace Timeline
    const timeline = document.getElementById('traceTimeline');
    timeline.innerHTML = run.trace.map(step => `
        <div class="trace-step ${step.type} ${step.status}">
            <div class="step-marker"></div>
            <div class="step-card">
                <div class="step-header">
                    <span class="step-name">${step.name}</span>
                    <div class="step-meta">
                        <span>${step.duration}s</span>
                        <span class="step-cost">$${step.cost}</span>
                    </div>
                </div>
                <div class="step-details">
                    ${step.details}
                </div>
            </div>
        </div>
    `).join('');

    // Open Panel
    tracePanel.classList.add('open');
    backdrop.classList.add('open');
}

function closePanel() {
    tracePanel.classList.remove('open');
    backdrop.classList.remove('open');
}

function renderApiKeys() {
    apiKeysTableBody.innerHTML = state.apiKeys.map(key => `
        <tr>
            <td style="font-weight: 500;">${key.name}</td>
            <td>
                <div class="masked-key">
                    ${key.key}
                    <span class="eye-icon" title="Reveal">👁️</span>
                </div>
            </td>
            <td>
                <div class="masked-key">
                    ${key.secret}
                    <span class="eye-icon" title="Reveal">👁️</span>
                </div>
            </td>
            <td style="color: var(--text-secondary); font-size: 13px;">${key.created}</td>
            <td><button class="delete-action" onclick="deleteApiKey(${key.id})">Delete</button></td>
        </tr>
    `).join('');
}

window.deleteApiKey = function(id) {
    if(confirm('Are you sure you want to delete this API Key?')) {
        state.apiKeys = state.apiKeys.filter(k => k.id !== id);
        renderApiKeys();
    }
}

function switchView(viewName) {
    state.currentView = viewName;
    
    // Hide all views
    dashboardView.style.display = 'none';
    apiKeysView.style.display = 'none';
    
    // Update Nav Active State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    if (viewName === 'dashboard') {
        dashboardView.style.display = 'block';
        if(navDashboard) navDashboard.classList.add('active');
    } else if (viewName === 'api-keys') {
        apiKeysView.style.display = 'block';
        renderApiKeys();
    }
    
    // Close dropdown
    settingsDropdown.classList.remove('active');
}

// --- Event Listeners ---

closeBtn.addEventListener('click', closePanel);
backdrop.addEventListener('click', closePanel);

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
});

// Settings & Navigation Listeners
if(settingsIcon) {
    settingsIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsDropdown.classList.toggle('active');
    });
}

document.addEventListener('click', () => {
    if(settingsDropdown) settingsDropdown.classList.remove('active');
});

if(settingsDropdown) {
    settingsDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

if(menuApiKeys) {
    menuApiKeys.addEventListener('click', () => {
        switchView('api-keys');
    });
}

if(navDashboard) {
    navDashboard.addEventListener('click', () => {
        switchView('dashboard');
    });
}

// --- Initialization ---

function init() {
    renderTable();
    renderChart();
    renderApiKeys();
    console.log("Anyway Prototype Loaded. Data:", state);
}

init();
