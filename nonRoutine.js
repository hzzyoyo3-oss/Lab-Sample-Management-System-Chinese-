
/**
 * Laboratory Sample Test Management System - Workspace Module
 * Licensed under the MIT License.
 * Co-authored by HGG & Gemini.
 */

(function () {
    let tableZoomScale = 1.0;
    window.limsActiveJobs = [];
    let currentSelectedSampleRef = null;

    injectNonRoutineStyles();

    window.initLimsNonRoutineModule = function (containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="nr-wrapper">
                <div class="nr-left-pane">
                    <div class="nr-zoom-indicator">💡 按住 [Ctrl] 键并滚动鼠标滚轮可放大/缩小表格</div>
                    <div class="nr-table-scroll-wrapper" id="nrZoomWrapper">
                        <table class="nr-matrix-table" id="nrMatrixTable">
                            <thead>
                                <tr class="nr-th-tier1">
                                    <th colspan="3" class="nr-blank-cap"></th>
                                    <th colspan="3" class="nr-domain-a">Test A</th>
                                    <th colspan="3" class="nr-domain-b">Test B</th>
                                    <th colspan="3" class="nr-domain-c">Test C</th>
                                    <th colspan="3" class="nr-domain-d">Test D</th>
                                    <th colspan="1" class="nr-domain-e">Test E</th>
                                    <th colspan="3" class="nr-domain-f">Test F</th>
                                </tr>
                                <tr class="nr-th-tier2">
                                    <th style="min-width:110px;">Sample ID</th>
                                    <th style="min-width:140px;">Sample Name</th>
                                    <th style="min-width:90px;">Tray No.</th>
                                    <th>Val 1</th><th>Val 2</th><th>Result</th>
                                    <th>Val 1</th><th>Val 2</th><th>Result</th>
                                    <th>Val 1</th><th>Val 2</th><th>Result</th>
                                    <th>Val 1</th><th>Val 2</th><th>Result</th>
                                    <th>Value</th>
                                    <th>Val 1</th><th>Val 2</th><th>Result</th>
                                </tr>
                            </thead>
                            <tbody id="nrMatrixTbody"></tbody>
                        </table>
                    </div>
                </div>

                <div class="nr-right-pane" id="nrInputDock">
                    <div class="nr-dock-empty-state">
                        <div style="font-size: 50px; color: #d1d5db; margin-bottom:15px;">🔬</div>
                        请从表格中选中一个样本记录行，然后输入数据。
                    </div>
                </div>
            </div>
        `;

        if (typeof setupTableWheelZoom === "function") setupTableWheelZoom();

        window.refreshNonRoutineView = function () {
            const allJobs = JSON.parse(localStorage.getItem('limsJobs')) || [];
            window.limsActiveJobs = allJobs.filter(job => job.status.toLowerCase() === "pending");

            window.limsActiveJobs.forEach(job => {
                if (job.samples && job.samples.length > 0) {
                    job.samples.forEach(sample => {
                        if (!sample.id && sample.generatedID) sample.id = sample.generatedID;
                        if (!sample.name && sample.sampleName) sample.name = sample.sampleName;
                        if (!sample.options) sample.options = { Test_A:true, Test_B:true, Test_C:true, Test_D:true, Test_E:true, Test_F:true, Attach:true };
                        if (!sample.data) sample.data = {};
                    });
                }
            });

            if (typeof renderMatrixView === "function") renderMatrixView();
        };

        window.refreshNonRoutineView();
    };

    function setupTableWheelZoom() {
        const zoomWrapper = document.getElementById("nrZoomWrapper");
        if (!zoomWrapper) return;

        zoomWrapper.addEventListener("wheel", function (e) {
            if (e.ctrlKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    tableZoomScale = Math.min(tableZoomScale + 0.05, 1.6);
                } else {
                    tableZoomScale = Math.max(tableZoomScale - 0.05, 0.7);
                }
                const table = zoomWrapper.querySelector(".nr-matrix-table");
                if (table) {
                    table.style.transform = `scale(${tableZoomScale})`;
                    table.style.transformOrigin = "top left";
                    table.style.width = (100 / tableZoomScale) + "%";
                }
            }
        }, { passive: false });
    }

    function renderMatrixView() {
        const tbody = document.getElementById("nrMatrixTbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        if (window.limsActiveJobs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="20" class="nr-no-data-placeholder">
                        ⚠️ 队列中未找到待处理的任务。请先在“模板”工作区中创建任务。
                    </td>
                </tr>`;
            return;
        }

        window.limsActiveJobs.forEach((job, jobIdx) => {
            const isJobCompleted = evaluateJobCompletionState(job);
            const rawComment = job.jobComment || "";
            const displayComment = rawComment.length > 20 ? (rawComment.substring(0, 20) + "...") : rawComment;
            const commentSpan = rawComment ? ` | 💬 备注: <span style="color:#d97706; font-weight:700;">${escapeHtml(displayComment)}</span>` : "";

            const headerTr = document.createElement("tr");
            headerTr.className = `nr-job-header-row ${isJobCompleted ? 'nr-row-completed-green' : ''}`;
            headerTr.innerHTML = `
                <td colspan="20" class="nr-job-meta-cell">
                    <div class="nr-job-meta-flex">
                        <div class="nr-clickable-meta" onclick="window.openWindow6_JobDetails(${jobIdx})">
                            📅 日期: <strong>${job.samplingTime}</strong> | 
                            📋 任务名: <strong>${escapeHtml(job.taskName)}</strong> | 
                            🔑 模板: <strong>${job.templateID}</strong>${commentSpan}
                        </div>
                        <button class="nr-btn-finalize" onclick="window.openWindow7_ConfirmJob(${jobIdx})">✔ 确认全部完成</button>
                    </div>
                </td>
            `;
            tbody.appendChild(headerTr);

            job.samples.forEach((sample, sampleIdx) => {
                const tr = document.createElement("tr");
                tr.className = "nr-sample-data-row";

                if (currentSelectedSampleRef && currentSelectedSampleRef.jIdx === jobIdx && currentSelectedSampleRef.sIdx === sampleIdx) {
                    tr.classList.add("nr-row-selected");
                }

                tr.onclick = (e) => {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                    selectSampleLine(jobIdx, sampleIdx, tr);
                };

                const d = sample.data || {};

                const makeEditableCell = (optionKey, fieldName, valueText, colorClass) => {
                    const isOptionActive = (optionKey === 'TrayLinker') ? true : sample.options?.[optionKey];
                    if (!sample.options || !isOptionActive) {
                        return `<td class="${colorClass}"></td>`;
                    }
                    return `
                        <td contenteditable="true" 
                            class="${colorClass} nr-excel-editable-cell" 
                            data-jobidx="${jobIdx}" 
                            data-sampleidx="${sampleIdx}" 
                            data-optionkey="${optionKey}" 
                            data-field="${fieldName}"
                            style="outline: none; cursor: edit;">${valueText ?? ''}</td>
                    `;
                };

                const cA = evalCellColorClass(sample, 'Test_A', ['val1', 'val2']);
                const cB = evalCellColorClass(sample, 'Test_B', ['val1', 'val2']);
                const cC = evalCellColorClass(sample, 'Test_C', ['val1', 'val2']);
                const cD = evalCellColorClass(sample, 'Test_D', ['val1', 'val2']);
                const cE = evalCellColorClass(sample, 'Test_E', ['value']);
                const cF = evalCellColorClass(sample, 'Test_F', ['val1', 'val2']);

                tr.innerHTML = `
                    <td class="nr-font-bold" style="background:#f9fafb;">${sample.id}</td>
                    <td style="background:#f9fafb; font-weight:600;">${escapeHtml(sample.name)}</td>
                    ${makeEditableCell('TrayLinker', 'trayNo', sample.trayNo, 'nr-cell-white')}
                    
                    ${makeEditableCell('Test_A', 'val1', d.Test_A?.val1, cA)}
                    ${makeEditableCell('Test_A', 'val2', d.Test_A?.val2, cA)}
                    <td class="${cA} nr-font-bold" style="background:#f9fafb;">${d.Test_A?.result ?? ''}</td>
                    
                    ${makeEditableCell('Test_B', 'val1', d.Test_B?.val1, cB)}
                    ${makeEditableCell('Test_B', 'val2', d.Test_B?.val2, cB)}
                    <td class="${cB} nr-font-bold" style="background:#f9fafb;">${d.Test_B?.result ?? ''}</td>
                    
                    ${makeEditableCell('Test_C', 'val1', d.Test_C?.val1, cC)}
                    ${makeEditableCell('Test_C', 'val2', d.Test_C?.val2, cC)}
                    <td class="${cC} nr-font-bold" style="background:#f9fafb;">${d.Test_C?.result ?? ''}</td>
                    
                    ${makeEditableCell('Test_D', 'val1', d.Test_D?.val1, cD)}
                    ${makeEditableCell('Test_D', 'val2', d.Test_D?.val2, cD)}
                    <td class="${cD} nr-font-bold" style="background:#f9fafb;">${d.Test_D?.result ?? ''}</td>

                    ${makeEditableCell('Test_E', 'value', d.Test_E?.value, cE)}
                    
                    ${makeEditableCell('Test_F', 'val1', d.Test_F?.val1, cF)}
                    ${makeEditableCell('Test_F', 'val2', d.Test_F?.val2, cF)}
                    <td class="${cF} nr-font-bold" style="background:#f9fafb;">${d.Test_F?.result ?? ''}</td>
                `;
                tbody.appendChild(tr);
            });
        });
    }

    document.addEventListener("input", function (e) {
        const cell = e.target;
        if (!cell.classList.contains("nr-excel-editable-cell")) return;

        const jIdx = parseInt(cell.dataset.jobidx);
        const sIdx = parseInt(cell.dataset.sampleidx);
        const optKey = cell.dataset.optionkey;
        const field = cell.dataset.field;
        const rawVal = cell.innerText.trim();

        const targetJob = window.limsActiveJobs[jIdx];
        if (!targetJob) return;
        const sample = targetJob.samples[sIdx];

        if (optKey === 'TrayLinker' && field === 'trayNo') {
            sample.trayNo = rawVal;
        } else {
            sample.data = sample.data || {};
            sample.data[optKey] = sample.data[optKey] || { operator: "" };

            if (!sample.data[optKey].operator) {
                const dockOpInput = document.getElementById(`dock_${optKey}_operator`);
                sample.data[optKey].operator = dockOpInput ? dockOpInput.value.trim() : "Tester";
            }
            sample.data[optKey][field] = rawVal === "" ? "" : parseFloat(rawVal);
        }

        const d = sample.data?.[optKey];
        if (d && (optKey === 'Test_A' || optKey === 'Test_B' || optKey === 'Test_C' || optKey === 'Test_D' || optKey === 'Test_F')) {
            if (!isNaN(parseFloat(d.val1)) && !isNaN(parseFloat(d.val2))) {
                d.result = parseFloat(d.val1) + parseFloat(d.val2); // Simple Addition Math
            } else {
                d.result = null;
            }

            const currentRowTr = cell.closest("tr");
            if (currentRowTr) {
                const results = currentRowTr.querySelectorAll(`td[class*="${evalCellColorClass(sample, optKey, ['val1','val2'])}"].nr-font-bold`);
                // Find correct result cell by calculating index manually based on test offset
                renderMatrixView(); // simpler to just re-render to update the calc safely
            }
        }
        syncNonRoutineToGlobalStorage();
    });

    function evalCellColorClass(sample, optionKey, requiredFields) {
        if (!sample.options || sample.options[optionKey] !== true) {
            return "nr-cell-white";
        }
        const blockData = sample.data?.[optionKey];
        if (optionKey === "Attach") {
            if (!blockData || !blockData.operator || blockData.operator.trim() === "") return "nr-cell-red";
            if (!blockData.checked) return "nr-cell-yellow";
            return "nr-cell-green";
        }
        if (!blockData || !blockData.operator || blockData.operator.trim() === "") return "nr-cell-red";
        const hasAllFields = requiredFields.every(field =>
            blockData[field] !== undefined && blockData[field] !== "" && !isNaN(blockData[field])
        );
        return hasAllFields ? "nr-cell-green" : "nr-cell-yellow";
    }

    function evaluateJobCompletionState(job) {
        return job.samples.every(s => {
            if (s.options.Test_A && evalCellColorClass(s, 'Test_A', ['val1', 'val2']) !== 'nr-cell-green') return false;
            if (s.options.Test_B && evalCellColorClass(s, 'Test_B', ['val1', 'val2']) !== 'nr-cell-green') return false;
            if (s.options.Test_C && evalCellColorClass(s, 'Test_C', ['val1', 'val2']) !== 'nr-cell-green') return false;
            if (s.options.Test_D && evalCellColorClass(s, 'Test_D', ['val1', 'val2']) !== 'nr-cell-green') return false;
            if (s.options.Test_E && evalCellColorClass(s, 'Test_E', ['value']) !== 'nr-cell-green') return false;
            if (s.options.Test_F && evalCellColorClass(s, 'Test_F', ['val1', 'val2']) !== 'nr-cell-green') return false;
            if (s.options.Attach && (!s.data.Attach || !s.data.Attach.checked)) return false;
            return true;
        });
    }

    function selectSampleLine(jIdx, sIdx, trElement) {
        document.querySelectorAll(".nr-sample-data-row").forEach(r => r.classList.remove("nr-row-selected"));
        trElement.classList.add("nr-row-selected");
        currentSelectedSampleRef = { jIdx, sIdx };
        refreshInputDockPanel();
    }

    function refreshInputDockPanel() {
        const dock = document.getElementById("nrInputDock");
        if (!currentSelectedSampleRef || !dock) return;

        const job = window.limsActiveJobs[currentSelectedSampleRef.jIdx];
        const s = job.samples[currentSelectedSampleRef.sIdx];
        s.data = s.data || {};

        let sectionsHtml = "";

        const generateTestBlock = (key, title, fields) => {
            if (!s.options[key]) return "";
            const d = s.data[key] || { operator: "" };
            let inputsHtml = "";
            fields.forEach(f => {
                inputsHtml += `<div class="nr-input-box"><label>${f.label}</label><input type="number" id="dock_${key}_${f.id}" value="${d[f.id]||''}" oninput="execRealtimeCalc()"></div>`;
            });

            return `
                <div class="nr-dock-card border-generic">
                    <div class="nr-card-title-bar">
                        <span>${title}</span>
                        <input type="text" id="dock_${key}_operator" class="nr-analyst-input" value="${escapeHtml(d.operator)}" placeholder="Operator" oninput="execRealtimeCalc()">
                    </div>
                    <div class="nr-dock-grid-2">
                        ${inputsHtml}
                    </div>
                    ${fields.length > 1 ? `<div class="nr-calc-output-row">Calculated Result (Addition): <span class="nr-output-span" id="lbl_${key}_res">${d.result !== undefined && d.result !== null ? d.result : 'N/A'}</span></div>` : ''}
                </div>
            `;
        };

        sectionsHtml += generateTestBlock('Test_A', 'Test A (Addition Math)', [{id:'val1', label:'Value 1'}, {id:'val2', label:'Value 2'}]);
        sectionsHtml += generateTestBlock('Test_B', 'Test B (Addition Math)', [{id:'val1', label:'Value 1'}, {id:'val2', label:'Value 2'}]);
        sectionsHtml += generateTestBlock('Test_C', 'Test C (Addition Math)', [{id:'val1', label:'Value 1'}, {id:'val2', label:'Value 2'}]);
        sectionsHtml += generateTestBlock('Test_D', 'Test D (Addition Math)', [{id:'val1', label:'Value 1'}, {id:'val2', label:'Value 2'}]);
        
        if (s.options.Test_E) {
            const dE = s.data.Test_E || { operator: "", value: "" };
            sectionsHtml += `
                <div class="nr-dock-card border-generic">
                    <div class="nr-card-title-bar">
                        <span>Test E (Single Input)</span>
                        <input type="text" id="dock_Test_E_operator" class="nr-analyst-input" value="${escapeHtml(dE.operator)}" placeholder="Operator" oninput="execRealtimeCalc()">
                    </div>
                    <div style="padding:10px 0;"><label style="font-weight:600; display:block; margin-bottom:5px;">Value</label><input type="number" id="dock_Test_E_value" class="nr-input" value="${dE.value}" oninput="execRealtimeCalc()"></div>
                </div>
            `;
        }

        sectionsHtml += generateTestBlock('Test_F', 'Test F (Addition Math)', [{id:'val1', label:'Value 1'}, {id:'val2', label:'Value 2'}]);

        if (s.options.Attach) {
            const dA = s.data.Attach || { operator: "", checked: false, attachment: null };
            sectionsHtml += `
                <div class="nr-dock-card border-generic">
                    <div class="nr-card-title-bar">
                        <span>File Attachment</span>
                        <input type="text" id="dock_Attach_operator" class="nr-analyst-input" value="${escapeHtml(dA.operator)}" placeholder="Operator" oninput="execRealtimeCalc()">
                    </div>
                    <div style="padding:15px 0; display:flex; align-items:center; gap:20px;">
                        <label class="nr-checkbox-lbl"><input type="checkbox" id="dock_Attach_checked" ${dA.checked ? 'checked' : ''} onchange="execRealtimeCalc()"> Verified</label>
                        <div style="flex:1; display:flex; align-items:center; gap:10px;">
                            <button class="nr-btn-sm nr-btn-secondary" onclick="document.getElementById('psd_file_input').click()">📎 上传 File</button>
                            <input type="file" id="psd_file_input" style="display:none;" onchange="handlePsdUpload(this)">
                            <span id="psd_file_status" style="font-size:14px; color:#6b7280;">${dA.attachment ? escapeHtml(dA.attachment) : '还没添加文件'}</span>
                            ${dA.attachment ? `<button class="nr-btn-trash" onclick="deletePsdAttachment()">🗑</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        if (!sectionsHtml) {
            dock.innerHTML = `<div class="nr-dock-empty-state">⚪ 无选中项目</div>`;
            return;
        }

        dock.innerHTML = `
            <div class="nr-dock-header">
                <div class="nr-dock-actions-top">
                    <button class="nr-btn nr-btn-success" style="flex:1; font-size:18px;" onclick="commitDockParametricChanges()">保存</button>
                    <button class="nr-btn nr-btn-danger" style="padding:12px 18px;" onclick="triggerDeleteSampleCancellation()">删除</button>
                </div>
                <div class="nr-dock-meta-grid">
                    <div><span class="nr-meta-lbl">模板 ID:</span> <strong>${job.templateID}</strong></div>
                    <div><span class="nr-meta-lbl">样品 ID:</span> <strong style="color:#4c1d95;">${s.id}</strong></div>
                    <div><span class="nr-meta-lbl">样品名字:</span> <strong>${escapeHtml(s.name)}</strong></div>
                    <div><span class="nr-meta-lbl">容器编码:</span> <input type="text" id="dock_trayNo_field" class="nr-input" style="padding:5px 8px; font-size:14px; width:120px;" value="${escapeHtml(s.trayNo || '')}" oninput="execRealtimeCalc()"></div>
                </div>
            </div>
            <div class="nr-dock-scrollable-body">
                ${sectionsHtml}
                <div class="nr-dock-card" style="border-left: 5px solid #6d28d9; background: #f9fafb; margin-top: 15px;">
                    <div style="font-weight: 700; font-size: 14px; color: #4c1d95; margin-bottom: 6px;">📋 Sample Line Remark</div>
                    <input type="text" id="dock_sampleComment_field" class="nr-input" 
                           style="padding:8px 12px; font-size:14px; background:#fff; font-style:italic;" 
                           value="${escapeHtml(s.sampleComment || '')}" 
                           placeholder="Type to add or modify..." 
                           oninput="execRealtimeCalc()">
                </div>
            </div>
        `;
    }

    window.execRealtimeCalc = function () {
        if (!currentSelectedSampleRef) return;
        const s = window.limsActiveJobs[currentSelectedSampleRef.jIdx].samples[currentSelectedSampleRef.sIdx];

        s.trayNo = document.getElementById("dock_trayNo_field").value.trim();
        if (document.getElementById("dock_sampleComment_field")) {
            s.sampleComment = document.getElementById("dock_sampleComment_field").value;
        }

        const calcTest = (key) => {
            if (s.options[key]) {
                const op = document.getElementById(`dock_${key}_operator`).value.trim();
                const v1 = parseFloat(document.getElementById(`dock_${key}_val1`).value);
                const v2 = parseFloat(document.getElementById(`dock_${key}_val2`).value);
                let res = null;
                if (op && !isNaN(v1) && !isNaN(v2)) {
                    res = v1 + v2;
                    document.getElementById(`lbl_${key}_res`).innerText = res;
                } else {
                    document.getElementById(`lbl_${key}_res`).innerText = "N/A";
                }
                s.data[key] = { operator: op, val1: isNaN(v1)?'':v1, val2: isNaN(v2)?'':v2, result: res };
            }
        };

        calcTest('Test_A');
        calcTest('Test_B');
        calcTest('Test_C');
        calcTest('Test_D');
        calcTest('Test_F');

        if (s.options.Test_E) {
            const op = document.getElementById("dock_Test_E_operator").value.trim();
            const val = parseFloat(document.getElementById("dock_Test_E_value").value);
            s.data.Test_E = { operator: op, value: isNaN(val) ? "" : val };
        }

        if (s.options.Attach) {
            const op = document.getElementById("dock_Attach_operator").value.trim();
            const checked = document.getElementById("dock_Attach_checked").checked;
            s.data.Attach = s.data.Attach || { attachment: null };
            s.data.Attach.operator = op;
            s.data.Attach.checked = checked;
        }

        renderMatrixView();
        syncNonRoutineToGlobalStorage();
    };

    function syncNonRoutineToGlobalStorage() {
        const allJobs = JSON.parse(localStorage.getItem('limsJobs')) || [];
        if (window.limsActiveJobs) {
            window.limsActiveJobs.forEach(activeJob => {
                const globalIdx = allJobs.findIndex(j => j.jobId === activeJob.jobId);
                if (globalIdx !== -1) {
                    allJobs[globalIdx] = activeJob;
                } else {
                    allJobs.push(activeJob);
                }
            });
        }
        localStorage.setItem('limsJobs', JSON.stringify(allJobs));
    }

    window.commitDockParametricChanges = function () {
        if (!currentSelectedSampleRef) return;
        syncNonRoutineToGlobalStorage();
        alert("✅ Parametric results successfully updated in Local Storage.");
    };

    window.handlePsdUpload = function (inputEl) {
        if (inputEl.files.length > 0 && currentSelectedSampleRef) {
            const file = inputEl.files[0];
            const s = window.limsActiveJobs[currentSelectedSampleRef.jIdx].samples[currentSelectedSampleRef.sIdx];
            s.data.Attach = s.data.Attach || { operator: "", checked: false, attachment: null };
            
            // Mock Local Storage File Upload (Stores pseudo-path)
            s.data.Attach.attachment = "/mock-uploads/" + file.name;
            execRealtimeCalc();
            refreshInputDockPanel();
            alert("File successfully mocked and registered locally!");
        }
    };

    window.deletePsdAttachment = function () {
        if (currentSelectedSampleRef) {
            const s = window.limsActiveJobs[currentSelectedSampleRef.jIdx].samples[currentSelectedSampleRef.sIdx];
            if (s.data.Attach) s.data.Attach.attachment = null;
            execRealtimeCalc();
            refreshInputDockPanel();
        }
    };

    window.triggerDeleteSampleCancellation = function () {
        if (!currentSelectedSampleRef) return;
        const confirmCancel = confirm("Warning: Delete this record permanently from workspace?");
        if (confirmCancel) {
            const job = window.limsActiveJobs[currentSelectedSampleRef.jIdx];
            job.samples.splice(currentSelectedSampleRef.sIdx, 1);
            currentSelectedSampleRef = null;
            syncNonRoutineToGlobalStorage();
            renderMatrixView();
            document.getElementById("nrInputDock").innerHTML = `<div class="nr-dock-empty-state">🗑 记录删除</div>`;
        }
    };

    window.openWindow6_JobDetails = function (jobIdx) {
        const job = window.limsActiveJobs[jobIdx];
        const modalHost = document.getElementById("limsGlobalModalHost");
        if (!modalHost) return;
        modalHost.innerHTML = `
            <div class="nr-modal-layer">
                <div class="nr-modal-win" style="max-width:550px;">
                    <div class="nr-modal-header">编辑</div>
                    <div class="nr-f-group">
                        <label>任务发起人</label>
                        <input type="text" id="w6_reqName" class="nr-input" value="${escapeHtml(job.requesterName || '')}">
                    </div>
                    <div class="nr-f-group" style="margin-top:15px;">
                        <label>联系方式</label>
                        <input type="email" id="w6_email" class="nr-input" value="${escapeHtml(job.email || '')}">
                    </div>
                    <div class="nr-f-group" style="margin-top:15px;">
                        <label>整体任务备注</label>
                        <textarea id="w6_jobComment" class="tmpl-textarea" style="height:100px;">${escapeHtml(job.jobComment || job.overrideComment || '')}</textarea>
                    </div>
                    <div class="nr-modal-footer">
                        <button class="nr-btn nr-btn-success" id="w6_saveBtn">保存</button>
                        <button class="nr-btn nr-btn-secondary" id="w6_closeBtn">取消</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById("w6_closeBtn").onclick = () => modalHost.innerHTML = "";
        document.getElementById("w6_saveBtn").onclick = function () {
            job.requesterName = document.getElementById("w6_reqName").value.trim();
            job.email = document.getElementById("w6_email").value.trim();
            const updatedComment = document.getElementById("w6_jobComment").value;
            job.jobComment = updatedComment;
            job.overrideComment = updatedComment;
            syncNonRoutineToGlobalStorage();
            modalHost.innerHTML = "";
            renderMatrixView();
        };
    };

    window.openWindow7_ConfirmJob = function (jobIdx) {
        const modalHost = document.getElementById("limsGlobalModalHost");
        if (!modalHost) return;

        modalHost.innerHTML = `
        <div class="nr-modal-layer">
            <div class="nr-modal-win" style="max-width:500px; padding:25px; text-align:center;">
                <div style="font-size:45px; margin-bottom:15px;">❓</div>
                <div style="font-size:18px; font-weight:700; color:#1f2937; margin-bottom:25px;">确认所有实验已完成?</div>
                <div style="display:flex; justify-content:center; gap:15px;">
                    <button class="nr-btn nr-btn-success" id="w7_okBtn" style="padding:10px 30px;">确定</button>
                    <button class="nr-btn nr-btn-secondary" id="w7_cancelBtn" style="padding:10px 25px;">取消</button>
                </div>
            </div>
        </div>
        `;
        document.getElementById("w7_cancelBtn").onclick = () => modalHost.innerHTML = "";
        document.getElementById("w7_okBtn").onclick = function () {
            const targetJob = window.limsActiveJobs[jobIdx];
            if (!targetJob) return;

            targetJob.status = "completed";
            targetJob.completedTimeTimestamp = Date.now();

            const allJobs = JSON.parse(localStorage.getItem('limsJobs')) || [];
            const globalIdx = allJobs.findIndex(j => j.jobId === targetJob.jobId);
            if (globalIdx !== -1) {
                allJobs[globalIdx] = targetJob;
            } else {
                allJobs.push(targetJob);
            }
            localStorage.setItem('limsJobs', JSON.stringify(allJobs));

            window.limsActiveJobs.splice(jobIdx, 1);
            currentSelectedSampleRef = null;
            modalHost.innerHTML = "";
            renderMatrixView();
            document.getElementById("nrInputDock").innerHTML = `<div class="nr-dock-empty-state">🎉 任务完成，已转移到主页</div>`;
            alert("任务完成，已存入数据库");
            if (typeof window.refreshDashboardView === 'function') window.refreshDashboardView();
        };
    };

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function injectNonRoutineStyles() {
        const id = "nr-styles-injected";
        if (document.getElementById(id)) return;
        const s = document.createElement("style");
        s.id = id;
        s.innerHTML = `
            .nr-wrapper { display: flex; gap: 25px; height: calc(100vh - 160px); min-height:680px; align-items: stretch; }
            .nr-left-pane { flex: 1; background: #fff; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
            .nr-right-pane { width: 480px; background: #ffffff; border: 1px solid #d1d5db; border-radius: 8px; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.05); padding:20px; box-sizing:border-box;}
            
            .nr-zoom-indicator { background: #f3f4f6; color: #4b5563; padding: 6px 15px; font-size: 13px; font-weight: 600; border-bottom: 1px solid #d1d5db; text-align: left; }
            
            .nr-table-scroll-wrapper { flex:1; overflow: auto; position: relative; background: #f9fafb; }
            .nr-matrix-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size:14px; text-align: center; transition: transform 0.1s ease-out; }
            .nr-matrix-table th { position: sticky; top: 0; background: #f9fafb; z-index: 10; padding: 10px 6px; border-bottom: 1px solid #d1d5db; border-right: 1px solid #e5e7eb; font-weight:700;}
            .nr-matrix-table td { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #f3f4f6; vertical-align: middle; height:36px; max-height:36px; background:#fff;}
            
            .nr-th-tier1 th { font-size:14px; text-transform: uppercase; letter-spacing:0.5px; color:#fff; border-bottom:2px solid #d1d5db;}
            .nr-blank-cap { background: #f9fafb !important; }
            .nr-domain-a { background: linear-gradient(135deg, #4b5563 0%, #374151 100%) !important; }
            .nr-domain-b { background: linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%) !important; }
            .nr-domain-c { background: linear-gradient(135deg, #4b5563 0%, #1f2937 100%) !important; }
            .nr-domain-d { background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%) !important; }
            .nr-domain-e { background: linear-gradient(135deg, #ec4899 0%, #be185d 100%) !important; }
            .nr-domain-f { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%) !important; }
            
            .nr-cell-white { background-color: #ffffff !important; color: #1f2937; }
            .nr-cell-red { background-color: #fca5a5 !important; color: #000000; } 
            .nr-cell-yellow { background-color: #fde047 !important; color: #000000; } 
            .nr-cell-green { background-color: #86efac !important; color: #000000; font-weight: 600; } 
            
            .nr-job-header-row td { background: #e5e7eb !important; border-top: 2px solid #9ca3af; border-bottom: 2px solid #9ca3af; padding: 12px 20px; text-align:left; }
            .nr-row-completed-green td { background: #d1fae5 !important; border-top: 2px solid #34d399 !important; border-bottom: 2px solid #34d399 !important; }
            .nr-job-meta-flex { display: flex; justify-content: space-between; align-items: center; width:100%;}
            .nr-clickable-meta { font-size: 15px; color: #374151; cursor: pointer; flex:1;}
            .nr-clickable-meta:hover { text-decoration: underline; color: var(--primary-color); }
            
            .nr-inline-table-input { border: 1px solid transparent; background: transparent; text-align: center; width: 100%; font-size:14px; padding:4px 0;}
            .nr-inline-table-input:focus { border-color: var(--primary-color); background: #fff; outline: none; border-radius:4px;}
            
            .nr-sample-data-row { cursor: pointer; transition: all 0.15s; }
            .nr-sample-data-row:hover td { background-color: #f3f4f6 !important; }
            .nr-row-selected td { border-top: 2px solid var(--primary-color) !important; border-bottom: 2px solid var(--primary-color) !important; background-color: #ede9fe !important; font-weight:500;}

            .nr-dock-header { border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 15px; }
            .nr-dock-actions-top { display: flex; gap: 10px; margin-bottom: 15px; }
            .nr-dock-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; background: #f9fafb; padding: 12px; border-radius: 6px; border:1px solid #e5e7eb;}
            .nr-meta-lbl { color: #6b7280; font-weight: 500; }
            .nr-dock-scrollable-body { flex: 1; overflow-y: auto; padding-right: 4px; }
            
            .nr-dock-card { background: #ffffff; border-radius: 8px; border: 1px solid #d1d5db; padding: 14px; margin-bottom: 15px; box-shadow:0 2px 5px rgba(0,0,0,0.02); }
            .border-generic { border-left: 5px solid #6b7280; }
            
            .nr-card-title-bar { display: flex; justify-content: space-between; align-items: center; font-weight: 700; color: #1f2937; border-bottom: 1px dashed #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; font-size:15px;}
            .nr-analyst-input { width: 140px; font-size: 13px; padding: 5px 8px; border: 1px solid #d1d5db; border-radius: 4px; }
            
            .nr-dock-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .nr-input-box label { display: block; font-size: 12px; font-weight: 600; color: #4b5563; margin-bottom: 4px;}
            .nr-input-box input { width: 100%; border: 1px solid #d1d5db; border-radius: 4px; padding: 8px; font-size: 14px; box-sizing: border-box; }
            
            .nr-calc-output-row { background: #f9fafb; margin-top: 10px; padding: 8px 12px; border-radius: 4px; font-size: 13px; font-weight: 600; color: #374151; border: 1px solid #f3f4f6;}
            .nr-output-span { color: var(--primary-color); font-size: 14px; font-weight: 700; }
            
            .nr-btn { font-size: 16px; font-weight: 600; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
            .nr-btn:hover { transform: translateY(-1px); }
            .nr-btn-success { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; }
            .nr-btn-danger { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; }
            .nr-btn-secondary { background: #e5e7eb; color: #4b5563; }
            .nr-btn-sm { padding: 6px 12px; font-size: 13px; border-radius: 4px; font-weight:600; }
            .nr-btn-trash { background:none; border:none; color:#ef4444; cursor:pointer; font-size:16px; padding:0 5px;}
            .nr-btn-finalize { background: #ffffff; color: #1f2937; font-weight: 700; border: 1px solid #d1d5db; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
            .nr-btn-finalize:hover { background: #1f2937; color: #fff; border-color:#1f2937; }
            
            .nr-input { font-size: 15px; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; width:100%; box-sizing:border-box;}
            .nr-font-bold { font-weight: 700; }
            .nr-checkbox-lbl { font-size:14px; font-weight:600; display:inline-flex; align-items:center; gap:6px; cursor:pointer;}
            .nr-checkbox-lbl input { width:18px; height:18px; cursor:pointer;}
            
            .nr-no-data-placeholder { padding: 80px 20px !important; color: #9ca3af; font-size: 16px; font-weight: 500; text-align: center; background: #fff !important; }
            .nr-dock-empty-state { text-align: center; color: #9ca3af; font-size: 16px; margin: auto; padding: 40px 20px; font-weight: 500; }
            .nr-no-options-warning { text-align:center; padding:30px; color:#9ca3af; font-size:14px; border:1px dashed #d1d5db; border-radius:6px;}

            .nr-modal-layer { position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(17,24,39,0.5); backdrop-filter: blur(3px); display:flex; align-items:center; justify-content:center; z-index:99999; }
            .nr-modal-win { background: #fff; border-radius: 10px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); width:90%; max-width:550px; padding: 25px; animation: nrModalIn 0.2s ease-out; }
            @keyframes nrModalIn { from{opacity:0; transform:translateY(-10px);} to{opacity:1; transform:translateY(0);} }
            .nr-modal-header { font-size: 20px; font-weight: 700; color: #1f2937; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
            .nr-f-group { display: flex; flex-direction: column; }
            .nr-f-group label { font-weight: 600; font-size: 14px; margin-bottom: 6px; color:#4b5563; }
            .nr-modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding-top: 20px; margin-top: 20px; border-top: 1px solid #e5e7eb; }
            .nr-excel-editable-cell:focus {
                background-color: #ffffff !important;
                color: #000000 !important;
                box-shadow: inset 0 0 0 2px var(--primary-color) !important;
                font-weight: 700;
            }
            .nr-excel-editable-cell {
                transition: background-color 0.1s;
                min-width: 45px;
            }
        `;
        document.head.appendChild(s);
    }
})();