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
                description: `Executed ${stepTemplate.name} successfully`, // Added description
                type: stepTemplate.type,
                status: (j === stepCount - 1 && !isSuccess) ? "failed" : "success",
                duration: duration.toFixed(2),
                cost: cost.toFixed(4),
                tokens: tokens,
                input: "User query: 'Analyze market trends for Q3'", // Added input
                output: "Market data: Growth 5%, Competitors: A, B, C", // Added output
                details: stepTemplate.type === 'llm' ? `Model: gpt-4-turbo\nInput: ${tokens} tokens` : "System operation"
            });

            totalCost += cost;
            totalDuration += duration;
            totalTokens += tokens;
        }

        const deliverableName = DELIVERABLES[Math.floor(Math.random() * DELIVERABLES.length)];
        const customerName = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];

        runs.push({
            id: `DEL-${10000 + i}`,
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
    agents: [], // New Agent State
    products: [], // New Product Catalog State
    llmKeys: [], // New LLM Provider Keys
    currentView: 'dashboard',
    wizardData: {
        step: 1,
        provider: 'openai',
        keyLabel: '',
        apiKey: '',
        agentName: '',
        agentDesc: '',
        selectedKeys: []
    },
    productWizardData: {
        step: 1,
        agentId: null,
        isStandalone: false,
        name: '',
        desc: '',
        audience: '',
        useCase: '',
        competitorPrice: '',
        manualCost: '',
        margin: '',
        suggestedRange: '',
        suggestedAnchor: '',
        finalPrice: ''
    }
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
const productCatalogView = document.getElementById('productCatalogView'); // New
const settingsIcon = document.getElementById('settingsIcon');
const settingsDropdown = document.getElementById('settingsDropdown');
const menuApiKeys = document.getElementById('menuApiKeys');
const apiKeysTableBody = document.getElementById('apiKeysTableBody');
const productTableBody = document.getElementById('productTableBody'); // New
const navDashboard = document.getElementById('nav-dashboard');
const navProducts = document.getElementById('nav-products'); // New

// Agent Modals
const addAgentBackdrop = document.getElementById('addAgentBackdrop');
const manageAgentsBackdrop = document.getElementById('manageAgentsBackdrop');
const addProductBackdrop = document.getElementById('addProductBackdrop'); // New
const addAgentBtn = document.getElementById('addAgentBtn');
const manageAgentsBtn = document.getElementById('manageAgentsBtn');
const emptyState = document.getElementById('emptyState');
const dashboardContent = document.getElementById('dashboardContent');

// --- Agent Logic ---

function renderDashboard() {
    // If no agents, show empty state (Simulated logic: for demo, we might want to start with 1 agent)
    // But per requirements, let's respect the state.
    // For this prototype, let's initialize with 0 agents to show the empty state flow,
    // OR initialize with 1 mock agent if we want to show data immediately.
    // Given the "New Requirement" explicitly asks for empty state handling, let's start empty OR check state.
    
    // Initial Seed if empty (Optional, but let's leave it empty to test flow)
    // state.agents = [{ id: 1, name: "Demo Agent", providerCount: 1 }]; 
    
    if (state.agents.length === 0) {
        if(emptyState) emptyState.style.display = 'flex';
        if(dashboardContent) dashboardContent.style.display = 'none';
        // Hide add button in header if empty state is main focus? 
        // Requirement says: "When empty, entry button as visual focus (center)". 
        // We have the center button. We can hide the header button to reduce clutter or keep it.
    } else {
        if(emptyState) emptyState.style.display = 'none';
        if(dashboardContent) dashboardContent.style.display = 'block';
    }
}

// --- Add Agent Wizard ---

window.openAddAgentModal = function() {
    // Reset Wizard Data
    state.wizardData = {
        step: 1,
        agentName: '',
        agentDesc: '',
        keys: []
    };
    
    // Reset UI
    document.getElementById('agentNameInput').value = '';
    document.getElementById('agentDescInput').value = '';
    document.getElementById('providerSelect').value = 'openai';
    document.getElementById('keyLabelInput').value = '';
    document.getElementById('apiKeyInput').value = '';
    
    renderConfiguredKeys();
    window.goToStep(1);
    addAgentBackdrop.classList.add('active');
}

window.closeAddAgentModal = function() {
    addAgentBackdrop.classList.remove('active');
}

window.goToStep = function(step) {
    // Validation Step 1 -> 2
    if (step === 2 && state.wizardData.step === 1) {
        const name = document.getElementById('agentNameInput').value;
        if (!name) {
            alert("Agent Name is required.");
            return;
        }
        state.wizardData.agentName = name;
        state.wizardData.agentDesc = document.getElementById('agentDescInput').value;
    }
    
    // Validation Step 2 -> 3
    if (step === 3 && state.wizardData.step === 2) {
        if (state.wizardData.keys.length === 0) {
            alert("Please add at least one Provider Key.");
            return;
        }
        
        // Generate Credentials
        document.getElementById('generatedAnywayKey').value = "any_wk_" + Math.random().toString(36).substr(2, 16);
        
        // Generate Base URLs for each provider
        const baseUrlContainer = document.getElementById('generatedBaseUrlsContainer');
        baseUrlContainer.innerHTML = state.wizardData.keys.map(k => `
            <div class="copy-field" style="margin-bottom: 8px;">
                <span style="font-size: 11px; width: 60px; display: inline-block; color: var(--text-secondary);">${k.provider}</span>
                <input type="text" readonly value="https://api.anyway.sh/v1/${k.provider}">
                <button class="copy-btn">Copy</button>
            </div>
        `).join('');

        // Generate Code Example
        const codeBlock = document.getElementById('integrationCodeBlock');
        codeBlock.innerHTML = `
const client = new OpenAI({
  apiKey: "<span style="color:#059669">ANYWAY_API_KEY</span>",
  baseURL: "<span style="color:#059669">https://api.anyway.sh/v1/${state.wizardData.keys[0].provider}</span>" // Use corresponding URL
});`;
    }

    // Update UI
    document.querySelectorAll('.step').forEach((el, idx) => {
        if (idx + 1 === step) el.classList.add('active');
        else el.classList.remove('active');
    });
    
    document.querySelectorAll('.step-content').forEach((el, idx) => {
        if (idx + 1 === step) el.classList.add('active');
        else el.classList.remove('active');
    });
    
    state.wizardData.step = step;
}

window.addProviderKey = function() {
    const provider = document.getElementById('providerSelect').value;
    const label = document.getElementById('keyLabelInput').value;
    const key = document.getElementById('apiKeyInput').value;
    
    if (!label || !key) {
        alert("Please fill in Label and API Key.");
        return;
    }
    
    // Unique Label Check
    if (state.wizardData.keys.some(k => k.label === label)) {
        alert("Key Label must be unique.");
        return;
    }
    
    // Max 3 Check
    if (state.wizardData.keys.length >= 3) {
        alert("Maximum 3 keys allowed.");
        return;
    }
    
    state.wizardData.keys.push({
        id: Date.now(),
        provider,
        label,
        key: key.substring(0, 8) + "...",
        fullKey: key,
        showFull: false // Track visibility state
    });
    
    // Clear Inputs
    document.getElementById('keyLabelInput').value = '';
    document.getElementById('apiKeyInput').value = '';
    
    renderConfiguredKeys();
}

window.removeProviderKey = function(id) {
    state.wizardData.keys = state.wizardData.keys.filter(k => k.id !== id);
    renderConfiguredKeys();
}

function renderConfiguredKeys() {
    const list = document.getElementById('configuredKeysList');
    if (state.wizardData.keys.length === 0) {
        list.innerHTML = '<div class="empty-keys-msg">No keys added yet.</div>';
        return;
    }
    
    list.innerHTML = state.wizardData.keys.map(k => `
        <div class="key-option" style="cursor: default;">
            <span>${k.provider === 'openai' ? '🟢' : k.provider === 'anthropic' ? '🟠' : '🔵'}</span>
            <div style="flex:1">
                <div style="font-weight:500; font-size:13px">${k.label}</div>
                <div style="font-size:11px; color:var(--text-secondary)">
                    ${k.provider} • <span style="font-family:monospace">${k.showFull ? k.fullKey : k.key}</span>
                    <a href="#" onclick="toggleWizardKeyVisibility(${k.id}); return false;" style="margin-left:4px; font-size:10px;">${k.showFull ? 'Hide' : 'Show'}</a>
                </div>
            </div>
            <button class="secondary-btn" style="padding: 2px 8px; height: 24px; font-size: 11px;" onclick="removeProviderKey(${k.id})">Remove</button>
        </div>
    `).join('');
}

window.toggleWizardKeyVisibility = function(id) {
    const key = state.wizardData.keys.find(k => k.id === id);
    if (key) {
        key.showFull = !key.showFull;
        renderConfiguredKeys();
    }
}

window.testConnection = function() {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = "Testing...";
    setTimeout(() => {
        btn.textContent = "Connection Verified ✅";
        btn.style.borderColor = "var(--success)";
        btn.style.color = "var(--success)";
    }, 1500);
}

window.finishAddAgent = function() {
    // Create Agent
    const newAgent = {
        id: Date.now(),
        name: state.wizardData.agentName,
        description: state.wizardData.agentDesc,
        providerCount: state.wizardData.keys.length,
        keys: state.wizardData.keys,
        anywayKey: document.getElementById('generatedAnywayKey').value
    };
    state.agents.push(newAgent);
    
    closeAddAgentModal();
    renderDashboard();
    
    // Switch to Dashboard View if not already
    switchView('dashboard');
}

// --- Manage Agents ---

window.openManageAgentsModal = function() {
    renderAgentList();
    manageAgentsBackdrop.classList.add('active');
}

window.closeManageAgentsModal = function() {
    manageAgentsBackdrop.classList.remove('active');
}

function renderAgentList() {
    const list = document.getElementById('agentList');
    list.innerHTML = state.agents.map(agent => `
        <div class="agent-list-item" onclick="selectAgent(${agent.id})">
            <div class="name">${agent.name}</div>
            <div class="meta">${agent.providerCount} Providers Linked</div>
        </div>
    `).join('');
}

window.selectAgent = function(id) {
    const agent = state.agents.find(a => a.id === id);
    if (!agent) return;
    
    const detailView = document.getElementById('manageDetailView');
    
    // Generate Keys HTML
    const keysHtml = (agent.keys || []).map(k => `
        <div class="key-option" style="cursor: default; margin-bottom: 8px;">
            <span>${k.provider === 'openai' ? '🟢' : k.provider === 'anthropic' ? '🟠' : '🔵'}</span>
            <div style="flex:1">
                <div style="font-weight:500; font-size:13px">${k.label}</div>
                <div style="font-size:11px; color:var(--text-secondary)">
                    ${k.provider} • <span style="font-family:monospace">${k.showFull ? k.fullKey : k.key}</span>
                    <a href="#" onclick="toggleAgentKeyVisibility(${agent.id}, ${k.id}); return false;" style="margin-left:4px; font-size:10px;">${k.showFull ? 'Hide' : 'Show'}</a>
                </div>
            </div>
            <button class="secondary-btn" style="padding:2px 8px; font-size:11px;" onclick="removeAgentKey(${agent.id}, ${k.id})">Remove</button>
        </div>
    `).join('');

    // Generate Base URLs HTML
    const baseUrlsHtml = (agent.keys || []).map(k => `
        <div class="copy-field" style="margin-bottom: 8px;">
            <span style="font-size: 11px; width: 60px; display: inline-block; color: var(--text-secondary);">${k.provider}</span>
            <input type="text" readonly value="https://api.anyway.sh/v1/${k.provider}">
            <button class="copy-btn">Copy</button>
        </div>
    `).join('');

    detailView.innerHTML = `
        <div class="detail-section">
            <h3>Basic Information</h3>
            <div class="form-group">
                <label>Agent Name</label>
                <input type="text" class="form-input" id="editAgentName" value="${agent.name}">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea class="form-input" id="editAgentDesc" rows="2">${agent.description || ''}</textarea>
            </div>
            <button class="primary-btn" onclick="saveAgentInfo(${agent.id})">Save Changes</button>
        </div>
        
        <div class="detail-section">
            <h3>Provider Keys</h3>
            <div class="key-selection-list" style="margin-bottom:12px;">
                 ${keysHtml || '<div class="empty-keys-msg">No keys linked.</div>'}
            </div>
            <button class="secondary-btn" onclick="promptAddKey(${agent.id})">+ Link New Key</button>
        </div>
        
        <div class="detail-section">
            <h3>Anyway Credentials</h3>
            <div class="form-group">
                <label>Anyway API Key</label>
                <div class="copy-field">
                    <input type="text" readonly value="${agent.anywayKey || 'Not Generated'}" style="font-family:monospace;">
                    <button class="copy-btn">Copy</button>
                </div>
            </div>
             <div class="form-group">
                <label>Anyway Base URLs</label>
                ${baseUrlsHtml}
            </div>
        </div>
        
        <div class="danger-zone">
            <h3>Danger Zone</h3>
            <p style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">Deleting this agent will permanently disable all associated credentials. Historical data will be preserved.</p>
            <button class="danger-btn" onclick="deleteAgent(${agent.id})">Delete Agent</button>
        </div>
    `;
}

window.saveAgentInfo = function(id) {
    const agent = state.agents.find(a => a.id === id);
    if (!agent) return;
    
    const newName = document.getElementById('editAgentName').value;
    if (!newName) {
        alert("Agent Name cannot be empty.");
        return;
    }
    
    agent.name = newName;
    agent.description = document.getElementById('editAgentDesc').value;
    
    renderAgentList();
    alert("Changes saved successfully.");
}

window.removeAgentKey = function(agentId, keyId) {
    const agent = state.agents.find(a => a.id === agentId);
    if (!agent) return;
    
    if (confirm("Remove this key? The agent will no longer be able to use this provider.")) {
        agent.keys = agent.keys.filter(k => k.id !== keyId);
        agent.providerCount = agent.keys.length;
        renderAgentList();
        selectAgent(agentId); // Refresh detail view
    }
}

window.promptAddKey = function(agentId) {
    const provider = prompt("Enter Provider (openai/anthropic/gemini):", "openai");
    if(!provider) return;
    const label = prompt("Enter Key Label:", "New Key");
    if(!label) return;
    const key = prompt("Enter API Key:", "sk-...");
    if(!key) return;
    
    const agent = state.agents.find(a => a.id === agentId);
    agent.keys = agent.keys || [];
    agent.keys.push({
        id: Date.now(),
        provider,
        label,
        key: key.substring(0, 8) + "...",
        fullKey: key
    });
    agent.providerCount = agent.keys.length;
    renderAgentList();
    selectAgent(agentId);
}

window.deleteAgent = function(id) {
    if(confirm("Are you sure you want to delete this agent? This action cannot be undone.")) {
        state.agents = state.agents.filter(a => a.id !== id);
        renderAgentList();
        document.getElementById('manageDetailView').innerHTML = '<div class="empty-selection">Select an agent to edit</div>';
        renderDashboard(); // Update background state
    }
}


// --- Rendering Logic ---

function renderTable() {
    tableBody.innerHTML = state.runs.map(run => `
        <tr onclick="openRunDetail('${run.id}')" data-testid="row-${run.id}">
            <td class="id-cell">${run.id}</td>
            <td>${run.timestamp.split(',')[0]}</td>
            <td>
                <div style="font-weight:500">${run.deliverable}</div>
                <div style="font-size:11px; color:var(--text-secondary)">demo@anyway.sh</div>
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
    if(productCatalogView) productCatalogView.style.display = 'none'; // New
    
    // Update Nav Active State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    if (viewName === 'dashboard') {
        dashboardView.style.display = 'block';
        if(navDashboard) navDashboard.classList.add('active');
    } else if (viewName === 'api-keys') {
        apiKeysView.style.display = 'block';
        renderApiKeys();
    } else if (viewName === 'products') { // New
        if(productCatalogView) productCatalogView.style.display = 'block';
        if(navProducts) navProducts.classList.add('active');
        renderProductCatalog();
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

if(navProducts) {
    navProducts.addEventListener('click', () => {
        switchView('products');
    });
}

// Global Copy Button Handler
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-btn')) {
        const input = e.target.previousElementSibling;
        if (input && input.tagName === 'INPUT') {
            input.select();
            // Modern Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                 navigator.clipboard.writeText(input.value);
            } else {
                // Fallback
                document.execCommand('copy');
            }
            
            const originalText = e.target.textContent;
            e.target.textContent = 'Copied!';
            e.target.classList.add('success');
            setTimeout(() => {
                e.target.textContent = originalText;
                e.target.classList.remove('success');
            }, 1500);
        }
    }
});

// --- Product Catalog Logic ---

function renderProductCatalog() {
    if (!productTableBody) return;
    
    if (state.products.length === 0) {
        productTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding: 40px; color: var(--text-secondary);">
                    No products created yet. Click "+ Create Product" to start monetizing.
                </td>
            </tr>
        `;
        return;
    }
    
    productTableBody.innerHTML = state.products.map(p => `
        <tr>
            <td>
                <div style="font-weight:500">${p.name}</div>
                <div style="font-size:11px; color:var(--text-secondary)">${p.desc || 'No description'}</div>
            </td>
            <td>
                ${p.isStandalone ? 
                    '<span class="status-badge" style="background:var(--bg-body); color:var(--text-secondary)">Standalone</span>' : 
                    state.agents.find(a => a.id === p.agentId)?.name || 'Unknown Agent'
                }
            </td>
            <td>$${p.finalPrice}</td>
            <td>
                <div style="font-size:12px">${p.audience === 'b2c' ? 'B2C' : 'B2B'}</div>
            </td>
            <td><span class="status-badge active">Active</span></td>
            <td><button class="view-btn">Edit</button></td>
        </tr>
    `).join('');
}

window.openAddProductModal = function() {
    // Reset Wizard Data
    state.productWizardData = {
        step: 1,
        agentId: null,
        isStandalone: false,
        name: '',
        desc: '',
        audience: 'b2c',
        useCase: '',
        competitorPrice: '',
        manualCost: '',
        margin: '',
        suggestedRange: '',
        suggestedAnchor: '',
        finalPrice: ''
    };
    
    // Reset UI Inputs
    if(document.getElementById('productNameInput')) document.getElementById('productNameInput').value = '';
    if(document.getElementById('productDescInput')) document.getElementById('productDescInput').value = '';
    if(document.getElementById('pricingAudience')) document.getElementById('pricingAudience').value = 'b2c';
    if(document.getElementById('finalPriceInput')) document.getElementById('finalPriceInput').value = '';
    
    // Reset Analysis UI
    document.getElementById('pricingAnalysisPlaceholder').style.display = 'block';
    document.getElementById('pricingAnalysisResult').style.display = 'none';
    
    // Populate Agent Select
    const agentSelect = document.getElementById('productAgentSelect');
    if (agentSelect) {
        if (state.agents.length === 0) {
            agentSelect.innerHTML = '<option value="" disabled selected>No agents available</option>';
        } else {
            agentSelect.innerHTML = '<option value="">-- Select an Agent --</option>' + 
                state.agents.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
        }
    }
    
    // Reset Selection UI
    selectStandaloneProduct(false);
    
    window.productGoToStep(1);
    addProductBackdrop.classList.add('active');
}

window.closeAddProductModal = function() {
    addProductBackdrop.classList.remove('active');
}

window.selectStandaloneProduct = function(isStandalone) {
    // Toggle if called without args (from UI click)
    if (typeof isStandalone === 'undefined') {
        isStandalone = !state.productWizardData.isStandalone;
    }
    
    state.productWizardData.isStandalone = isStandalone;
    // Corrected ID to match HTML (standaloneOption) and removed non-existent agentOptionCard
    const standaloneCard = document.getElementById('standaloneOption');
    const agentSelect = document.getElementById('productAgentSelect');
    
    if (isStandalone) {
        if(standaloneCard) standaloneCard.classList.add('selected');
        if(agentSelect) {
            agentSelect.disabled = true;
            agentSelect.value = "";
        }
    } else {
        if(standaloneCard) standaloneCard.classList.remove('selected');
        if(agentSelect) agentSelect.disabled = false;
    }
}

window.productGoToStep = function(step) {
    // Validation
    if (step === 2 && state.productWizardData.step === 1) {
        if (!state.productWizardData.isStandalone && (!state.agents.length || !document.getElementById('productAgentSelect').value)) {
            // Allow if standalone, else check agent
             if(!state.productWizardData.isStandalone) {
                 const agentId = document.getElementById('productAgentSelect').value;
                 if(!agentId) {
                     alert("Please select an agent or choose Standalone Product.");
                     return;
                 }
                 state.productWizardData.agentId = parseInt(agentId);
             }
        }
    }
    
    if (step === 3 && state.productWizardData.step === 2) {
        const name = document.getElementById('productNameInput').value;
        if (!name) {
            alert("Product Name is required.");
            return;
        }
        state.productWizardData.name = name;
        state.productWizardData.desc = document.getElementById('productDescInput').value;
    }
    
    if (step === 4 && state.productWizardData.step === 3) {
        const price = document.getElementById('finalPriceInput').value;
        if (!price) {
            alert("Please set a final price.");
            return;
        }
        state.productWizardData.finalPrice = price;
    }

    // Update UI
    document.querySelectorAll('#addProductBackdrop .step').forEach((el, idx) => {
        if (idx + 1 === step) el.classList.add('active');
        else el.classList.remove('active');
    });
    
    document.querySelectorAll('#addProductBackdrop .step-content').forEach((el, idx) => {
        if (idx + 1 === step) el.classList.add('active');
        else el.classList.remove('active');
    });
    
    state.productWizardData.step = step;
}

window.analyzePricing = function() {
    const audience = document.getElementById('pricingAudience').value;
    state.productWizardData.audience = audience;
    
    // Simulate AI Analysis
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = "🤖 Analyzing Market Data...";
    btn.disabled = true;
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        // Mock Result Logic
        let min = 19, max = 29;
        if (audience === 'b2b_small') { min = 49; max = 99; }
        if (audience === 'b2b_enterprise') { min = 499; max = 999; }
        
        document.getElementById('pricingAnalysisPlaceholder').style.display = 'none';
        document.getElementById('pricingAnalysisResult').style.display = 'block';
        document.getElementById('suggestedRange').textContent = `$${min} - $${max}`;
        
        // Auto-fill a suggested price
        document.getElementById('finalPriceInput').value = max - 0.01; // .99 trick
        
    }, 1500);
}

window.finishAddProduct = function() {
    const newProduct = {
        id: Date.now(),
        ...state.productWizardData,
        created: new Date().toISOString()
    };
    
    state.products.push(newProduct);
    renderProductCatalog();
    closeAddProductModal();
    // Switch to products view if not already there
    switchView('products'); 
}

// --- Initialization ---

function init() {
    if(addAgentBtn) {
        addAgentBtn.addEventListener('click', openAddAgentModal);
    }

    if(manageAgentsBtn) {
        manageAgentsBtn.addEventListener('click', openManageAgentsModal);
    }
    
    renderTable();
    renderChart();
    renderApiKeys();
    renderDashboard();
    console.log("Anyway Prototype Loaded. Data:", state);
}

init();
