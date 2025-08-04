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
    const statusSpan = document.createElement('span');
    statusSpan.className = `webtui-status ${message.isSuccess ? 'webtui-status--success' : 'webtui-status--error'}`;
    statusSpan.textContent = message.isSuccess ? 'Success' : 'Error';
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
    let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);
    
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
    } catch (error) {
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
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MessagesDashboard();
});