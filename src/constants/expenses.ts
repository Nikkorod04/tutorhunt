import type { ExpenseCategory } from '@/types';
import type { IconName } from '@/components/ui';

export const EXPENSE_CATEGORIES: readonly {
  value: ExpenseCategory;
  label: string;
  icon: IconName;
}[] = [
  { value: 'transportation', label: 'Transportation', icon: 'car-outline' },
  { value: 'materials', label: 'Materials', icon: 'construct-outline' },
  { value: 'printing', label: 'Printing', icon: 'print-outline' },
  { value: 'food', label: 'Food', icon: 'restaurant-outline' },
  { value: 'school_supplies', label: 'School supplies', icon: 'pencil-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];

export function expenseCategoryLabel(category: ExpenseCategory): string {
  return EXPENSE_CATEGORIES.find((item) => item.value === category)?.label ?? 'Other';
}
