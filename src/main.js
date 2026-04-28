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

function toggleRow(row) {
    row.classList.toggle('selected');
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
    if(!drawing) return;
    if(e.cancelable) e.preventDefault();
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

window.calculateAge = calculateAge;
window.calculateOpDuration = calculateOpDuration;
window.toggleRow = toggleRow;
window.previewImage = previewImage;
window.setMode = setMode;
window.clearCanvas = clearCanvas;
window.confirmReset = confirmReset;

window.onload = () => {
    canvas = document.getElementById('schemaCanvas');
    ctx = canvas.getContext('2d');
    initCanvas();
    document.getElementById('patientName').addEventListener('input', e => {
        document.getElementById('syncName').innerText = "患者氏名: " + e.target.value;
    });

    // ボタンイベントリスナー
    document.getElementById('drawBtn').addEventListener('click', () => setMode('draw'));
    document.getElementById('eraseBtn').addEventListener('click', () => setMode('erase'));
    document.getElementById('clearBtn').addEventListener('click', () => clearCanvas());
};

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', () => drawing = false);
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', () => drawing = false);
