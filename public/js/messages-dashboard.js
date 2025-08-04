/**
 * Messages Dashboard Client-Side JavaScript
 * Handles data fetching, table rendering, and pagination for the AI interactions dashboard
 */

class MessagesDashboard {
  constructor() {
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalPages = 1;
    this.totalItems = 0;
    this.data = null;
    this.eventSource = null;
    this.messageCache = new Map(); // Cache messages by ID for real-time updates
    this.inFlightMessages = new Set(); // Track in-flight message IDs
    
    // DOM elements
    this.loadingState = document.getElementById('loading-state');
    this.errorState = document.getElementById('error-state');
    this.errorMessage = document.getElementById('error-message');
    this.messagesTable = document.getElementById('messages-table');
    this.tbody = document.getElementById('messages-tbody');
    this.paginationStart = document.getElementById('pagination-start');
    this.paginationEnd = document.getElementById('pagination-end');
    this.paginationTotal = document.getElementById('pagination-total');
    this.prevBtn = document.getElementById('prev-btn');
    this.nextBtn = document.getElementById('next-btn');
    this.pageNumbers = document.getElementById('page-numbers');
    
    this.init();
  }
  
  /**
   * Initialize the dashboard by setting up event listeners and loading initial data
   */
  init() {
    this.setupEventListeners();
    this.loadMessages();
    this.initializeRealTimeUpdates();
  }
  
  /**
   * Set up event listeners for pagination controls
   */
  setupEventListeners() {
    this.prevBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
    this.nextBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
  }
  
