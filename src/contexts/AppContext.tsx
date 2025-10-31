import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Budget, Category, Expense, Goal, Language, Theme } from '@/types';
import { translations } from '@/i18n/translations';
import { toast } from '@/hooks/use-toast';
import { getDefaultCategories, normalizeCategoryPercentages } from '@/lib/categories';

const getExpenseYear = (expense: Expense) => {
  if (expense.date) {
    const [year] = expense.date.split('-');
    if (year) {
      return year;
    }
  }
  if (expense.month) {
    const [year] = expense.month.split('-');
    if (year) {
      return year;
    }
  }
  return '';
};

const getExpenseMonthKey = (expense: Expense) => {
  if (expense.date) {
    const [year, month] = expense.date.split('-');
    if (year && month) {
      return `${year}-${month}`;
    }
  }
  if (expense.month) {
    return expense.month;
  }
  return '';
};

type CategoryUpdateOptions = {
  normalize?: boolean;
};

interface AppContextType {
  budget: Budget;
  expenses: Expense[];
  goals: Goal[];
  theme: Theme;
  language: Language;
  t: (key: string, params?: Record<string, string>) => string;
  updateBudget: (budget: Budget) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  updateCategoryPercentages: (categories: Category[], options?: CategoryUpdateOptions) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => void;
  getExpensesByMonth: (month: string) => Expense[];
  getExpensesByYear: (year: string) => Expense[];
  getMonthlyTotals: (year: string) => { month: string; total: number }[];
  getCategorySpent: (categoryId: string, month?: string) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [budget, setBudget] = useState<Budget>(() => {
    const saved = localStorage.getItem('budget');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Budget;
        const categories = parsed.categories?.length
          ? normalizeCategoryPercentages(parsed.categories)
          : getDefaultCategories();

        return {
          totalIncome: parsed.totalIncome ?? 5000,
          categories,
        };
      } catch (error) {
        console.error('Failed to parse saved budget from localStorage', error);
      }
    }

