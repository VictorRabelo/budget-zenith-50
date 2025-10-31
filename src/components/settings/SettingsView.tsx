import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Category } from '@/types';
import { CategoryForm, CategoryFormValues } from './CategoryForm';
import { CATEGORY_ICON_COMPONENTS } from './category-icons';
import { cn } from '@/lib/utils';
import { DollarSign, Save, Plus, Edit3, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const getCategoryLabel = (name: string, translate: (key: string) => string) => {
  if (name.startsWith('categories.')) {
    return translate(name);
  }
  return name;
};

const getCategoryIcon = (icon: string) =>
  CATEGORY_ICON_COMPONENTS[icon as keyof typeof CATEGORY_ICON_COMPONENTS] ||
  CATEGORY_ICON_COMPONENTS.Home;

export const SettingsView = () => {
  const {
    budget,
    updateBudget,
    updateCategoryPercentages,
    addCategory,
    updateCategory,
    deleteCategory,
    t,
  } = useApp();
  const [income, setIncome] = useState(budget.totalIncome.toString());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  useEffect(() => {
    setIncome(budget.totalIncome.toString());
  }, [budget.totalIncome]);

  const totalPercentage = useMemo(
    () => budget.categories.reduce((sum, category) => sum + category.percentage, 0),
    [budget.categories],
  );

  const handlePercentageChange = (categoryId: string, value: number) => {
    const nextValue = Math.max(0, Math.min(100, Math.round(value)));
    const updated = budget.categories.map(category =>
      category.id === categoryId
        ? { ...category, percentage: nextValue }
        : category,
    );

    updateCategoryPercentages(updated, { normalize: false });
  };

  const handleSave = () => {
    if (totalPercentage !== 100) {
      toast({
        title: t('common.error'),
        description: t('categories.totalMustBe100'),
        variant: 'destructive',
      });
      return;
    }

    updateBudget({
      totalIncome: parseFloat(income) || 0,
      categories: budget.categories,
    });
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  const handleCategorySubmit = (values: CategoryFormValues) => {
    const resolveName = (original: Category | null, submitted: string) => {
      if (!original) {
        return submitted;
      }

      if (original.name.startsWith('categories.')) {
        const translated = t(original.name);
        if (submitted === translated) {
          return original.name;
        }
      }

      return submitted;
    };

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: resolveName(editingCategory, values.name),
        percentage: values.percentage,
        color: values.color,
        icon: values.icon,
      });
    } else {
      addCategory({
        name: values.name,
        percentage: values.percentage,
        color: values.color,
        icon: values.icon,
      });
    }

    closeForm();
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteCategory(categoryToDelete.id);
    }
    setCategoryToDelete(null);
  };

  const incomeValue = parseFloat(income) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">{t('settings.title')}</h2>
        <p className="text-muted-foreground">{t('app.subtitle')}</p>
      </div>

      <Card className="space-y-6 border-border/50 bg-gradient-card p-6">
        <div className="space-y-2">
          <Label htmlFor="income" className="text-lg font-semibold">
            {t('settings.income')}
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="income"
              type="number"
              step="0.01"
              min="0"
              value={income}
              onChange={(event) => setIncome(event.target.value)}
              className="pl-10 text-lg"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{t('categories.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('categories.percentageHelper')}
              </p>
            </div>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
                totalPercentage === 100 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
              )}
            >
              {totalPercentage}%
            </span>
          </div>

          <div className="space-y-6">
            {budget.categories.map(category => {
              const allocated = (incomeValue * category.percentage) / 100;
              const Icon = getCategoryIcon(category.icon);
              return (
                <div key={category.id} className="space-y-3 rounded-lg border border-border/60 bg-card/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full text-background"
                        style={{ backgroundColor: category.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-base font-medium text-foreground">
                          {getCategoryLabel(category.name, t)}
                        </p>
                        <p className="text-sm text-muted-foreground">${allocated.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setEditingCategory(category);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                        <span className="sr-only">{t('common.edit')}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={budget.categories.length <= 1}
                        onClick={() => setCategoryToDelete(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t('common.delete')}</span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{t('categories.percentage')}</span>
                      <span className="font-medium text-foreground">{category.percentage}%</span>
                    </div>
                    <Slider
                      value={[category.percentage]}
                      onValueChange={(value) => handlePercentageChange(category.id, value[0])}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="w-full bg-gradient-primary transition-opacity hover:opacity-90"
          disabled={totalPercentage !== 100}
        >
          <Save className="mr-2 h-4 w-4" />
          {t('common.save')}
        </Button>
      </Card>

      <Card className="space-y-6 border-border/50 bg-card/70 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {t('categories.manageTitle')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('categories.manageDescription')}
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingCategory(null);
              setIsFormOpen(true);
            }}
            className="bg-gradient-success hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('categories.addCategory')}
          </Button>
        </div>

        <div className="grid gap-4">
          {budget.categories.map(category => {
            const Icon = getCategoryIcon(category.icon);
            return (
              <div
                key={`manage-${category.id}`}
                className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-background"
                    style={{ backgroundColor: category.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-base font-medium text-foreground">
                      {getCategoryLabel(category.name, t)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {category.percentage}% · {category.icon}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingCategory(category);
                      setIsFormOpen(true);
                    }}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setCategoryToDelete(category)}
                    disabled={budget.categories.length <= 1}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => (open ? setIsFormOpen(true) : closeForm())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t('categories.editCategory') : t('categories.addCategory')}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm initialData={editingCategory ?? undefined} onSubmit={handleCategorySubmit} onCancel={closeForm} t={t} />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(categoryToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('categories.deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('categories.deleteConfirmation', {
                category: categoryToDelete ? getCategoryLabel(categoryToDelete.name, t) : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
