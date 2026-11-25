
const $ = id => document.getElementById(id);

let currentUser = null;
let currentPage = "dashboard";
let moneyChart = null;
let budgetChart = null;
let analyticsChart = null;
let authMode = "login";

function getUsers() {
    return JSON.parse(localStorage.getItem("finset_users") || "[]");
}

function saveUsers(users) {
    localStorage.setItem("finset_users", JSON.stringify(users));
}

function dataKey() {
    return "finset_data_" + currentUser.email;
}

function getData() {
    return JSON.parse(localStorage.getItem(dataKey()) || '{"transactions":[],"goals":[],"budget":10000,"currency":"INR","name":""}');
}

function saveData(data) {
    localStorage.setItem(dataKey(), JSON.stringify(data));
}

function toast(message) {
    $("toast").textContent = message;
    $("toast").style.display = "block";
    setTimeout(() => $("toast").style.display = "none", 2500);
}

function showAuth(mode) {
    authMode = mode;
    $("authName").classList.toggle("hidden", mode !== "register");
    $("authSubmit").textContent = mode === "login" ? "Login" : "Create Account";
    $("loginTab").classList.toggle("selected", mode === "login");
    $("registerTab").classList.toggle("selected", mode === "register");
    $("authMessage").textContent = "";
}

$("loginTab").onclick = () => showAuth("login");
$("registerTab").onclick = () => showAuth("register");

$("authForm").addEventListener("submit", e => {
    e.preventDefault();

    const email = $("authEmail").value.trim().toLowerCase();
    const password = $("authPassword").value;
    const users = getUsers();

    if (authMode === "register") {
        const name = $("authName").value.trim();

        if (!name) return $("authMessage").textContent = "Enter your name.";
        if (password.length < 6) return $("authMessage").textContent = "Password must be at least 6 characters.";
        if (users.some(u => u.email === email)) return $("authMessage").textContent = "Account already exists. Please login.";

        users.push({name, email, password});
        saveUsers(users);

        localStorage.setItem("finset_data_" + email, JSON.stringify({
            transactions: [], goals: [], budget: 10000, currency: "INR", name
        }));

        toast("Account created successfully!");
    } else {
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) return $("authMessage").textContent = "Invalid email or password.";
        currentUser = user;
        startApp();
    }

    if (authMode === "register") {
        $("authMessage").textContent = "Account created! Please login.";
        showAuth("login");
        $("authEmail").value = email;
    }
});

function startApp() {
    $("authScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    const data = getData();
    $("profileName").textContent = data.name || currentUser.name;
    $("avatar").textContent = (data.name || currentUser.name).charAt(0).toUpperCase();
    $("settingsName").value = data.name || currentUser.name;
    $("settingsEmail").value = currentUser.email;
    $("displayCurrency").value = data.currency || "INR";
    renderAll();
    navigate("dashboard");
    lucide.createIcons();
}

function logout() {
    currentUser = null;
    $("app").classList.add("hidden");
    $("authScreen").classList.remove("hidden");
    $("authForm").reset();
    showAuth("login");
}

$("logoutBtn").onclick = e => {
    e.preventDefault();
    logout();
};

$("profileBtn").onclick = () => navigate("settings");

function navigate(page) {
    currentPage = page;

    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    $(page + "Page").classList.remove("hidden");

    document.querySelectorAll(".sidebar nav a").forEach(a => {
        a.classList.toggle("active", a.dataset.page === page);
    });

    const titles = {
        dashboard: "Dashboard",
        transactions: "Transactions",
        wallet: "My Wallet",
        goals: "Saving Goals",
        budget: "Monthly Budget",
        analytics: "Analytics",
        converter: "Currency Converter",
        settings: "Settings"
    };

    $("pageTitle").textContent = titles[page];
    $("welcomeText").textContent = "Welcome, " + (getData().name || currentUser.name);
    renderAll();
    lucide.createIcons();
}

document.querySelectorAll(".sidebar nav a[data-page]").forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();
        navigate(link.dataset.page);
    });
});

function currency(value) {
    const code = getData().currency || "INR";
    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: code,
            maximumFractionDigits: 2
        }).format(value);
    } catch {
        return value.toFixed(2) + " " + code;
    }
}

