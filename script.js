// ===== Вкладки и резюме разработчиков =====
const themeToggle = document.getElementById('themeToggle');
const themeStateText = document.getElementById('themeStateText');
let savedColorMode = 'light';
try {
    savedColorMode = localStorage.getItem('color-mode') === 'dark' ? 'dark' : 'light';
} catch {}

function applyColorMode(mode) {
    const isDark = mode === 'dark';
    document.body.dataset.colorMode = isDark ? 'dark' : 'light';
    if (themeToggle) {
        themeToggle.setAttribute('aria-checked', String(isDark));
    }
    if (themeStateText) {
        themeStateText.textContent = isDark ? 'dark' : 'light';
    }
    try {
        localStorage.setItem('color-mode', document.body.dataset.colorMode);
    } catch {}
}

applyColorMode(savedColorMode);
themeToggle.addEventListener('click', () => {
    const nextMode = document.body.dataset.colorMode === 'dark' ? 'light' : 'dark';
    applyColorMode(nextMode);
});

const tabButtons = Array.from(document.querySelectorAll('[role="tab"]'));
const tabPanels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
const profileName = document.getElementById('profileName');
const profileRole = document.getElementById('profileRole');

function updateProfileHeader(targetId) {
    const activePanel = document.getElementById(targetId);
    if (!activePanel) return;

    const theme = activePanel.dataset.theme || 'frontend';
    document.body.dataset.theme = theme;
    const isTasksPanel = targetId.startsWith('task-');
    document.body.classList.toggle('tasks-active', isTasksPanel);

    if (isTasksPanel) return;

    profileName.textContent = activePanel.dataset.name;
    profileRole.textContent = activePanel.dataset.role;
}

// ===== Задание 1: объединённые задачи =====
const taskElement = document.getElementById('task-element');
const greetingButton = document.getElementById('greetingButton');
const newElementButton = document.getElementById('newElementButton');
const newDiv = document.createElement('div');
newDiv.className = 'new-div';
newDiv.textContent = 'Мен жаңа элементпін';

greetingButton.addEventListener('click', () => {
    const isGreeting = taskElement.textContent === 'Сәлем, әлем!';
    taskElement.textContent = isGreeting ? 'Бастапқы мәтін' : 'Сәлем, әлем!';
    greetingButton.textContent = isGreeting ? 'Мәтінді өзгерту' : 'Бастапқы мәтінді қайтару';
});

newElementButton.addEventListener('click', () => {
    if (newDiv.isConnected) {
        newDiv.remove();
        newElementButton.textContent = 'Элементті қосу';
    } else {
        document.body.appendChild(newDiv);
        newElementButton.textContent = 'Элементті алып тастау';
    }
});

// ===== Задание 2: объединённые задачи =====
const toggleParagraph = document.getElementById('toggleParagraph');
const classTarget = document.getElementById('classTarget');
const classToggleButton = document.getElementById('classToggleButton');
const classListOutput = document.getElementById('classListOutput');
const rowsInput = document.getElementById('rowsInput');
const colsInput = document.getElementById('colsInput');
const createTableBtn = document.getElementById('createTableBtn');
const dynamicTable = document.getElementById('dynamicTable');
const selectedCellsInfo = document.getElementById('selectedCellsInfo');
const colorInput = document.getElementById('colorInput');
const addColorBtn = document.getElementById('addColorBtn');
const selectedPalette = document.getElementById('selectedPalette');
const selectedColorsInfo = document.getElementById('selectedColorsInfo');
const selectedColorSet = new Set();

function toggleParagraphStyle() {
    const isChanged = toggleParagraph.classList.toggle('changed');
    toggleParagraph.setAttribute('aria-pressed', String(isChanged));
}

toggleParagraph.addEventListener('click', toggleParagraphStyle);
toggleParagraph.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleParagraphStyle();
});

function showElementClasses() {
    const classes = Array.from(classTarget.classList);
    console.log('Элемент кластары:', classes);
    classListOutput.textContent = `Элемент кластары: ${classes.join(', ')}`;
}

