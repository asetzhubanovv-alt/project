import { addTodo, deleteTodo, getTodos, updateTodo } from './todosApi.js';
import { getUser, getUsers } from './usersApi.js';

const todoForm = document.querySelector('#todoForm');
const todoTitleInput = document.querySelector('#todoTitle');
const userIdInput = document.querySelector('#userId');
const completedInput = document.querySelector('#todoCompleted');
const createDialog = document.querySelector('#createDialog');
const createDialogTitle = document.querySelector('#createDialogTitle');
const openCreateDialog = document.querySelector('#openCreateDialog');
const todoSubmitButton = todoForm.querySelector('button[type="submit"]');
const userPickerToggle = document.querySelector('#userPickerToggle');
const userPickerValue = document.querySelector('#userPickerValue');
const userPickerOptions = document.querySelector('#userPickerOptions');
const formError = document.querySelector('#formError');
const totalCount = document.querySelector('#totalCount');
const completedCount = document.querySelector('#completedCount');
const searchInput = document.querySelector('#searchInput');
const sortSelect = document.querySelector('#sortSelect');
const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
const visibleCount = document.querySelector('#visibleCount');
const listState = document.querySelector('#listState');
const actionError = document.querySelector('#actionError');
const todoList = document.querySelector('#todoList');
const profileDialog = document.querySelector('#profileDialog');
const profileContent = document.querySelector('#profileContent');

let todos = [];
let users = [];
const userCache = new Map();
let currentFilter = 'all';
let searchText = '';
let sortOrder = 'asc';
let editingTodoId = null;
let nextLocalId = -1;
let searchTimer = null;
let activeProfileUser = null;
let profileRequestId = 0;

function getValidFormValues(titleInput, userInput, completedValue = 'false') {
    const title = titleInput.value.trim();
    const userId = Number(userInput.value);

    if (!title) {
        return { error: 'Введите название задачи.' };
    }

    if (!Number.isInteger(userId) || !users.some((user) => user.id === userId)) {
        return { error: 'Выберите исполнителя из списка.' };
    }

    return { title, userId, completed: completedValue === 'true' };
}

function getUserById(userId) {
    return users.find((user) => user.id === userId) || userCache.get(userId);
}

function makeAvatar(user, className = 'user-avatar') {
    const wrapper = document.createElement('span');
    wrapper.className = `avatar-shell ${className}`;
    const image = document.createElement('img');
    image.src = user.image;
    image.alt = '';
    image.loading = 'lazy';
    const fallback = document.createElement('span');
    fallback.className = 'avatar-fallback';
    fallback.textContent = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
    image.addEventListener('error', () => wrapper.classList.add('is-fallback'), { once: true });
    wrapper.append(image, fallback);
    return wrapper;
}

