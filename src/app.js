import { addTodo, deleteTodo, getTodos, updateTodo } from './todosApi.js';

const todoForm = document.querySelector('#todoForm');
const todoTitleInput = document.querySelector('#todoTitle');
const userIdInput = document.querySelector('#userId');
const formError = document.querySelector('#formError');
const totalCount = document.querySelector('#totalCount');
const completedCount = document.querySelector('#completedCount');
const searchInput = document.querySelector('#searchInput');
const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
const visibleCount = document.querySelector('#visibleCount');
const listState = document.querySelector('#listState');
const actionError = document.querySelector('#actionError');
const todoList = document.querySelector('#todoList');

let todos = [];
let currentFilter = 'all';
let searchText = '';
let editingTodoId = null;
let nextLocalId = -1;

function getValidFormValues(titleInput, userInput) {
    const title = titleInput.value.trim();
    const userId = Number(userInput.value);

    if (!title) {
        return { error: 'Введите название задачи.' };
    }

    if (!Number.isInteger(userId) || userId <= 0) {
        return { error: 'ID пользователя должен быть положительным целым числом.' };
    }

    return { title, userId };
}

function updateSummary() {
    totalCount.textContent = String(todos.length);
    completedCount.textContent = String(todos.filter((todo) => todo.completed).length);
}

function showState(title, message, actionLabel, action) {
    listState.replaceChildren();
    listState.hidden = false;
    todoList.hidden = true;

    if (title) {
        const heading = document.createElement('strong');
        heading.className = 'state-title';
        heading.textContent = title;
        listState.append(heading);
    }

    if (message) {
        const description = document.createElement('p');
        description.textContent = message;
        listState.append(description);
    }

    if (actionLabel && action) {
        const button = document.createElement('button');
        button.className = 'button button-secondary';
        button.type = 'button';
        button.textContent = actionLabel;
        button.addEventListener('click', action, { once: true });
        listState.append(button);
    }
}

function makeMetaItem(label, value) {
    const item = document.createElement('span');
    item.textContent = `${label}: ${value}`;
    return item;
}

function createButton(label, className, onClick) {
    const button = document.createElement('button');
    button.className = className;
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
}

function createInlineEdit(todo) {
    const form = document.createElement('form');
    form.className = 'inline-edit';
    form.noValidate = true;

    const titleLabel = document.createElement('label');
    titleLabel.className = 'field';
    titleLabel.textContent = 'Название';
    const titleInput = document.createElement('input');
    titleInput.name = 'title';
    titleInput.type = 'text';
    titleInput.maxLength = 160;
    titleInput.value = todo.todo;
    titleInput.required = true;
    titleLabel.append(titleInput);

    const userLabel = document.createElement('label');
    userLabel.className = 'field';
    userLabel.textContent = 'ID пользователя';
    const userInput = document.createElement('input');
    userInput.name = 'userId';
    userInput.type = 'number';
    userInput.min = '1';
    userInput.step = '1';
    userInput.value = String(todo.userId);
    userInput.required = true;
    userLabel.append(userInput);

    const saveButton = document.createElement('button');
    saveButton.className = 'button button-primary';
    saveButton.type = 'submit';
    saveButton.textContent = 'Сохранить';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'button button-secondary';
    cancelButton.type = 'button';
    cancelButton.textContent = 'Отмена';
    cancelButton.addEventListener('click', () => {
        editingTodoId = null;
        renderTodos();
    });

    form.append(titleLabel, userLabel, saveButton, cancelButton);
    form.addEventListener('submit', (event) => saveEdit(event, todo, titleInput, userInput));
    return form;
}

function createTodoCard(todo) {
    const item = document.createElement('li');
    item.className = `todo-card${todo.completed ? ' is-completed' : ''}`;

    const main = document.createElement('div');
    main.className = 'todo-main';

    const checkbox = document.createElement('input');
    checkbox.className = 'todo-checkbox';
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', `${todo.completed ? 'Вернуть в работу' : 'Отметить выполненной'}: ${todo.todo}`);
    checkbox.addEventListener('change', () => toggleCompleted(todo));

    const content = document.createElement('div');
    content.className = 'todo-content';
    const title = document.createElement('p');
    title.className = 'todo-title';
    title.textContent = todo.todo;

    const meta = document.createElement('div');
    meta.className = 'todo-meta';
    const status = document.createElement('span');
    status.className = 'todo-status';
    status.textContent = todo.completed ? 'Выполнена' : 'В работе';
    meta.append(status, makeMetaItem('ID пользователя', todo.userId));
    content.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'todo-actions';
    actions.append(
        createButton('Изменить', 'text-button', () => {
            editingTodoId = todo.id;
            renderTodos();
            todoList.querySelector('.inline-edit input[name="title"]')?.focus();
        }),
        createButton('Удалить', 'text-button text-button-danger', () => removeTodo(todo)),
    );

    main.append(checkbox, content, actions);
    item.append(main);

    if (editingTodoId === todo.id) {
        item.append(createInlineEdit(todo));
    }

    return item;
}

