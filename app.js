// Application State
let state = {
    people: [],
    expenses: []
};

let editingPersonId = null;
let editingExpenseId = null;

// Simple compression alternative (since we're not using external libraries)
// We'll use base64 encoding for URL sharing
function serializeState(state) {
    try {
        const jsonString = JSON.stringify(state);
        return btoa(encodeURIComponent(jsonString));
    } catch (error) {
        console.error('Error serializing state:', error);
        return '';
    }
}

function deserializeState(encoded) {
    try {
        if (!encoded) return { people: [], expenses: [] };
        const jsonString = decodeURIComponent(atob(encoded));
        const parsed = JSON.parse(jsonString);
        return {
            people: Array.isArray(parsed.people) ? parsed.people : [],
            expenses: Array.isArray(parsed.expenses) ? parsed.expenses : []
        };
    } catch (error) {
        console.error('Error deserializing state:', error);
        return { people: [], expenses: [] };
    }
}

// State Management
function updateState() {
    const encoded = serializeState(state);
    
    // Update URL without causing page reload
    const url = new URL(window.location);
    if (encoded) {
        url.searchParams.set('data', encoded);
    } else {
        url.searchParams.delete('data');
    }
    history.replaceState(null, '', url.toString());
    
    // Save to localStorage as backup
    localStorage.setItem('expense-tracker', encoded);
    
    // Re-render UI
    renderUI();
}

function loadStateFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const encoded = urlParams.get('data');
    
    if (encoded) {
        state = deserializeState(encoded);
    } else {
        // Try to load from localStorage
        const stored = localStorage.getItem('expense-tracker');
        if (stored) {
            state = deserializeState(stored);
        }
    }
    
    renderUI();
}

// Utility Functions
function generateId() {
    return Date.now() + Math.random();
}

function formatCurrency(amount) {
    return `₹${parseFloat(amount).toFixed(2)}`;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.add('show');
    
    setTimeout(() => {
        errorElement.classList.remove('show');
    }, 5000);
}

function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    errorElement.classList.remove('show');
}

// People Management
function addPerson(name) {
    name = name.trim();
    
    if (!name) {
        showError('personError', 'Please enter a name');
        return false;
    }
    
    if (state.people.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        showError('personError', 'Person with this name already exists');
        return false;
    }
    
    const person = {
        id: generateId(),
        name: name
    };
    
    state.people.push(person);
    updateState();
    showToast(`${name} added successfully`);
    return true;
}

function editPerson(id, newName) {
    newName = newName.trim();
    
    if (!newName) {
        showError('editPersonError', 'Please enter a name');
        return false;
    }
    
    const existingPerson = state.people.find(p => p.id !== id && p.name.toLowerCase() === newName.toLowerCase());
    if (existingPerson) {
        showError('editPersonError', 'Person with this name already exists');
        return false;
    }
    
    const person = state.people.find(p => p.id === id);
    if (person) {
        const oldName = person.name;
        person.name = newName;
        updateState();
        showToast(`${oldName} renamed to ${newName}`);
        return true;
    }
    
    return false;
}

function deletePerson(id) {
    const person = state.people.find(p => p.id === id);
    if (!person) return;
    
    if (!confirm(`Are you sure you want to delete ${person.name}? This will also delete all their expenses.`)) {
        return;
    }
    
    // Remove person
    state.people = state.people.filter(p => p.id !== id);
    
    // Remove all expenses involving this person
    state.expenses = state.expenses.filter(expense => {
        return expense.paidBy !== id && !expense.splitBetween.includes(id);
    });
    
    updateState();
    showToast(`${person.name} and their expenses deleted`);
}

