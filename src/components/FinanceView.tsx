import React, { useState, useMemo } from 'react';
import { useLifeOS } from '../context/LifeOSContext.tsx';
import { FinanceRecordItem } from '../types.ts';
import { Plus, Trash2 } from 'lucide-react';

interface FinanceViewProps {
  subPage?: string;
  onSubPageChange?: (sub: string) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  subPage = 'transactions',
  onSubPageChange,
}) => {
  const {
    profile,
    financeRecords,
    todayDate,
    createFinanceRecord,
    deleteFinanceRecord,
  } = useLifeOS();

  const [activeTab, setActiveTab] = useState<
    'transactions' | 'budgets' | 'subscriptions' | 'savings'
  >(
    (subPage as 'transactions' | 'budgets' | 'subscriptions' | 'savings') ||
      'transactions'
  );

  // Entry Form State
  const [recordType, setRecordType] = useState<FinanceRecordItem['recordType']>('expense');
  const [amountMajor, setAmountMajor] = useState('');
  const [targetMajor, setTargetMajor] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food');
  const [accountName, setAccountName] = useState('Cash');
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const currency = profile?.currency || 'EGP';

  const switchTab = (
    tab: 'transactions' | 'budgets' | 'subscriptions' | 'savings'
  ) => {
    setActiveTab(tab);
    if (onSubPageChange) onSubPageChange(tab);
  };

  const transactions = useMemo(
    () =>
      financeRecords
        .filter((f) => f.recordType === 'expense' || f.recordType === 'income')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [financeRecords]
  );

  const budgets = financeRecords.filter((f) => f.recordType === 'budget');
  const subscriptions = financeRecords.filter((f) => f.recordType === 'subscription');
  const savingsGoals = financeRecords.filter((f) => f.recordType === 'savings_goal');

  const accountBalance = (accLabel: string) => {
    return financeRecords
      .filter(
        (f) =>
          (f.recordType === 'expense' || f.recordType === 'income') &&
          f.accountName.toLowerCase() === accLabel.toLowerCase()
      )
      .reduce(
        (sum, r) =>
          sum + (r.recordType === 'income' ? r.amountMinor / 100 : -r.amountMinor / 100),
        0
      );
  };

  const totalIncome = transactions
    .filter((t) => t.recordType === 'income')
    .reduce((sum, r) => sum + r.amountMinor / 100, 0);
  const totalExpenses = transactions
    .filter((t) => t.recordType === 'expense')
    .reduce((sum, r) => sum + r.amountMinor / 100, 0);
  const netFlow = totalIncome - totalExpenses;

  // Spending by category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.recordType === 'expense') {
        map[tx.category] = (map[tx.category] || 0) + tx.amountMinor / 100;
      }
    }
    return Object.entries(map).map(([cat, amt]) => ({
      category: cat,
      amount: Math.round(amt),
      pct: totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0,
    }));
  }, [transactions, totalExpenses]);

  const handleSaveFinanceRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amountMajor);
    if (isNaN(num) || num < 0 || !title.trim()) return;

    const targetNum = parseFloat(targetMajor);
    await createFinanceRecord({
      recordType,
      title: title.trim(),
      category,
      accountName,
      amountMinor: Math.round(num * 100),
      targetAmountMinor:
        !isNaN(targetNum) && targetNum > 0 ? Math.round(targetNum * 100) : undefined,
      date: todayDate,
      isRecurring: recordType === 'subscription',
    });

    setSavedBanner(`Saved ${recordType.replace('_', ' ')}: ${currency} ${num} (${title})`);
    setAmountMajor('');
    setTargetMajor('');
    setTitle('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8EDE8]">Finance</h1>
          <p className="text-xs text-[#9AA79E] mt-1">
            {transactions.length} transactions · {budgets.length} budgets ·{' '}
            {subscriptions.length} subscriptions · {savingsGoals.length} savings goals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#222C27] border border-[#BDD3C1]/15 text-xs">
            {(
              [
                { id: 'transactions', label: 'Transactions' },
                { id: 'budgets', label: 'Budgets' },
                { id: 'subscriptions', label: 'Subscriptions' },
                { id: 'savings', label: 'Savings' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === t.id
                    ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                    : 'text-[#9AA79E] hover:text-[#E8EDE8]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => switchTab('budgets')}
            className="px-4 py-2 rounded-xl bg-[#9BB9A2] hover:bg-[#a9c5b0] text-[#171E1B] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add entry
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="px-4 py-2.5 rounded-xl bg-[#2C3932] border border-[#9BB9A2]/40 text-xs text-[#9BB9A2] flex items-center justify-between">
          <span>{savedBanner}</span>
          <button onClick={() => setSavedBanner(null)}>×</button>
        </div>
      )}

      {/* 4 Account KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sage-card p-4">
          <p className="text-xs text-[#9AA79E]">Cash</p>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">
            {currency} {Math.round(accountBalance('Cash')).toLocaleString()}
          </p>
          <p className="text-xs text-[#9AA79E] mt-1">Net cash flow</p>
        </div>
        <div className="sage-card p-4">
          <p className="text-xs text-[#9AA79E]">Bank account</p>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">
            {currency} {Math.round(accountBalance('Bank account')).toLocaleString()}
          </p>
          <p className="text-xs text-[#9BB9A2] mt-1">Net bank flow</p>
        </div>
        <div className="sage-card p-4">
          <p className="text-xs text-[#9AA79E]">Mobile wallet</p>
          <p className="text-2xl font-bold text-[#E8EDE8] mt-1">
            {currency} {Math.round(accountBalance('Mobile wallet')).toLocaleString()}
          </p>
          <p className="text-xs text-[#9AA79E] mt-1">Net wallet flow</p>
        </div>
        <div className="sage-card p-4">
          <p className="text-xs text-[#9AA79E]">Net balance</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              netFlow >= 0 ? 'text-[#9BB9A2]' : 'text-[#D97A6C]'
            }`}
          >
            {netFlow >= 0 ? '+' : ''}
            {Math.round(netFlow).toLocaleString()}
          </p>
          <p className="text-xs text-[#9AA79E] mt-1">
            In: {Math.round(totalIncome).toLocaleString()} · Out:{' '}
            {Math.round(totalExpenses).toLocaleString()}
          </p>
        </div>
      </div>

      {/* TRANSACTIONS VIEW */}
      {activeTab === 'transactions' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 7-Col Recent Transactions Table */}
          <div className="lg:col-span-7 sage-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#E8EDE8]">
                Transactions ({transactions.length})
              </h2>
              <button
                onClick={() => switchTab('budgets')}
                className="text-xs text-[#9BB9A2] hover:underline"
              >
                + Add transaction
              </button>
            </div>

            {transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-[#65756B] border-b border-[#BDD3C1]/10">
                      <th className="py-2.5 px-2">Date</th>
                      <th className="py-2.5 px-2">Description</th>
                      <th className="py-2.5 px-2">Category</th>
                      <th className="py-2.5 px-2">Account</th>
                      <th className="py-2.5 px-2 text-right">Amount</th>
                      <th className="py-2.5 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#BDD3C1]/8">
                    {transactions.map((tx) => {
                      const isInc = tx.recordType === 'income';
                      return (
                        <tr key={tx.id} className="hover:bg-[#2C3932]/40">
                          <td className="py-3 px-2 text-[#9AA79E]">{tx.date}</td>
                          <td className="py-3 px-2 font-medium text-[#E8EDE8]">{tx.title}</td>
                          <td className="py-3 px-2 text-[#9AA79E]">{tx.category}</td>
                          <td className="py-3 px-2 text-[#9AA79E]">{tx.accountName}</td>
                          <td
                            className={`py-3 px-2 text-right font-semibold ${
                              isInc ? 'text-[#9BB9A2]' : 'text-[#E8EDE8]'
                            }`}
                          >
                            {isInc ? '+' : '-'}
                            {currency} {(tx.amountMinor / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={() => deleteFinanceRecord(tx.id)}
                              className="text-[#65756B] hover:text-[#D97A6C]"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center space-y-2">
                <p className="text-xs text-[#9AA79E]">No transactions recorded yet.</p>
                <button
                  onClick={() => switchTab('budgets')}
                  className="px-4 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                >
                  + Add your first transaction
                </button>
              </div>
            )}
          </div>

          {/* Right 5-Col Spending by Category */}
          <div className="lg:col-span-5 space-y-4">
            <div className="sage-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[#E8EDE8]">Spending by category</h2>
              <div className="flex items-center gap-5">
                <div className="w-24 h-24 rounded-full border-[6px] border-[#9BB9A2] flex flex-col items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-[#E8EDE8]">
                    {Math.round(totalExpenses).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[#9AA79E]">{currency}</span>
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  {categoryBreakdown.length > 0 ? (
                    categoryBreakdown.map((c) => (
                      <div key={c.category} className="flex justify-between">
                        <span className="text-[#9AA79E]">• {c.category}</span>
                        <span className="text-[#E8EDE8] font-medium">
                          {currency} {c.amount.toLocaleString()} ({c.pct}%)
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#65756B]">No expense categories yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* BUDGETS, SUBSCRIPTIONS & SAVINGS VIEW */
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Monthly Budgets */}
            <div className="lg:col-span-6 sage-card p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#E8EDE8]">
                  Budgets ({budgets.length})
                </h2>
              </div>

              {budgets.length > 0 ? (
                budgets.map((b) => {
                  const target = (b.targetAmountMinor || b.amountMinor) / 100;
                  const spentInCat = transactions
                    .filter((t) => t.recordType === 'expense' && t.category === b.category)
                    .reduce((sum, r) => sum + r.amountMinor / 100, 0);
                  const pct = target > 0 ? Math.round((spentInCat / target) * 100) : 0;
                  const over = pct > 100;
                  return (
                    <div key={b.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-[#E8EDE8]">
                          {b.title} ({b.category})
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              over ? 'text-[#D97A6C] font-semibold' : 'text-[#9AA79E]'
                            }
                          >
                            {currency} {Math.round(spentInCat)} / {Math.round(target)} ({pct}%)
                          </span>
                          <button
                            onClick={() => deleteFinanceRecord(b.id)}
                            className="text-[#65756B] hover:text-[#D97A6C]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#171E1B] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            over ? 'bg-[#D97A6C]' : 'bg-[#9BB9A2]'
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#9AA79E] py-6 text-center">
                  No budgets defined yet. Select &ldquo;Budget&rdquo; in the form on the right to
                  set a category cap.
                </p>
              )}
            </div>

            {/* Universal Finance Entry Form */}
            <form
              onSubmit={handleSaveFinanceRecord}
              className="lg:col-span-6 sage-card p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#E8EDE8]">Add finance entry</h2>
                  <p className="text-xs text-[#9AA79E]">
                    Log an expense, income, budget cap, subscription, or savings goal
                  </p>
                </div>

                <div className="grid grid-cols-5 gap-1.5 text-xs">
                  {(
                    [
                      { id: 'expense', label: 'Expense' },
                      { id: 'income', label: 'Income' },
                      { id: 'budget', label: 'Budget' },
                      { id: 'subscription', label: 'Sub' },
                      { id: 'savings_goal', label: 'Savings' },
                    ] as const
                  ).map((rt) => (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => setRecordType(rt.id)}
                      className={`py-1.5 rounded-lg font-medium ${
                        recordType === rt.id
                          ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                          : 'bg-[#2C3932] text-[#9AA79E]'
                      }`}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#9AA79E] mb-1">
                      Amount ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amountMajor}
                      onChange={(e) => setAmountMajor(e.target.value)}
                      placeholder="150"
                      className="w-full sage-input px-3.5 py-2 text-sm font-bold"
                    />
                  </div>
                  {(recordType === 'budget' || recordType === 'savings_goal') && (
                    <div>
                      <label className="block text-[11px] text-[#9AA79E] mb-1">
                        Target ({currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={targetMajor}
                        onChange={(e) => setTargetMajor(e.target.value)}
                        placeholder="2500"
                        className="w-full sage-input px-3.5 py-2 text-sm font-bold"
                      />
                    </div>
                  )}
                  <div
                    className={
                      recordType === 'budget' || recordType === 'savings_goal'
                        ? 'col-span-2'
                        : ''
                    }
                  >
                    <label className="block text-[11px] text-[#9AA79E] mb-1">Title / Note</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Description..."
                      className="w-full sage-input px-3.5 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[#9AA79E] mb-1.5">Category</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['Food', 'Study', 'Transport', 'Health', 'General'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={`py-1.5 rounded-lg text-xs font-medium ${
                          category === c
                            ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                            : 'bg-[#2C3932] text-[#9AA79E]'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[#9AA79E] mb-1.5">Account</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Cash', 'Bank account', 'Mobile wallet'].map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAccountName(a)}
                        className={`py-1.5 rounded-lg text-xs font-medium ${
                          accountName === a
                            ? 'bg-[#9BB9A2] text-[#171E1B] font-semibold'
                            : 'bg-[#2C3932] text-[#9AA79E]'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#9BB9A2] text-[#171E1B] text-xs font-semibold"
                >
                  Save entry
                </button>
              </div>
            </form>
          </div>

          {/* Bottom Row: Subscriptions + Savings Goals */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 sage-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#E8EDE8]">
                  Recurring subscriptions ({subscriptions.length})
                </h2>
              </div>
              {subscriptions.length > 0 ? (
                subscriptions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl bg-[#2C3932]/75 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#E8EDE8]">{s.title}</p>
                      <p className="text-[11px] text-[#9AA79E]">
                        {s.accountName} · {s.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#222C27] text-[#E8EDE8]">
                        {currency} {(s.amountMinor / 100).toFixed(0)} / mo
                      </span>
                      <button
                        onClick={() => deleteFinanceRecord(s.id)}
                        className="text-[#65756B] hover:text-[#D97A6C]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#9AA79E] py-4">No subscriptions tracked yet.</p>
              )}
            </div>

            <div className="lg:col-span-6 sage-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[#E8EDE8]">
                Savings goals ({savingsGoals.length})
              </h2>
              {savingsGoals.length > 0 ? (
                savingsGoals.map((g) => {
                  const saved = g.amountMinor / 100;
                  const target = (g.targetAmountMinor || g.amountMinor) / 100;
                  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
                  return (
                    <div
                      key={g.id}
                      className="p-4 rounded-xl bg-[#2C3932]/75 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full border-4 border-[#9BB9A2] flex items-center justify-center text-xs font-bold text-[#E8EDE8] shrink-0">
                          {pct}%
                        </div>
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-[#E8EDE8]">{g.title}</p>
                          <p className="text-[#9AA79E]">
                            {currency} {saved.toLocaleString()} of {target.toLocaleString()} saved
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteFinanceRecord(g.id)}
                        className="text-[#65756B] hover:text-[#D97A6C]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#9AA79E] py-4">No savings goals created yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