function getVisibleTodos() {
    const normalizedSearch = searchText.trim().toLocaleLowerCase('ru');

    return todos.filter((todo) => {
        const matchesSearch = todo.todo.toLocaleLowerCase('ru').includes(normalizedSearch);
        const matchesFilter = currentFilter === 'all'
            || (currentFilter === 'active' && !todo.completed)
            || (currentFilter === 'completed' && todo.completed);
        return matchesSearch && matchesFilter;
    });
}

function renderTodos() {
    updateSummary();
    actionError.hidden = true;

    const visibleTodos = getVisibleTodos();
    visibleCount.textContent = `Показано ${visibleTodos.length} из ${todos.length}`;

    if (visibleTodos.length === 0) {
        if (todos.length === 0) {
            showState('Список пока пуст', 'Добавьте первую задачу в форму выше.');
        } else if (searchText.trim()) {
            showState('Ничего не найдено', 'Попробуйте изменить поисковый запрос или фильтр.');
        } else {
            showState('Задач в этом списке нет', 'Выберите другой фильтр, чтобы увидеть остальные задачи.');
        }
        return;
    }

    listState.hidden = true;
    todoList.hidden = false;
    todoList.replaceChildren(...visibleTodos.map(createTodoCard));
}

function showFormError(message) {
    formError.textContent = message;
    formError.hidden = false;
}

function showActionError(message) {
    actionError.textContent = message;
    actionError.hidden = false;
}

async function loadTodos() {
    showState('', 'Загружаем задачи…');
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    listState.prepend(spinner);

    try {
        todos = await getTodos();
        renderTodos();
    } catch (error) {
        showState('Не удалось загрузить задачи', error.message, 'Попробовать снова', loadTodos);
    }
}

async function createTodo(event) {
    event.preventDefault();
    formError.hidden = true;

    const values = getValidFormValues(todoTitleInput, userIdInput);
    if (values.error) {
        showFormError(values.error);
        return;
    }

    const submitButton = todoForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
        await addTodo({ todo: values.title, completed: false, userId: values.userId });
        // Negative IDs stay separate from IDs returned by the API.
        while (todos.some((todo) => todo.id === nextLocalId)) {
            nextLocalId -= 1;
        }
        todos.unshift({ id: nextLocalId, todo: values.title, completed: false, userId: values.userId });
        nextLocalId -= 1;
        todoForm.reset();
        userIdInput.value = '1';
        currentFilter = 'all';
        searchInput.value = '';
        searchText = '';
        updateFilterButtons();
        renderTodos();
        todoTitleInput.focus();
    } catch (error) {
        showFormError(`Не удалось добавить задачу: ${error.message}`);
    } finally {
        submitButton.disabled = false;
    }
}

async function saveEdit(event, todo, titleInput, userInput) {
    event.preventDefault();
    const values = getValidFormValues(titleInput, userInput);

    if (values.error) {
        showActionError(values.error);
        return;
    }

    try {
        if (todo.id > 0) {
            await updateTodo(todo.id, { todo: values.title, userId: values.userId });
        }
        Object.assign(todo, { todo: values.title, userId: values.userId });
        editingTodoId = null;
        renderTodos();
    } catch (error) {
        showActionError(`Не удалось сохранить задачу: ${error.message}`);
    }
}

async function toggleCompleted(todo) {
    const completed = !todo.completed;
    try {
        if (todo.id > 0) {
            await updateTodo(todo.id, { completed });
        }
        todo.completed = completed;
        renderTodos();
    } catch (error) {
        renderTodos();
        showActionError(`Не удалось изменить статус: ${error.message}`);
    }
}

async function removeTodo(todo) {
    if (!window.confirm(`Удалить задачу «${todo.todo}»?`)) return;

    try {
        if (todo.id > 0) {
            await deleteTodo(todo.id);
        }
        todos = todos.filter((item) => item.id !== todo.id);
        if (editingTodoId === todo.id) editingTodoId = null;
        renderTodos();
    } catch (error) {
        showActionError(`Не удалось удалить задачу: ${error.message}`);
    }
}

function updateFilterButtons() {
    for (const button of filterButtons) {
        const isSelected = button.dataset.filter === currentFilter;
        button.classList.toggle('is-selected', isSelected);
        button.setAttribute('aria-pressed', String(isSelected));
    }
}

todoForm.addEventListener('submit', createTodo);
searchInput.addEventListener('input', () => {
    searchText = searchInput.value;
    renderTodos();
});

for (const button of filterButtons) {
    button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;
        updateFilterButtons();
        renderTodos();
    });
}

loadTodos();