function totals() {
    const data = getData();
    const income = data.transactions.filter(t => t.type === "income").reduce((s,t) => s + t.amount, 0);
    const expense = data.transactions.filter(t => t.type === "expense").reduce((s,t) => s + t.amount, 0);
    return {income, expense, balance: income - expense};
}

function renderAll() {
    const data = getData();
    const t = totals();

    $("totalBalance").textContent = currency(t.balance);
    $("totalIncome").textContent = currency(t.income);
    $("totalExpense").textContent = currency(t.expense);
    $("totalSavings").textContent = currency(t.balance);

    $("walletBalance").textContent = currency(t.balance);
    $("walletIncome").textContent = "Total Income: " + currency(t.income);
    $("walletExpense").textContent = "Total Expense: " + currency(t.expense);
    $("walletSavings").textContent = "Net Savings: " + currency(t.balance);

    renderTransactions();
    renderGoals();
    renderBudget();
    renderCharts();

    $("analyticsIncome").textContent = currency(t.income);
    $("analyticsExpense").textContent = currency(t.expense);
    $("analyticsSavings").textContent = currency(t.balance);
}

function renderTransactions() {
    const list = getData().transactions.slice().reverse();

    const html = list.map(tx => `
        <div class="transaction-row">
            <div><strong>${escapeHTML(tx.title)}</strong><small>${escapeHTML(tx.category)} • ${escapeHTML(tx.date)}</small></div>
            <strong class="${tx.type === "income" ? "green" : "red"}">${tx.type === "income" ? "+" : "-"}${currency(tx.amount)}</strong>
            <button class="delete-btn" onclick="deleteTransaction('${tx.id}')">Delete</button>
        </div>
    `).join("") || '<p class="muted">No transactions yet. Add your first transaction!</p>';

    $("allTransactions").innerHTML = html;
    $("recentTransactions").innerHTML = list.slice(0,4).map(tx => `
        <div class="transaction-row">
            <div><strong>${escapeHTML(tx.title)}</strong><small>${escapeHTML(tx.category)}</small></div>
            <strong class="${tx.type === "income" ? "green" : "red"}">${tx.type === "income" ? "+" : "-"}${currency(tx.amount)}</strong>
        </div>
    `).join("") || '<p class="muted">No transactions yet.</p>';
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[c]);
}

$("transactionForm").addEventListener("submit", e => {
    e.preventDefault();
    const data = getData();
    data.transactions.push({
        id: Date.now().toString(),
        title: $("txTitle").value.trim(),
        amount: Number($("txAmount").value),
        type: $("txType").value,
        category: $("txCategory").value,
        date: $("txDate").value
    });
    saveData(data);
    e.target.reset();
    $("txDate").value = new Date().toISOString().slice(0,10);
    renderAll();
    toast("Transaction added!");
});

function deleteTransaction(id) {
    const data = getData();
    data.transactions = data.transactions.filter(t => t.id !== id);
    saveData(data);
    renderAll();
    toast("Transaction deleted!");
}

function renderGoals() {
    const goals = getData().goals;

    const html = goals.map(g => {
        const percent = Math.min(100, Math.round(g.saved / g.target * 100));
        return `
            <div class="goal">
                <div class="goal-info">
                    <strong>${escapeHTML(g.name)}</strong>
                    <span>${percent}%</span>
                </div>
                <div class="progress"><div style="width:${percent}%"></div></div>
                <small>${currency(g.saved)} of ${currency(g.target)}</small>
                <button class="delete-btn" onclick="deleteGoal('${g.id}')">Delete</button>
            </div>`;
    }).join("") || '<p class="muted">No saving goals yet.</p>';

    $("allGoals").innerHTML = html;
    $("recentGoals").innerHTML = html;
}

$("goalForm").addEventListener("submit", e => {
    e.preventDefault();
    const data = getData();
    const target = Number($("goalTarget").value);
    const saved = Number($("goalSaved").value);

    if (saved > target) return toast("Saved amount cannot exceed target.");

    data.goals.push({
        id: Date.now().toString(),
        name: $("goalName").value.trim(),
        target,
        saved
    });

    saveData(data);
    e.target.reset();
    renderAll();
    toast("Saving goal created!");
});