classToggleButton.addEventListener('click', () => {
    const isActive = classTarget.classList.toggle('active');
    classToggleButton.textContent = isActive ? 'active класын жою' : 'active класын қосу';
    showElementClasses();
});

showElementClasses();

function normalizeColorValue(colorValue) {
    if (!colorValue) return '';

    const value = colorValue.toLowerCase().trim();
    if (value.startsWith('#')) return value;

    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return '';

    const [, r, g, b] = match;
    return `#${[r, g, b].map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
}

function renderSelectedColors() {
    const uniqueColors = Array.from(selectedColorSet);

    if (!uniqueColors.length) {
        selectedPalette.innerHTML = '';
        selectedColorsInfo.textContent = 'Таңдалған түстер: жоқ';
        return;
    }

    selectedPalette.innerHTML = uniqueColors.map((color) => `
        <span class="color-swatch" style="--swatch-color: ${color};">${color}</span>
    `).join('');
    selectedColorsInfo.textContent = `Таңдалған түстер: ${uniqueColors.join(', ')}`;
}

function buildTable() {
    const rows = Math.max(1, Number(rowsInput.value) || 1);
    const cols = Math.max(1, Number(colsInput.value) || 1);

    dynamicTable.innerHTML = '';

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
        const row = document.createElement('tr');

        for (let colIndex = 0; colIndex < cols; colIndex += 1) {
            const cell = document.createElement('td');
            cell.textContent = '';
            cell.style.backgroundColor = '';
            cell.addEventListener('click', () => {
                const selectedColor = colorInput.value.toLowerCase();
                const currentColor = normalizeColorValue(cell.style.backgroundColor);

                if (currentColor === selectedColor) {
                    cell.style.backgroundColor = '';
                } else {
                    cell.style.backgroundColor = selectedColor;
                    selectedColorSet.add(selectedColor);
                }

                updateSelectedCellsInfo();
                renderSelectedColors();
            });
            row.appendChild(cell);
        }

        dynamicTable.appendChild(row);
    }

    updateSelectedCellsInfo();
    renderSelectedColors();
}

function updateSelectedCellsInfo() {
    const selectedCells = dynamicTable.querySelectorAll('td').length
        ? Array.from(dynamicTable.querySelectorAll('td')).filter((cell) => Boolean(cell.style.backgroundColor)).length
        : 0;
    selectedCellsInfo.textContent = `Таңдалған ұяшықтар: ${selectedCells}`;
}

function addSelectedColor() {
    const selectedColor = colorInput.value.toLowerCase();
    selectedColorSet.add(selectedColor);
    renderSelectedColors();
}

createTableBtn.addEventListener('click', buildTable);
addColorBtn.addEventListener('click', addSelectedColor);

buildTable();

// ===== Переключение вкладок мышью и клавиатурой =====
function activateTab(selectedButton, moveFocus = false) {
    const targetId = selectedButton.dataset.target;

    for (const button of tabButtons) {
        const isSelected = button === selectedButton;
        button.classList.toggle('active', isSelected);
        button.setAttribute('aria-selected', String(isSelected));
        button.tabIndex = isSelected ? 0 : -1;
    }

    for (const panel of tabPanels) {
        const isSelected = panel.id === targetId;
        panel.classList.toggle('active', isSelected);
        panel.hidden = !isSelected;
    }

    updateProfileHeader(targetId);
    if (moveFocus) selectedButton.focus();
}

for (const button of tabButtons) {
    button.addEventListener('click', () => activateTab(button));
    button.addEventListener('keydown', (event) => {
        const currentIndex = tabButtons.indexOf(button);
        let nextIndex = currentIndex;

        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabButtons.length;
        if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabButtons.length - 1;
        if (nextIndex === currentIndex) return;

        event.preventDefault();
        activateTab(tabButtons[nextIndex], true);
    });
}

activateTab(tabButtons[0]);