  /**
   * Navigate to a specific page
   * @param {number} page - Page number to navigate to
   */
  goToPage(page) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadMessages();
    }
  }
  
  /**
   * Load messages from the API
   */
  async loadMessages() {
    this.showLoading();
    
    try {
      const apiEndpoint = window.MESSAGES_API_ENDPOINT || '/api/messages';
      const url = new URL(apiEndpoint, window.location.origin);
      url.searchParams.set('page', this.currentPage.toString());
      url.searchParams.set('pageSize', this.pageSize.toString());
      url.searchParams.set('sortField', 'createdAt');
      url.searchParams.set('sortDirection', 'desc');
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.data = data;
      this.totalPages = data.totalPages;
      this.totalItems = data.totalItems;
      
      this.renderTable();
      this.renderPagination();
      this.showTable();
      
    } catch (error) {
      console.error('Failed to load messages:', error);
      this.showError(`Failed to load messages: ${error.message}`);
    }
  }
  
  /**
   * Render the messages table with data
   */
  renderTable() {
    if (!this.data || !this.data.messages) {
      return;
    }
    
    this.tbody.innerHTML = '';
    
    this.data.messages.forEach(message => {
      const row = this.createTableRow(message);
      this.tbody.appendChild(row);
    });
  }
  
  /**
   * Create a table row for a message
   * @param {Object} message - Message object from API
   * @returns {HTMLElement} Table row element
   */
  createTableRow(message) {
    const row = document.createElement('tr');
    row.dataset.messageId = message.id; // Add message ID for real-time updates
    
    // Add in-flight styling if message is processing
    const isInFlight = this.inFlightMessages.has(message.id) || message.status === 'in-flight';
    if (isInFlight) {
      row.classList.add('webtui-table-row--processing');
    }
    
    // Time column
    const timeCell = document.createElement('td');
    timeCell.className = 'webtui-text-sm';
    timeCell.textContent = this.formatDate(message.createdAt);
    row.appendChild(timeCell);
    
    // Model column
    const modelCell = document.createElement('td');
    modelCell.className = 'webtui-text-sm webtui-font-medium';
    modelCell.textContent = message.model || 'Unknown';
    row.appendChild(modelCell);
    
    // Provider column
    const providerCell = document.createElement('td');
    providerCell.className = 'webtui-text-sm webtui-text-gray';
    providerCell.textContent = message.provider || 'N/A';
    row.appendChild(providerCell);
    
    // Tokens column
    const tokensCell = document.createElement('td');
    tokensCell.className = 'webtui-text-sm webtui-text-right';
    tokensCell.textContent = this.formatNumber(message.totalTokens);
    row.appendChild(tokensCell);
    
    // Response Time column
    const responseTimeCell = document.createElement('td');
    responseTimeCell.className = 'webtui-text-sm webtui-text-right';
    responseTimeCell.textContent = this.formatResponseTime(message.responseTime);
    row.appendChild(responseTimeCell);
    
    // Status column
    const statusCell = document.createElement('td');
    statusCell.className = 'message-status'; // Add class for easy targeting
    const statusSpan = document.createElement('span');
    
    // Determine status display based on in-flight state and success
    let statusClass, statusText;
    if (isInFlight) {
      statusClass = 'webtui-status--warning';
      statusText = 'Processing';
    } else if (message.isSuccess) {
      statusClass = 'webtui-status--success';
      statusText = 'Success';
    } else {
      statusClass = 'webtui-status--error';
      statusText = 'Error';
    }
    
    statusSpan.className = `webtui-status ${statusClass}`;
    statusSpan.textContent = statusText;
    statusCell.appendChild(statusSpan);
    row.appendChild(statusCell);
    
    // Preview column
    const previewCell = document.createElement('td');
    previewCell.className = 'webtui-text-xs webtui-text-gray webtui-truncate';
    previewCell.style.maxWidth = '200px';
    previewCell.textContent = message.requestPreview || 'No preview available';
    previewCell.title = message.requestPreview || 'No preview available';
    row.appendChild(previewCell);
    
    return row;
  }
  
  /**
   * Render pagination controls
   */
  renderPagination() {
    // Update pagination info
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalItems);
    
    this.paginationStart.textContent = this.totalItems > 0 ? start.toString() : '0';
    this.paginationEnd.textContent = end.toString();
    this.paginationTotal.textContent = this.totalItems.toString();
    
    // Update navigation buttons
    this.prevBtn.disabled = this.currentPage <= 1;
    this.nextBtn.disabled = this.currentPage >= this.totalPages;
    
    // Render page numbers
    this.renderPageNumbers();
  }
  
  /**
   * Render page number buttons
   */
  renderPageNumbers() {
    this.pageNumbers.innerHTML = '';
    
    if (this.totalPages <= 1) {
      return;
    }
    
    // Calculate visible page range
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(this.totalPages, startPage + maxVisible - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    // Add first page and ellipsis if needed
    if (startPage > 1) {
      this.addPageButton(1);
      if (startPage > 2) {
        this.addEllipsis();
      }
    }
    
    // Add visible page numbers
    for (let i = startPage; i <= endPage; i++) {
      this.addPageButton(i);
    }
    
    // Add last page and ellipsis if needed
    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        this.addEllipsis();
      }
      this.addPageButton(this.totalPages);
    }
  }
  
  /**
   * Add a page number button
   * @param {number} page - Page number
   */
  addPageButton(page) {
    const button = document.createElement('button');
    button.className = `webtui-pagination-btn ${page === this.currentPage ? 'webtui-pagination-btn--active' : ''}`;
    button.textContent = page.toString();
    button.addEventListener('click', () => this.goToPage(page));
    this.pageNumbers.appendChild(button);
  }
  
  /**
   * Add ellipsis to pagination
   */
  addEllipsis() {
    const ellipsis = document.createElement('span');
    ellipsis.className = 'webtui-pagination-btn';
    ellipsis.textContent = '...';
    ellipsis.style.cursor = 'default';
    this.pageNumbers.appendChild(ellipsis);
  }
  
  /**
   * Format a date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMinutes < 1) {
        return 'Just now';
      } else if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (_error) {
      return 'Invalid date';
    }
  }
  
  /**
   * Format a number for display
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  formatNumber(num) {
    if (num === null || num === undefined) return 'N/A';
    if (typeof num !== 'number') return 'N/A';
    return num.toLocaleString();
  }
  
  /**
   * Format response time for display
   * @param {number} ms - Response time in milliseconds
   * @returns {string} Formatted response time
   */
  formatResponseTime(ms) {
    if (ms === null || ms === undefined) return 'N/A';
    if (typeof ms !== 'number') return 'N/A';
    
    if (ms < 1000) {
      return `${ms}ms`;
    } else {
      return `${(ms / 1000).toFixed(1)}s`;
    }
  }
  
  /**
   * Show loading state
   */
  showLoading() {
    this.loadingState.style.display = 'flex';
    this.errorState.style.display = 'none';
    this.messagesTable.style.display = 'none';
  }
  
  /**
   * Show error state
   * @param {string} message - Error message to display
   */
  showError(message) {
    this.loadingState.style.display = 'none';
    this.errorState.style.display = 'block';
    this.messagesTable.style.display = 'none';
    this.errorMessage.textContent = message;
  }
  
  /**
   * Show table with data
   */
  showTable() {
    this.loadingState.style.display = 'none';
    this.errorState.style.display = 'none';
    this.messagesTable.style.display = 'block';
  }
  
  /**
   * Initialize Server-Sent Events for real-time updates
   */
  initializeRealTimeUpdates() {
    if (typeof EventSource === 'undefined') {
      console.warn('Server-Sent Events not supported in this browser');
      return;
    }

    try {
      const eventsEndpoint = window.MESSAGES_EVENTS_ENDPOINT || '/api/messages/events';
      this.eventSource = new EventSource(eventsEndpoint);
      
      this.eventSource.onopen = () => {
        console.log('Real-time connection established');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealTimeEvent(data);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (this.eventSource.readyState === EventSource.CLOSED) {
            this.initializeRealTimeUpdates();
          }
        }, 5000);
      };

      // Clean up on page unload
      window.addEventListener('beforeunload', () => {
        if (this.eventSource) {
          this.eventSource.close();
        }
      });
    } catch (error) {
      console.error('Failed to initialize SSE connection:', error);
    }
  }

  /**
   * Handle real-time events from Server-Sent Events
   * @param {Object} eventData - Event data from SSE
   */
  handleRealTimeEvent(eventData) {
    switch (eventData.type) {
      case 'connected':
        console.log('Real-time updates connected:', eventData.message);
        break;
      
      case 'message':
        this.handleMessageUpdate(eventData.data);
        break;
      
      case 'status':
        this.handleStatusUpdate(eventData.data);
        break;
      
      case 'heartbeat':
        // Just log for debugging, no action needed
        console.debug('SSE heartbeat received');
        break;
      
      case 'error':
        console.error('SSE error:', eventData.message);
        break;
      
      default:
        console.log('Unknown SSE event type:', eventData.type);
    }
  }

  /**
   * Handle message updates from real-time events
   * @param {Object} messageData - Message data from SSE
   */
  handleMessageUpdate(messageData) {
    // Cache the message
    this.messageCache.set(messageData.id, messageData);
    
    // Track in-flight status
    if (messageData.status === 'in-flight') {
      this.inFlightMessages.add(messageData.id);
    } else if (messageData.status === 'completed') {
      this.inFlightMessages.delete(messageData.id);
    }

    // If this is a new message and we're on the first page, prepend it
    if (this.currentPage === 1 && this.data && this.data.messages) {
      const existingIndex = this.data.messages.findIndex(msg => msg.id === messageData.id);
      
      if (existingIndex === -1) {
        // New message - add to the beginning
        this.data.messages.unshift(messageData);
        this.totalItems++;
        this.renderTable();
        this.renderPagination();
      } else {
        // Update existing message
        this.data.messages[existingIndex] = { ...this.data.messages[existingIndex], ...messageData };
        this.updateTableRow(messageData);
      }
    } else {
      // Update cached message for when we navigate to that page
      this.updateCachedMessage(messageData);
    }
  }

  /**
   * Handle status updates for messages
   * @param {Object} statusData - Status update data
   */
  handleStatusUpdate(statusData) {
    const { id, status } = statusData;
    
    if (status === 'in-flight') {
      this.inFlightMessages.add(id);
    } else {
      this.inFlightMessages.delete(id);
    }

    // Update the table row if visible
    this.updateMessageStatus(id, status);
  }

  /**
   * Update cached message data
   * @param {Object} messageData - Updated message data
   */
  updateCachedMessage(messageData) {
    this.messageCache.set(messageData.id, messageData);
  }

  /**
   * Update a specific table row with new data
   * @param {Object} messageData - Updated message data
   */
  updateTableRow(messageData) {
    const rows = this.tbody.querySelectorAll('tr');
    for (const row of rows) {
      // Find row by matching the message data (we'll add data-id attribute)
      if (row.dataset.messageId === messageData.id) {
        // Replace the entire row
        const newRow = this.createTableRow(messageData);
        row.replaceWith(newRow);
        break;
      }
    }
  }

  /**
   * Update message status in the table
   * @param {string} messageId - Message ID
   * @param {string} status - New status
   */
  updateMessageStatus(messageId, status) {
    const rows = this.tbody.querySelectorAll('tr');
    for (const row of rows) {
      if (row.dataset.messageId === messageId) {
        const statusCell = row.querySelector('.message-status');
        if (statusCell) {
          const statusSpan = statusCell.querySelector('span');
          if (statusSpan) {
            statusSpan.className = `webtui-status ${status === 'in-flight' ? 'webtui-status--warning' : 
              status === 'completed' ? 'webtui-status--success' : 'webtui-status--error'}`;
            statusSpan.textContent = status === 'in-flight' ? 'Processing' : 
              status === 'completed' ? 'Success' : 'Error';
          }
        }
        break;
      }
    }
  }
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MessagesDashboard();
});