import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HistoryChart } from './HistoryChart';
import { HistoryTable } from './HistoryTable';
import { HistorySummaryCard, HistorySummaryCategory } from './HistorySummaryCard';
import { Expense } from '@/types';

const MONTH_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const;

type MonthKey = (typeof MONTH_KEYS)[number];

type HistoryPeriod = 'all' | MonthKey;

const getMonthFromExpense = (expense: Expense) => {
  if (expense.date) {
    const [, month] = expense.date.split('-');
    if (month) {
      return month as MonthKey;
    }
  }
  if (expense.month) {
    const [, month] = expense.month.split('-');
    if (month) {
      return month as MonthKey;
    }
  }
  return undefined;
};

export const HistoryView = () => {
  const { expenses, budget, t, getExpensesByYear, getMonthlyTotals } = useApp();

  const currentYear = new Date().getFullYear().toString();
  const lastYear = (Number(currentYear) - 1).toString();

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    expenses.forEach(expense => {
      const [year] = expense.date?.split('-') || expense.month?.split('-') || [];
      if (year) {
        yearsSet.add(year);
      }
    });

    yearsSet.add(currentYear);
    yearsSet.add(lastYear);

    return Array.from(yearsSet).filter(Boolean).sort((a, b) => Number(b) - Number(a));
  }, [expenses, currentYear, lastYear]);

  const initialYear = availableYears[0] || currentYear;

  const [selectedYear, setSelectedYear] = useState<string>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<HistoryPeriod>('all');

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0] || currentYear);
    }
  }, [availableYears, selectedYear, currentYear]);

  useEffect(() => {
    setSelectedMonth('all');
  }, [selectedYear]);

  const monthLabels = useMemo(
    () => ({
      '01': t('history.months.january'),
      '02': t('history.months.february'),
      '03': t('history.months.march'),
      '04': t('history.months.april'),
      '05': t('history.months.may'),
      '06': t('history.months.june'),
      '07': t('history.months.july'),
      '08': t('history.months.august'),
      '09': t('history.months.september'),
      '10': t('history.months.october'),
      '11': t('history.months.november'),
      '12': t('history.months.december'),
    }),
    [t],
  );

  const yearExpenses = useMemo(() => getExpensesByYear(selectedYear), [getExpensesByYear, selectedYear]);

  const filteredExpenses = useMemo(
    () =>
      selectedMonth === 'all'
        ? yearExpenses
        : yearExpenses.filter(expense => getMonthFromExpense(expense) === selectedMonth),
    [yearExpenses, selectedMonth],
  );

  const monthlyTotals = useMemo(
    () => getMonthlyTotals(selectedYear),
    [getMonthlyTotals, selectedYear],
  );

  const monthlyTableData = useMemo(
    () =>
      monthlyTotals.map(total => {
        const transactions = yearExpenses.filter(expense => getMonthFromExpense(expense) === total.month).length;
        return {
          month: total.month,
          total: total.total,
          transactions,
        };
      }),
    [monthlyTotals, yearExpenses],
  );

  const totalSpent = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses],
  );

  const periodMonths = selectedMonth === 'all' ? 12 : 1;
  const plannedIncome = budget.totalIncome * periodMonths;
  const remaining = plannedIncome - totalSpent;

  const periodLabel = selectedMonth === 'all'
    ? t('history.periodYear', { year: selectedYear })
    : t('history.periodMonth', { month: monthLabels[selectedMonth], year: selectedYear });

  const summaryDescription = t('history.summaryDescription', { period: periodLabel });

  const categorySummary: HistorySummaryCategory[] = useMemo(() => {
    if (!budget?.categories?.length) {
      return [];
    }

    const totals = budget.categories.map(category => {
      const categorySpent = filteredExpenses
        .filter(expense => expense.categoryId === category.id)
        .reduce((sum, expense) => sum + expense.amount, 0);

      return {
        id: category.id,
        name: t(category.name),
        value: categorySpent,
        percentage: totalSpent > 0 ? (categorySpent / totalSpent) * 100 : 0,
        color: category.color,
      };
    });

    return totals.sort((a, b) => b.value - a.value);
  }, [budget.categories, filteredExpenses, t, totalSpent]);

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(prev => (prev === month ? 'all' : (month as HistoryPeriod)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t('history.title')}</h2>
        <p className="text-muted-foreground">{t('history.subtitle')}</p>
      </div>

      <Card className="bg-gradient-card border-border/50 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setSelectedYear(currentYear)}>
              {t('history.thisYear')}
            </Button>
            <Button variant="outline" onClick={() => setSelectedYear(lastYear)}>
              {t('history.lastYear')}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="year-filter">{t('history.year')}</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year-filter" className="bg-background/80">
                  <SelectValue placeholder={t('history.year')} />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month-filter">{t('history.month')}</Label>
              <Select value={selectedMonth} onValueChange={value => setSelectedMonth(value as HistoryPeriod)}>
                <SelectTrigger id="month-filter" className="bg-background/80">
                  <SelectValue placeholder={t('history.month')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('history.allMonths')}</SelectItem>
                  {MONTH_KEYS.map(month => (
                    <SelectItem key={month} value={month}>
                      {monthLabels[month]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      <HistorySummaryCard
        plannedIncome={plannedIncome}
        totalSpent={totalSpent}
        remaining={remaining}
        periodLabel={periodLabel}
        categories={categorySummary}
        summaryTitle={t('history.summaryTitle')}
        summaryDescription={summaryDescription}
        totalIncomeLabel={t('history.totalIncome')}
        totalSpentLabel={t('history.totalSpent')}
        remainingLabel={t('history.remaining')}
        categoryDistributionLabel={t('history.categoryDistribution')}
        noDataLabel={t('history.noData')}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-gradient-card border-border/50 p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{t('history.monthlyDistribution')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('history.summaryDescription', { period: t('history.periodYear', { year: selectedYear }) })}
              </p>
            </div>
            <div className="h-[300px] w-full">
              <HistoryChart
                data={monthlyTotals}
                monthLabels={monthLabels}
                selectedMonth={selectedMonth}
                onMonthSelect={handleMonthSelect}
                totalLabel={t('history.totalSpent')}
              />
            </div>
          </div>
        </Card>

        <Card className="border-border/50 p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{t('history.tableTitle')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('history.summaryDescription', { period: periodLabel })}
              </p>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                <HistoryTable
                  data={monthlyTableData}
                  monthLabels={monthLabels}
                  selectedMonth={selectedMonth}
                  onMonthSelect={handleMonthSelect}
                  noDataLabel={t('history.noData')}
                  monthHeader={t('history.table.month')}
                  totalHeader={t('history.table.total')}
                  transactionsHeader={t('history.table.transactions')}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