// Expense Management
function addExpense(description, amount, type, date, paidBy, splitBetween) {
    description = description.trim();
    amount = parseFloat(amount);
    type = type.trim();
    const originalPaidBy = paidBy; // Keep original for debugging
    paidBy = parseInt(paidBy);
    splitBetween = splitBetween.map(id => parseInt(id));
    
    console.log('Debug - addExpense called with:', { description, amount, type, date, originalPaidBy, paidBy, splitBetween });
    
    if (!description) {
        showError('expenseError', 'Please enter a description');
        return false;
    }
    
    if (isNaN(amount) || amount <= 0) {
        showError('expenseError', 'Please enter a valid positive amount');
        return false;
    }
    
    if (!type) {
        showError('expenseError', 'Please select an expense type');
        return false;
    }
    
    if (!date) {
        showError('expenseError', 'Please select a date');
        return false;
    }
    
    if (isNaN(paidBy) || !state.people.find(p => p.id === paidBy)) {
        console.log('Debug - paidBy validation failed:', { originalPaidBy, paidBy, isNaN: isNaN(paidBy), people: state.people });
        showError('expenseError', 'Please select who paid (dropdown must be selected)');
        return false;
    }
    
    if (splitBetween.length === 0) {
        showError('expenseError', 'Please select at least one person to split between');
        return false;
    }
    
    // Validate that all splitBetween people exist
    const invalidPeople = splitBetween.filter(id => !state.people.find(p => p.id === id));
    if (invalidPeople.length > 0) {
        showError('expenseError', 'Some selected people no longer exist');
        return false;
    }
    
    const expense = {
        id: generateId(),
        description,
        amount,
        type,
        date,
        paidBy,
        splitBetween: [...splitBetween]
    };
    
    state.expenses.push(expense);
    updateState();
    showToast('Expense added successfully');
    return true;
}

function editExpense(id, description, amount, type, date, paidBy, splitBetween) {
    description = description.trim();
    amount = parseFloat(amount);
    type = type.trim();
    paidBy = parseInt(paidBy);
    splitBetween = splitBetween.map(id => parseInt(id));
    
    if (!description) {
        showError('editExpenseError', 'Please enter a description');
        return false;
    }
    
    if (isNaN(amount) || amount <= 0) {
        showError('editExpenseError', 'Please enter a valid positive amount');
        return false;
    }
    
    if (!type) {
        showError('editExpenseError', 'Please select an expense type');
        return false;
    }
    
    if (!date) {
        showError('editExpenseError', 'Please select a date');
        return false;
    }
    
    if (isNaN(paidBy) || !state.people.find(p => p.id === paidBy)) {
        showError('editExpenseError', 'Please select who paid');
        return false;
    }
    
    if (splitBetween.length === 0) {
        showError('editExpenseError', 'Please select at least one person to split between');
        return false;
    }
    
    const expense = state.expenses.find(e => e.id === id);
    if (expense) {
        expense.description = description;
        expense.amount = amount;
        expense.type = type;
        expense.date = date;
        expense.paidBy = paidBy;
        expense.splitBetween = [...splitBetween];
        updateState();
        showToast('Expense updated successfully');
        return true;
    }
    
    return false;
}

function deleteExpense(id) {
    const expense = state.expenses.find(e => e.id === id);
    if (!expense) return;
    
    if (!confirm(`Are you sure you want to delete "${expense.description}"?`)) {
        return;
    }
    
    state.expenses = state.expenses.filter(e => e.id !== id);
    updateState();
    showToast('Expense deleted');
}

