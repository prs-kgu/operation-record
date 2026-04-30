let canvas;
let ctx;
let drawing = false;
let mode = 'draw';

function calculateAge() {
    const birth = document.getElementById('birthDate').value;
    const op = document.getElementById('opDate').value;
    if (!birth || !op) return;

    const bDate = new Date(birth);
    const oDate = new Date(op);
    let age = oDate.getFullYear() - bDate.getFullYear();
    if (oDate.getMonth() < bDate.getMonth() || (oDate.getMonth() === bDate.getMonth() && oDate.getDate() < bDate.getDate())) {
        age--;
    }
    document.getElementById('ageResult').value = age >= 0 ? age : 0;
}

function calculateOpDuration() {
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;
    if (!start || !end) return;

    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let diffMinutes = (eH * 60 + eM) - (sH * 60 + sM);
    if (diffMinutes < 0) diffMinutes += 1440;
    document.getElementById('durationResult').value = diffMinutes;
}

const selectChainConfig = { disease: 5, site: 3, facialBone: 2 };

function findItemByValue(items, value) {
    for (const item of items) {
        if (item.value === value) return item;
        if (item.children) {
            const found = findItemByValue(item.children, value);
            if (found) return found;
        }
    }
    return null;
}

function findItemByPath(items, path) {
    let currentItems = items;
    let current = null;
    for (const value of path) {
        current = currentItems.find(item => item.value === value);
        if (!current) return null;
        currentItems = current.children || [];
    }
    return current;
}

function getSelectedValues(group, level) {
    const select = document.getElementById(`${group}Level${level}`);
    if (select.multiple) {
        return Array.from(select.selectedOptions).map(opt => opt.value);
    } else {
        return select.value ? [select.value] : [];
    }
}

function normalizeForSkip(items, level, maxLevel) {
    let current = items;
    let currentLevel = level;

    while (currentLevel < maxLevel && current.length === 1 && current[0].value === '' && Array.isArray(current[0].children)) {
        current = current[0].children;
        currentLevel += 1;
    }

    // 最後のレベルでも、空の値のアイテムがあればスキップ（ただし currentLevel は進めない）
    if (currentLevel === maxLevel && current.length === 1 && current[0].value === '' && Array.isArray(current[0].children)) {
        current = current[0].children;
    }

    return { items: current, level: currentLevel };
}

const fixedSiteLevel3 = ['左', '中', '両(側)', '正中'];
const fixedFacialBoneLevel1 = ['前頭骨', '鼻骨', '鼻軟骨', '篩骨', '眼窩縁', '眼窩下壁', '眼窩内側壁', '眼窩上壁', '頬骨体部', '頬骨弓部', 'ルフォーⅠ型上顎骨', 'ルフォーⅡ型上顎骨', 'ルフォーⅢ型上顎骨', '上顎骨（ルフォー型以外）', '上顎歯槽骨', '口蓋骨', '下顎体部', '下顎枝部（角部含む）', '下顎関節突起部', '下顎歯槽骨', '歯牙'];
const fixedFacialBoneLevel2 = ['左', '中', '両(側)', '正中'];

function populateDependentSelect(group, level) {
    const root = linkedData[group];
    let items = [];

    if (group === 'facialBone') {
        if (level === 1) {
            items = fixedFacialBoneLevel1.map(v => ({ value: v, label: v }));
        } else if (level === 2) {
            items = fixedFacialBoneLevel2.map(v => ({ value: v, label: v }));
        }
    } else if (level === 3 && group === 'site') {
        items = fixedSiteLevel3.map(v => ({ value: v, label: v }));
    } else {
        if (level === 1) {
            items = root;
        } else {
            const parentPath = [];
            for (let i = 1; i < level; i++) {
                const selectEl = document.getElementById(`${group}Level${i}`);
                if (selectEl && selectEl.value) {
                    parentPath.push(selectEl.value);
                }
            }
            const parent = findItemByPath(root, parentPath);
            items = parent && parent.children ? parent.children : [];
        }
    }

    // 空の階層をスキップし、次に表示すべき有効なデータセットを探す
    let currentItems = items;
    let currentLevel = level;

    // 子要素が1つだけで、かつその値が空文字の場合のみスキップする
    while (currentItems.length === 1 && currentItems[0].value === "" && currentItems[0].children) {
        currentItems = currentItems[0].children;
    }

    const select = document.getElementById(`${group}Level${currentLevel}`);
    if (!select) return;

    select.innerHTML = '';

    if (currentItems.length > 0) {
        select.disabled = false;
        // 初期選択肢として「選択してください」を追加（任意）
        const placeholder = document.createElement('option');
        placeholder.value = "";
        placeholder.textContent = "-- 選択 --";
        select.appendChild(placeholder);

        currentItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.label;
            select.appendChild(option);
        });
    } else {
        select.disabled = true;
    }

    // 以降のレベルをクリア
    for (let next = currentLevel + 1; next <= selectChainConfig[group]; next++) {
        const nextSelect = document.getElementById(`${group}Level${next}`);
        if (nextSelect) {
            nextSelect.innerHTML = '';
            nextSelect.disabled = true;
        }
    }
}

