// Simple dashboard implementation for messages
(function() {
  let currentPage = 1;
  let totalPages = 1;
  const limit = 20;

  async function fetchMessages(page = 1) {
    try {
      const response = await fetch(`/api/messages?page=${page}&limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  function formatDuration(ms) {
    return `${ms}ms`;
  }

  function getStatusBadge(status) {
    const classes = status === 'success' 
      ? 'bg-success/10 text-success border-success/20' 
      : 'bg-danger/10 text-danger border-danger/20';
    return `<span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${classes}">
      ${status}
    </span>`;
  }

  function renderTable(data) {
    const tbody = document.getElementById('messages-tbody');
    tbody.innerHTML = data.messages.map(msg => `
      <tr class="border-b hover:bg-muted/5 cursor-pointer" data-id="${msg.id}">
        <td class="px-4 py-3 text-sm">${formatDate(msg.timestamp)}</td>
        <td class="px-4 py-3 text-sm font-medium">${msg.model}</td>
        <td class="px-4 py-3 text-sm">${msg.provider}</td>
        <td class="px-4 py-3 text-sm">${msg.totalTokens}</td>
        <td class="px-4 py-3 text-sm">${formatDuration(msg.responseTime)}</td>
        <td class="px-4 py-3 text-sm">${getStatusBadge(msg.status)}</td>
        <td class="px-4 py-3 text-sm text-muted truncate max-w-xs">${msg.prompt}</td>
      </tr>
    `).join('');

    // Update pagination info
    const start = (data.page - 1) * data.limit + 1;
    const end = Math.min(data.page * data.limit, data.total);
    document.getElementById('pagination-start').textContent = start;
    document.getElementById('pagination-end').textContent = end;
    document.getElementById('pagination-total').textContent = data.total;

    // Update pagination controls
    totalPages = Math.ceil(data.total / data.limit);
    document.getElementById('prev-btn').disabled = currentPage === 1;
    document.getElementById('next-btn').disabled = currentPage === totalPages;
  }

  async function loadPage(page) {
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('error-state').classList.add('hidden');
    document.getElementById('messages-table').classList.add('hidden');

    try {
      const data = await fetchMessages(page);
      currentPage = page;
      renderTable(data);
      
      document.getElementById('loading-state').classList.add('hidden');
      document.getElementById('messages-table').classList.remove('hidden');
    } catch (error) {
      document.getElementById('loading-state').classList.add('hidden');
      document.getElementById('error-state').classList.remove('hidden');
      document.getElementById('error-message').textContent = error.message;
    }
  }

  // Initialize event listeners
  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 1) loadPage(currentPage - 1);
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    if (currentPage < totalPages) loadPage(currentPage + 1);
  });

  // Load initial data
  loadPage(1);
})();