// Settlement Calculations
function calculateSettlements() {
    if (state.people.length === 0 || state.expenses.length === 0) {
        return { balances: {}, settlements: [] };
    }
    
    // Initialize balances
    const balances = {};
    state.people.forEach(person => {
        balances[person.id] = 0;
    });
    
    // Calculate balances
    state.expenses.forEach(expense => {
        const sharePerPerson = expense.amount / expense.splitBetween.length;
        
        // Add to payer's balance
        balances[expense.paidBy] += expense.amount;
        
        // Subtract share from each person who should pay
        expense.splitBetween.forEach(personId => {
            balances[personId] -= sharePerPerson;
        });
    });
    
    // Round balances to avoid floating point precision issues
    Object.keys(balances).forEach(id => {
        balances[id] = Math.round(balances[id] * 100) / 100;
    });
    
    // Calculate settlements using greedy algorithm
    const settlements = [];
    const debtors = Object.entries(balances)
        .filter(([_, balance]) => balance < -0.01)
        .map(([id, balance]) => ({ id: parseInt(id), balance: -balance }))
        .sort((a, b) => b.balance - a.balance);
    
    const creditors = Object.entries(balances)
        .filter(([_, balance]) => balance > 0.01)
        .map(([id, balance]) => ({ id: parseInt(id), balance }))
        .sort((a, b) => b.balance - a.balance);
    
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        const amount = Math.min(debtor.balance, creditor.balance);
        
        if (amount > 0.01) {
            settlements.push({
                from: debtor.id,
                to: creditor.id,
                amount: Math.round(amount * 100) / 100
            });
        }
        
        debtor.balance -= amount;
        creditor.balance -= amount;
        
        if (debtor.balance <= 0.01) i++;
        if (creditor.balance <= 0.01) j++;
    }
    
    return { balances, settlements };
}