function makeUserLink(user) {
    const button = document.createElement('button');
    button.className = 'todo-user';
    button.type = 'button';
    button.append(makeAvatar(user, 'todo-user-avatar'));
    const username = document.createElement('span');
    username.textContent = `@${user.username}`;
    button.append(username);
    button.addEventListener('click', () => openUserProfile(user.id));
    return button;
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

function createButton(label, className, onClick) {
    const button = document.createElement('button');
    button.className = className;
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
}

function openTodoDialog(todo = null) {
    editingTodoId = todo?.id ?? null;
    formError.hidden = true;
    todoForm.reset();

    if (todo) {
        todoTitleInput.value = todo.todo;
        userIdInput.value = String(todo.userId);
        completedInput.value = String(todo.completed);
        createDialogTitle.textContent = 'Изменить задачу';
    } else {
        if (activeProfileUser) userIdInput.value = String(activeProfileUser.id);
        createDialogTitle.textContent = 'Добавить задачу';
    }

    userPickerOptions.hidden = true;
    userPickerToggle.setAttribute('aria-expanded', 'false');
    updateSelectedUser();
    createDialog.showModal();
    todoTitleInput.focus();
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

    const user = getUserById(todo.userId);
    const userRow = document.createElement('div');
    userRow.className = 'todo-user-row';
    if (user) userRow.append(makeUserLink(user));

    const meta = document.createElement('div');
    meta.className = 'todo-meta';
    const status = document.createElement('span');
    status.className = 'todo-status';
    status.textContent = todo.completed ? 'Выполнена' : 'В работе';
    meta.append(status);
    content.append(title, userRow, meta);

    const actions = document.createElement('div');
    actions.className = 'todo-actions';
    actions.append(
        createButton('Изменить', 'text-button', () => openTodoDialog(todo)),
        createButton('Удалить', 'text-button text-button-danger', () => removeTodo(todo)),
    );

    main.append(checkbox, content, actions);
    item.append(main);

    return item;
}

function getVisibleTodos() {
    const normalizedSearch = searchText.trim().toLocaleLowerCase('ru');

    const filteredTodos = todos.filter((todo) => {
        const matchesSearch = todo.todo.toLocaleLowerCase('ru').includes(normalizedSearch);
        const matchesFilter = currentFilter === 'all'
            || (currentFilter === 'active' && !todo.completed)
            || (currentFilter === 'completed' && todo.completed);
        return matchesSearch && matchesFilter;
    });
    return sortTodosByTitle(filteredTodos);
}

function sortTodosByTitle(todoItems) {
    return [...todoItems].sort((first, second) => {
        const comparison = first.todo.localeCompare(second.todo, 'ru', { sensitivity: 'base' });
        return sortOrder === 'asc' ? comparison : -comparison;
    });
}

function renderTodos() {
    updateSummary();
    actionError.hidden = true;

    const visibleTodos = getVisibleTodos();
    visibleCount.textContent = `Показано ${visibleTodos.length} из ${todos.length}`;

    if (visibleTodos.length === 0) {
        if (todos.length === 0) {
            showState('Список пока пуст', 'Добавьте первую задачу кнопкой выше.');
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
    showState('', 'Загружаем задачи и пользователей…');
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    listState.prepend(spinner);

    try {
        const [loadedTodos, loadedUsers] = await Promise.all([getTodos(), getUsers()]);
        todos = loadedTodos;
        users = loadedUsers;
        if (users.length === 0) throw new Error('Список пользователей пуст.');
        userIdInput.replaceChildren(new Option('Выберите исполнителя', ''));
        userPickerOptions.replaceChildren();
        for (const user of users) {
            userCache.set(user.id, user);
            const option = new Option(`@${user.username}`, String(user.id));
            userIdInput.append(option);
            const userOption = document.createElement('button');
            userOption.className = 'user-picker-option';
            userOption.type = 'button';
            userOption.role = 'option';
            userOption.dataset.userId = String(user.id);
            userOption.setAttribute('aria-selected', 'false');
            userOption.append(makeAvatar(user, 'picker-avatar'));
            const username = document.createElement('span');
            username.textContent = `@${user.username}`;
            userOption.append(username);
            userOption.addEventListener('click', () => {
                userIdInput.value = String(user.id);
                updateSelectedUser();
                userPickerOptions.hidden = true;
                userPickerToggle.setAttribute('aria-expanded', 'false');
            });
            userPickerOptions.append(userOption);
        }
        userIdInput.disabled = false;
        userPickerToggle.disabled = false;
        updateSelectedUser();
        renderTodos();
    } catch (error) {
        userIdInput.disabled = true;
        userPickerToggle.disabled = true;
        showState('Не удалось загрузить данные', error.message, 'Попробовать снова', loadTodos);
    }
}

function updateSelectedUser() {
    const user = getUserById(Number(userIdInput.value));
    userPickerValue.replaceChildren();
    if (!user) {
        userPickerValue.textContent = 'Выберите исполнителя';
    } else {
        userPickerValue.append(makeAvatar(user, 'picker-avatar'));
        const name = document.createElement('span');
        name.textContent = `@${user.username}`;
        userPickerValue.append(name);
    }
    for (const option of userPickerOptions.children) {
        option.setAttribute('aria-selected', String(Number(option.dataset.userId) === user?.id));
    }
}

async function createTodo(event) {
    event.preventDefault();
    formError.hidden = true;

    const values = getValidFormValues(todoTitleInput, userIdInput, completedInput.value);
    if (values.error) {
        showFormError(values.error);
        return;
    }

    const todoBeingEdited = editingTodoId === null
        ? null
        : todos.find((todo) => todo.id === editingTodoId);
    if (editingTodoId !== null && !todoBeingEdited) {
        showFormError('Эта задача больше недоступна.');
        return;
    }

    todoSubmitButton.disabled = true;

    try {
        if (todoBeingEdited) {
            if (todoBeingEdited.id > 0) {
                await updateTodo(todoBeingEdited.id, {
                    todo: values.title,
                    completed: values.completed,
                    userId: values.userId,
                });
            }
            Object.assign(todoBeingEdited, {
                todo: values.title,
                completed: values.completed,
                userId: values.userId,
            });
            editingTodoId = null;
        } else {
            await addTodo({ todo: values.title, completed: values.completed, userId: values.userId });
            // Negative IDs stay separate from IDs returned by the API.
            while (todos.some((todo) => todo.id === nextLocalId)) {
                nextLocalId -= 1;
            }
            todos.unshift({ id: nextLocalId, todo: values.title, completed: values.completed, userId: values.userId });
            nextLocalId -= 1;
        }
        todoForm.reset();
        updateSelectedUser();
        createDialog.close();
        if (!todoBeingEdited) {
            currentFilter = 'all';
            searchInput.value = '';
            searchText = '';
            updateFilterButtons();
        }
        renderTodos();
        if (profileDialog.open) renderProfile();
    } catch (error) {
        showFormError(`Не удалось ${todoBeingEdited ? 'сохранить задачу' : 'добавить задачу'}: ${error.message}`);
    } finally {
        todoSubmitButton.disabled = false;
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
        if (profileDialog.open) renderProfile();
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
        if (profileDialog.open) renderProfile();
    } catch (error) {
        showActionError(`Не удалось удалить задачу: ${error.message}`);
    }
}

function appendProfileDetail(container, label, value) {
    if (!value) return;
    const detail = document.createElement('div');
    detail.className = 'profile-detail';
    const term = document.createElement('span');
    term.textContent = label;
    const description = document.createElement('strong');
    description.textContent = String(value);
    detail.append(term, description);
    container.append(detail);
}

function appendProfileTaskList(container, title, profileTodos) {
    const section = document.createElement('section');
    section.className = 'profile-task-section';
    const heading = document.createElement('h3');
    heading.textContent = `${title} (${profileTodos.length})`;
    section.append(heading);
    if (profileTodos.length) {
        const list = document.createElement('ul');
        list.className = 'todo-list profile-todo-list';
        list.append(...profileTodos.map(createTodoCard));
        section.append(list);
    } else {
        const empty = document.createElement('p');
        empty.className = 'profile-empty';
        empty.textContent = 'Нет задач';
        section.append(empty);
    }
    container.append(section);
}

function renderProfile() {
    if (!activeProfileUser) return;
    const user = activeProfileUser;
    profileContent.replaceChildren();

    const heading = document.createElement('div');
    heading.className = 'profile-heading';
    const avatar = makeAvatar(user, 'profile-avatar');
    const identity = document.createElement('div');
    const name = document.createElement('h2');
    name.id = 'profileName';
    name.textContent = `${user.firstName} ${user.lastName}`;
    const username = document.createElement('p');
    username.className = 'profile-username';
    username.textContent = `@${user.username}`;
    identity.append(name, username);
    const closeButton = document.createElement('button');
    closeButton.className = 'dialog-close';
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Закрыть');
    closeButton.addEventListener('click', () => profileDialog.close());
    heading.append(avatar, identity, closeButton);

    const details = document.createElement('div');
    details.className = 'profile-details';
    appendProfileDetail(details, 'Email', user.email);
    appendProfileDetail(details, 'Телефон', user.phone);
    appendProfileDetail(details, 'Город', user.address?.city);
    appendProfileDetail(details, 'Возраст', user.age);
    appendProfileDetail(details, 'Пол', user.gender);
    appendProfileDetail(details, 'Университет', user.university);
    appendProfileDetail(details, 'Компания', user.company?.name);
    appendProfileDetail(details, 'Должность', user.company?.title);

    const taskGroups = document.createElement('div');
    taskGroups.className = 'profile-task-groups';
    const userTodos = todos.filter((todo) => todo.userId === user.id);
    appendProfileTaskList(taskGroups, 'Выполненные', sortTodosByTitle(userTodos.filter((todo) => todo.completed)));
    appendProfileTaskList(taskGroups, 'Невыполненные', sortTodosByTitle(userTodos.filter((todo) => !todo.completed)));

    const taskToolbar = document.createElement('div');
    taskToolbar.className = 'profile-task-toolbar';
    const taskHeading = document.createElement('h3');
    taskHeading.textContent = 'Задачи пользователя';
    const taskControls = document.createElement('div');
    taskControls.className = 'profile-task-controls';
    const sortLabel = document.createElement('label');
    sortLabel.className = 'profile-sort-control';
    sortLabel.textContent = 'Сортировка';
    const profileSort = document.createElement('select');
    profileSort.setAttribute('aria-label', 'Сортировка задач пользователя');
    profileSort.append(new Option('А-Я', 'asc'), new Option('Я-А', 'desc'));
    profileSort.value = sortOrder;
    profileSort.addEventListener('change', () => {
        sortOrder = profileSort.value;
        sortSelect.value = sortOrder;
        renderTodos();
        renderProfile();
    });
    sortLabel.append(profileSort);
    const addButton = createButton('Добавить задачу', 'button button-primary profile-add-button', () => openCreateDialog.click());
    taskControls.append(sortLabel, addButton);
    taskToolbar.append(taskHeading, taskControls);
    profileContent.append(heading, details, taskToolbar, taskGroups);
}

async function openUserProfile(userId) {
    const requestId = ++profileRequestId;
    activeProfileUser = null;
    profileContent.replaceChildren();
    const loading = document.createElement('div');
    loading.className = 'profile-loading';
    loading.append(Object.assign(document.createElement('span'), { className: 'loading-spinner' }));
    loading.append(document.createTextNode('Загружаем профиль…'));
    profileContent.append(loading);
    profileDialog.showModal();

    try {
        const user = await getUser(userId);
        if (requestId !== profileRequestId) return;
        activeProfileUser = user;
        userCache.set(user.id, user);
        renderProfile();
    } catch (error) {
        if (requestId !== profileRequestId) return;
        const message = document.createElement('p');
        message.className = 'profile-error';
        message.textContent = `Не удалось загрузить профиль: ${error.message}`;
        const retry = createButton('Попробовать снова', 'button button-secondary', () => openUserProfile(userId));
        const close = createButton('Закрыть', 'button button-secondary', () => profileDialog.close());
        profileContent.replaceChildren(message, retry, close);
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
openCreateDialog.addEventListener('click', () => {
    openTodoDialog();
});

createDialog.addEventListener('close', () => {
    editingTodoId = null;
    createDialogTitle.textContent = 'Добавить задачу';
    todoSubmitButton.textContent = 'Сохранить';
    formError.hidden = true;
});

for (const button of document.querySelectorAll('[data-close-dialog]')) {
    button.addEventListener('click', () => createDialog.close());
}

createDialog.addEventListener('click', (event) => {
    if (event.target === createDialog) createDialog.close();
});

profileDialog.addEventListener('click', (event) => {
    if (event.target === profileDialog) profileDialog.close();
});

profileDialog.addEventListener('close', () => {
    profileRequestId += 1;
    activeProfileUser = null;
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (createDialog.open) createDialog.close();
    else if (profileDialog.open) profileDialog.close();
});

userIdInput.addEventListener('change', updateSelectedUser);
userPickerToggle.addEventListener('click', () => {
    userPickerOptions.hidden = !userPickerOptions.hidden;
    userPickerToggle.setAttribute('aria-expanded', String(!userPickerOptions.hidden));
});

document.addEventListener('click', (event) => {
    if (!event.target.closest('.user-picker')) {
        userPickerOptions.hidden = true;
        userPickerToggle.setAttribute('aria-expanded', 'false');
    }
});

searchInput.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
        searchText = searchInput.value;
        renderTodos();
    }, 250);
});

sortSelect.addEventListener('change', () => {
    sortOrder = sortSelect.value;
    renderTodos();
    if (profileDialog.open) renderProfile();
});

for (const button of filterButtons) {
    button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;
        updateFilterButtons();
        renderTodos();
    });
}

loadTodos();