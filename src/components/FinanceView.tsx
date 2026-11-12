import React, { useState } from 'react';
import { Download, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { FinanceRecordItem } from '../types.ts';

export const FinanceView: React.FC = () => {
  const { profile, financeRecords, todayDate, createFinanceRecord, deleteFinanceRecord } =
    useLifeOS();

  const [recordType, setRecordType] = useState<FinanceRecordItem['recordType']>('expense');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [accountName, setAccountName] = useState('Main Checking');
  const [amountMajor, setAmountMajor] = useState('25.00');
  const [targetMajor, setTargetMajor] = useState('500.00');
  const [isRecurring, setIsRecurring] = useState(false);

  const handleAddFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const amountMinor = Math.max(0, Math.round(( parseFloat(amountMajor) || 0 ) * 100));
    const targetAmountMinor =
      recordType === 'budget' || recordType === 'savings_goal'
        ? Math.max(0, Math.round(( parseFloat(targetMajor) || 0 ) * 100))
        : undefined;

    await createFinanceRecord({
      recordType,
      title,
      category,
      accountName,
      amountMinor,
      targetAmountMinor,
      date: todayDate,
      isRecurring,
    });
    setTitle('');
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Type', 'Title', 'Category', 'Account', 'AmountMinorUnits', 'AmountFormatted'];
    const rows = financeRecords.map((r) => [
      r.date,
      r.recordType,
      `"${r.title.replace(/"/g, '""')}"`,
      r.category,
      r.accountName,
      r.amountMinor,
      (r.amountMinor / 100).toFixed(2),
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life_os_finance_${todayDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalIncomeMinor = financeRecords
    .filter((f) => f.recordType === 'income')
    .reduce((acc, r) => acc + r.amountMinor, 0);
  const totalExpenseMinor = financeRecords
    .filter((f) => f.recordType === 'expense' || f.recordType === 'subscription')
    .reduce((acc, r) => acc + r.amountMinor, 0);
  const netBalanceMinor = totalIncomeMinor - totalExpenseMinor;

  const budgets = financeRecords.filter((f) => f.recordType === 'budget');
  const savingsGoals = financeRecords.filter((f) => f.recordType === 'savings_goal');
  const transactions = financeRecords.filter(
    (f) => f.recordType === 'expense' || f.recordType === 'income' || f.recordType === 'subscription'
  );

  const fmtMoney = (minor: number) => {
    const sign = minor < 0 ? '-' : '';
    return `${sign}$${(Math.abs(minor) / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Personal Finance Ledger & Savings Goals
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            Monetary values are stored in exact integer minor units ({profile?.currency || 'USD'} cents). AI can never silently alter financial records without confirmation.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Income</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {fmtMoney(totalIncomeMinor)}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            {totalIncomeMinor} minor units
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Spending</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {fmtMoney(totalExpenseMinor)}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            {totalExpenseMinor} minor units
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Net Cashflow</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {fmtMoney(netBalanceMinor)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Across Main Checking & Wallets
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Columns: Fast Entry + Budgets & Savings Goals */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Record Transaction, Budget or Goal
            </h2>

            <form onSubmit={handleAddFinance} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value as FinanceRecordItem['recordType'])}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="subscription">Recurring Subscription</option>
                  <option value="budget">Category Budget</option>
                  <option value="savings_goal">Savings Goal</option>
                </select>
                <select
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="Main Checking">Main Checking</option>
                  <option value="Cash Wallet">Cash Wallet</option>
                  <option value="High-Yield Vault">High-Yield Vault</option>
                </select>
              </div>

              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Description (e.g., Campus Bookstore, Stipend)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category"
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountMajor}
                  onChange={(e) => setAmountMajor(e.target.value)}
                  placeholder="Amount ($)"
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              {(recordType === 'budget' || recordType === 'savings_goal') && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Target Cap / Goal ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={targetMajor}
                    onChange={(e) => setTargetMajor(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                Recurring monthly transaction
              </label>

              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Save Financial Entry
              </button>
            </form>
          </div>

          {/* Budgets & Savings Goals Progress */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Budgets & Savings Goals
            </h3>
            {[...budgets, ...savingsGoals].map((item) => {
              const target = item.targetAmountMinor || 10000;
              const pct = Math.min(100, Math.round((item.amountMinor / target) * 100));
              const isNearLimit = item.recordType === 'budget' && pct >= 85;
              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {item.title}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {fmtMoney(item.amountMinor)} / {fmtMoney(target)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 7 Columns: High-Density Transaction Ledger */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Transaction Ledger
          </h2>

          {transactions.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No transactions recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                    <th className="py-2.5 font-medium">Date</th>
                    <th className="py-2.5 font-medium">Description</th>
                    <th className="py-2.5 font-medium">Category · Account</th>
                    <th className="py-2.5 font-medium text-right">Amount</th>
                    <th className="py-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 font-mono tabular-nums text-slate-500">{tx.date}</td>
                      <td className="py-3 font-medium text-slate-900 dark:text-slate-100">
                        {tx.title}
                      </td>
                      <td className="py-3 text-slate-500">
                        {tx.category} · {tx.accountName}
                      </td>
                      <td
                        className={`py-3 text-right font-mono tabular-nums font-semibold ${
                          tx.recordType === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {tx.recordType === 'income' ? '+' : '-'}
                        {fmtMoney(tx.amountMinor)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => deleteFinanceRecord(tx.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
