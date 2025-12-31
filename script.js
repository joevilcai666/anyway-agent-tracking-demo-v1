/**
 * Anyway Agent Tracking Demo Logic
 * Refactored for "Agent Traceability" Requirement
 */

const ICONS = {
    eye: `<svg xmlns="http://www.w3.org/2000/svg" class="lucide" width="14" height="14" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    bot: `<svg xmlns="http://www.w3.org/2000/svg" class="lucide" width="16" height="16" viewBox="0 0 24 24" style="margin-right:8px"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" class="lucide" width="16" height="16" viewBox="0 0 24 24" style="color:hsl(var(--success))"><polyline points="20 6 9 17 4 12"/></svg>`,
    copy: `<svg xmlns="http://www.w3.org/2000/svg" class="lucide" width="14" height="14" viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`
};

// --- State ---
const state = {
    isSampleData: true,
    hasConnectedSdk: false,
    runs: [], // Will be populated
    selectedRun: null,
    connectSdkStep: 1,
    sdkWizardKeyStep: 'form', // 'form', 'loading', 'success'
    testTraceReceived: false,
    generatedApiKey: null,
    currentView: 'dashboard'
};

// --- Mock Data ---

const SAMPLE_AGENTS = [
    { 
        name: "Support_Bot_v1", 
        user: "alice@acme.com",
        apiKey: "sk_live_" + Math.random().toString(36).substring(2, 15),
        webhookUrl: "https://api.anyway.sh/webhooks/support_bot_v1"
    },
    { 
        name: "Data_Extractor_Pro", 
        user: "bob@startuplab.io",
        apiKey: "sk_live_" + Math.random().toString(36).substring(2, 15),
        webhookUrl: "https://api.anyway.sh/webhooks/data_extractor_pro"
    },
    { 
        name: "Code_Review_Assistant", 
        user: "dev@techcorp.com",
        apiKey: "sk_live_" + Math.random().toString(36).substring(2, 15),
        webhookUrl: "https://api.anyway.sh/webhooks/code_review_assistant"
    }
];

const SAMPLE_PRODUCTS = [
    { name: "SEO Optimization Pro", agent: "Search_Bot_v2", price: "$49/mo", strategy: "Subscription", status: "active" },
    { name: "Data Scraper API", agent: "Data_Extractor_Pro", price: "$0.05/run", strategy: "Per-Use", status: "active" },
    { name: "Code Reviewer", agent: "Code_Review_Assistant", price: "$19/user", strategy: "Seat-based", status: "draft" }
];

const SAMPLE_STEPS = [
    { name: "Retrieve Context", type: "tool", duration: 0.45, cost: 0.0012, tokens: 0 },
    { name: "Plan Execution", type: "llm", duration: 1.2, cost: 0.015, tokens: 450 },
    { name: "Search Web", type: "tool", duration: 2.1, cost: 0.005, tokens: 0 },
    { name: "Generate Response", type: "llm", duration: 3.5, cost: 0.042, tokens: 1200 },
    { name: "Format Output", type: "system", duration: 0.1, cost: 0, tokens: 0 }
];

function generateSampleRuns() {
    const runs = [];
    const now = new Date();

    for (let i = 0; i < 5; i++) {
        const agent = SAMPLE_AGENTS[i % SAMPLE_AGENTS.length];
        const isSuccess = i !== 2; // Make the 3rd one fail
        const stepCount = isSuccess ? 4 : 2;
        
        let trace = [];
        let totalCost = 0;
        let totalTokens = 0;
        let totalDuration = 0;

        for (let j = 0; j < stepCount; j++) {
            const tmpl = SAMPLE_STEPS[j];
            const stepCost = tmpl.cost * (0.9 + Math.random() * 0.2);
            const stepDur = tmpl.duration * (0.8 + Math.random() * 0.4);
            
            trace.push({
                name: tmpl.name,
                type: tmpl.type,
                status: (j === stepCount - 1 && !isSuccess) ? "failed" : "success",
                duration: stepDur.toFixed(2),
                cost: stepCost.toFixed(5),
                tokens: tmpl.tokens,
                description: `Executed ${tmpl.name} with params...`,
                error: (j === stepCount - 1 && !isSuccess) ? "Error: Timeout waiting for upstream service" : null
            });

            totalCost += stepCost;
            totalDuration += stepDur;
            totalTokens += tmpl.tokens;
        }

        runs.push({
            id: `DEL-${10020 + i}`,
            timestamp: new Date(now - i * 1000 * 60 * 30).toLocaleString(),
            agentName: agent.name,
            userEmail: agent.user,
            status: isSuccess ? "success" : "failed",
            steps: stepCount,
            tokens: totalTokens,
            cost: totalCost.toFixed(4),
            duration: totalDuration.toFixed(2),
            trace: trace,
            output: isSuccess ? "Success: Data extracted and formatted." : "Failed: Process terminated unexpectedly."
        });
    }
    return runs;
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    state.runs = generateSampleRuns();
    state.generatedApiKey = "any_sk_live_" + Math.random().toString(36).substring(2, 15);
    
    renderDashboard();
    renderDevelopers();
    setupEventListeners();
});