function onDependentSelectChange(group, level) {
    if (group !== 'facialBone' && level < selectChainConfig[group]) {
        populateDependentSelect(group, level + 1);
    }
    updateConditionalFields();
}

function initLinkedSelects() {
    // populateDependentSelect('disease', 1);
    addDiseaseRow();
    populateDependentSelect('site', 1);
    populateDependentSelect('site', 3);
    populateDependentSelect('facialBone', 1);
    populateDependentSelect('facialBone', 2);
}

function getSelectedKRowCodes() {
    return Array.from(document.querySelectorAll('.points-table tr.selected'))
        .map(row => row.dataset.kcode)
        .filter(Boolean);
}

function matchesKCodeInput(patterns) {
    const value = document.getElementById('kCodeInput')?.value.trim().toUpperCase();
    return patterns.some(pattern => value === pattern.toUpperCase());
}

function isK013Selected() {
    const codes = getSelectedKRowCodes();
    return codes.includes('K013') || matchesKCodeInput(['K013-(1)', 'K013-(2)', 'K013-(3)', 'K013-(4)']);
}

function isK0132Selected() {
    const codes = getSelectedKRowCodes();
    return codes.includes('K013-2') || matchesKCodeInput(['K013-2-(1)', 'K013-2-(2)', 'K013-2-(3)', 'K013-2-(4)']);
}

function isK059Selected() {
    return matchesKCodeInput(['K059-(1)']);
}

function isK016orK017orK020Selected() {
    const codes = getSelectedKRowCodes();
    return codes.includes('K016') || matchesKCodeInput(['K017-(1)', 'K017-(2)', 'K020']);
}

// 「移植片の生着」を表示すべきか判定する関数
function isGraftTakeNeeded() {
    // 1. Kコード入力欄のチェック（カンマ区切り対応）
    const inputVal = document.getElementById('kCodeInput')?.value.trim().toUpperCase() || "";
    const inputCodes = inputVal.split(',').map(s => s.trim());
    const hasInputMatch = inputCodes.some(code => graftTakeTargetCodes.includes(code));

    // 2. 選択済み行のチェック（data-kcode属性との比較）
    const selectedRowCodes = getSelectedKRowCodes();
    const hasRowMatch = selectedRowCodes.some(code => {
        // K013 など、枝番号がない状態で定義されているものへの前方一致や完全一致の考慮
        return graftTakeTargetCodes.some(target => target.startsWith(code));
    });

    return hasInputMatch || hasRowMatch;
}

// 「熱傷の予後」を表示すべきか判定する関数
function isBurnOutcomeNeeded() {
    // 疾患名の最終レベル（L4）の値を取得
    const d4 = document.getElementById('diseaseLevel4')?.value;
    return burnOutcomeTargetDiseases.includes(d4);
}

function updateConditionalFields() {
    document.getElementById('skinDonorK013Wrapper').classList.toggle('hidden', !isK013Selected());
    document.getElementById('skinDonorK0132Wrapper').classList.toggle('hidden', !isK0132Selected());
    document.getElementById('boneDonorWrapper').classList.toggle('hidden', !isK059Selected());
    document.getElementById('flapDonorWrapper').classList.toggle('hidden', !isK016orK017orK020Selected());
    document.getElementById('graftTakeWrapper').classList.toggle('hidden', !isGraftTakeNeeded());
    document.getElementById('burnOutcomeWrapper').classList.toggle('hidden', !isBurnOutcomeNeeded());
}

function toggleRow(row) {
    row.classList.toggle('selected');
    updateConditionalFields();
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const parent = input.parentElement;
            parent.innerHTML = `<img src="${e.target.result}" class="h-full w-full object-contain rounded">`;
            parent.onclick = () => input.click();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function initCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.globalCompositeOperation = 'source-over';
}

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left,
        y: (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top
    };
}