    return { totalIncome: 5000, categories: getDefaultCategories() };
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('goals');
    return saved ? JSON.parse(saved) : [];
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'dark';
  });

  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved || 'en';
  });

  useEffect(() => {
    localStorage.setItem('budget', JSON.stringify(budget));
  }, [budget]);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string, params?: Record<string, string>) => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    if (typeof value === 'string' && params) {
      return Object.entries(params).reduce(
        (acc, [key, val]) => acc.replace(`{{${key}}}`, val),
        value
      );
    }

    return value || key;
  };

  const sanitizeCategoryPercentages = (categories: Category[]): Category[] =>
    categories.map(category => ({
      ...category,
      percentage: Math.max(0, Math.min(100, Math.round(category.percentage))),
    }));

  const applyCategoryUpdate = (
    categories: Category[],
    options?: CategoryUpdateOptions,
  ): Category[] => {
    const sanitized = sanitizeCategoryPercentages(categories);
    if (options?.normalize === false) {
      return sanitized;
    }

    return normalizeCategoryPercentages(sanitized);
  };

  const updateBudget = (newBudget: Budget) => {
    setBudget({
      totalIncome: newBudget.totalIncome,
      categories: normalizeCategoryPercentages(newBudget.categories),
    });
    toast({
      title: t('common.success'),
      description: t('alerts.incomeUpdated'),
    });
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense = { ...expense, id: Date.now().toString() };
    setExpenses([...expenses, newExpense]);

    const category = budget.categories.find(c => c.id === expense.categoryId);
    const spent = getCategorySpent(expense.categoryId, expense.month) + expense.amount;
    const allocated = (budget.totalIncome * (category?.percentage || 0)) / 100;
    const percentage = Math.round((spent / allocated) * 100);

    if (percentage >= 80 && percentage < 100) {
      toast({
        title: t('common.error'),
        description: t('alerts.budgetWarning', {
          percentage: percentage.toString(),
          category: t(category?.name) || ''
        }),
        variant: 'destructive',
      });
    } else if (percentage >= 100) {
      toast({
        title: t('common.error'),
        description: t('alerts.budgetExceeded', { category: t(category?.name) || '' }),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('common.success'),
        description: t('alerts.expenseAdded'),
      });
    }
  };

  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
    toast({
      title: t('common.success'),
      description: t('alerts.expenseDeleted'),
    });
  };

  const addGoal = (goal: Omit<Goal, 'id'>) => {
    const newGoal = { ...goal, id: Date.now().toString() };
    setGoals([...goals, newGoal]);
    toast({
      title: t('common.success'),
      description: t('alerts.goalAdded'),
    });
  };

  const updateGoal = (id: string, updatedGoal: Partial<Goal>) => {
    setGoals(goals.map(g => {
      if (g.id === id) {
        const updated = { ...g, ...updatedGoal };
        if (updated.currentAmount >= updated.targetAmount) {
          toast({
            title: t('common.success'),
            description: t('alerts.goalAchieved', { goal: updated.name }),
          });
        }
        return updated;
      }
      return g;
    }));
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
    toast({
      title: t('common.success'),
      description: t('alerts.goalDeleted'),
    });
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const updateCategoryPercentages = (
    categories: Category[],
    options?: CategoryUpdateOptions,
  ) => {
    setBudget(current => ({
      ...current,
      categories: applyCategoryUpdate(categories, options),
    }));
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    let shouldNotify = false;
    setBudget(current => {
      const newCategory: Category = {
        ...category,
        id: Date.now().toString(),
      };
      const updated = applyCategoryUpdate([...current.categories, newCategory]);
      shouldNotify = true;
      return { ...current, categories: updated };
    });

    if (shouldNotify) {
      toast({
        title: t('common.success'),
        description: t('alerts.categoryAdded'),
      });
    }
  };

  const updateCategory = (id: string, category: Partial<Omit<Category, 'id'>>) => {
    let shouldNotify = false;
    setBudget(current => {
      if (!current.categories.some(cat => cat.id === id)) {
        return current;
      }

      let didUpdate = false;

      const updatedCategories = current.categories.map(cat => {
        if (cat.id !== id) {
          return cat;
        }

        const updatedCategory = { ...cat, ...category };

        if (
          updatedCategory.name !== cat.name ||
          updatedCategory.percentage !== cat.percentage ||
          updatedCategory.color !== cat.color ||
          updatedCategory.icon !== cat.icon
        ) {
          didUpdate = true;
        }

        return updatedCategory;
      });

      if (!didUpdate) {
        return current;
      }

      shouldNotify = true;

      return {
        ...current,
        categories: applyCategoryUpdate(updatedCategories, { normalize: false }),
      };
    });

    if (shouldNotify) {
      toast({
        title: t('common.success'),
        description: t('alerts.categoryUpdated'),
      });
    }
  };

  const deleteCategory = (id: string) => {
    let shouldNotify = false;

    setBudget(current => {
      if (!current.categories.some(cat => cat.id === id)) {
        return current;
      }

      const remaining = current.categories.filter(cat => cat.id !== id);
      const categories = remaining.length
        ? applyCategoryUpdate(remaining)
        : getDefaultCategories();

      shouldNotify = true;

      return {
        ...current,
        categories,
      };
    });

    if (shouldNotify) {
      toast({
        title: t('common.success'),
        description: t('alerts.categoryDeleted'),
      });
    }
  };

  const getExpensesByMonth = (month: string) => {
    return expenses.filter(e => e.month === month);
  };

  const getExpensesByYear = useCallback(
    (year: string) => expenses.filter(expense => getExpenseYear(expense) === year),
    [expenses],
  );

  const getMonthlyTotals = useCallback(
    (year: string) => {
      const months = Array.from({ length: 12 }, (_, index) => (index + 1).toString().padStart(2, '0'));
      const yearlyExpenses = getExpensesByYear(year);
      const totalsMap = yearlyExpenses.reduce<Record<string, number>>((acc, expense) => {
        const monthKey = getExpenseMonthKey(expense);
        const [, month = ''] = monthKey.split('-');

        if (month) {
          acc[month] = (acc[month] || 0) + expense.amount;
        }

        return acc;
      }, {});

      return months.map(month => ({
        month,
        total: Number((totalsMap[month] || 0).toFixed(2)),
      }));
    },
    [getExpensesByYear],
  );

  const getCategorySpent = (categoryId: string, month?: string) => {
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    return expenses
      .filter(e => e.categoryId === categoryId && e.month === currentMonth)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  return (
    <AppContext.Provider value={{
      budget,
      expenses,
      goals,
      theme,
      language,
      t,
      updateBudget,
      addExpense,
      deleteExpense,
      addGoal,
      updateGoal,
      deleteGoal,
      toggleTheme,
      setLanguage,
      updateCategoryPercentages,
      addCategory,
      updateCategory,
      deleteCategory,
      getExpensesByMonth,
      getExpensesByYear,
      getMonthlyTotals,
      getCategorySpent,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
