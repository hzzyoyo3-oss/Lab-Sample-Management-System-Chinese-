/**
 * Laboratory Sample Test Management System - Dashboard Module
 * Licensed under the MIT License.
 * Co-authored by HGG & Gemini.
 */

(function () {
    let draggedItemIdx = null;
    let activeWindow3JobRef = null;

    injectDashboardStyles();

    window.initLimsDashboardModule = function (containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="db-wrapper">
                <div class="db-section-box">
                    <div class="db-section-title">⭐ 完成还没确认（点击查看结果）</div>
                    <div class="db-list-container" id="dbFinalApprovalList"></div>
                </div>

                <div class="db-section-box" style="flex: 1.2;">
                    <div class="db-section-title">⏳ 等待处理（拖拽改变实验紧急度）</div>
                    <div class="db-list-container" id="dbPendingExecutionList"></div>
                </div>
            </div>
        `;

        renderDashboardLists();
    };

    function renderDashboardLists() {
        const allJobs = JSON.parse(localStorage.getItem('limsJobs')) || [];
        window.limsJobs = allJobs;

        const pendingJobs = allJobs.filter(job => job.status.toLowerCase() === "pending");
        const approvalJobs = allJobs.filter(job => job.status.toLowerCase() === "completed");

        const finalApprovalList = document.getElementById("dbFinalApprovalList");
        if (finalApprovalList) {
            if (approvalJobs.length === 0) {
                finalApprovalList.innerHTML = `<div class="db-empty-tip">没有任务正在等待最终审核批准。</div>`;
            } else {
                finalApprovalList.innerHTML = approvalJobs.map((job) => {
                    let completedTimeDisplayStr = "";
                    if (job.completedTimeTimestamp) {
                        const cDate = new Date(job.completedTimeTimestamp);
                        completedTimeDisplayStr = ` | 🏁 完成日期: ${cDate.toISOString().split('T')[0]}`;
                    }
                    return `
                        <div class="db-job-card card-approval" onclick='window.showDashboardJobResultModal(${JSON.stringify(job).replace(/'/g, "&apos;").replace(/"/g, "&quot;")})'>
                            📋 <strong>${escapeHtml(job.requesterName || 'N/A')}</strong> | ${escapeHtml(job.taskName)} | 📅 日期: ${job.samplingTime} ${completedTimeDisplayStr}
                        </div>
                    `;
                }).join('');
            }
        }

        const pendingList = document.getElementById("dbPendingExecutionList");
        if (pendingList) {
            if (pendingJobs.length === 0) {
                pendingList.innerHTML = `<div class="db-empty-tip">没有正在等待处理的实验</div>`;
            } else {
                pendingList.innerHTML = pendingJobs.map((job, idx) => `
                    <div class="db-job-card card-pending" draggable="true" 
                         ondragstart="window.handleDbDragStart(event, ${idx})"
                         ondragover="window.handleDbDragOver(event)"
                         ondrop="window.handleDbDrop(event, ${idx})"
                         onclick="window.openWindow3_DetailsById('${job.jobId}')">
                        ⣿ ⏳ <strong>${escapeHtml(job.requesterName || 'N/A')}</strong> | ${escapeHtml(job.taskName)} | 📅 日期: ${job.samplingTime}
                    </div>
                `).join('');
            }
        }
    }

    window.handleDbDragStart = function(e, idx) { draggedItemIdx = idx; };
    window.handleDbDragOver = function(e) { e.preventDefault(); };
    window.handleDbDrop = function(e, targetIdx) {
        e.preventDefault();
        if (draggedItemIdx === null || draggedItemIdx === targetIdx) return;

        const allJobs = window.limsJobs || [];
        const pendingIndexes = allJobs.map((job, i) => job.status.toLowerCase() === "pending" ? i : -1).filter(i => i !== -1);
        const fromIndex = pendingIndexes[draggedItemIdx];
        const toIndex = pendingIndexes[targetIdx];

        if (fromIndex !== undefined && toIndex !== undefined) {
            const movedItem = allJobs.splice(fromIndex, 1)[0];
            allJobs.splice(toIndex, 0, movedItem);
            localStorage.setItem('limsJobs', JSON.stringify(allJobs));
            renderDashboardLists();
            if (typeof window.refreshNonRoutineView === 'function') window.refreshNonRoutineView();
        }
    };

    window.openWindow3_DetailsById = function (jobId) {
        const allJobs = window.limsJobs || [];
        activeWindow3JobRef = allJobs.find(j => j.jobId === jobId);
        if (!activeWindow3JobRef) return;
        window.currentActiveWindow3JobId = jobId;
        window.currentActiveWindow9JobId = null;

        const job = activeWindow3JobRef;
        const modalHost = document.getElementById("limsGlobalModalHost");
        if (!modalHost) return;

        const isPendingJob = (job.status.toLowerCase() === "pending");

        let tableRowsHtml = (job.samples || []).map((sample, sIdx) => {
            const d = sample.data || {};
            
            const renderCellColorHTML = (fieldKey, formattedText) => {
                if (!sample.options || !sample.options[fieldKey]) {
                    return `<td style="background:#ffffff !important; color:#000;"></td>`;
                }
                if (formattedText === null || formattedText === undefined || formattedText === "") {
                    return `<td class="clickable-cell" style="background:#fee2e2 !important; color:#dc2626; font-weight:700;">N/A</td>`;
                }
                const clickAttr = !isPendingJob ? `onclick="window.openWindow8_ModifyCell(${sIdx}, '${fieldKey}')"` : '';
                return `<td class="clickable-cell" style="background:#d1fae5 !important; color:#059669; font-weight:700; cursor:cell;" ${clickAttr}>${formattedText}</td>`;
            };

            const linkHtml = d.Attach?.attachment ? `<a href="${d.Attach.attachment}" target="_blank" download class="db-btn-sm" style="background:#e0e7ff; color:#6d28d9; text-decoration:none;">📎 下载</a>` : 'None';
            const currentSelectionText = sample.retestTargetSelection || "";

            return `
                <tr>
                    <td>${sIdx + 1}</td>
                    <td style="font-weight:700; color:#4c1d95;">${sample.id}</td>
                    <td>${escapeHtml(sample.name || sample.sampleName)}</td>
                    ${renderCellColorHTML('Test_A', d.Test_A?.result)}
                    ${renderCellColorHTML('Test_B', d.Test_B?.result)}
                    ${renderCellColorHTML('Test_C', d.Test_C?.result)}
                    ${renderCellColorHTML('Test_D', d.Test_D?.result)}
                    ${renderCellColorHTML('Test_E', d.Test_E?.value)}
                    ${renderCellColorHTML('Test_F', d.Test_F?.result)}
                    <td>${linkHtml}</td>
                    <td class="select-blank-cell" onclick="window.openWindow5_SelectItems(${sIdx})">
                        ${currentSelectionText ? `<span style="color:#6d28d9; background:#ede9fe; padding:2px 6px; border-radius:4px; font-weight:700;">➕ ${currentSelectionText}</span>` : 'Select'}
                    </td>
                    <td>
                        <input type="text" class="db-each-sample-comment-input db-input" 
                               style="padding:3px 6px; font-size:13px; font-style:italic;" 
                               data-sidx="${sIdx}" value="${escapeHtml(sample.sampleComment || '')}">
                    </td>
                </tr>
            `;
        }).join('');

        modalHost.innerHTML = `
            <div class="db-modal-mask"><div class="db-modal-win border-w3" style="width: 95%; max-width: 1250px;">
                <div class="w3-header-grid">
                    <div>📋 模板: <strong style="color:var(--primary-color);">${job.templateID || 'T0001'}</strong></div>
                    <div>任务名: <input type="text" id="w3_taskName" class="db-input" value="${escapeHtml(job.taskName)}"></div>
                    <div style="text-align:right; display:flex; gap:8px; justify-content:flex-end;">
                        <button class="db-btn" style="padding:4px 10px; font-size:11px; background:#059669; color:#fff;" onclick="window.downloadWindow3_Pending_Summary_CSV()">📥 报告</button>
                    </div>
                </div>
                <div class="w3-meta-grid">
                    <div>Owner Name: <input type="text" id="w3_reqName" class="db-input" value="${escapeHtml(job.requesterName)}"></div>
                    <div>Owner Email: <input type="text" id="w3_email" class="db-input" value="${escapeHtml(job.email || '')}"></div>
                    <div>Task Date: <input type="date" id="w3_sTime" class="db-input" value="${job.samplingTime}"></div>
                </div>

                <div class="tmpl-f-group" style="margin-top:10px;">
                    <label style="font-weight:700; font-size:13px; color:#4b5563;">Task Global Comment</label>
                    <textarea id="w3_bigJobComment" class="db-input" style="height:55px; font-family:inherit; padding:8px;">${escapeHtml(job.jobComment || job.overrideComment || '')}</textarea>
                </div>

                <div class="w3-table-wrapper" style="margin-top:10px;">
                    <table class="w3-data-table">
                        <thead>
                            <tr>
                                <th>Seq</th><th>Sample ID</th><th>Sample Name</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th><th>File</th><th>Add</th><th>Comment</th>
                            </tr>
                        </thead>
                        <tbody>${tableRowsHtml}</tbody>
                    </table>
                </div>

                <div class="db-modal-actions" style="justify-content: flex-end; margin-top:15px; gap:12px;">
                    <button class="db-btn db-btn-success" style="padding:10px 22px; background:var(--primary-color); ${!isPendingJob ? 'display:none;' : ''}" onclick="window.commitWindow3_UpdateInfo()">💾 更新并追加实验</button>
                    <button class="db-btn db-btn-success" style="${isPendingJob ? 'display:none;' : ''}" onclick="window.commitWindow3_Confirm()">确认并归档</button>
                    <button class="db-btn db-btn-retest" style="${isPendingJob ? 'display:none;' : ''}" onclick="window.commitWindow3_Retest()">🔄 发起重测</button>
                    <button class="db-btn db-btn-secondary" style="padding:10px 25px;" onclick="document.getElementById('limsGlobalModalHost').innerHTML=''">Close</button>
                </div>
            </div></div>`;
    };

    window.downloadWindow3_Pending_Summary_CSV = function () {
        if (!activeWindow3JobRef) return;
        const job = activeWindow3JobRef;
        let csvContent = "\uFEFF";
        csvContent += `Task Name,${job.taskName},Job ID,${job.jobId}\n\n`;
        csvContent += "Seq,Sample ID,Sample Name,Test_A,Test_B,Test_C,Test_D,Test_E,Test_F\n";
        job.samples.forEach((s, idx) => {
            const d = s.data || {};
            const val = (key) => (s.options?.[key] ? (d[key]?.result ?? d[key]?.value ?? "REQ") : "-");
            const row = [idx + 1, s.id, s.name, val('Test_A'), val('Test_B'), val('Test_C'), val('Test_D'), val('Test_E'), val('Test_F')].join(",");
            csvContent += row + "\n";
        });
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `Report_${job.jobId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    window.commitWindow3_UpdateInfo = function () {
        if (!activeWindow3JobRef) return;
        const job = activeWindow3JobRef;

        job.taskName = document.getElementById("w3_taskName").value.trim();
        job.requesterName = document.getElementById("w3_reqName").value.trim();
        job.email = document.getElementById("w3_email").value.trim();
        job.samplingTime = document.getElementById("w3_sTime").value;

        const txt = document.getElementById("w3_bigJobComment").value;
        job.jobComment = txt; job.overrideComment = txt;

        document.querySelectorAll(".db-each-sample-comment-input").forEach(input => {
            const sIdx = parseInt(input.dataset.sidx);
            if (job.samples[sIdx]) job.samples[sIdx].sampleComment = input.value.trim();
        });

        let appendCounter = 0;
        job.samples.forEach(s => {
            if (s.retestTargetSelection && s.retestTargetSelection.trim() !== "") {
                const itemsToAppend = s.retestTargetSelection.split(',').map(i => i.trim());
                itemsToAppend.forEach(verifiedKey => {
                    if (!s.options[verifiedKey]) {
                        s.options[verifiedKey] = true;
                        if (verifiedKey === 'Attach') {
                            s.data[verifiedKey] = { operator: "", checked: false, attachment: null };
                        } else if (verifiedKey === 'Test_E') {
                            s.data[verifiedKey] = { operator: "", value: "" };
                        } else {
                            s.data[verifiedKey] = { operator: "", val1: "", val2: "", result: null };
                        }
                        appendCounter++;
                    }
                });
                s.retestTargetSelection = "";
            }
        });

        localStorage.setItem('limsJobs', JSON.stringify(window.limsJobs));
        if (typeof window.refreshNonRoutineView === 'function') window.refreshNonRoutineView();
        
        let msg = "💾 编辑已保存!";
        if (appendCounter > 0) msg += `\n➕ Injected ${appendCounter} parameters.`;
        alert(msg);
        
        document.getElementById("limsGlobalModalHost").innerHTML = "";
        renderDashboardLists();
    };

    window.openWindow8_ModifyCell = function (sampleIdx, fieldKey) {
        if (!activeWindow3JobRef) return;
        const sample = activeWindow3JobRef.samples[sampleIdx];
        let currentRawVal = sample.data[fieldKey]?.result || sample.data[fieldKey]?.value || "";

        const subModal = document.createElement("div");
        subModal.className = "db-sub-modal-layer";
        subModal.innerHTML = `
            <div class="db-modal-win border-w8" style="width:340px;">
                <div class="db-modal-title">✏️ Caution: Manual Override</div>
                <div class="w8-form">
                    <label>Target Value:</label>
                    <input type="number" id="w8_new_val" class="db-input" value="${currentRawVal}" step="0.01">
                    <label style="margin-top:10px;">Operator Name:</label>
                    <input type="text" id="w8_operator" class="db-input" placeholder="Cannot be blank">
                </div>
                <div class="db-modal-actions" style="margin-top:15px;">
                    <button class="db-btn db-btn-success" id="w8_save">Confirm Changes</button>
                    <button class="db-btn db-btn-secondary" id="w8_cancel">Abort</button>
                </div>
            </div>`;
        document.body.appendChild(subModal);

        document.getElementById("w8_save").onclick = function() {
            const newVal = parseFloat(document.getElementById("w8_new_val").value);
            const opName = document.getElementById("w8_operator").value.trim();
            if (!opName || isNaN(newVal)) { alert("Invalid input."); return; }

            sample.data[fieldKey] = sample.data[fieldKey] || {};
            sample.data[fieldKey].operator = opName;
            if (fieldKey === 'Test_E') {
                sample.data[fieldKey].value = newVal;
            } else {
                sample.data[fieldKey].result = newVal;
            }

            localStorage.setItem('limsJobs', JSON.stringify(window.limsJobs));
            subModal.remove();
            window.refreshWindow3View();
            renderDashboardLists();
        };
        document.getElementById("w8_cancel").onclick = function () { subModal.remove(); };
    };

    window.openWindow5_SelectItems = function (sampleIdx) {
        const currentJob = activeWindow9JobRef || activeWindow3JobRef;
        if (!currentJob || !currentJob.samples[sampleIdx]) return;
        const sample = currentJob.samples[sampleIdx];
        const isRetestMode = (currentJob.status.toLowerCase() === "completed");

        const subModal = document.createElement("div");
        subModal.className = "db-sub-modal-layer";
        
        const renderCheckRow = (key, label) => {
            if (!isRetestMode && sample.options?.[key] === true) return "";
            return `<label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:4px 0; font-size:14px; font-weight:600;">
                        <input type="checkbox" class="w5-core-opt-box" value="${key}" style="width:16px; height:16px;"> ${label}
                    </label>`;
        };

        const listContentHtml = `
            ${renderCheckRow('Test_A', 'Test_A')}
            ${renderCheckRow('Test_B', 'Test_B')}
            ${renderCheckRow('Test_C', 'Test_C')}
            ${renderCheckRow('Test_D', 'Test_D')}
            ${renderCheckRow('Test_E', 'Test_E')}
            ${renderCheckRow('Test_F', 'Test_F')}
            ${renderCheckRow('Attach', 'Attach')}
        `.trim();

        if (!isRetestMode && listContentHtml === "") {
            alert("测试已被请求");
            return;
        }

        subModal.innerHTML = `
            <div class="db-modal-win border-w5" style="width:280px; text-align:left; padding:18px;">
                <div class="db-modal-title">🔲 Select Test Item</div>
                <div style="display:flex; flex-direction:column; gap:6px; padding:12px 0;">${listContentHtml}</div>
                <div class="db-modal-actions" style="margin-top:10px;">
                    <button class="db-btn db-btn-success" id="w5_confirm_btn">Confirm</button>
                    <button class="db-btn db-btn-secondary" id="w5_close_btn">Close</button>
                </div>
            </div>`;
        document.body.appendChild(subModal);

        document.getElementById("w5_confirm_btn").onclick = function () {
            const checkedBoxes = subModal.querySelectorAll(".w5-core-opt-box");
            let selectedArr = [];
            checkedBoxes.forEach(cb => { if (cb.checked) selectedArr.push(cb.value); });
            sample.retestTargetSelection = selectedArr.join(', ');
            subModal.remove();
            if (typeof window.refreshWindow3View === 'function') window.refreshWindow3View();
        };
        document.getElementById("w5_close_btn").onclick = function () { subModal.remove(); };
    };

    window.commitWindow3_Confirm = function () {
        if (!activeWindow3JobRef) return;
        const job = activeWindow3JobRef;
        job.status = "archived";
        localStorage.setItem('limsJobs', JSON.stringify(window.limsJobs));

        let histDb = JSON.parse(localStorage.getItem('limsHistoryDatabase')) || [];
        histDb.push(job);
        localStorage.setItem('limsHistoryDatabase', JSON.stringify(histDb));

        document.getElementById("limsGlobalModalHost").innerHTML = "";
        alert("🎉 任务已归档");
        renderDashboardLists();
    };

    window.commitWindow3_Retest = function () {
        const job = activeWindow3JobRef;
        if (!job) return;
        const retestSamples = job.samples.filter(s => s.retestTargetSelection && s.retestTargetSelection.trim() !== "");
        if (retestSamples.length === 0) { alert("⚠️ 没有选中任何测试!"); return; }

        const newRetestSamplesArray = retestSamples.map(s => {
            const optionsShell = { Test_A:false, Test_B:false, Test_C:false, Test_D:false, Test_E:false, Test_F:false, Attach:false };
            const lowerSelection = s.retestTargetSelection.toLowerCase();
            if (lowerSelection.includes("test_a")) optionsShell.Test_A = true;
            if (lowerSelection.includes("test_b")) optionsShell.Test_B = true;
            if (lowerSelection.includes("test_c")) optionsShell.Test_C = true;
            if (lowerSelection.includes("test_d")) optionsShell.Test_D = true;
            if (lowerSelection.includes("test_e")) optionsShell.Test_E = true;
            if (lowerSelection.includes("test_f")) optionsShell.Test_F = true;
            if (lowerSelection.includes("attach")) optionsShell.Attach = true;

            return {
                id: `${s.id}-R`,
                name: `${s.name} (R)`,
                sampleNo: s.sampleNo,
                options: optionsShell,
                sampleComment: "",
                data: {}
            };
        });

        const spawnedJob = {
            jobId: 'TASK-' + Date.now(),
            samplingTime: new Date().toISOString().split('T')[0],
            taskName: `Retest: ${job.taskName}`,
            templateID: job.templateID,
            requesterName: job.requesterName,
            email: job.email,
            status: "Pending",
            samples: newRetestSamplesArray
        };

        job.samples.forEach(s => s.retestTargetSelection = "");
        window.limsJobs.push(spawnedJob);
        localStorage.setItem('limsJobs', JSON.stringify(window.limsJobs));

        document.getElementById("limsGlobalModalHost").innerHTML = "";
        alert(`🔄 生成成功！数据输入区新增了重新测试任务。`);
        renderDashboardLists();
        if (typeof window.refreshNonRoutineView === 'function') window.refreshNonRoutineView();
    };

    function escapeHtml(str) { return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : ''; }

    window.refreshDashboardPendingList = function () { renderDashboardLists(); };
    window.refreshDashboardView = window.refreshDashboardPendingList;

    window.showDashboardJobResultModal = function (job) {
        if (job) window.openWindow9_ApprovalDetailsById(job.jobId);
    };

    let activeWindow9JobRef = null;

    window.openWindow9_ApprovalDetailsById = function (jobId) {
        const allJobs = window.limsJobs || [];
        activeWindow9JobRef = allJobs.find(j => j.jobId === jobId);
        if (!activeWindow9JobRef) return;
        window.currentActiveWindow3JobId = jobId;
        window.currentActiveWindow9JobId = jobId;
        const job = activeWindow9JobRef;

        let tableRowsHtml = (job.samples || []).map((sample, sIdx) => {
            const d = sample.data || {};
            const getDisplay = (key, subField = 'result') => {
                if (!sample.options || !sample.options[key]) return `<td></td>`;
                const val = d[key]?.[subField] ?? d[key]?.value;
                if (key === 'Attach' && d.Attach?.checked) return `<td style="color:#059669; font-weight:bold;">✓ Verified</td>`;
                if (val !== undefined && val !== "") return `<td style="color:#059669; font-weight:bold;">${val}</td>`;
                return `<td style="color:#dc2626; font-weight:bold;">REQ</td>`;
            };

            const linkHtml = d.Attach?.attachment ? `<a href="${d.Attach.attachment}" target="_blank" download class="db-btn-sm" style="background:#e0e7ff; color:#6d28d9; text-decoration:none;">📎 下载</a>` : 'None';
            const currentSelectionText = sample.retestTargetSelection || "";

            return `
                <tr>
                    <td>${sIdx + 1}</td>
                    <td style="font-weight:700; color:#4c1d95;">${sample.id}</td>
                    <td>${escapeHtml(sample.name || sample.sampleName)}</td>
                    ${getDisplay('Test_A')}
                    ${getDisplay('Test_B')}
                    ${getDisplay('Test_C')}
                    ${getDisplay('Test_D')}
                    ${getDisplay('Test_E', 'value')}
                    ${getDisplay('Test_F')}
                    <td>${linkHtml}</td>
                    <td class="select-blank-cell" onclick="window.openWindow5_SelectItems(${sIdx})">
                        ${currentSelectionText ? `<span style="color:#b45309; font-weight:700;">🔁 ${currentSelectionText}</span>` : 'Select'}
                    </td>
                </tr>
            `;
        }).join('');

        const modalHost = document.getElementById("limsGlobalModalHost");
        modalHost.innerHTML = `
            <div class="db-modal-mask"><div class="db-modal-win border-w3" style="width: 95%; max-width: 1250px; border-top:5px solid #059669;">
                <div class="w3-header-grid" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color:white;">
                    <div>📋 模板: <strong>${job.templateID || 'T0001'}</strong></div>
                    <div style="text-align:center; font-size:15px;">🕵️‍♂️ 最终确认</div>
                    <div></div>
                </div>
                <div class="w3-table-wrapper" style="margin-top:10px;">
                    <table class="w3-data-table">
                        <thead>
                            <tr>
                                <th>Seq</th><th>Sample ID</th><th>Sample Name</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th><th>File</th><th style="color:#92400e;">Retest</th>
                            </tr>
                        </thead>
                        <tbody>${tableRowsHtml}</tbody>
                    </table>
                </div>
                <div class="db-modal-actions" style="justify-content: flex-end; margin-top:15px; gap:12px;">
                    <button class="db-btn db-btn-success" style="padding:10px 24px;" onclick="window.commitWindow9_FinalArchive()">确认并归档</button>
                    <button class="db-btn db-btn-retest" style="padding:10px 24px;" onclick="window.commitWindow3_Retest()">🔄 发起重测</button>
                    <button class="db-btn db-btn-secondary" style="padding:10px 25px;" onclick="document.getElementById('limsGlobalModalHost').innerHTML=''">Close</button>
                </div>
            </div></div>`;
    };

    window.refreshWindow3View = function () {
        const modalHost = document.getElementById("limsGlobalModalHost");
        if (activeWindow9JobRef && document.getElementById("w9_taskName")) {
            window.openWindow9_ApprovalDetailsById(activeWindow9JobRef.jobId);
        } else if (window.currentActiveWindow3JobId) {
            window.openWindow3_DetailsById(window.currentActiveWindow3JobId);
        }
    };

    window.commitWindow9_FinalArchive = function () {
        if (!activeWindow9JobRef) return;
        const job = activeWindow9JobRef;
        job.status = "archived";

        localStorage.setItem('limsJobs', JSON.stringify(window.limsJobs));
        let histDb = JSON.parse(localStorage.getItem('limsHistoryDatabase')) || [];
        histDb.push(job);
        localStorage.setItem('limsHistoryDatabase', JSON.stringify(histDb));

        document.getElementById("limsGlobalModalHost").innerHTML = "";
        alert("🎉 任务完成已存入历史数据");
        renderDashboardLists();
    };

    function injectDashboardStyles() {
        const id = "db-styles-injected"; if (document.getElementById(id)) return;
        const s = document.createElement("style"); s.id = id;
        s.innerHTML = `
            .db-wrapper { display: flex; flex-direction: column; gap: 20px; height: calc(100vh - 160px); }
            .db-section-box { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px; display: flex; flex-direction: column; overflow: hidden;}
            .db-section-title { font-weight: 700; font-size: 16px; color: #1f2937; margin-bottom: 10px; display:flex; align-items:center; gap:6px;}
            .db-list-container { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; background: #f9fafb; padding: 8px; border-radius: 6px; border:1px dashed #d1d5db;}
            .db-job-card { padding: 14px 18px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; user-select: none;}
            .card-approval { background: #f0fdf4; border-left: 5px solid #059669; border-top:1px solid #d1fae5; border-bottom:1px solid #d1fae5; color: #065f46; }
            .card-approval:hover { background: #d1fae5; }
            .card-pending { background: #fff; border-left: 5px solid var(--primary-color); border-top:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb; color: #374151; }
            .card-pending:hover { background: #f3f4f6; }
            .db-empty-tip { text-align: center; color: #9ca3af; font-size: 14px; padding: 25px 0; }
            .db-modal-mask { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(17,24,39,0.5); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; z-index:999; }
            .db-sub-modal-layer { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; z-index:1000; }
            .db-modal-win { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); display:flex; flex-direction:column; gap:12px; max-height:92vh; overflow-y:auto; }
            .border-w3 { border-top: 5px solid var(--primary-color); } .border-w5 { border-top: 5px solid #10b981; } .border-w8 { border-top: 5px solid #f97316; }
            .db-modal-title { font-weight: 700; font-size: 16px; color: #1f2937; margin-bottom: 5px; }
            .db-modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
            .db-btn { font-weight: 700; padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; font-size: 14px; }
            .db-btn-success { background: #10b981; color: white; }
            .db-btn-retest { background: #f59e0b; color: white; }
            .db-btn-secondary { background: #e5e7eb; color: #4b5563; }
            .db-btn-sm { padding: 4px 10px; font-size: 12px; border-radius: 4px; font-weight: 700; cursor:pointer;}
            .w3-header-grid { display: grid; grid-template-columns: 1fr 1.5fr 1fr; gap:15px; font-weight:700; background:#f3f4f6; padding:12px; border-radius:6px; align-items:center;}
            .w3-meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap:12px; font-size:14px; font-weight:600;}
            .db-input { width:100%; border:1px solid #d1d5db; border-radius:4px; padding:6px; font-size:14px; box-sizing:border-box; margin-top:2px;}
            .w3-table-wrapper { max-height: 380px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 6px; margin-top: 5px; }
            .w3-data-table { width: 100%; border-collapse: collapse; font-size:13px; text-align:center; }
            .w3-data-table th { background: #f9fafb; padding: 10px 4px; border-bottom: 2px solid #d1d5db; position:sticky; top:0; z-index:9; }
            .w3-data-table td { padding: 8px 4px; border-bottom: 1px solid #e5e7eb; height:30px;}
            .clickable-cell:hover { filter: brightness(0.95); text-decoration: underline;}
            .select-blank-cell { background: #fdf2f8; color: #9d174d; cursor: pointer; font-weight:600; border: 1px dashed #fbcfe8;}
            .select-blank-cell:hover { background: #fce7f3; }
            .w8-form label { display:block; font-size:13px; font-weight:700; color:#4b5563; margin-top:6px;}
        `;
        document.head.appendChild(s);
    }
})();