function startDrawing(e) {
    drawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
    if (!drawing) return;
    if (e.cancelable) e.preventDefault();
    const pos = getPos(e);
    ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
    ctx.lineWidth = mode === 'erase' ? 20 : 2;
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
}

function setMode(m) {
    mode = m;
}

// フォーム内の全入力値をオブジェクトにまとめる関数
function getFormData() {
    const data = {};
    // すべての入力要素を id ベースで取得
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (!el.id) return; // idがないものはスキップされるので注意

        if (el.type === 'checkbox' || el.type === 'radio') {
            data[el.id] = el.checked;
        } else {
            data[el.id] = el.value;
        }
    });

    // 点数表の選択状態を「ID」で保存
    // selectedクラスがついている tr の id を集める
    data.selectedKRowIds = Array.from(document.querySelectorAll('.points-table tr.selected'))
        .map(tr => tr.id)
        .filter(id => id);

    data.canvas = canvas.toDataURL();
    return data;
}

// ファイルとして保存 (JSON形式)
function saveToFile() {
    const data = JSON.stringify(getFormData());
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().substring(0, 10);
    const name = document.getElementById('patientName').value || 'SurgicalReport';

    a.href = url;
    a.download = `${date}_${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ファイルから読み込み
function loadFromFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        applyFormData(data);
    };
    reader.readAsText(file);
}

// データを画面に反映させる関数
function applyFormData(data) {
    if (!data) return;

    // --- 疾患部位（NCD）の動的行復元ロジック ---
    const sContainer = document.getElementById('siteContainer');
    if (sContainer) {
        sContainer.innerHTML = '';
        siteRowCount = 0;
        let maxSiteRow = 0;
        Object.keys(data).forEach(key => {
            const match = key.match(/^site_(\d+)_L1$/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxSiteRow) maxSiteRow = num;
            }
        });
        for (let i = 1; i <= maxSiteRow; i++) {
            addSiteRow();
        }
        if (maxSiteRow === 0) addSiteRow();
    }

    Object.keys(data).forEach(key => {
        const el = document.getElementById(key);
        if (!el) return;

        if (el.type === 'checkbox' || el.type === 'radio') {
            // チェック状態を復元 (data[key] には true/false が入っている想定)
            el.checked = !!data[key];
        } else if (el.tagName === 'SELECT') {
            // 連動プルダウンの場合は、値をセットした後に手動でchangeイベントを発火させる
            el.value = data[key];

            if (key.startsWith('site_')) { // 部位用の同期を追加
                const parts = key.split('_');
                const rowId = parts[1];
                const level = parseInt(parts[2].replace('L', ''));
                if (level < 3) syncSite(rowId, level);
            } else if (key.startsWith('site') || key.startsWith('facialBone')) {
                // 既存の連動プルダウン用（必要に応じて既存の関数を呼び出し）
                el.dispatchEvent(new Event('change'));
            }
        } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            // テキスト、日付、選択肢を復元
            el.value = data[key];
        }
    });

    // 点数表の選択状態を復元
    if (data.selectedKRowIds) {
        // 一旦全ての選択を解除
        document.querySelectorAll('.points-table tr').forEach(tr => tr.classList.remove('selected'));

        // 保存されていたIDの要素を探して selected を付与
        data.selectedKRowIds.forEach(id => {
            const row = document.getElementById(id);
            if (row) {
                row.classList.add('selected');
            }
        });
    }

    // シェーマの復元
    if (data.canvas) {
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = data.canvas;
    }

    // 計算処理の再実行
    calculateAge();
    calculateOpDuration();
    updateConditionalFields();

    // 最後にID表示を一括更新
    if (data.patientId) {
        const idDisplays = document.querySelectorAll('.sync-id-display');
        idDisplays.forEach(el => {
            el.innerText = data.patientId;
        });
    }

    alert('データを読み込みました。連動プルダウン等は必要に応じて再選択してください。');
}

// 印刷ボタン
function saveAndPrint() {
    saveToFile();

    // 保存処理によるブラウザの挙動と干渉しないように念のため0.5秒待機
    setTimeout(() => {
        window.print();
    }, 500);
}

let siteRowCount = 0; // 追加

// initLinkedSelects 関数を以下のように書き換え
function initLinkedSelects() {
    populateDependentSelect('disease', 1); // 疾患名を固定で初期化
    addSiteRow(); // 初期状態で1行追加
    populateDependentSelect('facialBone', 1);
    populateDependentSelect('facialBone', 2);
}

// 疾患部位の行を追加
function addSiteRow() {
    siteRowCount++;
    const rowId = siteRowCount;

    const rowHtml = `
        <div id="siteRow_${rowId}" class="p-3 bg-slate-50 rounded border border-slate-200 relative group">
            <button type="button" onclick="removeSiteRow(${rowId})" class="no-print absolute -right-2 -top-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                <i class="fas fa-times"></i>
            </button>
            <div class="grid grid-cols-3 gap-2">
                <select id="site_${rowId}_L1" class="border border-slate-200 rounded p-2 text-sm bg-white" onchange="syncSite(${rowId}, 1)"></select>
                <select id="site_${rowId}_L2" class="border border-slate-200 rounded p-2 text-sm bg-white" onchange="syncSite(${rowId}, 2)" disabled></select>
                <select id="site_${rowId}_L3" class="border border-slate-200 rounded p-2 text-sm bg-white" disabled></select>
            </div>
        </div>
    `;

    document.getElementById('siteContainer').insertAdjacentHTML('beforeend', rowHtml);
    renderSelectOptions(`site_${rowId}_L1`, linkedData.site);
}

// 疾患部位の行を削除
function removeSiteRow(id) {
    if (document.querySelectorAll('[id^="siteRow_"]').length > 1) {
        document.getElementById(`siteRow_${id}`).remove();
    } else {
        alert("少なくとも1つの疾患部位が必要です。");
    }
}

// 疾患部位の連動処理
function syncSite(rowId, level) {
    const prefix = `site_${rowId}_L`;
    
    if (level === 2) {
        // Level 3 は固定値（左, 中, 両側...）
        const nextSelect = document.getElementById(`${prefix}3`);
        renderSelectOptions(`${prefix}3`, fixedSiteLevel3.map(v => ({ value: v, label: v })));
        return;
    }

    const parentPath = [];
    for (let i = 1; i <= level; i++) {
        const val = document.getElementById(`${prefix}${i}`).value;
        if (val) parentPath.push(val);
    }

    const parentItem = findItemByPath(linkedData.site, parentPath);
    let nextOptions = parentItem && parentItem.children ? parentItem.children : [];

    if (level < 3) {
        renderSelectOptions(`${prefix}${level + 1}`, nextOptions);
        // Level 1 を変えたら Level 3 は一旦リセット
        if (level === 1) {
            const l3 = document.getElementById(`${prefix}3`);
            l3.innerHTML = '';
            l3.disabled = true;
        }
    }
}

// 4. セレクトボックス描画の共通化
function renderSelectOptions(elementId, items) {
    const select = document.getElementById(elementId);
    if (!select) return;

    select.innerHTML = '<option value="">-- 選択 --</option>';
    if (items && items.length > 0) {
        select.disabled = false;
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.value;
            opt.textContent = item.label;
            select.appendChild(opt);
        });
    } else {
        select.disabled = true;
    }
}

function clearCanvas() {
    if (confirm('シェーマをリセットしますか？')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function confirmReset() {
    if (confirm('すべての入力をリセットしますか？')) {
        window.location.reload();
    }
}

window.onload = () => {
    canvas = document.getElementById('schemaCanvas');
    ctx = canvas.getContext('2d');
    initCanvas();
    initLinkedSelects();
    updateConditionalFields();

    // ID同期のリスナー
    const patientIdInput = document.getElementById('patientId');
    if (patientIdInput) {
        patientIdInput.addEventListener('input', e => {
            const idDisplays = document.querySelectorAll('.sync-id-display');
            idDisplays.forEach(el => {
                el.innerText = e.target.value;
            });
        });
    }

    document.getElementById('patientName').addEventListener('input', e => {
        document.getElementById('syncName').innerText = "患者氏名: " + e.target.value;
    });
    document.getElementById('kCodeInput').addEventListener('input', updateConditionalFields);

    // ボタンイベントリスナー
    document.getElementById('drawBtn').addEventListener('click', () => setMode('draw'));
    document.getElementById('eraseBtn').addEventListener('click', () => setMode('erase'));
    document.getElementById('clearBtn').addEventListener('click', () => clearCanvas());

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', () => drawing = false);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', () => drawing = false);
};