function deleteGoal(id) {
    const data = getData();
    data.goals = data.goals.filter(g => g.id !== id);
    saveData(data);
    renderAll();
    toast("Goal deleted!");
}

function renderBudget() {
    const data = getData();
    const expense = totals().expense;
    const amount = Number(data.budget) || 0;
    const percent = amount > 0 ? Math.min(100, expense / amount * 100) : 0;

    $("budgetSummary").textContent = `${currency(expense)} spent of ${currency(amount)}`;
    $("budgetPageAmount").textContent = currency(amount);
    $("budgetPageText").textContent = `${currency(expense)} spent • ${Math.round(percent)}% used`;
    $("budgetProgress").style.width = percent + "%";
}

$("budgetForm").addEventListener("submit", e => {
    e.preventDefault();
    const data = getData();
    data.budget = Number($("budgetAmount").value);
    saveData(data);
    renderAll();
    toast("Budget updated!");
});

function renderCharts() {
    const data = getData();
    const income = totals().income;
    const expense = totals().expense;
    const remaining = Math.max(0, (Number(data.budget) || 0) - expense);

    if (moneyChart) moneyChart.destroy();
    if (budgetChart) budgetChart.destroy();
    if (analyticsChart) analyticsChart.destroy();

    moneyChart = new Chart($("moneyChart"), {
        type: "bar",
        data: {
            labels: ["Income", "Expense"],
            datasets: [{
                data: [income, expense],
                backgroundColor: ["#8065ed", "#c7b8ff"],
                borderRadius: 8
            }]
        },
        options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}
    });

    budgetChart = new Chart($("budgetChart"), {
        type: "doughnut",
        data: {
            labels: ["Spent", "Remaining"],
            datasets: [{
                data: [expense, remaining],
                backgroundColor: ["#8065ed", "#eee9ff"],
                borderWidth: 0
            }]
        },
        options: {responsive:true, maintainAspectRatio:false, cutout:"72%"}
    });

    analyticsChart = new Chart($("analyticsChart"), {
        type: "bar",
        data: {
            labels: ["Income", "Expense", "Savings"],
            datasets: [{
                label: "Amount",
                data: [income, expense, income-expense],
                backgroundColor: ["#8065ed", "#e6a0a7", "#66b99a"],
                borderRadius: 8
            }]
        },
        options: {responsive:true, maintainAspectRatio:false}
    });
}

$("saveSettings").onclick = () => {
    const data = getData();
    const name = $("settingsName").value.trim();
    if (!name) return toast("Enter your name.");

    data.name = name;
    data.currency = $("displayCurrency").value;
    saveData(data);
    $("profileName").textContent = name;
    $("avatar").textContent = name.charAt(0).toUpperCase();
    renderAll();
    toast("Settings saved!");
};

$("themeBtn").onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("finset_dark", document.body.classList.contains("dark"));
};

$("convertBtn").onclick = async () => {
    const amount = Number($("convertAmount").value);
    const from = $("fromCurrency").value;
    const to = $("toCurrency").value;

    if (!Number.isFinite(amount) || amount < 0) return toast("Enter a valid amount.");

    $("conversionResult").textContent = "Converting...";
    try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
        if (!response.ok) throw new Error("Rate service unavailable");
        const result = await response.json();
        if (result.result !== "success" || !result.rates[to]) throw new Error("Currency unavailable");

        const converted = amount * result.rates[to];
        $("conversionResult").textContent =
            new Intl.NumberFormat("en-US", {style:"currency",currency:to}).format(converted);
        $("exchangeInfo").textContent =
            `1 ${from} = ${result.rates[to]} ${to} • Rate date: ${result.time_last_update_utc}`;
    } catch (error) {
        $("conversionResult").textContent = "Conversion unavailable. Check your internet connection.";
        $("exchangeInfo").textContent = "";
    }
};

if (localStorage.getItem("finset_dark") === "true") {
    document.body.classList.add("dark");
}

$("txDate").value = new Date().toISOString().slice(0,10);
showAuth("login");
