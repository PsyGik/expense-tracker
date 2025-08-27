# 📘 Expense Tracker – Full PRD + Implementation Guide

---

## 1. Product Overview

### 1.1 Product Name

**Expense Tracker**

### 1.2 Vision

A simple, shareable web application that allows users to track shared expenses among a group, calculate settlements, and share the data via URL — **no login, no backend**.

### 1.3 Target Audience

* Friends splitting travel costs
* Roommates sharing household expenses
* Small teams managing project-related expenses
* Anyone needing group expense tracking

### 1.4 Value Proposition

* Easy 3-tab navigation: **People**, **Expenses**, **Settlements**
* Share via URL (client-side state encoded, no backend)
* No login required
* Real-time settlement calculations
* Mobile-first design

---

## 2. Requirements

### 2.1 Functional Requirements

#### **People Tab**

* Add/edit/remove people
* Names must be unique and non-empty
* UI: input + “Add” button + list with edit/delete

#### **Expenses Tab**

* Add/edit/delete expenses
* Fields: description, amount, type (dropdown), date, paidBy (dropdown), splitBetween (multi-select)
* Validation: non-empty description, positive amount, valid date, at least one person in splitBetween
* UI: form + expense table + empty state

#### **Settlements Tab**

* Auto-calculated settlements
* Show per-person net balance
* Show settlement instructions: "X pays Y ₹Z"
* Handle chained debts (A→B→C)
* UI: summary + detailed list + empty state

---

### 2.2 Non-Functional Requirements

* **Performance**: Load <2s, settlement calc <200ms for 50 people, 200 expenses
* **Usability**: Tab navigation, empty states, responsive
* **Compatibility**: Chrome, Firefox, Safari, Edge, iOS/Android browsers
* **Security**: 100% client-side, encoded URL params
* **Accessibility**: ARIA roles, keyboard nav, WCAG contrast

---

### 2.3 Data Model

```js
// People
{ id: 1, name: "John" }

// Expenses
{
  id: 1,
  description: "Dinner",
  amount: 60.00,
  type: "Food",
  date: "2025-08-27",
  paidBy: 1,
  splitBetween: [1, 2]
}

// Settlements
{
  from: 2,
  to: 1,
  amount: 30.00
}

// State includes ID counters for clean incremental IDs
{
  people: [],
  expenses: [],
  nextPersonId: 1,
  nextExpenseId: 1
}
```

---

## 3. Implementation Guidelines

### 3.1 Tech Stack

* **HTML5**
* **CSS3**
* **Vanilla JS (ES6+)**
* **No external frameworks/libraries** (except optional compression lib like `lz-string`)

### 3.2 Architecture

* **SPA** (single-page app)
* State stored in-memory, synced to URL
* Auto-save to `localStorage`

### 3.3 File Structure

```
expense-tracker/
├── index.html
├── styles.css
└── app.js
```

---

## 4. Detailed Developer Specification

### 4.1 State Management

```js
let state = {
  people: [],
  expenses: []
};

// Serialize
function serializeState(state) {
  return LZString.compressToEncodedURIComponent(JSON.stringify(state));
}

// Deserialize
function deserializeState(encoded) {
  try {
    return JSON.parse(LZString.decompressFromEncodedURIComponent(encoded));
  } catch {
    return { people: [], expenses: [] };
  }
}
```

---

### 4.2 People Module

* **Add Person**

```js
function addPerson(name) {
  if (!name || state.people.find(p => p.name === name)) return;
  state.people.push({ id: Date.now(), name });
  updateState();
}
```

* **Edit Person**: Update name in state, cascade update to expenses
* **Delete Person**: Remove from `people`; delete/reassign their expenses

---

### 4.3 Expenses Module

* **Add Expense**

```js
function addExpense(desc, amount, type, date, paidBy, splitBetween) {
  if (!desc || amount <= 0 || !type || !date || !paidBy || splitBetween.length === 0) return;
  state.expenses.push({
    id: Date.now(),
    description: desc,
    amount: parseFloat(amount),
    type: type,
    date: date,
    paidBy,
    splitBetween
  });
  updateState();
}
```

* **Edit/Delete Expense**: Modify/remove by `id`

---

### 4.4 Settlements Module

**Algorithm (Greedy Minimization)**

1. Compute net balances:

   * `balance[id] = totalPaid - totalOwed`
2. Split into **debtors** (balance < 0) and **creditors** (balance > 0)
3. While both exist:

   * Match one debtor with one creditor
   * Transfer `min(abs(debtor), creditor)`
   * Update balances until all \~0

```js
function calculateSettlements() {
  const balances = {};
  state.people.forEach(p => balances[p.id] = 0);

  state.expenses.forEach(exp => {
    const share = exp.amount / exp.splitBetween.length;
    exp.splitBetween.forEach(pid => balances[pid] -= share);
    balances[exp.paidBy] += exp.amount;
  });

  const debtors = Object.entries(balances).filter(([_, b]) => b < 0);
  const creditors = Object.entries(balances).filter(([_, b]) => b > 0);

  const settlements = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    let [dId, dBal] = debtors[i];
    let [cId, cBal] = creditors[j];
    const amt = Math.min(-dBal, cBal);

    settlements.push({ from: +dId, to: +cId, amount: amt });

    debtors[i][1] += amt;
    creditors[j][1] -= amt;

    if (debtors[i][1] === 0) i++;
    if (creditors[j][1] === 0) j++;
  }

  return settlements;
}
```

---

### 4.5 URL Sharing

* Encode state on every change:

```js
function updateState() {
  const encoded = serializeState(state);
  history.replaceState(null, "", "?data=" + encoded);
  localStorage.setItem("expense-tracker", encoded);
  renderUI();
}
```

* Load from URL or fallback to `localStorage` on startup.

---

### 4.6 UI Rendering

#### Tabs

* `People` → form + list
* `Expenses` → form + table
* `Settlements` → summary + settlement list

#### States

* Empty states (`"No people"`, `"No expenses"`, `"All settled up!"`)
* Inline error validation messages
* Toasts: `"Person added"`, `"Expense deleted"`, etc.

#### Responsiveness

* Desktop: 2-column layout
* Mobile: stacked single-column

---

## 5. Testing

### Unit Tests

* Serialization/deserialization
* Settlement calculation (test multiple scenarios)
* Input validation

### Integration Tests

* Add/edit/remove people → expenses update correctly
* Add/edit/remove expenses → settlements update correctly
* URL share → reloads identical state

### Manual Testing

* Chrome, Safari, Firefox, Edge
* iOS + Android browsers

---

## 6. Success Metrics

* **Correctness**: Settlements always balance to zero
* **Performance**: <200ms calc time for 200 expenses
* **Adoption**: % of sessions with URL sharing
* **UX**: Users can complete common tasks in <3 steps

---

## 7. Future Enhancements

* CSV/PDF export
* Currency selection
* Expense categories filtering and analytics
* Recurring expenses
* QR code share
* Expense search and filtering by date range

---

## 8. Open Questions

1. Should settlements **minimize number of transactions** or just show raw debts?
   1. Ans: Show Raw Debts
2. When deleting a person, should their expenses be **deleted or reassigned**?
   1. Ans: Delete expenses
3. Should loading a shared URL **overwrite local data** or create a new session?
   1. Ans: new session, show a landing page to choose session