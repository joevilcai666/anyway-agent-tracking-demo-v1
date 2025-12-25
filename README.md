# Anyway - Agent Actions Tracking Prototype

This is an interactive UI/UX prototype for **Anyway**, a commercialization infrastructure for AI products. 

This demo specifically illustrates the **Agent Actions Tracking** feature, designed to help AI developers and agencies track the cost, performance, and execution details of their AI Agents.

## 🚀 Live Demo
You can view the prototype by opening `index.html` in your browser.

## 🎯 Key Features Demonstrated

1.  **Dashboard Overview**
    *   High-level metrics: Total Cost, Avg. Margin, Success Rate.
    *   Visualizes the financial health of AI agent operations.

2.  **Delivery Tracking (The Core Entity)**
    *   Lists individual agent executions ("Deliveries").
    *   Shows status, token usage, and cost per delivery.

3.  **Execution Trace (Drill-down)**
    *   Clicking any row in the table opens the **Trace Detail Panel**.
    *   **Step-by-Step Visualization:** Breaks down an agent's run into individual steps (e.g., "LLM Reasoning", "Web Search").
    *   **Cost Transparency:** Displays the exact cost of *each step* (e.g., GPT-4 call cost vs. Search API cost).
    *   **Artifacts:** Shows the final output/JSON result.

## 🛠️ Tech Stack
*   **HTML5 / CSS3** (Vanilla, no frameworks)
*   **JavaScript** (Vanilla, local mock data generation)
*   **Design:** Minimalist, data-heavy UI with "Anyway" brand aesthetics (Purple accents, clean typography).

## 📂 Project Structure
*   `index.html`: Main entry point and layout.
*   `style.css`: All styling, including the slide-over panel and animations.
*   `script.js`: Generates mock data and handles UI interactions.

---
*Prototype created for Anyway Product Team.*
