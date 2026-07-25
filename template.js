/**
 * Laboratory Sample Test Management System - Template & Job Management Module
 * Licensed under the MIT License.
 * Co-authored by HGG & Gemini.
 */

(function () {
    let templateCounter = 1;
    let templates = [];
    let jobCounterMap = {};

    injectTemplateStyles();

    function saveTemplatesLocally() {
        localStorage.setItem('mockTemplates', JSON.stringify(templates));
    }

    function loadTemplatesLocally() {
        const stored = localStorage.getItem('mockTemplates');
        if (stored) {
            templates = JSON.parse(stored);
            const ids = templates.map(t => parseInt(t.templateID.replace('T', ''), 10));
            if (ids.length > 0) templateCounter = Math.max(...ids) + 1;
            templates.forEach(t => {
                jobCounterMap[t.templateID] = t.usageCount || (t.isUsed ? 1 : 0);
            });
        }
    }

    window.initLimsTemplateModule = function (containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="tmpl-section">
                <div class="tmpl-search-bar">
                    <div style="display: flex; gap: 12px; flex: 1;">
                        <input type="text" id="tmplSearchInput" class="tmpl-input" style="width: 500px;" placeholder="按任务名称、示例名称或模板 ID 搜索……">
                        <button class="tmpl-btn tmpl-btn-primary" id="tmplSearchBtn">搜索</button>
                    </div>
                    <button class="tmpl-btn tmpl-btn-success" id="tmplCreateBtn">模板建立</button>
                </div>

                <div class="tmpl-sort-row">
                    <label style="font-weight: 600; color:#4b5563;">排序 </label>
                    <select id="tmplSortSelect" class="tmpl-select" style="width: 300px; padding: 6px 12px;">
                        <option value="id_asc" selected>模板 ID（升序）</option>
                        <option value="id_desc">模板 ID（降序）</option>
                        <option value="time_desc">最新更新</option>
                        <option value="time_asc">最后更新</option>
                    </select>
                </div>

                <div class="tmpl-list-box" id="tmplListBox"></div>
            </div>
        `;

        document.getElementById('tmplSearchBtn').onclick = refreshTemplateListView;
        document.getElementById('tmplSearchInput').oninput = refreshTemplateListView;
        document.getElementById('tmplSortSelect').onchange = refreshTemplateListView;
        document.getElementById('tmplCreateBtn').onclick = () => openWindow1_Create();

        loadTemplatesLocally();
        refreshTemplateListView();
    };

    function refreshTemplateListView() {
        const keyword = document.getElementById('tmplSearchInput').value.trim().toLowerCase();
        const sortMode = document.getElementById('tmplSortSelect').value;
        const listBox = document.getElementById('tmplListBox');

        let filteredData = templates.filter(t => {
            if (!keyword) return true;
            const matchID = t.templateID.toLowerCase().includes(keyword);
            const matchTask = t.taskName.toLowerCase().includes(keyword);
            const matchSample = t.samples.some(s => s.sampleName.toLowerCase().includes(keyword));
            return matchID || matchTask || matchSample;
        });

        filteredData.sort((a, b) => {
            if (sortMode === 'id_asc') return a.templateID.localeCompare(b.templateID);
            if (sortMode === 'id_desc') return b.templateID.localeCompare(a.templateID);
            if (sortMode === 'time_desc') return b.updateTime - a.updateTime;
            if (sortMode === 'time_asc') return a.updateTime - b.updateTime;
            return 0;
        });

        if (filteredData.length === 0) {
            listBox.innerHTML = `<div class="tmpl-no-data">No templates found. Click "Template create" to generate your first template.</div>`;
            return;
        }

        listBox.innerHTML = filteredData.map(t => `
            <div class="tmpl-card">
                <div class="tmpl-card-clickable" onclick="openWindow2_Modify('${t.templateID}')">
                    <span class="tmpl-id-badge">${t.templateID}</span>
                    <span class="tmpl-task-name">${escapeHtml(t.taskName)}</span>
                </div>
                <button class="tmpl-btn tmpl-btn-primary tmpl-btn-sm" onclick="openWindow3_CreateJob('${t.templateID}')">创建任务</button>
            </div>
        `).join('');
    }

    function openWindow1_Create() {
        const modalHost = document.getElementById('limsGlobalModalHost');
        const generatedID = 'T' + String(templateCounter).padStart(4, '0');

        modalHost.innerHTML = `
            <div class="tmpl-modal-layer">
                <div class="tmpl-modal-win">
                    <div class="tmpl-modal-header text-success">Create New Template (${generatedID})</div>
                    
                    <div class="tmpl-row-2">
                        <div class="tmpl-f-group">
                            <label>任务名称</label>
                            <input type="text" id="w1_taskName" class="tmpl-input" placeholder="请输入任务名称...">
                        </div>
                        <div class="tmpl-f-group">
                            <label>状态</label>
                            <select id="w1_statusSelect" class="tmpl-select">
                                <option value="active">使用中</option>
                                <option value="inactive">停用</option>
                            </select>
                        </div>
                    </div>

                    <div class="tmpl-f-group">
                        <label>备注</label>
                        <textarea id="w1_commentBox" class="tmpl-textarea" placeholder="输入模板注释..."></textarea>
                    </div>

                    <div class="tmpl-select-all-zone">
                        <strong>Select All Fields:</strong>
                        ${['Test_A','Test_B','Test_C','Test_D','Test_E','Test_F','附件'].map(opt => `
                            <label class="tmpl-checkbox-lbl">
                                <input type="checkbox" class="w1-master-check" data-opt="${opt}"> ${opt}
                            </label>
                        `).join('')}
                    </div>

                    <div style="margin-bottom: 12px;">
                        <button class="tmpl-btn tmpl-btn-secondary tmpl-btn-sm" id="w1_addRowBtn">+ 添加新行</button>
                    </div>

                    <div class="tmpl-table-wrap">
                        <table class="tmpl-table" id="w1_table">
                            <thead>
                                <tr>
                                    <th style="width: 80px;">No.</th>
                                    <th>Sample Name</th>
                                    <th style="width: 650px;">Options</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>

                    <div class="tmpl-modal-footer">
                        <button class="tmpl-btn tmpl-btn-success" id="w1_saveBtn">创建</button>
                        <button class="tmpl-btn tmpl-btn-secondary" id="w1_closeBtn">关闭</button>
                    </div>
                </div>
            </div>
        `;

        const tbody = document.querySelector('#w1_table tbody');
        
        function addW1Row(name = '') {
            const nextNo = tbody.rows.length + 1;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${nextNo}</td>
                <td><input type="text" class="tmpl-input w1-sname" style="width:90%;" value="${escapeHtml(name)}" placeholder="输入样品名称"></td>
                <td>${renderCheckboxesHTML('w1', nextNo)}</td>
            `;
            tbody.appendChild(tr);
        }

        for (let i = 0; i < 5; i++) addW1Row();

        bindMasterCheckLogic('w1-master-check', '#w1_table');

        document.getElementById('w1_addRowBtn').onclick = () => addW1Row();
        document.getElementById('w1_closeBtn').onclick = () => modalHost.innerHTML = '';
        
        document.getElementById('w1_saveBtn').onclick = function () {
            const taskName = document.getElementById('w1_taskName').value.trim();
            if (!taskName) { alert('请输入任务名'); return; }

            let sampleList = [];
            const rows = tbody.querySelectorAll('tr');
            rows.forEach((row, idx) => {
                const sName = row.querySelector('.w1-sname').value.trim();
                if (sName !== '') {
                    sampleList.push({
                        sampleNo: idx + 1,
                        sampleName: sName,
                        options: {
                            Test_A: row.querySelector('.test_a-cb').checked,
                            Test_B: row.querySelector('.test_b-cb').checked,
                            Test_C: row.querySelector('.test_c-cb').checked,
                            Test_D: row.querySelector('.test_d-cb').checked,
                            Test_E: row.querySelector('.test_e-cb').checked,
                            Test_F: row.querySelector('.test_f-cb').checked,
                            Attach: row.querySelector('.attach-cb').checked
                        },
                        hasData: false
                    });
                }
            });

            const statusNode = document.getElementById('w1_statusSelect');
            const commentNode = document.getElementById('w1_commentBox');

            const newTmpl = {
                templateID: generatedID,
                taskName: taskName,
                status: statusNode ? statusNode.value : "active",
                comment: commentNode ? commentNode.value : "",
                overrideComment: null,
                samples: sampleList,
                isUsed: false,
                updateTime: Date.now()
            };

            templates.push(newTmpl);
            templateCounter++;
            saveTemplatesLocally();
            
            modalHost.innerHTML = '';
            refreshTemplateListView();
            alert(`Template ${generatedID} created and stored locally!`);
        };
    }

    window.openWindow2_Modify = function (templateID) {
        const modalHost = document.getElementById('limsGlobalModalHost');
        const t = templates.find(item => item.templateID === templateID);
        if (!t) return;

        let taskNameAttr = '';
        if (t.isUsed) {
            taskNameAttr = 'readonly class="tmpl-input tmpl-lock"';
        } else {
            taskNameAttr = 'class="tmpl-input"';
        }

        modalHost.innerHTML = `
            <div class="tmpl-modal-layer">
                <div class="tmpl-modal-win">
                    <div class="tmpl-modal-header text-primary">编辑模板 (${t.templateID})</div>
                    
                    <div class="tmpl-row-2">
                        <div class="tmpl-f-group">
                            <label>任务名 ${t.isUsed ? '<span style="color:red; font-size:12px;">(Locked - Already Used)</span>' : ''}</label>
                            <input type="text" id="w2_taskName" value="${escapeHtml(t.taskName)}" ${taskNameAttr}>
                        </div>
                        <div class="tmpl-f-group">
                            <label>装填</label>
                            <select id="w2_statusSelect" class="tmpl-select">
                                <option value="active" ${t.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${t.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div class="tmpl-f-group">
                        <label>备注</label>
                        <textarea id="w2_commentBox" class="tmpl-textarea">${escapeHtml(t.comment)}</textarea>
                    </div>

                    <div class="tmpl-select-all-zone">
                        <strong>Select All Fields:</strong>
                        ${['Test_A','Test_B','Test_C','Test_D','Test_E','Test_F','Attach'].map(opt => `
                            <label class="tmpl-checkbox-lbl">
                                <input type="checkbox" class="w2-master-check" data-opt="${opt}"> ${opt}
                            </label>
                        `).join('')}
                    </div>

                    <div style="margin-bottom: 12px;">
                        <button class="tmpl-btn tmpl-btn-secondary tmpl-btn-sm" id="w2_addRowBtn">+ 添加新行</button>
                    </div>

                    <div class="tmpl-table-wrap">
                        <table class="tmpl-table" id="w2_table">
                            <thead>
                                <tr>
                                    <th style="width: 80px;">No.</th>
                                    <th>Sample Name</th>
                                    <th style="width: 650px;">Options</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>

                    <div class="tmpl-modal-footer">
                        <button class="tmpl-btn tmpl-btn-primary" id="w2_updateBtn">更新</button>
                        <button class="tmpl-btn tmpl-btn-secondary" id="w2_closeBtn">关闭</button>
                    </div>
                </div>
            </div>
        `;

        const tbody = document.querySelector('#w2_table tbody');

        t.samples.forEach(s => {
            const nameAttr = s.hasData ? 'readonly class="tmpl-input tmpl-lock"' : 'class="tmpl-input"';
            const lockLabel = s.hasData ? '<span style="color:red; font-size:11px; display:block;">(Locked - Has Active Data)</span>' : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.sampleNo}</td>
                <td>
                    <input type="text" class="tmpl-input w2-sname" style="width:90%;" value="${escapeHtml(s.sampleName)}" ${nameAttr}>
                    ${lockLabel}
                </td>
                <td>${renderCheckboxesHTML('w2', s.sampleNo, s.options)}</td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('w2_addRowBtn').onclick = function() {
            const nextNo = tbody.rows.length + 1;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${nextNo}</td>
                <td><input type="text" class="tmpl-input w2-sname" style="width:90%;" placeholder="输入新的样本名称"></td>
                <td>${renderCheckboxesHTML('w2', nextNo)}</td>
            `;
            tbody.appendChild(tr);
        };

        bindMasterCheckLogic('w2-master-check', '#w2_table');
        document.getElementById('w2_closeBtn').onclick = () => modalHost.innerHTML = '';

        document.getElementById('w2_updateBtn').onclick = function () {
            if (!t.isUsed) {
                t.taskName = document.getElementById('w2_taskName').value.trim();
            }
            t.status = document.getElementById('w2_statusSelect').value;
            t.comment = document.getElementById('w2_commentBox').value;

            let finalSamples = [];
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                const sNo = parseInt(row.cells[0].innerText);
                const sName = row.querySelector('.w2-sname').value.trim();
                
                if (sName !== '') {
                    const originalSample = t.samples.find(os => os.sampleNo === sNo);
                    const originalHasData = originalSample ? originalSample.hasData : false;

                    finalSamples.push({
                        sampleNo: sNo,
                        sampleName: sName,
                        options: {
                            Test_A: row.querySelector('.test_a-cb').checked,
                            Test_B: row.querySelector('.test_b-cb').checked,
                            Test_C: row.querySelector('.test_c-cb').checked,
                            Test_D: row.querySelector('.test_d-cb').checked,
                            Test_E: row.querySelector('.test_e-cb').checked,
                            Test_F: row.querySelector('.test_f-cb').checked,
                            Attach: row.querySelector('.attach-cb').checked
                        },
                        hasData: originalHasData
                    });
                }
            });

            t.samples = finalSamples;
            t.updateTime = Date.now();
            saveTemplatesLocally();

            modalHost.innerHTML = '';
            refreshTemplateListView();
            alert('Template updated and saved locally!');
        };
    };

    window.openWindow3_CreateJob = function (templateID) {
        const modalHost = document.getElementById('limsGlobalModalHost');
        const t = templates.find(item => item.templateID === templateID);
        if (!t) return;

        const taskNameAttr = t.isUsed ? 'readonly class="tmpl-input tmpl-lock"' : 'class="tmpl-input"';
        const currentDateStr = new Date().toISOString().slice(0, 10);
        const commentToLoad = t.overrideComment !== null ? t.overrideComment : t.comment;

        modalHost.innerHTML = `
        <div class="tmpl-modal-layer">
            <div class="tmpl-modal-win" style="max-width: 1250px; border-top: 6px solid var(--primary-color);">
                <div class="tmpl-modal-header text-primary">Create New Task (Derived from: ${t.templateID})</div>
                
                <div class="tmpl-row-2">
                    <div class="tmpl-f-group">
                        <label>任务名字</label>
                        <input type="text" id="j_taskName" value="${escapeHtml(t.taskName)}" ${taskNameAttr}>
                    </div>
                    <div class="tmpl-f-group">
                        <label>状态</label>
                        <select id="j_statusSelect" class="tmpl-select">
                            <option value="Pending" selected>等待检测</option>
                            <option value="Active">已完成</option>
                        </select>
                    </div>
                </div>

                <div class="tmpl-f-group">
                    <label>取样时间</label>
                    <input type="date" id="j_sampleTime" class="tmpl-input" value="${currentDateStr}">
                </div>

                <div class="tmpl-row-2">
                    <div class="tmpl-f-group">
                        <label>任务发起人</label>
                        <input type="text" id="j_reqName" class="tmpl-input" placeholder="请输入实验发起人姓名...">
                    </div>
                    <div class="tmpl-f-group">
                        <label>联系 Email</label>
                        <input type="text" id="j_reqEmail" class="tmpl-input" placeholder="请输入联系方式...">
                    </div>
                </div>

                <div class="tmpl-f-group">
                    <label>注释</label>
                    <textarea id="j_commentBox" class="tmpl-textarea">${escapeHtml(commentToLoad)}</textarea>
                </div>

                <div class="tmpl-select-all-zone">
                    <strong>全选:</strong>
                    ${['Test_A', 'Test_B', 'Test_C', 'Test_D', 'Test_E', 'Test_F', '附件'].map(opt => `
                        <label class="tmpl-checkbox-lbl">
                            <input type="checkbox" class="j-master-check" data-opt="${opt}"> ${opt}
                        </label>
                     `).join('')}
                </div>

                <div class="tmpl-table-wrap">
                    <table class="tmpl-table" id="j_table">
                        <thead>
                            <tr>
                                <th style="width: 70px;">1. No.</th>
                                <th style="width: 240px;">2. Item Name</th>
                                <th style="width: 520px;">3. Test Options</th>
                                <th>4. Remarks</th>
                                <th style="width: 140px;">
                                    <label style="cursor:pointer;"><input type="checkbox" id="j_col5_master" checked> 5. 全选</label>
                                </th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>

                <div class="tmpl-modal-footer" style="margin-top:25px;">
                    <button class="tmpl-btn tmpl-btn-success" id="j_btnCreat" style="padding: 15px 40px;">创建任务</button>
                    <button class="tmpl-btn tmpl-btn-secondary" id="j_btnClose" style="padding: 15px 30px;">关闭</button>
                </div>
            </div>
        </div>
    `;

        const tbody = document.querySelector('#j_table tbody');

        function addJobRow(sObj) {
            const currentNo = tbody.rows.length + 1;
            const tr = document.createElement('tr');

            if (sObj) {
                const nameAttr = sObj.hasData ? 'readonly class="tmpl-input tmpl-lock"' : 'class="tmpl-input"';
                tr.innerHTML = `
                <td>${sObj.sampleNo}</td>
                <td><input type="text" class="tmpl-input j-sname" value="${escapeHtml(sObj.sampleName)}" ${nameAttr}></td>
                <td>${renderCheckboxesHTML('j', sObj.sampleNo, sObj.options)}</td>
                <td><input type="text" class="tmpl-input j-row-comment" placeholder="添加自定义行备注……"></td>
                <td><input type="checkbox" class="j-row-select" checked style="width:20px; height:20px;"></td>
            `;
            }
            tbody.appendChild(tr);
        }

        if (t.samples && t.samples.length > 0) {
            t.samples.forEach(sample => addJobRow(sample));
        }

        bindMasterCheckLogic('j-master-check', '#j_table');

        document.getElementById('j_btnClose').onclick = () => modalHost.innerHTML = '';
        document.getElementById('j_col5_master').onchange = function () {
            tbody.querySelectorAll('.j-row-select').forEach(cb => cb.checked = this.checked);
        };

        const btnCreat = document.getElementById('j_btnCreat');
        btnCreat.onclick = function () {
            const taskName = document.getElementById('j_taskName').value.trim();
            if (!taskName) { alert('请输入任务名'); return; }

            const reqName = document.getElementById('j_reqName').value.trim();
            if (!reqName) { alert('请填写任务发起人姓名。'); return; }

            const currentN = jobCounterMap[t.templateID] || 1;
            t.isUsed = true;
            t.usageCount = currentN;

            let finalJobReport = [];
            const rows = tbody.querySelectorAll('tr');

            // Process Data locally
            const cleanStr = (str) => String(str || "").replace(/[\r\n\t]/g, " ").replace(/"/g, "'");
            const fullTextComment = document.getElementById('j_commentBox') ? document.getElementById('j_commentBox').value : "";
            const fetchedRequesterEmail = document.getElementById('j_reqEmail') ? document.getElementById('j_reqEmail').value.trim() : "";

            const newLimsJob = {
                jobId: 'TASK-' + Date.now(),
                samplingTime: document.getElementById('j_sampleTime').value || new Date().toISOString().split('T')[0],
                taskName: cleanStr(taskName),
                templateID: t.templateID,
                requesterName: cleanStr(reqName),
                email: cleanStr(fetchedRequesterEmail),
                status: 'Pending',
                overrideComment: cleanStr(fullTextComment),
                jobComment: cleanStr(fullTextComment),
                createTime: Date.now(),
                samples: []
            };

            let validSelection = false;
            rows.forEach(row => {
                const isSelected = row.querySelector('.j-row-select').checked;
                const sampleName = row.querySelector('.j-sname').value.trim();
                const sNo = row.cells[0].innerText;

                if (isSelected && sampleName) {
                    validSelection = true;
                    const flags = {
                        Test_A: row.querySelector('.test_a-cb')?.checked || false,
                        Test_B: row.querySelector('.test_b-cb')?.checked || false,
                        Test_C: row.querySelector('.test_c-cb')?.checked || false,
                        Test_D: row.querySelector('.test_d-cb')?.checked || false,
                        Test_E: row.querySelector('.test_e-cb')?.checked || false,
                        Test_F: row.querySelector('.test_f-cb')?.checked || false,
                        Attach: row.querySelector('.attach-cb')?.checked || false
                    };

                    const rowRemark = row.querySelector('.j-row-comment') ? row.querySelector('.j-row-comment').value.trim() : "";

                    newLimsJob.samples.push({
                        id: `${t.templateID}.${sNo}.${currentN}.1`,
                        sampleNo: parseInt(sNo),
                        name: cleanStr(sampleName),
                        sampleName: cleanStr(sampleName),
                        trayNo: "",
                        sampleComment: cleanStr(rowRemark),
                        options: flags,
                        data: {
                            Test_A: { checked: flags.Test_A, operator: "", val1: "", val2: "", result: null },
                            Test_B: { checked: flags.Test_B, operator: "", val1: "", val2: "", result: null },
                            Test_C: { checked: flags.Test_C, operator: "", val1: "", val2: "", result: null },
                            Test_D: { checked: flags.Test_D, operator: "", val1: "", val2: "", result: null },
                            Test_E: { checked: flags.Test_E, operator: "", val1: "", val2: "", result: null },
                            Test_F: { checked: flags.Test_F, operator: "", val1: "", val2: "", result: null },
                            Attach: { checked: flags.Attach, operator: "", fileVerified: false, attachment: null }
                        }
                    });
                }
            });

            if (!validSelection) {
                alert('No items selected! Ensure Column 5 has checked items.');
                return;
            }

            jobCounterMap[t.templateID] = currentN + 1;
            saveTemplatesLocally();

            window.limsJobs.push(newLimsJob);
            localStorage.setItem('limsJobs', JSON.stringify(window.limsJobs));

            modalHost.innerHTML = '';
            alert(`任务创建成功！`);

            if (typeof window.refreshNonRoutineView === 'function') window.refreshNonRoutineView();
            if (typeof window.refreshDashboardView === 'function') window.refreshDashboardView();
        };
    };

    function renderCheckboxesHTML(prefix, rowIdx, defaults = null) {
        const isChecked = (key) => (defaults && defaults[key]) ? 'checked' : '';
        return `
            <div class="tmpl-cb-container">
                <label class="tmpl-cb-badge"><input type="checkbox" class="test_a-cb" ${isChecked('Test_A')}> Test_A</label>
                <label class="tmpl-cb-badge"><input type="checkbox" class="test_b-cb" ${isChecked('Test_B')}> Test_B</label>
                <label class="tmpl-cb-badge"><input type="checkbox" class="test_c-cb" ${isChecked('Test_C')}> Test_C</label>
                <label class="tmpl-cb-badge"><input type="checkbox" class="test_d-cb" ${isChecked('Test_D')}> Test_D</label>
                <label class="tmpl-cb-badge"><input type="checkbox" class="test_e-cb" ${isChecked('Test_E')}> Test_E</label>
                <label class="tmpl-cb-badge"><input type="checkbox" class="test_f-cb" ${isChecked('Test_F')}> Test_F</label>
                <label class="tmpl-cb-badge"><input type="checkbox" class="attach-cb" ${isChecked('Attach')}> 附件</label>
            </div>
        `;
    }

    function bindMasterCheckLogic(masterClass, tableSelector) {
        setTimeout(() => {
            const masterBoxes = document.querySelectorAll('.' + masterClass);
            masterBoxes.forEach(mbox => {
                mbox.onchange = function () {
                    const optKey = this.dataset.opt.toLowerCase();
                    const subRows = document.querySelectorAll(`${tableSelector} tbody tr`);
                    subRows.forEach(row => {
                        const subTarget = row.querySelector(`.${optKey}-cb`);
                        if (subTarget) subTarget.checked = this.checked;
                    });
                };
            });
        }, 50);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function injectTemplateStyles() {
        const id = 'tmpl-injected-styles';
        if (document.getElementById(id)) return;
        const s = document.createElement('style');
        s.id = id;
        s.innerHTML = `
            .tmpl-section { padding: 5px 0; }
            .tmpl-search-bar { display: flex; align-items: center; justify-content: space-between; background: #f3f4f6; padding: 20px; border-radius: 8px; border: 1px solid #d1d5db; margin-bottom: 20px; }
            .tmpl-sort-row { display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-bottom: 20px; }
            
            .tmpl-input, .tmpl-select, .tmpl-textarea { font-size: 16px; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; background: #fff; }
            .tmpl-input:focus, .tmpl-select:focus, .tmpl-textarea:focus { border-color: var(--primary-color); outline: none; box-shadow: 0 0 0 3px rgba(109,40,217,0.2); }
            .tmpl-textarea { height: 85px; width: 100%; resize: vertical; }

            .tmpl-btn { font-size: 16px; font-weight: 600; padding: 12px 26px; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
            .tmpl-btn:hover { transform: translateY(-1px); }
            .tmpl-btn-primary { background: linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%); color: white; }
            .tmpl-btn-success { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; }
            .tmpl-btn-secondary { background: #e5e7eb; color: #374151; }
            .tmpl-btn-sm { padding: 6px 14px; font-size: 14px; border-radius: 4px; }

            .tmpl-list-box { margin-top: 15px; }
            .tmpl-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px 25px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s; }
            .tmpl-card:hover { border-color: var(--primary-color); box-shadow: 0 4px 15px rgba(109,40,217,0.1); background: #f9fafb; }
            .tmpl-card-clickable { display: flex; align-items: center; gap: 25px; cursor: pointer; flex: 1; }
            
            .tmpl-id-badge { background: #ede9fe; color: #4c1d95; font-weight: 700; padding: 6px 14px; border-radius: 20px; border: 1px solid #c4b5fd; font-size: 15px; }
            .tmpl-task-name { font-size: 18px; font-weight: 600; color: #1f2937; }
            .tmpl-no-data { text-align: center; color: #9ca3af; padding: 50px; font-size: 16px; border: 2px dashed #d1d5db; border-radius: 8px; background: #fff; }

            .tmpl-modal-layer { position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(17,24,39,0.6); backdrop-filter: blur(4px); display:flex; align-items:center; justify-content:center; z-index:9999; }
            .tmpl-modal-win { background: #fff; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); width:90%; max-width:1150px; max-height: 88vh; overflow-y:auto; padding: 30px; animation: tmplIn 0.25s ease-out; }
            @keyframes tmplIn { from{opacity:0; transform:translateY(-15px);} to{opacity:1; transform:translateY(0);} }
            
            .tmpl-modal-header { font-size: 22px; font-weight: 700; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
            .text-success { color: #059669; } .text-primary { color: #6d28d9; }
            
            .tmpl-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .tmpl-f-group { display: flex; flex-direction: column; margin-bottom: 15px; }
            .tmpl-f-group label { font-weight: 600; margin-bottom: 6px; color:#4b5563; }
            
            .tmpl-select-all-zone { background: #f3f4f6; border: 1px solid #d1d5db; padding: 12px 20px; border-radius: 6px; margin: 15px 0; display:flex; align-items:center; gap:15px; flex-wrap:wrap; }
            .tmpl-checkbox-lbl { display:inline-flex; align-items:center; gap:5px; font-weight:500; cursor:pointer; }
            .tmpl-checkbox-lbl input { width:18px; height:18px; cursor:pointer; }

            .tmpl-table-wrap { max-height: 380px; overflow-y:auto; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 15px; }
            .tmpl-table { width: 100%; border-collapse: collapse; }
            .tmpl-table th { background: #e5e7eb; color: #1f2937; font-weight:700; padding:12px; border-bottom: 2px solid #d1d5db; position: sticky; top:0; z-index:5; text-align:center;}
            .tmpl-table td { padding: 10px; border-bottom:1px solid #e5e7eb; text-align:center; vertical-align:middle; }
            .tmpl-table tr:hover { background: #f9fafb; }
            
            .tmpl-cb-container { display: flex; flex-wrap:wrap; gap:8px; justify-content:center; }
            .tmpl-cb-badge { background:#f3f4f6; padding:4px 8px; border-radius:4px; border:1px solid #d1d5db; font-size:14px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;}
            
            .tmpl-lock { background-color: #f3f4f6 !important; color: #9ca3af !important; cursor: not-allowed !important; }
            .tmpl-modal-footer { display: flex; justify-content: flex-end; gap: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
        `;
        document.head.appendChild(s);
    }
})();