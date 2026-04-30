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

function updateConditionalFields() {
    document.getElementById('skinDonorK013Wrapper').classList.toggle('hidden', !isK013Selected());
    document.getElementById('skinDonorK0132Wrapper').classList.toggle('hidden', !isK0132Selected());
    document.getElementById('boneDonorWrapper').classList.toggle('hidden', !isK059Selected());
    document.getElementById('flapDonorWrapper').classList.toggle('hidden', !isK016orK017orK020Selected());
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

    // --- 疾患名（NCD）の動的行復元ロジック ---
    const container = document.getElementById('diseaseContainer');
    if (container) {
        container.innerHTML = ''; // 既存の行をクリア
        diseaseRowCount = 0; // カウンタをリセット

        // 保存されたデータの中から "disease_X_L1" の形式を探し、最大の X を特定する
        let maxRow = 0;
        Object.keys(data).forEach(key => {
            const match = key.match(/^disease_(\d+)_L1$/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxRow) maxRow = num;
            }
        });

        // 最大行数分、入力欄を生成する
        for (let i = 1; i <= maxRow; i++) {
            addDiseaseRow();
        }
        // もしデータが一つもなければ、デフォルトで1行追加
        if (maxRow === 0) addDiseaseRow();
    }

    Object.keys(data).forEach(key => {
        const el = document.getElementById(key);
        if (!el) return;

        if (el.type === 'checkbox' || el.type === 'radio') {
            // チェック状態を復元 (data[key] には true/false が入っている想定)
            el.checked = !!data[key];
        } else if (el.tagName === 'SELECT') {
            // 連動プルダウンの場合は、値をセットした後に手動でchangeイベントを発火させる
            // 疾患名(disease_X_LX)と、部位(site)、顔面骨(facialBone)に対応
            el.value = data[key];

            if (key.startsWith('disease_')) {
                const parts = key.split('_'); // ["disease", "1", "L1"]
                const rowId = parts[1];
                const level = parseInt(parts[2].replace('L', ''));
                if (level < 5) syncDisease(rowId, level); // 次の階層を生成
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

let diseaseRowCount = 0;

// 1. 新しい疾患名行を追加する関数
function addDiseaseRow() {
    diseaseRowCount++;
    const rowId = diseaseRowCount;

    const rowHtml = `
                <div id="diseaseRow_${rowId}" class="p-3 bg-slate-50 rounded border border-slate-200 relative group">
                    <button type="button" onclick="removeDiseaseRow(${rowId})" class="no-print absolute -right-2 -top-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="space-y-2">
                        <div class="grid grid-cols-3 gap-2">
                            <select id="disease_${rowId}_L1" class="border border-slate-200 rounded p-2 text-[11px] w-full bg-white" onchange="syncDisease(${rowId}, 1)"></select>
                            <select id="disease_${rowId}_L2" class="border border-slate-200 rounded p-2 text-[11px] w-full bg-white" onchange="syncDisease(${rowId}, 2)" disabled></select>
                            <select id="disease_${rowId}_L3" class="border border-slate-200 rounded p-2 text-[11px] w-full bg-white" onchange="syncDisease(${rowId}, 3)" disabled></select>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <select id="disease_${rowId}_L4" class="border border-slate-200 rounded p-2 text-[11px] w-full bg-white" onchange="syncDisease(${rowId}, 4)" disabled></select>
                            <select id="disease_${rowId}_L5" class="border border-slate-200 rounded p-2 text-[11px] w-full bg-white" disabled></select>
                        </div>
                    </div>
                </div>
            `;

    document.getElementById('diseaseContainer').insertAdjacentHTML('beforeend', rowHtml);

    // 最初のレベルの選択肢を投入
    renderSelectOptions(`disease_${rowId}_L1`, diseaseMaster);
}

// 2. 行を削除する関数
function removeDiseaseRow(id) {
    const row = document.getElementById(`diseaseRow_${id}`);
    if (document.querySelectorAll('[id^="diseaseRow_"]').length > 1) {
        row.remove();
    } else {
        alert("少なくとも1つの疾患名が必要です。");
    }
}

// 3. 疾患名専用の連動処理（ここが肝心です）
function syncDisease(rowId, level) {
    const prefix = `disease_${rowId}_L`;
    const parentPath = [];

    // 現在のレベルまでの選択値を取得
    for (let i = 1; i <= level; i++) {
        const val = document.getElementById(`${prefix}${i}`).value;
        if (val) parentPath.push(val);
    }

    // 次のレベルの選択肢を探す
    const parentItem = findItemByPath(diseaseMaster, parentPath);
    let nextOptions = parentItem && parentItem.children ? parentItem.children : [];

    // 空の階層（childrenはあるがvalueが空）をスキップ
    while (nextOptions.length === 1 && nextOptions[0].value === "" && nextOptions[0].children) {
        nextOptions = nextOptions[0].children;
    }

    // 次のレベルを描画
    if (level < 5) {
        renderSelectOptions(`${prefix}${level + 1}`, nextOptions);

        // それ以降のレベルをリセット
        for (let i = level + 2; i <= 5; i++) {
            const el = document.getElementById(`${prefix}${i}`);
            if (el) {
                el.innerHTML = '';
                el.disabled = true;
            }
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