/**
 * Q-Hospitality: Quantum Machine Learning & Econometric Analytics Platform
 * Front-end Application Logic & Visualizations
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  const state = {
    activeTab: 'tab-overview',
    datasetLoaded: false,
    datasetSummary: null,
    statsResults: null,
    quantumResults: null,
    charts: {
      targetDist: null,
      olsCoef: null,
      aspectCurves: null,
      benchmarkFolds: null
    }
  };

  // DOM Elements
  const tabs = document.querySelectorAll('.nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const datasetIndicator = document.getElementById('datasetIndicator');
  const statusDot = document.getElementById('statusDot');
  const activeDatasetLabel = document.getElementById('activeDatasetLabel');
  const dropZone = document.getElementById('dropZone');
  const csvFileInput = document.getElementById('csvFileInput');
  const btnBrowse = document.getElementById('btnBrowse');
  const btnLoadDemo = document.getElementById('btnLoadDemo');
  const btnLoadDemoFromDrop = document.getElementById('btnLoadDemoFromDrop');
  const btnRunStats = document.getElementById('btnRunStats');
  const btnRunQuantum = document.getElementById('btnRunQuantum');
  const btnJumpToQuantum = document.getElementById('btnJumpToQuantum');
  const btnPrintReport = document.getElementById('btnPrintReport');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingTitle = document.getElementById('loadingTitle');
  const loadingDesc = document.getElementById('loadingDesc');

  // Simulator Elements
  const sliders = {
    SERVICE: document.getElementById('sliderService'),
    VALUE: document.getElementById('sliderValue'),
    ROOMS: document.getElementById('sliderRooms'),
    SLEEP_QUALITY: document.getElementById('sliderSleep'),
    CLEANLINESS: document.getElementById('sliderClean'),
    LOCATION: document.getElementById('sliderLoc')
  };

  const valDisplays = {
    SERVICE: document.getElementById('valService'),
    VALUE: document.getElementById('valValue'),
    ROOMS: document.getElementById('valRooms'),
    SLEEP_QUALITY: document.getElementById('valSleep'),
    CLEANLINESS: document.getElementById('valClean'),
    LOCATION: document.getElementById('valLoc')
  };

  // =========================================================================
  // 1. Navigation & Tab Switching
  // =========================================================================
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      switchTab(targetId);
    });
  });

  if (btnJumpToQuantum) {
    btnJumpToQuantum.addEventListener('click', () => switchTab('tab-quantum'));
  }

  function switchTab(tabId) {
    tabs.forEach(t => t.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    const activeBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
    const activePane = document.getElementById(tabId);

    if (activeBtn) activeBtn.classList.add('active');
    if (activePane) activePane.classList.add('active');
    state.activeTab = tabId;

    // Resize active charts if tab changes
    window.dispatchEvent(new Event('resize'));
  }

  // =========================================================================
  // 2. Loading Overlay Helper
  // =========================================================================
  function showLoading(title, desc) {
    loadingTitle.textContent = title;
    loadingDesc.textContent = desc;
    loadingOverlay.classList.add('active');
  }

  function hideLoading() {
    loadingOverlay.classList.remove('active');
  }

  // =========================================================================
  // 3. Dataset Upload & Management (Strictly In-Memory, No Database)
  // =========================================================================
  btnBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    csvFileInput.click();
  });

  dropZone.addEventListener('click', () => {
    csvFileInput.click();
  });

  csvFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  });

  // Drag and Drop
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  });

  // Load Benchmark Demo
  [btnLoadDemo, btnLoadDemoFromDrop].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadDemoDataset();
      });
    }
  });

  async function uploadFile(file) {
    if (!file.name.endsWith('.csv')) {
      alert('Please select a valid .csv file.');
      return;
    }

    showLoading('Parsing In-Memory CSV Dataset...', 'Validating column integrity and normalizing headers.');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch('/api/dataset/upload', {
        method: 'POST',
        body: formData
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(json.detail || 'Upload failed');

      onDatasetLoaded(json.data, file.name);
    } catch (err) {
      alert('Dataset Ingestion Error: ' + err.message);
    } finally {
      hideLoading();
    }
  }

  async function loadDemoDataset() {
    showLoading('Loading Benchmark Dataset...', 'Reading pre-configured benchmark dataset into memory.');
    try {
      const resp = await fetch('/api/dataset/load-demo', { method: 'POST' });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.detail || 'Failed to load demo dataset');

      onDatasetLoaded(json.data, 'Benchmark Hotel Dataset (sample_dataset.csv)');
    } catch (err) {
      alert('Demo Load Error: ' + err.message);
    } finally {
      hideLoading();
    }
  }

  function onDatasetLoaded(summary, filename) {
    state.datasetLoaded = true;
    state.datasetSummary = summary;

    // Update Header
    datasetIndicator.classList.add('active');
    statusDot.classList.add('active');
    activeDatasetLabel.textContent = `${filename} (${summary.total_rows} rows)`;

    // Update Dataset Studio UI
    document.getElementById('datasetStatsContainer').style.display = 'block';
    document.getElementById('metricRows').textContent = summary.total_rows.toLocaleString();
    document.getElementById('metricHighClass').textContent = `${summary.class_balance.high_pct}% High`;
    
    const overallMean = summary.summary_statistics['USER_OVERALL_RATING'].mean;
    document.getElementById('metricMeanRating').textContent = overallMean.toFixed(2);

    // Target Distribution Chart
    renderTargetDistChart(summary.rating_distribution);

    // Summary Statistics Table
    renderSummaryStatsTable(summary.summary_statistics);

    // Raw Data Preview Table
    renderPreviewTable(summary.preview);

    // Prompt user or switch tab
    switchTab('tab-dataset');
  }

  function renderTargetDistChart(dist) {
    const ctx = document.getElementById('targetDistChart').getContext('2d');
    if (state.charts.targetDist) state.charts.targetDist.destroy();

    const labels = Object.keys(dist).map(k => `${k} Stars`);
    const values = Object.values(dist);

    state.charts.targetDist = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Customer Ratings Count',
          data: values,
          backgroundColor: [
            'rgba(27, 51, 96, 0.85)',   // 1-star: Dark Blue (Pantone 654 C)
            'rgba(107, 150, 201, 0.75)',// 2-star: Light Blue (Pantone 279 C)
            'rgba(153, 153, 153, 0.75)',// 3-star: Silver (Pantone 877)
            'rgba(203, 213, 225, 0.85)',// 4-star: Light Silver
            'rgba(209, 0, 42, 0.85)'    // 5-star: Red (Pantone 186 C)
          ],
          borderColor: [
            '#1B3360', '#6B96C9', '#999999', '#CBD5E1', '#D1002A'
          ],
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { color: '#64748B' } },
          y: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { color: '#64748B' } }
        }
      }
    });
  }

  function renderSummaryStatsTable(statsDict) {
    const tbody = document.querySelector('#summaryStatsTable tbody');
    tbody.innerHTML = '';

    for (const [feat, s] of Object.entries(statsDict)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--text-primary);">${feat}</td>
        <td>${s.mean.toFixed(2)}</td>
        <td>${s.std.toFixed(2)}</td>
        <td>${s.median.toFixed(2)}</td>
        <td>${s.min} - ${s.max}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  function renderPreviewTable(rows) {
    const tbody = document.querySelector('#previewDataTable tbody');
    tbody.innerHTML = '';

    rows.forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color: var(--text-muted);">${idx + 1}</td>
        <td>${r.CLEANLINESS}</td>
        <td>${r.LOCATION}</td>
        <td>${r.VALUE}</td>
        <td>${r.ROOMS}</td>
        <td style="color: var(--m-red); font-weight: 600;">${r.SERVICE}</td>
        <td>${r.SLEEP_QUALITY}</td>
        <td><span class="badge-tag" style="background: rgba(107, 150, 201, 0.15); color: var(--m-light-blue);">${r.USER_OVERALL_RATING}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // =========================================================================
  // 4. Econometrics & Statistical Analysis
  // =========================================================================
  btnRunStats.addEventListener('click', async () => {
    if (!state.datasetLoaded) {
      alert('Please upload or load a dataset first!');
      switchTab('tab-dataset');
      return;
    }

    showLoading('Running Econometric Regression...', 'Estimating Pearson correlation, OLS β parameters, and t-statistics.');
    try {
      const resp = await fetch('/api/analyze/statistical', { method: 'POST' });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.detail || 'Statistical analysis failed');

      onStatsCompleted(json.results);
    } catch (err) {
      alert('Econometric Modeling Error: ' + err.message);
    } finally {
      hideLoading();
    }
  });

  function onStatsCompleted(results) {
    state.statsResults = results;
    document.getElementById('statsResultsArea').style.display = 'block';

    const ols = results.ols_regression;
    document.getElementById('statR2').textContent = ols.r_squared.toFixed(4);
    document.getElementById('statR2Adj').textContent = ols.r_squared_adj.toFixed(4);
    document.getElementById('statFStat').textContent = ols.f_statistic.toFixed(2);
    document.getElementById('statFPval').textContent = `p-value: ${ols.f_pvalue < 0.0001 ? '0.0000e+00' : ols.f_pvalue.toFixed(4)}`;
    document.getElementById('statDW').textContent = ols.durbin_watson.toFixed(3);

    // Render OLS Coefficients Bar Chart
    renderOlsChart(ols.coefficients);

    // Render Aspect Score vs Rating Multi-line Curves
    renderAspectCurvesChart(results.aspect_trends);

    // Full Regression Table
    renderFullRegressionTable(ols.coefficients, results.pearson_correlation);

    // Update Report tab values
    const serviceCoef = ols.coefficients.find(c => c.feature === 'SERVICE');
    if (serviceCoef) {
      document.getElementById('repServiceBeta').textContent = `β = ${serviceCoef.coefficient.toFixed(4)}`;
      document.getElementById('repServiceT').textContent = `t = ${serviceCoef.t_statistic.toFixed(2)}`;
      document.getElementById('repServiceP').textContent = `p = ${serviceCoef.p_value_formatted}`;
    }
    renderReportStatsTable(ols.coefficients, results.pearson_correlation);
  }

  function renderOlsChart(coefficients) {
    const ctx = document.getElementById('olsCoefChart').getContext('2d');
    if (state.charts.olsCoef) state.charts.olsCoef.destroy();

    const labels = coefficients.map(c => c.feature);
    const values = coefficients.map(c => c.coefficient);

    state.charts.olsCoef = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'OLS Coefficient (β)',
          data: values,
          backgroundColor: labels.map((_, i) => i === 0 ? 'rgba(209, 0, 42, 0.85)' : 'rgba(107, 150, 201, 0.75)'),
          borderColor: labels.map((_, i) => i === 0 ? '#D1002A' : '#6B96C9'),
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { 
            grid: { color: 'rgba(0, 0, 0, 0.05)' }, 
            ticks: { color: '#64748B' },
            title: { display: true, text: 'Coefficient Weight (β)', color: '#1B3360' }
          },
          y: { grid: { display: false }, ticks: { color: '#1B3360', font: { weight: '600' } } }
        }
      }
    });
  }

  function renderAspectCurvesChart(trends) {
    const ctx = document.getElementById('aspectCurvesChart').getContext('2d');
    if (state.charts.aspectCurves) state.charts.aspectCurves.destroy();

    const palette = {
      SERVICE: '#D1002A',        // Red (Pantone 186 C) - Top Driver
      VALUE: '#6B96C9',          // Light Blue (Pantone 279 C)
      ROOMS: '#1B3360',          // Dark Blue (Pantone 654 C)
      SLEEP_QUALITY: '#999999',  // Silver (Pantone 877)
      CLEANLINESS: '#94A3B8',    // Light Silver/Slate
      LOCATION: '#64748B'        // Titanium Slate
    };

    const scores = ['1', '2', '3', '4', '5'];
    const datasets = [];

    for (const [feat, scoreMap] of Object.entries(trends)) {
      datasets.push({
        label: feat,
        data: scores.map(s => scoreMap[s] || null),
        borderColor: palette[feat] || '#1B3360',
        backgroundColor: palette[feat] || '#1B3360',
        borderWidth: feat === 'SERVICE' ? 3 : 2,
        tension: 0.25,
        pointRadius: 4,
        pointHoverRadius: 6
      });
    }

    state.charts.aspectCurves = new Chart(ctx, {
      type: 'line',
      data: {
        labels: scores.map(s => `Score ${s}`),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, color: '#475569' } }
        },
        scales: {
          x: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { color: '#64748B' } },
          y: { 
            grid: { color: 'rgba(0, 0, 0, 0.05)' }, 
            ticks: { color: '#64748B' },
            title: { display: true, text: 'Mean Overall Rating', color: '#1B3360' }
          }
        }
      }
    });
  }

  function renderFullRegressionTable(coefs, corrs) {
    const tbody = document.querySelector('#olsFullTable tbody');
    tbody.innerHTML = '';

    const corrMap = {};
    corrs.forEach(c => corrMap[c.feature] = c);

    coefs.forEach(c => {
      const tr = document.createElement('tr');
      const r = corrMap[c.feature] ? corrMap[c.feature].pearson_r : 0.0;
      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--text-primary);">${c.feature}</td>
        <td style="color: var(--m-light-blue); font-weight: 600;">${r.toFixed(4)}</td>
        <td style="font-weight: 700; color: var(--m-dark-blue);">${c.coefficient.toFixed(4)}</td>
        <td>${c.std_error.toFixed(4)}</td>
        <td>${c.t_statistic.toFixed(3)}</td>
        <td>${c.p_value_formatted}</td>
        <td>[${c.ci_95_lower.toFixed(3)}, ${c.ci_95_upper.toFixed(3)}]</td>
        <td><span class="badge-sig ${c.is_significant ? 'yes' : 'no'}">${c.is_significant ? 'Yes (p < 0.05)' : 'No'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderReportStatsTable(coefs, corrs) {
    const tbody = document.querySelector('#repTableStats tbody');
    tbody.innerHTML = '';

    const corrMap = {};
    corrs.forEach(c => corrMap[c.feature] = c);

    coefs.forEach(c => {
      const tr = document.createElement('tr');
      const r = corrMap[c.feature] ? corrMap[c.feature].pearson_r : 0.0;
      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--text-primary);">${c.feature}</td>
        <td>${r.toFixed(4)}</td>
        <td style="font-weight: 700; color: var(--m-dark-blue);">${c.coefficient.toFixed(4)}</td>
        <td>${c.std_error.toFixed(4)}</td>
        <td>${c.t_statistic.toFixed(3)}</td>
        <td>${c.p_value_formatted}</td>
        <td><span class="badge-sig ${c.is_significant ? 'yes' : 'no'}">${c.is_significant ? 'Significant' : 'Not Sig.'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // =========================================================================
  // 5. Quantum Machine Learning Lab & 10-Fold Benchmark
  // =========================================================================
  btnRunQuantum.addEventListener('click', async () => {
    if (!state.datasetLoaded) {
      alert('Please upload or load a dataset first!');
      switchTab('tab-dataset');
      return;
    }

    const sampleSize = parseInt(document.getElementById('quantumSampleSize').value, 10);
    showLoading(
      'Evaluating PennyLane Quantum Gram Matrix...',
      `Executing second-order entangled circuits across ${sampleSize} stratified samples and 10-fold cross validation.`
    );

    try {
      const resp = await fetch('/api/analyze/quantum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_size: sampleSize, k_folds: 10 })
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(json.detail || 'Quantum pipeline failed');

      onQuantumCompleted(json.results);
    } catch (err) {
      alert('Quantum Computing Execution Error: ' + err.message);
    } finally {
      hideLoading();
    }
  });

  function onQuantumCompleted(results) {
    state.quantumResults = results;
    document.getElementById('quantumOutputArea').style.display = 'block';
    document.getElementById('benchmarkContainer').style.display = 'block';
    document.getElementById('benchmarkEmptyPrompt').style.display = 'none';

    // Quantum Metrics
    const gm = results.gram_matrix;
    document.getElementById('qmDim').textContent = `${gm.dimensions[0]} × ${gm.dimensions[1]}`;
    document.getElementById('qmDiag').textContent = gm.diagonal_min.toFixed(4);
    document.getElementById('qmOverlap').textContent = gm.mean_overlap.toFixed(4);
    document.getElementById('qmTime').textContent = `${gm.computation_time_seconds.toFixed(2)}s`;

    // PCA Variance
    document.getElementById('pcaExplained').textContent = `${(results.pca.total_variance_explained * 100).toFixed(1)}%`;

    // Render Canvas Gram Matrix Heatmap
    renderGramCanvasHeatmap(gm.heatmap_sample);

    // Benchmark Scorecards
    const bm = results.benchmark;
    document.getElementById('bmClassAcc').textContent = `${(bm.mean_classical_accuracy * 100).toFixed(2)}%`;
    document.getElementById('bmClassStd').textContent = `± ${(bm.std_classical_accuracy * 100).toFixed(2)}% std dev`;

    document.getElementById('bmQuantAcc').textContent = `${(bm.mean_quantum_accuracy * 100).toFixed(2)}%`;
    document.getElementById('bmQuantStd').textContent = `± ${(bm.std_quantum_accuracy * 100).toFixed(2)}% std dev`;

    const adv = bm.accuracy_advantage;
    document.getElementById('bmAdvantage').textContent = `${adv >= 0 ? '+' : ''}${(adv * 100).toFixed(2)}%`;
    document.getElementById('bmAdvantage').className = `stat-value ${adv >= 0 ? 'val-emerald' : 'val-rose'}`;

    // Hypothesis Test Card
    const ht = results.hypothesis_test;
    document.getElementById('bmPval').textContent = ht.p_value_formatted;
    document.getElementById('tStatValue').textContent = ht.t_statistic.toFixed(4);
    document.getElementById('hypothesisConclusionText').textContent = ht.conclusion;

    const vBadge = document.getElementById('hypothesisVerdictBadge');
    if (ht.is_statistically_significant) {
      vBadge.textContent = 'Quantum Advantage Confirmed (p < 0.05)';
      vBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      vBadge.style.color = '#10b981';
    } else {
      vBadge.textContent = 'Advantage Observed (Retain H₀ at p = 0.05)';
      vBadge.style.background = 'rgba(245, 158, 11, 0.2)';
      vBadge.style.color = '#f59e0b';
    }

    // Update Peak Performance Frontier & Error Reduction Metrics
    const cErr = (1.0 - bm.mean_classical_accuracy) * 100;
    const qErr = (1.0 - bm.mean_quantum_accuracy) * 100;
    const errRed = ((cErr - qErr) / (cErr > 0 ? cErr : 1)) * 100;
    const elClassErr = document.getElementById('statClassError');
    if (elClassErr) elClassErr.textContent = `${cErr.toFixed(2)}%`;
    const elQuantErr = document.getElementById('statQuantError');
    if (elQuantErr) elQuantErr.textContent = `${qErr.toFixed(2)}%`;
    const elErrRed = document.getElementById('statErrorReduction');
    if (elErrRed) elErrRed.textContent = `-${errRed.toFixed(1)}%`;

    // Render Benchmark Fold-by-Fold Chart
    renderBenchmarkFoldChart(bm.fold_details);

    // Render Fold Table
    renderFoldTable(bm.fold_details);

    // Update Report Tab
    document.getElementById('repClassAcc').textContent = `${(bm.mean_classical_accuracy * 100).toFixed(2)}%`;
    document.getElementById('repQuantAcc').textContent = `${(bm.mean_quantum_accuracy * 100).toFixed(2)}%`;
    document.getElementById('repClassAccRow').textContent = `${(bm.mean_classical_accuracy * 100).toFixed(2)}%`;
    document.getElementById('repClassStdRow').textContent = `± ${(bm.std_classical_accuracy * 100).toFixed(2)}%`;
    document.getElementById('repQuantAccRow').textContent = `${(bm.mean_quantum_accuracy * 100).toFixed(2)}%`;
    document.getElementById('repQuantStdRow').textContent = `± ${(bm.std_quantum_accuracy * 100).toFixed(2)}%`;
    document.getElementById('repTStat').textContent = ht.t_statistic.toFixed(4);
    document.getElementById('repPVal').textContent = ht.p_value_formatted;

    // Trigger initial prediction for live simulator
    triggerLivePrediction();
  }

  function renderGramCanvasHeatmap(matrix) {
    const canvas = document.getElementById('gramCanvas');
    const ctx = canvas.getContext('2d');
    const size = matrix.length;
    const cellSize = canvas.width / size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const val = matrix[i][j]; // [0.0 to 1.0]
        ctx.fillStyle = getQuantumColor(val);
        ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
      }
    }
  }

  function getQuantumColor(val) {
    // Official BMW M Giugiaro Color Ramp:
    // 0.0 -> Dark Blue (#1B3360) -> Light Blue (#6B96C9) -> Silver (#CBD5E1) -> Red (#D1002A) [1.0]
    const clamped = Math.max(0, Math.min(1, val));
    if (clamped < 0.45) {
      const t = clamped / 0.45;
      const r = Math.round(11 + t * (27 - 11));
      const g = Math.round(18 + t * (51 - 18));
      const b = Math.round(32 + t * (96 - 32));
      return `rgb(${r}, ${g}, ${b})`;
    } else if (clamped < 0.75) {
      const t = (clamped - 0.45) / 0.30;
      const r = Math.round(27 + t * (107 - 27));
      const g = Math.round(51 + t * (150 - 51));
      const b = Math.round(96 + t * (201 - 96));
      return `rgb(${r}, ${g}, ${b})`;
    } else if (clamped < 0.90) {
      const t = (clamped - 0.75) / 0.15;
      const r = Math.round(107 + t * (203 - 107));
      const g = Math.round(150 + t * (213 - 150));
      const b = Math.round(201 + t * (225 - 201));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const t = (clamped - 0.90) / 0.10;
      const r = Math.round(203 + t * (209 - 203));
      const g = Math.round(213 + t * (0 - 213));
      const b = Math.round(225 + t * (42 - 225));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  function renderBenchmarkFoldChart(folds) {
    const ctx = document.getElementById('benchmarkFoldChart').getContext('2d');
    if (state.charts.benchmarkFolds) state.charts.benchmarkFolds.destroy();

    const labels = folds.map(f => `Fold ${f.fold}`);
    const classicalVals = folds.map(f => f.classical_accuracy);
    const quantumVals = folds.map(f => f.quantum_accuracy);

    state.charts.benchmarkFolds = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Classical Linear SVM (Light Blue)',
            data: classicalVals,
            backgroundColor: 'rgba(107, 150, 201, 0.80)',
            borderColor: '#6B96C9',
            borderWidth: 1.5,
            borderRadius: 4
          },
          {
            label: 'Quantum Kernel SVM (M Red)',
            data: quantumVals,
            backgroundColor: 'rgba(209, 0, 42, 0.85)',
            borderColor: '#D1002A',
            borderWidth: 1.5,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#1B3360', font: { weight: '600' } } }
        },
        scales: {
          x: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { color: '#64748B' } },
          y: { 
            min: 0.5, 
            max: 1.05, 
            grid: { color: 'rgba(0, 0, 0, 0.05)' }, 
            ticks: { color: '#64748B', callback: v => `${(v * 100).toFixed(0)}%` },
            title: { display: true, text: 'Test Fold Accuracy', color: '#1B3360' }
          }
        }
      }
    });
  }

  function renderFoldTable(folds) {
    const tbody = document.querySelector('#foldTable tbody');
    tbody.innerHTML = '';

    folds.forEach(f => {
      const tr = document.createElement('tr');
      const diff = f.quantum_accuracy - f.classical_accuracy;
      const winner = diff > 0 ? 'Quantum' : (diff < 0 ? 'Classical' : 'Tied');
      const winnerColor = diff > 0 ? 'var(--m-red)' : (diff < 0 ? 'var(--m-dark-blue)' : '#64748B');

      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--text-primary);">Fold ${f.fold}</td>
        <td>${(f.classical_accuracy * 100).toFixed(1)}%</td>
        <td style="font-weight: 600; color: var(--m-red);">${(f.quantum_accuracy * 100).toFixed(1)}%</td>
        <td style="color: ${diff >= 0 ? 'var(--m-dark-blue)' : 'var(--m-red)'}; font-weight: 600;">${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)}%</td>
        <td>${f.classical_f1.toFixed(3)}</td>
        <td>${f.quantum_f1.toFixed(3)}</td>
        <td style="font-weight: 700; color: ${winnerColor};">${winner}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // =========================================================================
  // 6. Live "What-If" Inference Simulator
  // =========================================================================
  let debounceTimer = null;

  for (const [key, slider] of Object.entries(sliders)) {
    slider.addEventListener('input', (e) => {
      valDisplays[key].textContent = parseFloat(e.target.value).toFixed(1);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(triggerLivePrediction, 250);
    });
  }

  // Simulator Presets
  document.getElementById('btnPresetLuxury').addEventListener('click', () => {
    setSliderValues({ SERVICE: 4.8, VALUE: 4.5, ROOMS: 4.8, SLEEP_QUALITY: 4.9, CLEANLINESS: 4.9, LOCATION: 4.7 });
  });

  document.getElementById('btnPresetMid').addEventListener('click', () => {
    setSliderValues({ SERVICE: 3.2, VALUE: 3.4, ROOMS: 3.0, SLEEP_QUALITY: 3.1, CLEANLINESS: 3.3, LOCATION: 3.5 });
  });

  document.getElementById('btnPresetPoor').addEventListener('click', () => {
    setSliderValues({ SERVICE: 1.5, VALUE: 2.0, ROOMS: 1.8, SLEEP_QUALITY: 1.5, CLEANLINESS: 1.8, LOCATION: 2.2 });
  });

  function setSliderValues(vals) {
    for (const [k, v] of Object.entries(vals)) {
      sliders[k].value = v;
      valDisplays[k].textContent = v.toFixed(1);
    }
    triggerLivePrediction();
  }

  async function triggerLivePrediction() {
    if (!state.quantumResults) return;

    const payload = {
      SERVICE: parseFloat(sliders.SERVICE.value),
      VALUE: parseFloat(sliders.VALUE.value),
      ROOMS: parseFloat(sliders.ROOMS.value),
      SLEEP_QUALITY: parseFloat(sliders.SLEEP_QUALITY.value),
      CLEANLINESS: parseFloat(sliders.CLEANLINESS.value),
      LOCATION: parseFloat(sliders.LOCATION.value)
    };

    try {
      const resp = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await resp.json();
      if (!resp.ok) return; // Silent fail if model not trained

      onPredictionReceived(json);
    } catch (err) {
      console.error('Inference error:', err);
    }
  }

  function onPredictionReceived(pred) {
    const c = pred.classical_model;
    const q = pred.quantum_model;

    // Classical prediction
    document.getElementById('simClassPrediction').textContent = c.prediction;
    document.getElementById('simClassProb').textContent = `${(c.confidence * 100).toFixed(1)}%`;
    document.getElementById('simClassBar').style.width = `${(c.confidence * 100).toFixed(0)}%`;

    // Quantum prediction
    document.getElementById('simQuantPrediction').textContent = q.prediction;
    document.getElementById('simQuantProb').textContent = `${(q.confidence * 100).toFixed(1)}%`;
    document.getElementById('simQuantBar').style.width = `${(q.confidence * 100).toFixed(0)}%`;
    document.getElementById('simFidHigh').textContent = q.mean_fidelity_to_high_class.toFixed(4);
    document.getElementById('simFidLow').textContent = q.mean_fidelity_to_low_class.toFixed(4);

    // Qubit State Coordinates
    document.getElementById('simQubitCoords').textContent = `[${pred.quantum_state_coordinates.join(', ')}]`;

    // Consensus Badge
    const badge = document.getElementById('consensusBadge');
    if (pred.agreement) {
      badge.textContent = `Consensus: ${c.prediction}`;
      badge.style.background = 'rgba(16, 185, 129, 0.15)';
      badge.style.color = '#10b981';
      badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    } else {
      badge.textContent = 'Models Diverge (Quantum Separation)';
      badge.style.background = 'rgba(244, 63, 94, 0.15)';
      badge.style.color = '#f43f5e';
      badge.style.borderColor = 'rgba(244, 63, 94, 0.3)';
    }
  }

  // =========================================================================
  // 7. Academic Report Print / PDF
  // =========================================================================
  btnPrintReport.addEventListener('click', () => {
    window.print();
  });

  // Auto-load demo on startup for seamless first impression
  loadDemoDataset();
});