// UI Rendering Functions
function renderPeople() {
    const peopleList = document.getElementById('peopleList');
    
    if (state.people.length === 0) {
        peopleList.innerHTML = `
            <div class="empty-state">
                <p>👥 No people added yet</p>
                <p>Add people to start tracking expenses</p>
            </div>
        `;
        return;
    }
    
    peopleList.innerHTML = state.people.map(person => `
        <div class="person-item">
            <span class="person-name">${escapeHtml(person.name)}</span>
            <div class="person-actions">
                <button class="btn-small btn-edit" onclick="openEditPersonModal(${person.id})">Edit</button>
                <button class="btn-small btn-delete" onclick="deletePerson(${person.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function renderExpenseForm() {
    const paidBySelect = document.getElementById('expensePaidBy');
    const splitBetweenDiv = document.getElementById('splitBetween');
    const editPaidBySelect = document.getElementById('editExpensePaidBy');
    const editSplitBetweenDiv = document.getElementById('editSplitBetween');
    
    // Update paid by dropdowns
    const paidByOptions = '<option value="">Who paid?</option>' + 
        state.people.map(person => `<option value="${person.id}">${escapeHtml(person.name)}</option>`).join('');
    
    paidBySelect.innerHTML = paidByOptions;
    editPaidBySelect.innerHTML = paidByOptions;
    
    // Update split between checkboxes
    const splitCheckboxes = state.people.map(person => `
        <label class="split-checkbox">
            <input type="checkbox" value="${person.id}">
            ${escapeHtml(person.name)}
        </label>
    `).join('');
    
    splitBetweenDiv.innerHTML = splitCheckboxes;
    editSplitBetweenDiv.innerHTML = splitCheckboxes;
    
    // Add event listeners for split checkboxes
    [splitBetweenDiv, editSplitBetweenDiv].forEach(container => {
        container.querySelectorAll('.split-checkbox').forEach(label => {
            label.addEventListener('click', function(e) {
                if (e.target.type !== 'checkbox') {
                    e.preventDefault();
                    const checkbox = this.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                }
                this.classList.toggle('selected', this.querySelector('input[type="checkbox"]').checked);
            });
        });
    });
}

function renderExpenses() {
    const expensesList = document.getElementById('expensesList');
    
    if (state.expenses.length === 0) {
        expensesList.innerHTML = `
            <div class="empty-state">
                <p>💸 No expenses added yet</p>
                <p>Add an expense to start tracking</p>
            </div>
        `;
        return;
    }
    
    // Sort expenses by date (newest first)
    const sortedExpenses = [...state.expenses].sort((a, b) => {
        const dateA = new Date(a.date || '1970-01-01');
        const dateB = new Date(b.date || '1970-01-01');
        return dateB - dateA;
    });
    
    expensesList.innerHTML = `
        <div class="expenses-table">
            ${sortedExpenses.map(expense => {
                const paidByPerson = state.people.find(p => p.id === expense.paidBy);
                const splitPeople = expense.splitBetween
                    .map(id => state.people.find(p => p.id === id))
                    .filter(p => p)
                    .map(p => p.name);
                
                const formattedDate = expense.date ? 
                    new Date(expense.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: new Date(expense.date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    }) : 'No date';
                
                return `
                    <div class="expense-item">
                        <div class="expense-desc">${escapeHtml(expense.description)}</div>
                        <div class="expense-amount">${formatCurrency(expense.amount)}</div>
                        <div class="expense-type">${escapeHtml(expense.type || 'Other')}</div>
                        <div class="expense-date">${formattedDate}</div>
                        <div class="expense-paid-by">Paid by ${escapeHtml(paidByPerson ? paidByPerson.name : 'Unknown')}</div>
                        <div class="expense-split">Split: ${escapeHtml(splitPeople.join(', '))}</div>
                        <div class="expense-actions">
                            <button class="btn-small btn-edit" onclick="openEditExpenseModal(${expense.id})">Edit</button>
                            <button class="btn-small btn-delete" onclick="deleteExpense(${expense.id})">Delete</button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderSettlements() {
    const balanceSummary = document.getElementById('balanceSummary');
    const settlementsList = document.getElementById('settlementsList');
    
    const { balances, settlements } = calculateSettlements();
    
    // Render balance summary
    if (Object.keys(balances).length === 0) {
        balanceSummary.innerHTML = `
            <div class="empty-state">
                <p>⚖️ No balances to show</p>
                <p>Add people and expenses to see settlements</p>
            </div>
        `;
    } else {
        balanceSummary.innerHTML = state.people.map(person => {
            const balance = balances[person.id] || 0;
            let balanceClass = 'zero';
            let prefix = '';
            
            if (balance > 0.01) {
                balanceClass = 'positive';
                prefix = '+';
            } else if (balance < -0.01) {
                balanceClass = 'negative';
            }
            
            return `
                <div class="balance-item">
                    <span class="balance-name">${escapeHtml(person.name)}</span>
                    <span class="balance-amount ${balanceClass}">${prefix}${formatCurrency(Math.abs(balance))}</span>
                </div>
            `;
        }).join('');
    }
    
    // Render settlements
    if (settlements.length === 0) {
        settlementsList.innerHTML = `
            <div class="empty-state">
                <p>✅ All settled up!</p>
                <p>No payments needed</p>
            </div>
        `;
    } else {
        settlementsList.innerHTML = settlements.map(settlement => {
            const fromPerson = state.people.find(p => p.id === settlement.from);
            const toPerson = state.people.find(p => p.id === settlement.to);
            
            if (!fromPerson || !toPerson) return '';
            
            return `
                <div class="settlement-item">
                    <span class="settlement-text">
                        ${escapeHtml(fromPerson.name)} pays ${escapeHtml(toPerson.name)}
                    </span>
                    <span class="settlement-amount">${formatCurrency(settlement.amount)}</span>
                </div>
            `;
        }).join('');
    }
}

function renderUI() {
    renderPeople();
    renderExpenseForm();
    renderExpenses();
    renderSettlements();
}

// Modal Functions
function openEditPersonModal(personId) {
    const person = state.people.find(p => p.id === personId);
    if (!person) return;
    
    editingPersonId = personId;
    document.getElementById('editPersonName').value = person.name;
    document.getElementById('editPersonModal').classList.add('show');
    hideError('editPersonError');
}

function closeEditPersonModal() {
    editingPersonId = null;
    document.getElementById('editPersonModal').classList.remove('show');
}

function openEditExpenseModal(expenseId) {
    const expense = state.expenses.find(e => e.id === expenseId);
    if (!expense) return;
    
    editingExpenseId = expenseId;
    document.getElementById('editExpenseDesc').value = expense.description;
    document.getElementById('editExpenseAmount').value = expense.amount;
    document.getElementById('editExpenseType').value = expense.type || '';
    document.getElementById('editExpenseDate').value = expense.date || '';
    document.getElementById('editExpensePaidBy').value = expense.paidBy;
    
    // Update split between checkboxes
    const checkboxes = document.querySelectorAll('#editSplitBetween input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        const personId = parseInt(checkbox.value);
        const shouldBeChecked = expense.splitBetween.includes(personId);
        checkbox.checked = shouldBeChecked;
        checkbox.closest('.split-checkbox').classList.toggle('selected', shouldBeChecked);
    });
    
    document.getElementById('editExpenseModal').classList.add('show');
    hideError('editExpenseError');
}

function closeEditExpenseModal() {
    editingExpenseId = null;
    document.getElementById('editExpenseModal').classList.remove('show');
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Load initial state
    loadStateFromURL();
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expenseDate').value = today;
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update active tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
    
    // Share button
    document.getElementById('shareBtn').addEventListener('click', function() {
        navigator.clipboard.writeText(window.location.href).then(function() {
            showToast('Share link copied to clipboard!');
        }).catch(function() {
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = window.location.href;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('Share link copied to clipboard!');
        });
    });
    
    // Person form
    document.getElementById('personForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const nameInput = document.getElementById('personName');
        const name = nameInput.value;
        
        hideError('personError');
        
        if (addPerson(name)) {
            nameInput.value = '';
        }
    });
    
    // Expense form
    document.getElementById('expenseForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const description = document.getElementById('expenseDesc').value;
        const amount = document.getElementById('expenseAmount').value;
        const type = document.getElementById('expenseType').value;
        const date = document.getElementById('expenseDate').value;
        const paidBy = document.getElementById('expensePaidBy').value;
        const splitCheckboxes = document.querySelectorAll('#splitBetween input[type="checkbox"]:checked');
        const splitBetween = Array.from(splitCheckboxes).map(cb => cb.value);
        
        hideError('expenseError');
        
        if (addExpense(description, amount, type, date, paidBy, splitBetween)) {
            this.reset();
            // Reset split checkboxes visual state
            document.querySelectorAll('#splitBetween .split-checkbox').forEach(label => {
                label.classList.remove('selected');
            });
            // Set default date to today
            document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
        }
    });
    
    // Edit person modal
    document.getElementById('savePersonEdit').addEventListener('click', function() {
        const newName = document.getElementById('editPersonName').value;
        hideError('editPersonError');
        
        if (editPerson(editingPersonId, newName)) {
            closeEditPersonModal();
        }
    });
    
    document.getElementById('cancelPersonEdit').addEventListener('click', closeEditPersonModal);
    
    // Edit expense modal
    document.getElementById('saveExpenseEdit').addEventListener('click', function() {
        const description = document.getElementById('editExpenseDesc').value;
        const amount = document.getElementById('editExpenseAmount').value;
        const type = document.getElementById('editExpenseType').value;
        const date = document.getElementById('editExpenseDate').value;
        const paidBy = document.getElementById('editExpensePaidBy').value;
        const splitCheckboxes = document.querySelectorAll('#editSplitBetween input[type="checkbox"]:checked');
        const splitBetween = Array.from(splitCheckboxes).map(cb => cb.value);
        
        hideError('editExpenseError');
        
        if (editExpense(editingExpenseId, description, amount, type, date, paidBy, splitBetween)) {
            closeEditExpenseModal();
        }
    });
    
    document.getElementById('cancelExpenseEdit').addEventListener('click', closeEditExpenseModal);
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', function() {
        loadStateFromURL();
    });
    
    // Auto-save periodically as backup
    setInterval(() => {
        if (state.people.length > 0 || state.expenses.length > 0) {
            const encoded = serializeState(state);
            localStorage.setItem('expense-tracker-backup', encoded);
        }
    }, 30000); // Save every 30 seconds
});

// Expose functions globally for onclick handlers
window.deletePerson = deletePerson;
window.openEditPersonModal = openEditPersonModal;
window.deleteExpense = deleteExpense;
window.openEditExpenseModal = openEditExpenseModal;
