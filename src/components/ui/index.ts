/**
 * The UI primitive set. See DESIGN_PLAN.md section 4.
 *
 * Screens import from here rather than reaching into individual files, so the
 * surface area stays deliberate.
 */

export { Avatar, type AvatarProps, type AvatarSize } from './Avatar';
export { Badge, type BadgeProps, type BadgeVariant } from './Badge';
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './Button';
export { Card, type CardProps, type CardVariant } from './Card';
export { Chip, type ChipProps, type ChipVariant } from './Chip';
export { DateField, type DateFieldProps } from './DateField';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { IconButton, type IconButtonProps, type IconButtonVariant } from './IconButton';
export { ListRow, type ListRowProps } from './ListRow';
export { ProgressBar, type ProgressBarProps } from './ProgressBar';
export { Screen, type ScreenProps } from './Screen';
export { SectionHeader, type SectionHeaderProps } from './SectionHeader';
export { Skeleton, type SkeletonProps, type SkeletonVariant } from './Skeleton';
export { StatTile, type StatTileProps, type StatTileVariant } from './StatTile';
export {
  PlanBadge,
  ReimbursementStatusChip,
  SessionStatusChip,
} from './StatusChip';
export { Text, type TextProps } from './Text';
export { TextField, type TextFieldProps } from './TextField';
export type { IconName } from './icon';