function setupEventListeners() {
    // Trace Panel
    document.getElementById('closePanelBtn').onclick = closeTracePanel;
    document.getElementById('tracePanelBackdrop').onclick = closeTracePanel;

    // Navigation
    document.getElementById('nav-dashboard').onclick = () => switchView('dashboard');
    document.getElementById('nav-products').onclick = () => switchView('products');
    
    // Dashboard Filters
    const searchInput = document.getElementById('deliverySearch');
    const statusSelect = document.getElementById('deliveryStatusFilter');
    if (searchInput) searchInput.addEventListener('input', filterDashboard);
    if (statusSelect) statusSelect.addEventListener('change', filterDashboard);

    // Close Account Popover when clicking outside
    document.addEventListener('click', (event) => {
        const userProfile = document.getElementById('userProfile');
        const popover = document.getElementById('accountPopover');
        
        if (userProfile && popover) {
            if (!userProfile.contains(event.target) && !popover.contains(event.target)) {
                popover.classList.remove('active');
            }
        }
    });
}

// --- Navigation Logic ---

window.switchView = function(viewId) {
    // Hide all views
    document.querySelectorAll('.view-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // Show selected view
    const view = document.getElementById(viewId + 'View');
    if (view) view.style.display = 'block';

    // Update Nav
    const navItem = document.getElementById('nav-' + viewId);
    if (navItem) navItem.classList.add('active');
    
    // Render specific view content
    if (viewId === 'dashboard') {
        renderDashboard();
    } else if (viewId === 'developers') {
        renderDevelopers();
    } else if (viewId === 'products') {
        renderProductCatalog();
    }
}

// --- Dashboard Logic ---

function renderDashboard() {
    const banner = document.getElementById('sampleDataBanner');
    
    if (state.isSampleData) {
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }

    renderRunsTable(state.runs);
}

function filterDashboard() {
    const searchInput = document.getElementById('deliverySearch');
    const statusSelect = document.getElementById('deliveryStatusFilter');
    
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const status = statusSelect ? statusSelect.value : 'all';
    
    const filtered = state.runs.filter(run => {
        const matchesSearch = run.id.toLowerCase().includes(query) || 
                              run.agentName.toLowerCase().includes(query);
        const matchesStatus = status === 'all' || run.status === status;
        return matchesSearch && matchesStatus;
    });
    
    renderRunsTable(filtered);
}

function renderRunsTable(runs) {
    const tbody = document.getElementById('runsTableBody');
    tbody.innerHTML = '';

    runs.forEach(run => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: 'Geist Mono', monospace; font-size: 13px;">${run.id}</td>
            <td style="color: hsl(var(--muted-foreground)); font-size: 13px;">${run.timestamp}</td>
            <td>
                <div style="font-weight: 500;">${run.agentName}</div>
                <div style="font-size: 11px; color: hsl(var(--muted-foreground));">${run.userEmail}</div>
            </td>
            <td><span class="status-badge ${run.status}">${run.status}</span></td>
            <td>${run.steps}</td>
            <td>${run.tokens.toLocaleString()}</td>
            <td style="font-family: 'Geist Mono', monospace;">$${run.cost}</td>
            <td>
                <button class="view-btn" onclick="openTracePanel('${run.id}')">Trace</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterTable(status) {
    const filtered = status === 'all' 
        ? state.runs 
        : state.runs.filter(r => r.status === status);
    renderRunsTable(filtered);
}

// --- Product Catalog Logic ---

function renderProductCatalog() {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '';
    
    SAMPLE_PRODUCTS.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 500;">${p.name}</td>
            <td style="color: hsl(var(--muted-foreground));">${p.agent}</td>
            <td style="font-family: 'Geist Mono', monospace;">${p.price}</td>
            <td><span style="background: hsl(var(--muted)); padding: 2px 8px; border-radius: 4px; font-size: 12px;">${p.strategy}</span></td>
            <td><span class="status-badge" style="background: transparent; padding: 0; color: ${p.status === 'active' ? 'hsl(var(--success))' : 'hsl(var(--warning))'}">&#9679; ${p.status}</span></td>
            <td><button class="view-btn" onclick="openEditProduct('${p.name}')">Edit</button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.openAddProductModal = function() {
    document.getElementById('addProductBackdrop').classList.add('active');
    // Populate agent select
    const select = document.getElementById('productAgentSelect');
    select.innerHTML = '<option value="">-- Select an Agent --</option>';
    SAMPLE_AGENTS.forEach(agent => {
        select.innerHTML += `<option value="${agent.name}">${agent.name}</option>`;
    });
}

window.openEditProduct = function(productName) {
    const product = SAMPLE_PRODUCTS.find(p => p.name === productName);
    if (!product) return;

    openAddProductModal();
    
    // Update title
    document.querySelector('#addProductBackdrop h2').textContent = `Edit Product: ${productName}`;
    
    // Pre-fill Step 1 (Agent)
    const agentSelect = document.getElementById('productAgentSelect');
    if(agentSelect) agentSelect.value = product.agent;
    
    // Pre-fill Step 2 (Basic Info)
    // Note: In a real app, we'd have more fields in SAMPLE_PRODUCTS to map here.
    // For now, we'll simulate it.
    const nameInput = document.getElementById('productNameInput');
    const descInput = document.getElementById('productDescInput');
    
    if(nameInput) nameInput.value = product.name;
    if(descInput) descInput.value = `Description for ${product.name}...`; // Mock data

    // Pre-fill Step 3 (Pricing)
    const priceInput = document.getElementById('finalPriceInput');
    if(priceInput) {
        // Extract number from "$49/mo" -> 49
        const priceMatch = product.price.match(/[\d\.]+/);
        if(priceMatch) priceInput.value = priceMatch[0];
    }
}

window.closeAddProductModal = function() {
    document.getElementById('addProductBackdrop').classList.remove('active');
    // Reset title
    setTimeout(() => {
        document.querySelector('#addProductBackdrop h2').textContent = 'Create New Product';
    }, 300);
}

window.productGoToStep = function(step) {
    // Update Indicators
    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById(`p-step${i}-indicator`);
        if (indicator) {
            if (i === step) indicator.classList.add('active');
            else indicator.classList.remove('active');
        }
    }
    
    // Update Content
    for (let i = 1; i <= 4; i++) {
        const content = document.getElementById(`p-step${i}`);
        if (content) {
            if (i === step) content.classList.add('active');
            else content.classList.remove('active');
        }
    }
}

// --- Account Popover Logic ---

window.toggleAccountPopover = function(event) {
    event.stopPropagation();
    const popover = document.getElementById('accountPopover');
    const isActive = popover.classList.contains('active');
    
    // Close any other open dropdowns if needed
    
    if (isActive) {
        popover.classList.remove('active');
    } else {
        popover.classList.add('active');
    }
};

// Close popover when clicking outside
document.addEventListener('click', function(event) {
    const popover = document.getElementById('accountPopover');
    const profile = document.getElementById('userProfile');
    
    if (popover && popover.classList.contains('active')) {
        if (!popover.contains(event.target) && !profile.contains(event.target)) {
            popover.classList.remove('active');
        }
    }
});

window.handleAccountAction = function(action) {
    console.log('Account action:', action);
    const popover = document.getElementById('accountPopover');
    if (popover) popover.classList.remove('active');
    
    if (action === 'logout') {
        // Logout logic
        alert('Logging out...');
    } else if (action === 'developers') {
        switchView('developers');
    }
};


// --- Trace Panel Logic ---

window.openTracePanel = function(runId) {
    const run = state.runs.find(r => r.id === runId);
    if (!run) return;

    state.selectedRun = run;
    
    // Populate Header
    document.getElementById('detailDeliveryId').textContent = run.id;
    const statusBadge = document.getElementById('detailStatus');
    statusBadge.textContent = run.status;
    statusBadge.className = `status-badge ${run.status}`;

    // Populate Summary
    document.getElementById('detailCost').textContent = `$${run.cost}`;
    document.getElementById('detailDuration').textContent = `${run.duration}s`;
    document.getElementById('detailTokens').textContent = run.tokens.toLocaleString();

    // Populate Trace
    const timeline = document.getElementById('traceTimeline');
    timeline.innerHTML = run.trace.map(step => `
        <div class="trace-step ${step.status}">
            <div class="step-marker"></div>
            <div class="step-card">
                <div class="step-header">
                    <div style="display:flex; align-items:center;">
                        <span class="step-name">${step.name}</span>
                        <span class="step-type-badge">${step.type}</span>
                    </div>
                    <div class="step-cost">$${step.cost}</div>
                </div>
                <div class="step-meta">
                    <span>${step.duration}s</span>
                    ${step.tokens ? `<span>&bull; ${step.tokens} tokens</span>` : ''}
                </div>
                ${step.error ? `<div class="step-error">${step.error}</div>` : ''}
            </div>
        </div>
    `).join('');

    // Populate Artifacts
    document.getElementById('detailOutput').textContent = run.output;

    // Show Panel
    document.getElementById('tracePanel').classList.add('open');
    document.getElementById('tracePanelBackdrop').classList.add('open');
}

window.closeTracePanel = function() {
    document.getElementById('tracePanel').classList.remove('open');
    document.getElementById('tracePanelBackdrop').classList.remove('open');
}

// --- Connect SDK Modal Logic ---

window.openConnectSdkModal = function() {
    state.connectSdkStep = 1;
    state.sdkWizardKeyStep = 'form';
    state.generatedApiKey = null; // Reset key
    renderConnectSdkBody();
    document.getElementById('connectSdkBackdrop').classList.add('active');
}

window.generateSdkWizardKey = function() {
    const nameInput = document.getElementById('sdkKeyNameInput');
    const name = nameInput ? nameInput.value : '';
    
    if (!name) {
        // Simple validation feedback
        if(nameInput) nameInput.style.borderColor = '#ef4444';
        return;
    }

    state.sdkWizardKeyStep = 'loading';
    renderConnectSdkBody();

    // Simulate API call
    setTimeout(() => {
        state.generatedApiKey = "sk_live_" + Math.random().toString(36).substring(2, 20) + Math.random().toString(36).substring(2, 10);
        state.sdkWizardKeyStep = 'success';
        
        // Add to global keys list (mocking backend update)
        // We assume sdkKeys is defined in the Developers section logic. 
        // If not accessible, we skip this or define it if we can see the scope.
        // Based on previous reads, sdkKeys is global.
        if (typeof sdkKeys !== 'undefined') {
            sdkKeys.unshift({
                id: 'sdk_' + Math.random().toString(36).substring(2, 6),
                name: name,
                token: state.generatedApiKey,
                status: 'Active',
                created: 'Just now',
                lastUsed: 'Never'
            });
            // Update developers view if it exists
            if (typeof renderDevelopers === 'function') renderDevelopers();
        }
        
        renderConnectSdkBody();
    }, 1500);
}

window.closeConnectSdkModal = function() {
    document.getElementById('connectSdkBackdrop').classList.remove('active');
}

// --- Agent Management Logic ---

window.openManageAgentsModal = function() {
    document.getElementById('manageAgentsBackdrop').classList.add('active');
    renderAgentList();
}

window.closeManageAgentsModal = function() {
    document.getElementById('manageAgentsBackdrop').classList.remove('active');
}

function renderAgentList() {
    const list = document.getElementById('agentList');
    if(!list) return;
    
    list.innerHTML = SAMPLE_AGENTS.map(agent => `
        <div class="agent-item" onclick="selectAgent('${agent.name}')">
            <div style="font-weight: 500;">${agent.name}</div>
            <div style="font-size: 12px; color: hsl(var(--muted-foreground));">${agent.user}</div>
        </div>
    `).join('');
}

window.selectAgent = function(agentName) {
    const agent = SAMPLE_AGENTS.find(a => a.name === agentName);
    if (!agent) return;

    const detailView = document.getElementById('manageDetailView');
    detailView.innerHTML = `
        <h3 style="margin-bottom: 8px;">${agent.name}</h3>
        <p style="color: hsl(var(--muted-foreground)); margin-bottom: 24px;">Owned by ${agent.user}</p>
        
        <div class="form-group">
            <label>API Key</label>
            <div class="copy-field">
                <input type="text" readonly value="sk_live_...${Math.random().toString(36).substring(7)}">
                <button class="copy-btn">Copy</button>
            </div>
        </div>

        <div class="form-group">
            <label>Webhook URL</label>
             <input type="text" class="form-input" value="https://api.anyway.sh/webhooks/${agent.name.toLowerCase()}">
        </div>
        
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid hsl(var(--border));">
            <button class="secondary-btn" style="color: hsl(var(--destructive)); border-color: hsl(var(--destructive));" onclick="alert('Mock delete agent')">Delete Agent</button>
        </div>
    `;
}

window.openAddAgentModal = function() {
    const name = prompt("Enter Agent Name:");
    if (name) {
        SAMPLE_AGENTS.push({ 
            name: name, 
            user: "current@user.com",
            apiKey: "sk_live_" + Math.random().toString(36).substring(2, 15),
            webhookUrl: `https://api.anyway.sh/webhooks/${name.toLowerCase().replace(/\s+/g, '_')}`
        });
        alert(`Agent ${name} added!`);
        // If Manage modal is open, refresh list
        if (document.getElementById('manageAgentsBackdrop').classList.contains('active')) {
            renderAgentList();
        }
    }
}

function updateSdkStepsUI() {
    for (let i = 1; i <= 3; i++) {
        const stepEl = document.getElementById(`sdk-step-${i}`);
        if (!stepEl) continue;

        // Reset
        stepEl.classList.remove('active');
        stepEl.style.opacity = '1'; // Reset opacity
        
        // Define base content
        const stepTitles = ["1. Get API Key", "2. Install SDK", "3. Test Trace"];
        let content = stepTitles[i-1];

        if (i < state.connectSdkStep) {
            // Completed
            stepEl.style.color = 'hsl(var(--muted-foreground))';
            stepEl.style.borderBottomColor = 'transparent';
            stepEl.innerHTML = `${ICONS.check} <span style="margin-left: 6px;">${content}</span>`;
        } else if (i === state.connectSdkStep) {
            // Active
            stepEl.classList.add('active');
            stepEl.innerHTML = content;
        } else {
            // Future
            stepEl.style.opacity = '0.5';
            stepEl.innerHTML = content;
        }
    }
}

function renderConnectSdkBody() {
    updateSdkStepsUI();
    const body = document.getElementById('connectSdkBody');
    
    if (state.connectSdkStep === 1) {
        if (state.sdkWizardKeyStep === 'form' || state.sdkWizardKeyStep === 'loading') {
            body.innerHTML = `
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Create API Key</h3>
                    <p style="color: hsl(var(--muted-foreground)); margin-bottom: 24px;">Generate a new key to authenticate your SDK requests.</p>
                    
                    <div class="form-group">
                        <label>Key Name</label>
                        <input type="text" class="form-input" id="sdkKeyNameInput" placeholder="e.g., My Python SDK Key" value="My Python SDK Key">
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="primary-btn" onclick="generateSdkWizardKey()" ${state.sdkWizardKeyStep === 'loading' ? 'disabled' : ''}>
                        ${state.sdkWizardKeyStep === 'loading' 
                            ? `<svg class="lucide spin" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 8px; animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Creating...` 
                            : 'Generate Key'}
                    </button>
                </div>
            `;
        } else {
            // Success State
            body.innerHTML = `
                <div style="margin-bottom: 24px;">
                    <div class="success-message" style="margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px; background: hsl(var(--success-bg)); color: hsl(var(--success-foreground)); padding: 12px; border-radius: var(--radius);">
                        <span class="icon" style="color: hsl(var(--success));">🎉</span> 
                        <div>
                            <div style="font-weight: 600; margin-bottom: 4px;">API Key Created</div>
                            <div style="font-size: 13px; color: hsl(var(--foreground));">
                                <strong>Keep it safe</strong><br>
                                Save this key securely. You won’t be able to see it again.
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Secret Key</label>
                        <div class="copy-field">
                            <input type="text" readonly value="${state.generatedApiKey}" style="font-family: monospace;">
                            <button class="copy-btn" onclick="copyToClipboard('${state.generatedApiKey}')">Copy</button>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="primary-btn" onclick="nextSdkStep(2)">Next: Install SDK</button>
                </div>
            `;
        }
    } else if (state.connectSdkStep === 2) {
        const installCmd = "pip install anyway-sdk";
        const initCode = `import anyway

anyway.init(
    api_key="${state.generatedApiKey}"
)`;

        body.innerHTML = `
            <div style="margin-bottom: 24px;">
                <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Install SDK</h3>
                
                <div style="margin-bottom: 16px;">
                    <label style="display:block; margin-bottom:8px; font-size:12px; font-weight:500;">1. Install Package</label>
                    <div class="code-block" style="background: hsl(var(--muted)); padding: 12px; border-radius: 6px; font-family: 'Geist Mono', monospace; display: flex; justify-content: space-between; align-items: center;">
                        <span>${installCmd}</span>
                        <button class="copy-btn" style="padding: 4px 8px;" onclick="copyToClipboard('${installCmd}')">Copy</button>
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display:block; margin-bottom:8px; font-size:12px; font-weight:500;">2. Initialize Client</label>
                    <div class="code-block" style="background: hsl(var(--muted)); padding: 12px; border-radius: 6px; font-family: 'Geist Mono', monospace; position: relative;">
                        <pre style="margin:0; white-space: pre-wrap;">${initCode}</pre>
                        <button class="copy-btn" style="position: absolute; top: 8px; right: 8px; padding: 4px 8px;" onclick="copyToClipboard(\`${initCode}\`)">Copy</button>
                    </div>
                </div>

                <div style="display: flex; gap: 16px;">
                    <a href="#" style="color: hsl(var(--foreground)); text-decoration: underline; font-size: 13px;">View API Docs</a>
                </div>
            </div>
            <div class="modal-actions">
                <button class="secondary-btn" onclick="nextSdkStep(1)">Back</button>
                <button class="primary-btn" onclick="nextSdkStep(3)">Continue</button>
            </div>
        `;
    } else if (state.connectSdkStep === 3) {
        body.innerHTML = `
            <div style="margin-bottom: 24px; text-align: center; padding: 20px 0;">
                <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Send a Test Trace</h3>
                <p style="color: hsl(var(--muted-foreground)); margin-bottom: 24px;">
                    Run your python script to send a test delivery. We'll listen for it here.
                </p>
                
                <button id="sendTestBtn" class="primary-btn large" style="width: 100%; justify-content: center; padding: 12px;" onclick="simulateTestTrace()">
                    Send Test Trace
                </button>

                <div id="testStatus" style="margin-top: 16px; height: 20px; font-size: 13px;"></div>
            </div>
        `;
    }
}

window.nextSdkStep = function(step) {
    state.connectSdkStep = step;
    renderConnectSdkBody();
}

window.simulateTestTrace = function() {
    const btn = document.getElementById('sendTestBtn');
    
    btn.disabled = true;
    btn.textContent = "Waiting for delivery...";
    btn.innerHTML = `<svg class="lucide spin" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 8px; animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Waiting...`;
    
    // Simulate delay
    setTimeout(() => {
        state.testTraceReceived = true;
        btn.innerHTML = `Test Delivery Received!`;
        btn.style.backgroundColor = 'hsl(var(--success))';
        btn.style.borderColor = 'hsl(var(--success))';
        
        // Add a "Live" delivery
        const liveRun = {
            id: `DEL-LIVE-${Math.floor(Math.random() * 1000)}`,
            timestamp: "Just now",
            agentName: "My_First_Agent",
            userEmail: "me@company.com",
            status: "success",
            steps: 3,
            tokens: 850,
            cost: "0.0240",
            duration: "1.80",
            trace: [
                { name: "Init", type: "system", status: "success", duration: "0.10", cost: "0.0000" },
                { name: "Hello World Generation", type: "llm", status: "success", duration: "1.50", cost: "0.0240", tokens: 850 },
                { name: "Finalize", type: "system", status: "success", duration: "0.20", cost: "0.0000" }
            ],
            output: "Hello! This is your first live trace."
        };
        
        state.runs.unshift(liveRun);
        state.isSampleData = false; // Switch to live mode
        
        setTimeout(() => {
            closeConnectSdkModal();
            renderDashboard(); // Will hide banner and show new table
            
            // Auto open the new trace
            openTracePanel(liveRun.id);
            
            // Show toast
            showToast("Test trace received! You are now viewing live data.");
        }, 1000);
        
    }, 2000);
}

function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        ${type === 'success' ? ICONS.check : ''}
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    // Animate in is handled by CSS
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Developers View Logic ---

// Initial Data
const sdkKeys = [
    { id: 'sdk_1', name: 'Default Project Key', token: 'sk_live_...4f8a', status: 'Active', created: 'Oct 24', lastUsed: 'Just now' }
];

const paymentKeys = [];

function renderDevelopers() {
    renderKeyTable('sdkKeysTableBody', sdkKeys, 'SDK API Key');
    renderKeyTable('paymentKeysTableBody', paymentKeys, 'Payment API Key');
}

function renderKeyTable(tbodyId, keys, typeLabel) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (keys.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: hsl(var(--muted-foreground));">
                    Create an API key to connect your ${typeLabel === 'SDK API Key' ? 'SDK' : 'payment data'}
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = keys.map(key => `
        <tr>
            <td>
                <input type="text" class="inline-edit" value="${key.name}" onchange="updateKeyName('${key.id}', this.value)" style="width: 100%; max-width: 200px;">
            </td>
            <td style="font-family: 'Geist Mono', monospace; color: hsl(var(--muted-foreground)); cursor: pointer;" onclick="copyToClipboard('${key.token}')" title="Click to copy">
                ${key.token}
            </td>
            <td>
                <span class="status-badge ${key.status === 'Active' ? 'Success' : 'Failed'}" style="background-color: ${key.status === 'Active' ? 'hsl(var(--success-bg))' : '#f3f4f6'}; color: ${key.status === 'Active' ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))'};">
                    ${key.status}
                </span>
            </td>
            <td style="color: hsl(var(--muted-foreground)); font-size: 13px;">${key.created}</td>
            <td style="color: hsl(var(--muted-foreground)); font-size: 13px;">${key.lastUsed}</td>
            <td style="text-align: right;">
                <div style="position: relative; display: inline-block;">
                    <button class="icon-btn" onclick="toggleKeyMenu(event, '${key.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-more-horizontal"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>
                    <!-- Dropdown Menu -->
                    <div id="menu-${key.id}" class="settings-dropdown" style="right: 0; left: auto; min-width: 120px;">
                        <div class="dropdown-item" onclick="toggleKeyStatus('${key.id}')">
                            ${key.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </div>
                        <div class="dropdown-item" style="color: hsl(var(--destructive));" onclick="deleteKey('${key.id}')">
                            Delete
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
}

    window.updateKeyName = function(id, newName) {
        // Find in sdkKeys or paymentKeys
        let key = sdkKeys.find(k => k.id === id);
        if (!key) key = paymentKeys.find(k => k.id === id);
        
        if (key) {
            key.name = newName;
            console.log(`Updated key ${id} name to ${newName}`);
        }
    };

    window.toggleKeyMenu = function(event, id) {
        event.stopPropagation();
        const menu = document.getElementById(`menu-${id}`);
        const isActive = menu.classList.contains('active');
        
        // Close all other menus
        document.querySelectorAll('.settings-dropdown').forEach(d => d.classList.remove('active'));
        
        if (!isActive) {
            menu.classList.add('active');
        }
    };
    
    // Close menus when clicking outside
    document.addEventListener('click', function() {
         document.querySelectorAll('.settings-dropdown').forEach(d => d.classList.remove('active'));
    });

    window.toggleKeyStatus = function(id) {
        let key = sdkKeys.find(k => k.id === id);
        if (!key) key = paymentKeys.find(k => k.id === id);
        
        if (key) {
            key.status = key.status === 'Active' ? 'Inactive' : 'Active';
            renderDevelopers();
        }
    };

    window.deleteKey = function(id) {
        if(confirm('Are you sure you want to delete this key?')) {
            let index = sdkKeys.findIndex(k => k.id === id);
            if (index !== -1) {
                sdkKeys.splice(index, 1);
            } else {
                index = paymentKeys.findIndex(k => k.id === id);
                if (index !== -1) {
                    paymentKeys.splice(index, 1);
                }
            }
            renderDevelopers();
        }
    };

    window.copyToClipboard = function(text) {
        // Create a temporary text area to copy from
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("Copy");
        textArea.remove();
        
        // Show tooltip or visual feedback
        const activeElement = document.activeElement; // The element that triggered this
        if (activeElement) {
             // Optional: visual feedback
        }
    };

// --- Create API Key Modal Logic ---

window.openCreateKeyModal = function() {
    document.getElementById('createKeyBackdrop').classList.add('active');
    // Reset state
    document.getElementById('createKeyFormStep').style.display = 'block';
    document.getElementById('createKeyResultStep').style.display = 'none';
    document.getElementById('createKeyErrorStep').style.display = 'none';
    document.getElementById('newKeyName').value = '';
    const typeSelect = document.getElementById('newKeyType');
    if (typeSelect) typeSelect.value = 'sdk';
    
    // Reset button state
    const btn = document.getElementById('createKeyBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Create Key';
    }
}

window.closeCreateKeyModal = function() {
    document.getElementById('createKeyBackdrop').classList.remove('active');
    // If we just created a key, refresh the list
    if (document.getElementById('createKeyResultStep').style.display === 'block') {
        renderDevelopers();
    }
}

window.generateKey = function() {
    const btn = document.getElementById('createKeyBtn');
    const name = document.getElementById('newKeyName').value;
    const typeSelect = document.getElementById('newKeyType');
    const type = typeSelect ? typeSelect.value : 'sdk';

    if (!name) {
        alert('Please enter a key name');
        return;
    }
    
    // Show loading state
    if (btn && document.getElementById('createKeyFormStep').style.display === 'block') {
        btn.disabled = true;
        btn.innerHTML = `<svg class="lucide spin" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 8px; animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Creating...`;
    }

    // Simulate API call
    setTimeout(() => {
        // Randomly succeed or fail for demo purposes (mostly succeed)
        const isSuccess = Math.random() > 0.1; 

        if (isSuccess) {
            const prefix = type === 'sdk' ? 'sk_live_' : 'pk_live_';
            const newKey = prefix + Math.random().toString(36).substring(2, 20) + Math.random().toString(36).substring(2, 10);
            document.getElementById('newKeySecret').value = newKey;

            // Add to list
            const keyObj = {
                id: Math.random().toString(36).substring(7),
                name: name,
                token: newKey,
                status: 'Active',
                created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                lastUsed: 'Never'
            };
            
            if (type === 'sdk') {
                sdkKeys.unshift(keyObj);
            } else {
                paymentKeys.unshift(keyObj);
            }
            renderDevelopers();
            
            document.getElementById('createKeyFormStep').style.display = 'none';
            document.getElementById('createKeyErrorStep').style.display = 'none';
            document.getElementById('createKeyResultStep').style.display = 'block';
        } else {
            document.getElementById('createKeyFormStep').style.display = 'none';
            document.getElementById('createKeyResultStep').style.display = 'none';
            document.getElementById('createKeyErrorStep').style.display = 'block';
        }
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Create Key';
        }
    }, 1500);
}

window.downloadEnvSnippet = function() {
    const key = document.getElementById('newKeySecret').value;
    const typeSelect = document.getElementById('newKeyType');
    const type = typeSelect ? typeSelect.value : 'sdk';
    const varName = type === 'sdk' ? 'ANYWAY_SDK_KEY' : 'ANYWAY_PAYMENT_KEY';
    const content = `${varName}=${key}`;
    
    // Create a temporary text area to copy from
    const textArea = document.createElement("textarea");
    textArea.value = content;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("Copy");
    textArea.remove();
    
    const btn = document.querySelector('button[onclick="downloadEnvSnippet()"]');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Copied!';
        setTimeout(() => btn.innerHTML = originalText, 2000);
    }
}

window.copyNewKey = function() {
    const keyInput = document.getElementById('newKeySecret');
    keyInput.select();
    document.execCommand("Copy");
    
    const btn = document.querySelector('button[onclick="copyNewKey()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Copied!';
    setTimeout(() => btn.innerHTML = originalText, 2000);
}

window.copyRequestId = function() {
    const input = document.getElementById('errorRequestId');
    input.select();
    document.execCommand('copy');
    
    const copyBtn = input.nextElementSibling;
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
        copyBtn.textContent = originalText;
    }, 2000);
}


