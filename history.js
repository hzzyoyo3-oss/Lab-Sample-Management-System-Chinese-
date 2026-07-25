/**
 * Laboratory Sample Test Management System - History Trend Module
 * Licensed under the MIT License.
 * Co-authored by HGG & Gemini.
 */
(function () {
    let startDate = "";
    let endDate = "";
    let highlightedSeries = null;
    let activePackageKey = null;
    let currentFilteredDataList = [];

    const today = new Date();
    const fortnightAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    startDate = fortnightAgo.toISOString().split('T')[0];
    endDate = today.toISOString().split('T')[0];

    injectHistoryStyles();

    window.initLimsHistoryModule = function (containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="hi-wrapper">
                <div class="hi-left-pane">
                    <div class="hi-filter-card">
                        <label class="hi-label">日期区间选择:</label>
                        <div class="hi-date-grid">
                            <input type="date" id="hi_start_date" class="hi-input" value="${startDate}">
                            <input type="date" id="hi_end_date" class="hi-input" value="${endDate}">
                        </div>
                        <label class="hi-label" style="margin-top:10px;">搜索:</label>
                        <input type="text" id="hi_search_bar" class="hi-input" placeholder="输入关键字...">
                        
                        <div class="hi-download-btn-group" style="margin-top:12px; display:flex; flex-direction:column; gap:6px;">
                            <button id="hi_download_summary_btn" class="hi-csv-btn bg-summary">📥 导出结果 (.csv)</button>
                        </div>
                    </div>
                    <div class="hi-results-title" id="hiListTitleHeader">Historical Tasks</div>
                    <div class="hi-results-list" id="hiResultsList"></div>
                </div>
                <div class="hi-right-pane" id="hiChartPane" onclick="window.clearHistoryChartHighlight(event)">
                    <div class="hi-chart-header" id="hiChartDynamicTitle">动态分析趋势图</div>
                    
                    <div class="hi-svg-container" id="hiSvgContainer"></div>
                    
                    <div class="hi-legend-bar">
                        <span class="hi-legend-item lg-a" onclick="window.highlightHistoryLine('Test_A', event)">■ Test_A</span>
                        <span class="hi-legend-item lg-b" onclick="window.highlightHistoryLine('Test_B', event)">■ Test_B</span>
                        <span class="hi-legend-item lg-c" onclick="window.highlightHistoryLine('Test_C', event)">■ Test_C</span>
                        <span class="hi-legend-item lg-d" onclick="window.highlightHistoryLine('Test_D', event)">■ Test_D</span>
                        <span class="hi-legend-item lg-e" onclick="window.highlightHistoryLine('Test_E', event)">■ Test_E</span>
                        <span class="hi-legend-item lg-f" onclick="window.highlightHistoryLine('Test_F', event)">■ Test_F</span>
                    </div>
                    
                    <div class="hi-detail-dock" id="hiDetailDock">
                        <div class="hi-dock-placeholder">🔬 请点击任意历史卡片查看完整详情。</div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById("hi_search_bar").onkeydown = function (e) {
            if (e.key === "Enter") {
                startDate = document.getElementById("hi_start_date").value;
                endDate = document.getElementById("hi_end_date").value;
                executeHistoryEngine();
            }
        };

        document.getElementById("hi_download_summary_btn").onclick = function () { triggerDownloadRouter(); };

        executeHistoryEngine();
    };

    function executeHistoryEngine() {
        const keyword = document.getElementById("hi_search_bar").value.trim().toLowerCase();
        const listContainer = document.getElementById("hiResultsList");
        const titleHeader = document.getElementById("hiListTitleHeader");
        if (!listContainer) return;

        // Mock Local Storage Extraction
        const archivedJobs = JSON.parse(localStorage.getItem('limsHistoryDatabase')) || [];

        let allFlattenedRecords = [];
        const safeParse = (val) => {
            if (val === undefined || val === null || isNaN(parseFloat(val))) return 0;
            return parseFloat(parseFloat(val).toFixed(2));
        };

        archivedJobs.forEach(job => {
            if (job.samples && job.samples.length > 0) {
                job.samples.forEach(sample => {
                    allFlattenedRecords.push({
                        date: job.samplingTime || job.date || new Date().toISOString().split('T')[0],
                        taskName: job.taskName || 'Realtime Task',
                        templateID: job.templateID || job.template || 'T0001',
                        requesterName: job.requesterName || 'N/A',
                        sampleID: sample.id || sample.sampleID || 'N/A',
                        sampleName: sample.name || sample.sampleName || 'Unknown',
                        metrics: {
                            Test_A: safeParse(sample.data?.Test_A?.result),
                            Test_B: safeParse(sample.data?.Test_B?.result),
                            Test_C: safeParse(sample.data?.Test_C?.result),
                            Test_D: safeParse(sample.data?.Test_D?.result),
                            Test_E: safeParse(sample.data?.Test_E?.value),
                            Test_F: safeParse(sample.data?.Test_F?.result)
                        },
                        data: sample.data || {},
                        sampleComment: sample.sampleComment || "",
                        jobComment: job.jobComment || job.overrideComment || ""
                    });
                });
            }
        });

        let baseFiltered = allFlattenedRecords.filter(item => item.date >= startDate && item.date <= endDate);

        if (!keyword) {
            titleHeader.innerText = "📁 历史任务";
            let packageMap = {};
            baseFiltered.forEach(item => {
                const pkgKey = `${item.date}_${item.templateID}`;
                if (!packageMap[pkgKey]) {
                    packageMap[pkgKey] = { key: pkgKey, date: item.date, templateID: item.templateID, taskName: item.taskName, requesterName: item.requesterName, samples: [] };
                }
                packageMap[pkgKey].samples.push(item);
            });

            let packageList = Object.values(packageMap);
            packageList.sort((a, b) => b.date.localeCompare(a.date));

            if (packageList.length === 0) {
                listContainer.innerHTML = `<div class="hi-no-data">No tasks discovered within this window.</div>`;
                renderTrendChart([]);
                return;
            }

            listContainer.innerHTML = packageList.map(pkg => {
                const isActive = activePackageKey === pkg.key ? 'active' : '';
                return `
                <div class="hi-item-card card-package ${isActive}" onclick="window.selectHistoryTaskPackage('${pkg.key}')">
                    <div class="pkg-header-flex">
                        <span class="pkg-badge-tmpl">📦 ${pkg.templateID}</span>
                        <span class="pkg-date">${pkg.date}</span>
                    </div>
                    <div class="pkg-body-title">${escapeHtml(pkg.taskName)}</div>
                    <div class="pkg-footer-meta">👤 Owner: <strong>${escapeHtml(pkg.requesterName)}</strong></div>
                </div>
            `;
            }).join('');

            if (activePackageKey && packageMap[activePackageKey]) {
                currentFilteredDataList = packageMap[activePackageKey].samples;
                renderTrendChart(currentFilteredDataList);
                renderDetailDockTable(currentFilteredDataList, "Task Allocation");
            } else {
                currentFilteredDataList = [];
                renderTrendChart([]);
                document.getElementById("hiDetailDock").innerHTML = `<div class="hi-dock-placeholder">🔬 点击任意任务卡生成图表。</div>`;
            }
        } else {
            titleHeader.innerText = "🔍 Search Results";
            activePackageKey = null;
            let searchFiltered = baseFiltered.filter(item => {
                return (item.taskName || '').toLowerCase().includes(keyword) ||
                    (item.sampleName || '').toLowerCase().includes(keyword) ||
                    (item.sampleID || '').toLowerCase().includes(keyword) ||
                    (item.templateID || '').toLowerCase().includes(keyword);
            });
            searchFiltered.sort((a, b) => a.date.localeCompare(b.date));
            currentFilteredDataList = searchFiltered;

            if (searchFiltered.length === 0) {
                listContainer.innerHTML = `<div class="hi-no-data">Zero search matrices hit.</div>`;
                renderTrendChart([]);
                return;
            }

            listContainer.innerHTML = searchFiltered.map((item) => `
            <div class="hi-item-card card-sample">
                <div style="display:flex; justify-content:space-between; font-weight:700;">
                    <span style="color:var(--primary-color);">🔬 ${escapeHtml(item.sampleName)}</span>
                    <span style="color:#2563eb;">${item.sampleID}</span>
                </div>
                <div style="font-size:12px; color:#4b5563; margin-top:4px;">
                    📋 ${escapeHtml(item.taskName)} | 🔑 ${item.templateID}
                </div>
                <div style="font-size:11px; color:#6b7280; margin-top:2px;">
                    📅 ${item.date} | 👤 ${escapeHtml(item.requesterName)}
                </div>
            </div>
            `).join('');

            renderTrendChart(searchFiltered);
            renderDetailDockTable(searchFiltered, "Query Result Grid");
        }
    }

    window.selectHistoryTaskPackage = function (pkgKey) {
        activePackageKey = pkgKey;
        executeHistoryEngine();
    };

    function renderDetailDockTable(records, sectionTitle) {
        const dock = document.getElementById("hiDetailDock");
        if (!dock || records.length === 0) return;

        let tableRowsHtml = records.map((item, idx) => {
            const m = item.metrics || {};
            const d = item.data || {};

            const psdFileName = d.Attach?.attachment || null;
            let psdDisplayHtml = `<span style="color:#6b7280;">None</span>`;

            if (d.Attach?.checked) {
                if (psdFileName) {
                    psdDisplayHtml = `<a href="${psdFileName}" download target="_blank" class="hi-psd-down-btn" style="text-decoration:none; display:inline-block;" title="${escapeHtml(psdFileName)}">📎 下载</a>`;
                } else {
                    psdDisplayHtml = `<span style="color:#059669; font-weight:700;">✓ Verified</span>`;
                }
            }

            return `
                <tr>
                    <td>${idx + 1}</td>
                    <td style="font-weight:700; color:#4c1d95;">${item.sampleID}</td>
                    <td style="font-weight:600; text-align:left;">${escapeHtml(item.sampleName)}</td>
                    <td class="hi-cell-res">${m.Test_A ? m.Test_A : '-'}</td>
                    <td class="hi-cell-res">${m.Test_B ? m.Test_B : '-'}</td>
                    <td class="hi-cell-res">${m.Test_C ? m.Test_C : '-'}</td>
                    <td class="hi-cell-res">${m.Test_D ? m.Test_D : '-'}</td>
                    <td class="hi-cell-res">${m.Test_E ? m.Test_E : '-'}</td>
                    <td class="hi-cell-res">${m.Test_F ? m.Test_F : '-'}</td>
                    <td>${psdDisplayHtml}</td>
                    <td style="font-style:italic; color:#4b5563; text-align:left;">${escapeHtml(item.sampleComment || '-')}</td>
                </tr>
            `;
        }).join('');

        dock.innerHTML = `
            <div class="hi-dock-title">📊 ${sectionTitle} (Count: ${records.length})</div>
            <div class="hi-table-wrapper">
                <table class="hi-audit-table">
                    <thead>
                        <tr>
                            <th>Seq</th><th>Sample ID</th><th>Sample Name</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th><th>Doc</th><th>Comment</th>
                        </tr>
                    </thead>
                    <tbody>${tableRowsHtml}</tbody>
                </table>
            </div>
        `;
    };

    function renderTrendChart(data) {
        const svgContainer = document.getElementById("hiSvgContainer");
        const titleTitle = document.getElementById("hiChartDynamicTitle");
        if (!svgContainer) return;

        if (data.length === 0) {
            svgContainer.innerHTML = `<div class="hi-chart-empty-placeholder">📉无数据显示。请从左侧窗格列表中选择一项任务卡，以查看趋势数组。</div>`;
            return;
        }

        const width = svgContainer.clientWidth || 600;
        const height = 300;
        const padding = 45;

        let maxVal = 10;
        data.forEach(d => {
            if (d.metrics) {
                Object.values(d.metrics).forEach(v => { if (v > maxVal) maxVal = v; });
            }
        });
        maxVal = Math.ceil(maxVal * 1.18);

        const seriesConfig = {
            Test_A: { name: "Test_A", color: "#475569" },
            Test_B: { name: "Test_B", color: "#3b82f6" },
            Test_C: { name: "Test_C", color: "#1e293b" },
            Test_D: { name: "Test_D", color: "#d97706" },
            Test_E: { name: "Test_E", color: "#ec4899" },
            Test_F: { name: "Test_F", color: "#a855f7" }
        };

        const pointsMap = { Test_A: [], Test_B: [], Test_C: [], Test_D: [], Test_E: [], Test_F: [] };
        const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : (width - padding * 2);

        data.forEach((item, idx) => {
            const x = padding + idx * stepX;
            Object.keys(pointsMap).forEach(key => {
                const val = item.metrics?.[key] !== undefined ? item.metrics[key] : 0;
                const y = height - padding - (val / maxVal) * (height - padding * 2);
                pointsMap[key].push({ x, y, val: parseFloat(val).toFixed(2), sample: item.sampleID });
            });
        });

        let svgHtml = `<svg width="100%" height="${height}" style="overflow:hidden; background:#fff;">`;
        for (let i = 0; i <= 5; i++) {
            const y = padding + i * (height - padding * 2) / 5;
            const labelY = maxVal - (i * maxVal / 5);
            svgHtml += `
                <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#f3f4f6" stroke-width="1"/>
                <text x="${padding - 10}" y="${y + 4}" font-size="10" font-weight="600" text-anchor="end" fill="#6b7280">${labelY.toFixed(1)}</text>
            `;
        }

        data.forEach((item, idx) => {
            const x = padding + idx * stepX;
            svgHtml += `<text x="${x}" y="${height - padding + 16}" font-size="9" font-weight="600" text-anchor="middle" fill="#9ca3af">${item.sampleID}</text>`;
        });

        Object.keys(pointsMap).forEach(key => {
            const pts = pointsMap[key];
            const color = seriesConfig[key].color;
            let pathD = "";
            pts.forEach((p, idx) => { pathD += (idx === 0 ? 'M' : 'L') + ` ${p.x} ${p.y}`; });

            const isDimmed = (highlightedSeries && highlightedSeries !== key);
            const opacity = isDimmed ? "0.08" : "1.0";
            const strokeWidth = highlightedSeries === key ? "4.5" : "2";

            svgHtml += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" style="transition:all 0.15s;" />`;

            pts.forEach(p => {
                svgHtml += `
                    <g class="hi-svg-node-group">
                        <circle cx="${p.x}" cy="${p.y}" r="${highlightedSeries === key ? 5.5 : 3.5}" fill="${color}" opacity="${opacity}" style="transition:all 0.1s;"/>
                        ${highlightedSeries === key ? `<text x="${p.x}" y="${p.y - 10}" font-size="10" font-weight="800" fill="${color}" text-anchor="middle">${p.val}</text>` : ''}
                    </g>
                `;
            });
        });

        svgHtml += `</svg>`;
        svgContainer.innerHTML = svgHtml;
    }

    function triggerDownloadRouter() {
        const data = currentFilteredDataList;
        if (!data || data.length === 0) {
            alert("No structured dataset available to export.");
            return;
        }

        let csvContent = "\uFEFF";
        csvContent += "Date,Sample ID,Sample Name,Task Name,Test_A,Test_B,Test_C,Test_D,Test_E,Test_F,Line Remark\n";

        data.forEach(item => {
            const m = item.metrics || {};
            const row = [
                item.date, item.sampleID, item.sampleName, item.taskName,
                m.Test_A ?? '-', m.Test_B ?? '-', m.Test_C ?? '-',
                m.Test_D ?? '-', m.Test_E ?? '-', m.Test_F ?? '-',
                item.sampleComment || "-"
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
            csvContent += row + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const downloadEl = document.createElement("a");
        downloadEl.href = URL.createObjectURL(blob);
        downloadEl.setAttribute("download", `LIMS_History_Summary_${Date.now()}.csv`);
        document.body.appendChild(downloadEl);
        downloadEl.click();
        document.body.removeChild(downloadEl);
    }

    function keywordTextIsActive() {
        const el = document.getElementById("hi_search_bar");
        return el ? el.value.trim() !== "" : false;
    }

    window.highlightHistoryLine = function (seriesKey, event) {
        event.stopPropagation();
        highlightedSeries = seriesKey;
        document.querySelectorAll(".hi-legend-item").forEach(el => el.classList.add("dimmed"));
        const activeLegend = document.querySelector(`.lg-${seriesKey.toLowerCase().replace('test_','')}`);
        if (activeLegend) activeLegend.classList.remove("dimmed");
        renderTrendChart(currentFilteredDataList);
    };

    window.clearHistoryChartHighlight = function (event) {
        highlightedSeries = null;
        document.querySelectorAll(".hi-legend-item").forEach(el => el.classList.remove("dimmed"));
        renderTrendChart(currentFilteredDataList);
    };

    function escapeHtml(str) { return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }

    function injectHistoryStyles() {
        const id = "hi-styles-injected"; if (document.getElementById(id)) return;
        const s = document.createElement("style"); s.id = id;
        s.innerHTML = `
            .hi-wrapper { display: flex; gap: 20px; height: calc(100vh - 160px); min-height:680px; align-items: stretch; }
            .hi-left-pane { width: 340px; background: #fff; border: 1px solid #d1d5db; border-radius: 8px; display: flex; flex-direction: column; padding: 15px; box-sizing: border-box;}
            .hi-right-pane { flex: 1; background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; overflow-y: auto; box-sizing: border-box;}
            
            .hi-filter-card { background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; }
            .hi-label { display: block; font-size: 13px; font-weight: 700; color: #4b5563; margin-bottom: 6px; }
            .hi-date-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .hi-input { width: 100%; border: 1px solid #d1d5db; border-radius: 4px; padding: 8px; font-size: 14px; box-sizing: border-box; }
            
            .hi-csv-btn { width: 100%; border: none; color: #fff; border-radius: 4px; padding: 8px; font-size: 13px; font-weight:700; cursor: pointer; transition: all 0.15s; text-align:left; padding-left:12px;}
            .bg-summary { background: var(--primary-color); } .bg-summary:hover { background: #4c1d95; }
            
            .hi-results-title { font-weight: 700; font-size: 15px; margin: 15px 0 8px 0; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px;}
            .hi-results-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; min-height: 180px; }
            
            .hi-item-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; background: #fff; cursor: pointer; transition: all 0.15s; }
            .card-package { border-left: 5px solid var(--primary-color); background: #fafafa; }
            .card-package:hover { background: #f3f4f6; border-color: var(--primary-color); }
            .card-package.active { background: #ede9fe; border-color: var(--primary-color); }
            
            .card-sample { border-left: 5px solid #2563eb; background: #fff; }
            .card-sample:hover { background: #eff6ff; }
            
            .pkg-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
            .pkg-badge-tmpl { background: #e5e7eb; color: #374151; padding: 2px 6px; font-size: 12px; font-weight: 700; border-radius:4px; }
            .pkg-date { font-size: 12px; color: #6b7280; font-weight: 600; }
            .pkg-body-title { font-size: 14px; font-weight: 700; color: #1f2937; line-height: 1.4; margin-bottom: 4px; }
            .pkg-footer-meta { font-size: 12px; color: #6b7280; }

            .hi-chart-header { font-weight: 700; font-size: 16px; margin-bottom: 10px; color:#1f2937; }
            .hi-svg-container { height: 300px; min-height: 300px; width: 100%; background: #ffffff; margin-bottom: 15px; border: 1px dashed #d1d5db; border-radius:6px; display:flex; align-items:center; justify-content:center;}
            .hi-chart-empty-placeholder { color: #9ca3af; font-size: 14px; font-weight: 500; padding: 20px; text-align: center; max-width: 400px;}
            
            .hi-legend-bar { display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; background: #f9fafb; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 15px;}
            .hi-legend-item { font-size: 13px; font-weight: 700; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: all 0.15s; }
            .hi-legend-item.dimmed { opacity: 0.12; transform: scale(0.96); }
            .lg-a { color: #475569; } .lg-b { color: #3b82f6; } .lg-c { color: #1e293b; }
            .lg-d { color: #d97706; } .lg-e { color: #ec4899; } .lg-f { color: #a855f7; }
            .hi-no-data { text-align: center; color: #9ca3af; padding: 40px 10px; font-size: 14px; }
            
            .hi-detail-dock { background: #ffffff; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px; width:100%; box-sizing:border-box; flex:1; display:flex; flex-direction:column; overflow:hidden;}
            .hi-dock-placeholder { text-align: center; font-size: 14px; color: #9ca3af; padding: 30px 0; margin:auto; font-weight:500;}
            .hi-dock-title { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 10px; border-left: 4px solid var(--primary-color); padding-left: 8px;}
            
            .hi-table-wrapper { flex:1; overflow-y:auto; border:1px solid #e5e7eb; border-radius:6px; background:#fff;}
            .hi-audit-table { width:100%; border-collapse:collapse; font-size:13px; text-align:center;}
            .hi-audit-table th { background:#f9fafb; padding:8px 4px; border-bottom:2px solid #d1d5db; font-weight:700; position:sticky; top:0; z-index:5;}
            .hi-audit-table td { padding:6px 4px; border-bottom:1px solid #f3f4f6; height:28px;}
            .hi-cell-res { font-weight:700; color:#111827; background:#f0fdf4; }
            .hi-cell-res:hover { background:#bbf7d0;}
            
            .hi-svg-node-group circle { transition: r 0.1s ease-in-out; }
            .hi-svg-node-group:hover circle:first-child { r: 7px; }
            
            .hi-psd-down-btn { background: var(--primary-color); color: white; border: none; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.1s; }
            .hi-psd-down-btn:hover { background: #4c1d95; }
        `;
        document.head.appendChild(s);
    }
})();