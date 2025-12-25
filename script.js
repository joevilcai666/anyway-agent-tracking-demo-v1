/**
 * Anyway Agent Tracking Demo Logic
 * 
 * 1. Generates mock Delivery data with nested Traces and Costs.
 * 2. Renders the main Dashboard (KPIs, Chart, List).
 * 3. Handles "Drill-down" interaction to show Trace Details.
 */

// --- Mock Data Generation ---

const CUSTOMERS = ["Acme Corp", "TechStart Inc", "Global AI", "Indie Dev #42", "Apollo Agency"];
const STEPS = [
    { name: "Input Validation", type: "system", baseCost: 0, duration: 0.05 },
    { name: "Context Retrieval (Vector DB)", type: "tool", baseCost: 0.002, duration: 0.3 },
    { name: "LLM Reasoning (GPT-4)", type: "llm", baseCost: 0.03, duration: 2.5 },
    { name: "Web Search (SerpAPI)", type: "tool", baseCost: 0.01, duration: 1.2 },
    { name: "Response Formatting", type: "system", baseCost: 0, duration: 0.1 }
];

function generateDeliveries(count = 15) {
    const deliveries = [];
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

        deliveries.push({
            id: `DEL-${10000 + i}`,
            timestamp: new Date(Date.now() - i * 1000 * 60 * 45).toLocaleString(), // Spread over time
            customer: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
            status: isSuccess ? "success" : "failed",
            cost: totalCost.toFixed(4),
            duration: totalDuration.toFixed(2),
            tokens: totalTokens,
            trace: trace,
            output: isSuccess ? `{\n  "result": "Analysis complete",\n  "data_points": ${Math.floor(Math.random() * 10)}\n}` : `{\n  "error": "Timeout",\n  "code": 504\n}`
        });
    }
    return deliveries;
}

const state = {
    deliveries: generateDeliveries(),
    selectedDelivery: null
};

// --- DOM Elements ---
const tableBody = document.getElementById('deliveriesTableBody');
const tracePanel = document.getElementById('tracePanel');
const backdrop = document.getElementById('tracePanelBackdrop');
const closeBtn = document.getElementById('closePanelBtn');
const chartContainer = document.getElementById('mainChart');

// --- Rendering Logic ---

function renderTable() {
    tableBody.innerHTML = state.deliveries.map(d => `
        <tr onclick="openDeliveryDetail('${d.id}')" data-testid="row-${d.id}">
            <td class="id-cell">${d.id}</td>
            <td>${d.timestamp.split(',')[0]}</td>
            <td>${d.customer}</td>
            <td><span class="status-badge ${d.status}">${d.status}</span></td>
            <td>${d.trace.length} steps</td>
            <td>${d.tokens}</td>
            <td class="cost-cell">$${d.cost}</td>
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

function openDeliveryDetail(id) {
    const delivery = state.deliveries.find(d => d.id === id);
    if (!delivery) return;

    state.selectedDelivery = delivery;

    // Populate Panel Data
    document.getElementById('detailDeliveryId').textContent = delivery.id;
    const statusEl = document.getElementById('detailStatus');
    statusEl.textContent = delivery.status;
    statusEl.className = `status-badge ${delivery.status}`;
    
    document.getElementById('detailCost').textContent = `$${delivery.cost}`;
    document.getElementById('detailDuration').textContent = `${delivery.duration}s`;
    document.getElementById('detailTokens').textContent = delivery.tokens;
    document.getElementById('detailOutput').textContent = delivery.output;

    // Render Trace Timeline
    const timeline = document.getElementById('traceTimeline');
    timeline.innerHTML = delivery.trace.map(step => `
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

// --- Event Listeners ---

closeBtn.addEventListener('click', closePanel);
backdrop.addEventListener('click', closePanel);

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
});

// --- Initialization ---

function init() {
    renderTable();
    renderChart();
    console.log("Anyway Prototype Loaded. Data:", state.deliveries);
}

init();
