const byId = id => document.getElementById(id);
const labels = {
  submitted: 'Submitted',
  under_review: 'Under review',
  ready: 'Ready for collection',
  rejected: 'Rejected'
};
// Keep the session token when the same tab is refreshed.
let token = sessionStorage.getItem('registrar-token');
let user;
let selectedId;

// Show feedback above the forms.
function notify(message, isError = false) {
  const box = byId('message');
  box.hidden = !message;
  box.textContent = message;
  box.classList.toggle('error', isError);
}

// Send API requests and attach the token when the user is signed in.
async function api(path, method = 'GET', body) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch('/api' + path, { method, headers, body: body && JSON.stringify(body) });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') showLogin();
    throw new Error(result.error || 'Request failed.');
  }
  return result;
}

// Clear the session from the browser and show the sign-in form.
function showLogin() {
  token = null;
  user = null;
  selectedId = null;
  sessionStorage.removeItem('registrar-token');
  byId('workspace').hidden = true;
  byId('detail').hidden = true;
  byId('signin').hidden = false;
  byId('register').hidden = true;
  byId('signout').hidden = true;
}

// Show the sections that match the account role.
async function showWorkspace(account) {
  user = account;
  byId('signin').hidden = true;
  byId('register').hidden = true;
  byId('signout').hidden = false;
  byId('workspace').hidden = false;
  byId('account-name').textContent = account.name;
  byId('account-role').textContent = account.role === 'student' ? 'Student workspace' : 'Registrar workspace';
  byId('create-panel').hidden = account.role !== 'student';
  byId('queue-title').textContent = account.role === 'student' ? 'My requests' : 'Review queue';
  await loadRequests();
}

// Refresh the list using the records returned by the API.
async function loadRequests() {
  const { requests } = await api('/requests');
  const list = byId('request-list');
  list.replaceChildren();
  if (!requests.length) {
    const item = document.createElement('li');
    item.textContent = 'No transcript requests yet.';
    list.append(item);
  }
  for (const request of requests) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary request-link';
    const name = user.role === 'staff' ? request.student_name + ' · ' : '';
    button.textContent = name + labels[request.status] + ' · ' + request.purpose;
    button.addEventListener('click', () => run(button, () => openRequest(request.id, true)));
    item.append(button);
    list.append(item);
  }
}

// Show the selected request and its status history.
async function openRequest(id, focus = false) {
  const { request, history } = await api('/requests/' + id);
  selectedId = request.id;
  byId('detail').hidden = false;
  byId('reference').textContent = request.id;
  byId('request-purpose').textContent = request.purpose;
  byId('history').replaceChildren(...history.map(entry => {
    const item = document.createElement('li');
    const date = new Date(entry.changed_at).toLocaleString();
    item.textContent = labels[entry.status] + ' · ' + entry.actor + ' · ' + date +
      (entry.note ? ' — ' + entry.note : '');
    return item;
  }));
  // Show only the next steps available for this request. The API checks them again.
  const next = request.status === 'submitted' ? ['under_review']
    : request.status === 'under_review' ? ['ready', 'rejected'] : [];
  byId('status').replaceChildren(...next.map(status => new Option(labels[status], status)));
  byId('review-form').hidden = user.role !== 'staff' || !next.length;
  byId('note').value = '';
  if (focus) byId('detail-title').focus();
}

async function run(button, action) {
  // Prevent a second click while the request is in progress.
  button.disabled = true;
  notify('');
  try {
    await action();
  } catch (error) {
    notify(error.message, true);
  } finally {
    button.disabled = false;
  }
}

// Send the form through JavaScript without reloading the page.
function handleForm(id, handler) {
  byId(id).addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const form = event.currentTarget;
    run(form.querySelector('button'), () => handler(data, form));
  });
}

byId('open-register').addEventListener('click', () => {
  notify('');
  byId('signin').hidden = true;
  byId('register').hidden = false;
  byId('register-name').focus();
});

byId('back-to-login').addEventListener('click', () => {
  byId('register-form').reset();
  notify('');
  showLogin();
  byId('email').focus();
});

// Save the account, then let the student sign in with the new password.
handleForm('register-form', async (data, form) => {
  const account = await api('/auth/register', 'POST', data);
  form.reset();
  showLogin();
  byId('email').value = account.email;
  byId('password').value = '';
  byId('password').focus();
  notify('Account created. Sign in with your password.');
});

handleForm('login-form', async (data, form) => {
  const result = await api('/auth/login', 'POST', data);
  token = result.token;
  sessionStorage.setItem('registrar-token', token);
  form.reset();
  await showWorkspace(result.user);
});

handleForm('request-form', async (data, form) => {
  const result = await api('/requests', 'POST', data);
  form.reset();
  await loadRequests();
  await openRequest(result.request.id, true);
  notify('Request submitted successfully.');
});

handleForm('review-form', async data => {
  const id = selectedId;
  await api('/requests/' + id + '/status', 'PATCH', data);
  await loadRequests();
  await openRequest(id, true);
  notify('Status updated.');
});

byId('refresh').addEventListener('click', event => run(event.currentTarget, async () => {
  await loadRequests();
  if (selectedId) await openRequest(selectedId);
}));

byId('signout').addEventListener('click', event => run(event.currentTarget, async () => {
  try {
    await api('/auth/logout', 'POST');
  } finally {
    showLogin();
  }
}));

// Check whether the saved session still works when the page opens.
if (token) {
  api('/auth/me').then(result => showWorkspace(result.user)).catch(error => notify(error.message, true));
}
