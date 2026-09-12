# Q-Hospitality: Quantum Machine Learning & Econometric Analytics Platform

An enterprise-grade, publication-ready research platform investigating **Hospitality Customer Satisfaction Dynamics** using **Classical Econometric Modeling (OLS Regression & Pearson Correlation)** and **Quantum Kernel Machine Learning (PennyLane 4-Qubit QSVM)**.

---

## 🌟 Key Platform Features

1. **Zero Database Architecture**:
   - Strictly in-memory data processing with session handling.
   - Manual drag-and-drop CSV dataset ingestion with automatic header normalization and metadata filtering.
   - One-click benchmark demo dataset loader (`sample_dataset.csv`) and standard CSV template exporter.

2. **Phase 1: Econometrics & Statistical Significance ($p < 0.05$)**:
   - Pearson correlation ranking with $p$-values and directional impacts.
   - Ordinary Least Squares (OLS) Multiple Linear Regression parameter estimation ($\beta$ weights, standard errors, $t$-statistics, $95\%$ confidence intervals).
   - Non-linear aspect score curves (scores 1–5 vs mean overall rating).
   - Econometric diagnostics: $R^2$, Adjusted $R^2$, $F$-statistic, and Durbin-Watson residual test.

3. **Phase 2: Quantum Machine Learning Lab**:
   - 4-Qubit Second-Order Entangled Feature Map:
     $$|\psi(x)\rangle = U_{\Phi(x)} |0\rangle^{\otimes 4}$$
   - Circular 2-qubit CNOT coupling with phase encoding $R_Z(2(\pi - x_i)(\pi - x_{i+1}))$.
   - Bandwidth scaling to $[0, 0.10\pi]$ to prevent quantum kernel concentration / barren plateaus in high-dimensional Hilbert space.
   - Symmetric Gram matrix calculation ($K_{i,j} = K_{j,i}$, $K_{i,i} = 1.0$) cutting execution time by 50%.
   - Interactive 2D Gram Matrix Fidelity Heatmap Canvas.

4. **Phase 3: 10-Fold Benchmark & Hypothesis Testing**:
   - 10-Fold Stratified Cross-Validation comparing **Classical Linear SVM** vs **Quantum Kernel SVM**.
   - Student's Paired One-Tailed $t$-test:
     $$H_0: \mu_{\text{Classical}} \ge \mu_{\text{Quantum}} \quad \text{vs} \quad H_a: \mu_{\text{Quantum}} > \mu_{\text{Classical}}$$
   - Granular fold-by-fold audit table and comparative distribution bar charts.

5. **Phase 4: Live "What-If" Inference Simulator**:
   - Real-time guest review profile sliders (Cleanliness, Location, Value, Rooms, Service, Sleep Quality).
   - Instant dual-model classification, confidence scores, and quantum state Hilbert space coordinate projections.

6. **Academic Publication & Presentation Report**:
   - Formatted academic defense summary with one-click PDF printing.

---

## 🚀 Quickstart & Execution

### 1. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Launch the Application
Run the one-command launcher:
```bash
python run_app.py
```
Or start via Uvicorn:
```bash
uvicorn backend.main:app --reload --port 8000
```
Open your browser at: **`http://127.0.0.1:8000`**

---

## 📁 Repository Structure

```
Major-project/
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI REST endpoints & static file server
│   ├── quantum_engine.py    # PennyLane 4-qubit circuit, Gram matrix & QSVM
│   ├── stats_engine.py      # Pearson correlation, OLS regression & metrics
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── index.html           # Full-stack UI with 7 interactive research tabs
│   ├── css/
│   │   └── styles.css       # Obsidian quantum dark theme & visual design system
│   └── js/
│       └── app.js           # Client logic, Chart.js integrations & Canvas heatmap
├── run_app.py               # One-command server and browser launcher
├── sample_dataset.csv       # Pre-generated benchmark dataset (600 instances)
├── major_project_version_2_0.py   # Original Google Colab script
└── Major_project_version_2_0 (2).ipynb  # Original executed Colab notebook
```

---

## 🔬 Theoretical Summary

- **Primary Driver**: In both statistical and quantum modeling, **SERVICE** consistently exhibits the highest impact ($\beta \approx 0.33$, $p < 0.0001$), followed by Value and Rooms.
- **Quantum Fidelity**: The second-order feature map maintains a healthy mean fidelity overlap ($\approx 0.65$) across off-diagonal pairs due to bandwidth scaling ($0.10\pi$).
